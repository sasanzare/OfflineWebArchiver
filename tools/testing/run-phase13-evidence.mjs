import { createHash } from "node:crypto";
import { execFile as execFileCallback, spawn } from "node:child_process";
import { access, lstat, mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const execFile = promisify(execFileCallback);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const evidenceRoot = path.join(repositoryRoot, ".artifacts", "phase13-evidence");
const evidenceSchemaVersion = "1.0.0";
const sourceBaselineRelativePath = "tools/testing/phase13-evidence-baseline.json";
const sourceFingerprintAlgorithm = "sha256-canonical-path-role-hash-list-v1";
const allowedAcceptanceStatuses = new Set(["PASS", "PRODUCT_FAIL", "TEST_INFRA_FAILURE", "ENVIRONMENT_BLOCKED", "NOT_APPLICABLE"]);
const browserAcceptanceIds = ["AC-P13-002", "AC-P13-008", "AC-P13-012"];
const carryOverAcceptanceIds = ["AC-P12-001", "AC-P12-006", "AC-P12-015"];
const mandatoryAcceptanceIds = [...browserAcceptanceIds, "AC-P13-016"];
const allTrackedAcceptanceIds = [...mandatoryAcceptanceIds, ...carryOverAcceptanceIds];
const requiredBundleFiles = ["environment.json", "runtime.json", "test-results.json", "acceptance-results.json", "matrix-entry.json", "secret-scan.json"];
const maxCapturedOutput = 240_000;
const maxSafeDiagnostic = 6_000;
const secretPatterns = [
  { id: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i },
  { id: "bearer-credential", pattern: /\bBearer\s+[A-Za-z0-9._~+\/-]{12,}/i },
  { id: "cloud-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "github-credential", pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { id: "api-secret", pattern: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { id: "synthetic-session-value", pattern: /\b(?:fixture-session|session-only|signed-in)\b/i },
  { id: "unredacted-named-secret", pattern: /\b(?:authorization|cookie|password|token|otp|secret)\b\s*[:=]\s*(?!["']?\[redacted(?:-[^\]]+)?\]?)/i },
];

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isIsoTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function normalizedPath(value) {
  return value.split(path.sep).join("/");
}

function relativeRepositoryPath(target) {
  return normalizedPath(path.relative(repositoryRoot, target));
}

function commandOptions(context = {}) {
  const platform = context.platform ?? process.platform;
  const environment = context.env ?? process.env;
  return {
    cwd: context.cwd ?? repositoryRoot,
    env: { ...environment },
    windowsHide: platform === "win32",
  };
}

function isNpmCliPath(value, platform) {
  if (typeof value !== "string" || value.length === 0) return false;
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  return pathApi.isAbsolute(value) && pathApi.basename(value).toLowerCase() === "npm-cli.js";
}

function npmCliPath(platform, execPath, environment) {
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  const candidates = [environment.npm_execpath];
  if (platform === "win32") {
    candidates.push(
      pathApi.join(pathApi.dirname(execPath), "node_modules", "npm", "bin", "npm-cli.js"),
      typeof environment.npm_config_prefix === "string"
        ? pathApi.join(environment.npm_config_prefix, "node_modules", "npm", "bin", "npm-cli.js")
        : null,
    );
  }
  return candidates.find((candidate) => isNpmCliPath(candidate, platform)) ?? null;
}

export function resolvePortableCommand(kind, args = [], context = {}) {
  const platform = context.platform ?? process.platform;
  const execPath = context.execPath ?? process.execPath;
  const environment = context.env ?? process.env;
  const options = commandOptions({ ...context, platform, env: environment });
  if (kind === "node") return { command: execPath, args: [...args], options };
  if (kind !== "npm") throw new Error(`Unsupported portable command kind '${kind}'.`);
  const cliPath = npmCliPath(platform, execPath, environment);
  if (cliPath !== null) return { command: execPath, args: [cliPath, ...args], options };
  if (platform === "win32") throw new Error("Unable to resolve the npm CLI JavaScript entry point on Windows.");
  return { command: "npm", args: [...args], options };
}

function resolveDirectCommand(command, args = [], context = {}) {
  return { command, args: [...args], options: commandOptions(context) };
}

function redactText(value, maximum = maxSafeDiagnostic) {
  let redactions = 0;
  let text = String(value ?? "");
  const replacements = [
    { pattern: /(authorization|cookie|password|token|otp|secret)\s*([:=])\s*([^\s,;}]+)/gi, replacement: "$1$2[redacted]" },
    { pattern: /\bBearer\s+[A-Za-z0-9._~+\/-]{8,}/gi, replacement: "Bearer [redacted]" },
    { pattern: /\b(?:fixture-session|session-only|signed-in)\b/gi, replacement: "[redacted-fixture]" },
    { pattern: /([?&](?:token|password|secret|otp)=)[^&\s]+/gi, replacement: "$1[redacted]" },
  ];
  for (const item of replacements) {
    text = text.replace(item.pattern, (...args) => {
      redactions += 1;
      return item.replacement.replace("$1", args[1] ?? "").replace("$2", args[2] ?? "");
    });
  }
  return { text: text.replace(/[\r\n\t]+/g, " ").slice(0, maximum), redactions };
}

function commandLabel(executable, args) {
  return [executable, ...args].join(" ");
}

async function runCommand(executable, args, options = {}) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let stdout = "";
  let stderr = "";
  let spawnError = null;
  let timedOut = false;
  let signal = null;
  const append = (current, chunk) => current.length >= maxCapturedOutput ? current : `${current}${chunk.toString("utf8")}`.slice(0, maxCapturedOutput);
  const result = await new Promise((resolve) => {
    let child;
    try {
      child = spawn(executable, args, {
        cwd: options.cwd ?? repositoryRoot,
        env: options.env ?? { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: options.windowsHide ?? process.platform === "win32",
      });
    } catch (error) {
      spawnError = error;
      resolve({ code: null, signal: null });
      return;
    }
    child.stdout.on("data", (chunk) => { stdout = append(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = append(stderr, chunk); });
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 1_000).unref();
    }, options.timeoutMs ?? 10 * 60_000);
    child.once("error", (error) => { spawnError = error; });
    child.once("close", (code, exitSignal) => {
      clearTimeout(timeout);
      signal = exitSignal;
      resolve({ code, signal: exitSignal });
    });
  });
  const safeStdout = redactText(stdout);
  const safeStderr = redactText(stderr);
  return {
    command: options.displayCommand ?? commandLabel(executable, args),
    args,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    exitCode: typeof result.code === "number" ? result.code : null,
    signal,
    timedOut,
    spawnErrorSafe: spawnError === null ? null : redactText(spawnError.message, 1_000).text,
    stdoutSafe: safeStdout.text,
    stderrSafe: safeStderr.text,
    redactionsApplied: safeStdout.redactions + safeStderr.redactions,
    output: `${stdout}\n${stderr}`,
  };
}

function parseTapResult(output, exitCode) {
  const lines = output.replaceAll("\r\n", "\n").split("\n");
  const summary = { total: null, passed: null, failed: null, skipped: null, todo: null };
  for (const line of lines) {
    const match = line.match(/^(?:#|ℹ)\s*(tests|pass|fail|skipped|todo)\s+(\d+)$/);
    if (match === null) continue;
    const key = match[1] === "tests" ? "total" : match[1] === "pass" ? "passed" : match[1] === "fail" ? "failed" : match[1];
    summary[key] = Number(match[2]);
  }
  const subtests = [];
  let pendingTitle = null;
  for (const line of lines) {
    const title = line.match(/^# Subtest: (.+)$/);
    if (title !== null) {
      pendingTitle = title[1].trim();
      continue;
    }
    const result = line.match(/^(ok|not ok) \d+ - (.+)$/);
    if (result === null || pendingTitle === null) continue;
    subtests.push({ name: pendingTitle, status: result[1] === "ok" ? "passed" : "failed" });
    pendingTitle = null;
  }
  for (const line of lines) {
    const result = line.match(/^([✖✔﹣]) (.+?) \([^)]*ms\)$/);
    if (result === null) continue;
    const status = result[1] === "✔" ? "passed" : result[1] === "﹣" ? "skipped" : "failed";
    if (!subtests.some((item) => item.name === result[2].trim())) subtests.push({ name: result[2].trim(), status });
  }
  if (summary.total === null && subtests.length === 0) return null;
  if (summary.total === null) summary.total = subtests.length;
  if (summary.passed === null) summary.passed = subtests.filter((item) => item.status === "passed").length;
  if (summary.failed === null) summary.failed = subtests.filter((item) => item.status === "failed").length;
  if (summary.skipped === null) summary.skipped = 0;
  if (summary.todo === null) summary.todo = 0;
  return { ...summary, status: exitCode === 0 && summary.failed === 0 ? "pass" : "fail", subtests };
}

function compactCommand(result) {
  const { output, ...record } = result;
  return { ...record, testResult: parseTapResult(output, result.exitCode) };
}

async function readJsonFile(target) {
  return JSON.parse(await readFile(target, "utf8"));
}

async function readPackageJson(relativePath) {
  return readJsonFile(path.join(repositoryRoot, relativePath));
}

async function sha256(target) {
  return createHash("sha256").update(await readFile(target)).digest("hex");
}

function sha256Text(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sourceEntryText(entries) {
  return entries
    .slice()
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0)
    .map((entry) => `${entry.path}\u0000${entry.role}\u0000${entry.sha256}\n`)
    .join("");
}

function validRepositoryRelativePath(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\u0000")) return false;
  if (path.isAbsolute(value) || path.win32.isAbsolute(value)) return false;
  const normalized = value.replaceAll("\\", "/");
  return !normalized.split("/").some((part) => part === ".." || part === "");
}

async function inspectSourceBaseline(expected = null) {
  const target = path.join(repositoryRoot, sourceBaselineRelativePath);
  let manifest;
  try {
    manifest = await readJsonFile(target);
  } catch {
    return {
      manifest: null,
      manifestPath: sourceBaselineRelativePath,
      expectedSourceFingerprint: null,
      sourceFingerprint: null,
      packageLockHash: null,
      evidenceRunnerHash: null,
      acceptanceDefinitionHash: null,
      includedFiles: [],
      match: false,
      errors: ["SOURCE_BASELINE_MANIFEST_MISSING"],
    };
  }
  const errors = [];
  const includedFiles = Array.isArray(manifest?.includedFiles) ? manifest.includedFiles : [];
  if (manifest?.schemaVersion !== "1.0.0" || manifest?.kind !== "phase13-evidence-source-baseline") errors.push("SOURCE_BASELINE_MANIFEST_INVALID");
  if (manifest?.sourceFingerprintAlgorithm !== sourceFingerprintAlgorithm) errors.push("SOURCE_BASELINE_ALGORITHM_UNSUPPORTED");
  if (!/^[a-f0-9]{64}$/i.test(manifest?.sourceFingerprint ?? "")) errors.push("SOURCE_BASELINE_FINGERPRINT_INVALID");
  if (expected !== null) {
    if (manifest?.expectedNodeVersion !== expected.node || manifest?.expectedNpmMajor !== 11 || manifest?.playwrightVersion !== expected.playwrightVersion || manifest?.chromiumRevision !== expected.chromium.revision || manifest?.chromiumBuild !== expected.chromium.version || manifest?.electronVersion !== expected.electronVersion) errors.push("SOURCE_BASELINE_RUNTIME_CONTRACT_MISMATCH");
  }
  const seen = new Set();
  const expectedEntries = [];
  for (const item of includedFiles) {
    if (!isRecord(item) || !validRepositoryRelativePath(item.path) || typeof item.role !== "string" || !/^[a-f0-9]{64}$/i.test(item.sha256 ?? "")) {
      errors.push("SOURCE_BASELINE_FILE_ENTRY_INVALID");
      continue;
    }
    const normalized = item.path.replaceAll("\\", "/");
    if (seen.has(normalized)) {
      errors.push(`SOURCE_BASELINE_DUPLICATE_FILE:${normalized}`);
      continue;
    }
    seen.add(normalized);
    expectedEntries.push({ path: normalized, role: item.role, sha256: item.sha256 });
  }
  const actualEntries = [];
  for (const expectedEntry of expectedEntries) {
    try {
      actualEntries.push({ path: expectedEntry.path, role: expectedEntry.role, sha256: await sha256(path.join(repositoryRoot, expectedEntry.path)) });
    } catch {
      errors.push(`SOURCE_BASELINE_FILE_MISSING:${expectedEntry.path}`);
    }
  }
  for (const actual of actualEntries) {
    const expected = expectedEntries.find((item) => item.path === actual.path);
    if (expected?.sha256 !== actual.sha256) errors.push(`SOURCE_BASELINE_FILE_HASH_MISMATCH:${actual.path}`);
  }
  const sourceFingerprint = actualEntries.length === expectedEntries.length ? sha256Text(sourceEntryText(actualEntries)) : null;
  if (sourceFingerprint !== null && sourceFingerprint !== manifest.sourceFingerprint) errors.push("SOURCE_BASELINE_FINGERPRINT_MISMATCH");
  const categoryHash = (role) => {
    const entries = actualEntries.filter((item) => item.role === role);
    return entries.length === 0 ? null : sha256Text(sourceEntryText(entries));
  };
  const packageLock = actualEntries.find((item) => item.path === "package-lock.json");
  const runner = actualEntries.find((item) => item.path === "tools/testing/run-phase13-evidence.mjs");
  const acceptance = actualEntries.filter((item) => item.role === "acceptance-definition");
  const acceptanceDefinitionHash = acceptance.length === 0 ? null : sha256Text(sourceEntryText(acceptance));
  if (manifest.packageLockHash !== packageLock?.sha256) errors.push("SOURCE_BASELINE_PACKAGE_LOCK_HASH_MISMATCH");
  if (manifest.evidenceRunnerHash !== runner?.sha256) errors.push("SOURCE_BASELINE_RUNNER_HASH_MISMATCH");
  if (manifest.acceptanceDefinitionHash !== acceptanceDefinitionHash) errors.push("SOURCE_BASELINE_ACCEPTANCE_HASH_MISMATCH");
  return {
    manifest,
    manifestPath: sourceBaselineRelativePath,
    expectedSourceFingerprint: typeof manifest.sourceFingerprint === "string" ? manifest.sourceFingerprint : null,
    sourceFingerprint,
    packageLockHash: packageLock?.sha256 ?? null,
    evidenceRunnerHash: runner?.sha256 ?? null,
    acceptanceDefinitionHash,
    includedFiles: actualEntries,
    match: errors.length === 0 && sourceFingerprint === manifest.sourceFingerprint,
    errors,
    toolchainCategoryHash: categoryHash("toolchain-contract"),
  };
}

function expectedElectronExecutable() {
  if (process.platform === "win32") return path.join("node_modules", "electron", "dist", "electron.exe");
  if (process.platform === "darwin") return path.join("node_modules", "electron", "dist", "Electron.app", "Contents", "MacOS", "Electron");
  if (process.platform === "linux") return path.join("node_modules", "electron", "dist", "electron");
  return null;
}

async function readExpectedRuntime() {
  const rootPackage = await readPackageJson("package.json");
  const playwrightPackage = await readPackageJson("node_modules/playwright-core/package.json");
  const electronPackage = await readPackageJson("node_modules/electron/package.json");
  const browsers = await readJsonFile(path.join(repositoryRoot, "node_modules", "playwright-core", "browsers.json"));
  const chromium = browsers.browsers.find((item) => item.name === "chromium");
  if (!isRecord(chromium)) throw new Error("The installed Playwright browsers.json has no Chromium entry.");
  let lock = null;
  try { lock = await readJsonFile(path.join(repositoryRoot, "package-lock.json")); } catch {}
  const lockedElectron = lock?.packages?.["node_modules/electron"];
  return {
    node: rootPackage.engines?.node ?? null,
    npm: rootPackage.engines?.npm ?? null,
    playwrightVersion: rootPackage.dependencies?.["playwright-core"] ?? playwrightPackage.version,
    installedPlaywrightVersion: playwrightPackage.version,
    playwrightVersionMatches: playwrightPackage.version === (rootPackage.dependencies?.["playwright-core"] ?? playwrightPackage.version),
    chromium: { revision: String(chromium.revision), version: chromium.browserVersion },
    electronVersion: rootPackage.devDependencies?.electron ?? electronPackage.version,
    installedElectronVersion: electronPackage.version,
    electronIntegrity: lockedElectron?.integrity ?? null,
  };
}

async function realPathInside(root, target) {
  try {
    const rootReal = await realpath(root);
    const targetReal = await realpath(target);
    const relative = path.relative(rootReal, targetReal);
    return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
  } catch {
    return false;
  }
}

async function inspectBrowser(expected) {
  const browserRoot = path.join(repositoryRoot, ".runtime", "browsers");
  const manifestPath = path.join(browserRoot, "browser-manifest.json");
  const base = {
    resourceRoot: ".runtime/browsers",
    manifestPath: ".runtime/browsers/browser-manifest.json",
    provider: "playwright-core",
    source: "official-playwright",
    playwrightVersion: expected.playwrightVersion,
    expectedRevision: expected.chromium.revision,
    expectedVersion: expected.chromium.version,
    installed: false,
    valid: false,
    manifest: null,
    executablePath: null,
    executableSha256: null,
    reason: null,
  };
  let manifest;
  try { manifest = await readJsonFile(manifestPath); }
  catch { return { ...base, reason: "BROWSER_INSTALLATION_MISSING" }; }
  base.manifest = {
    manifestVersion: manifest?.manifestVersion ?? null,
    provider: manifest?.provider ?? null,
    playwrightVersion: manifest?.playwrightVersion ?? null,
    chromiumVersion: manifest?.chromiumVersion ?? null,
    browserRevision: manifest?.browserRevision ?? null,
    executablePath: typeof manifest?.executablePath === "string" ? manifest.executablePath : null,
    source: manifest?.source ?? null,
  };
  if (!isRecord(manifest) || manifest.manifestVersion !== 1 || manifest.provider !== "playwright-core" || manifest.source !== "official-playwright" || manifest.playwrightVersion !== expected.playwrightVersion || manifest.chromiumVersion !== expected.chromium.version || manifest.browserRevision !== expected.chromium.revision || typeof manifest.executablePath !== "string" || !/^[a-f0-9]{64}$/.test(manifest.executableSha256 ?? "")) {
    return { ...base, manifest: base.manifest, reason: "BROWSER_INSTALLATION_INVALID" };
  }
  const executable = path.resolve(browserRoot, manifest.executablePath);
  const relative = path.relative(browserRoot, executable);
  const normalizedExecutable = normalizedPath(relative);
  if (relative.startsWith("..") || path.isAbsolute(relative) || !normalizedExecutable.includes(`chromium-${expected.chromium.revision}`) || !(await realPathInside(browserRoot, executable))) {
    return { ...base, manifest: base.manifest, reason: "BROWSER_INSTALLATION_INVALID" };
  }
  try {
    const item = await lstat(executable);
    if (!item.isFile() || item.isSymbolicLink()) return { ...base, manifest: base.manifest, reason: "BROWSER_INSTALLATION_INVALID" };
    const digest = await sha256(executable);
    if (digest !== manifest.executableSha256) return { ...base, manifest: base.manifest, reason: "BROWSER_INSTALLATION_INVALID" };
    return { ...base, installed: true, valid: true, manifest: base.manifest, executablePath: normalizedRepositoryOrRuntimePath(executable), executableSha256: digest, reason: null };
  } catch {
    return { ...base, manifest: base.manifest, reason: "BROWSER_INSTALLATION_MISSING" };
  }
}

function normalizedRepositoryOrRuntimePath(target) {
  const relative = path.relative(repositoryRoot, target);
  return relative.startsWith("..") || path.isAbsolute(relative) ? normalizedPath(target) : normalizedPath(relative);
}

async function inspectElectron(expected) {
  const packagePath = path.join(repositoryRoot, "node_modules", "electron", "package.json");
  const executable = expectedElectronExecutable();
  const result = {
    packagePath: "node_modules/electron/package.json",
    packagePresent: false,
    packageVersion: null,
    expectedVersion: expected.electronVersion,
    packageVersionMatches: false,
    packageIntegrity: expected.electronIntegrity,
    executablePath: executable === null ? null : normalizedPath(executable),
    executablePresent: false,
    executableSha256: null,
    launchable: false,
    versionOutput: null,
    versionMatches: false,
    reason: null,
  };
  try {
    const packageJson = await readJsonFile(packagePath);
    result.packagePresent = true;
    result.packageVersion = packageJson.version ?? null;
    result.packageVersionMatches = result.packageVersion === expected.electronVersion;
  } catch {
    result.reason = "ELECTRON_PACKAGE_MISSING";
    return result;
  }
  if (executable === null) {
    result.reason = "ELECTRON_PLATFORM_UNSUPPORTED";
    return result;
  }
  try {
    const item = await lstat(path.join(repositoryRoot, executable));
    if (!item.isFile() || item.isSymbolicLink()) throw new Error("Electron executable is not a regular file.");
    result.executablePresent = true;
    result.executableSha256 = await sha256(path.join(repositoryRoot, executable));
  } catch {
    result.reason = "ELECTRON_BINARY_MISSING";
    return result;
  }
  if (!result.packageVersionMatches) {
    result.reason = "ELECTRON_PACKAGE_VERSION_MISMATCH";
    return result;
  }
  return result;
}

async function hostVersion() {
  if (process.platform === "darwin") {
    try {
      const result = await execFile("sw_vers", ["-productVersion"], { cwd: repositoryRoot, timeout: 5_000 });
      return result.stdout.trim() || os.release();
    } catch {}
  }
  if (process.platform === "win32") {
    try {
      const result = await execFile("cmd.exe", ["/d", "/c", "ver"], { cwd: repositoryRoot, timeout: 5_000 });
      return result.stdout.trim() || os.release();
    } catch {}
  }
  if (process.platform === "linux") {
    try {
      const text = await readFile("/etc/os-release", "utf8");
      const pretty = text.match(/^PRETTY_NAME=(.+)$/m)?.[1]?.replace(/^"|"$/g, "");
      if (pretty) return pretty;
    } catch {}
  }
  return os.release();
}

function windowsTarget() {
  const build = Number(os.release().split(".").at(-1));
  if (!Number.isFinite(build) || build <= 0) return "windows-unknown";
  return build >= 22_000 ? "windows-11" : "windows-10";
}

function platformTarget() {
  if (process.platform === "darwin") return `macos-${os.arch()}`;
  if (process.platform === "linux") return `linux-${os.arch()}`;
  if (process.platform === "win32") return `${windowsTarget()}-${os.arch()}`;
  return `${process.platform}-${os.arch()}`;
}

function platformRole(targetId) {
  if (targetId.startsWith("windows-11-x64")) return "primary-required";
  if (targetId.startsWith("windows-10")) return "legacy-optional";
  if (targetId.startsWith("macos-") || targetId.startsWith("linux-")) return "compatibility-required-for-phase-matrix";
  return "unsupported";
}

function nativeHost() {
  return process.platform === "darwin" || process.platform === "linux" || process.platform === "win32";
}

function supportedMajor(version, expectedRange) {
  const major = Number(String(version ?? "").replace(/^v/, "").split(".")[0]);
  const expectedMajor = Number(String(expectedRange ?? "").match(/(\d+)/)?.[1]);
  return Number.isInteger(major) && Number.isInteger(expectedMajor) && major === expectedMajor;
}

function runtimeVersions(expected, npmVersion, browser, electron) {
  return {
    node: process.version,
    npm: npmVersion,
    playwright: expected.playwrightVersion,
    chromium: {
      version: browser.manifest?.chromiumVersion ?? null,
      revision: browser.manifest?.browserRevision ?? null,
      executable: browser.executablePath,
    },
    electron: {
      version: electron.packageVersion,
      executable: electron.executablePath,
      versionOutput: electron.versionOutput,
      versionMatches: electron.versionMatches,
    },
  };
}

function commandFailureText(command) {
  return `${command?.stdoutSafe ?? ""} ${command?.stderrSafe ?? ""} ${command?.spawnErrorSafe ?? ""}`.toLowerCase();
}

function environmentFailure(command, runtime, concerns = {}) {
  if (concerns.browser === true && runtime.browser.valid === false) return true;
  if (concerns.electron === true && runtime.electron.executablePresent === false) return true;
  const text = commandFailureText(command);
  return /browser_installation|browser_launch|listen eperm|enoent|dns|enotfound|fetch failed|network|sandbox/.test(text);
}

export function classifyDesktopStatus(command, runtime) {
  const desktopEnvironmentBlocked = !runtime.electron.executablePresent
    || !runtime.electron.versionMatches
    || environmentFailure(command, runtime, { browser: true, electron: true });
  return command.exitCode === 0 && command.testResult?.failed === 0
    ? "PASS"
    : desktopEnvironmentBlocked
      ? "ENVIRONMENT_BLOCKED"
      : command.exitCode === null || command.testResult === null || command.testResult === undefined || command.exitCode === 0
        ? "TEST_INFRA_FAILURE"
        : "PRODUCT_FAIL";
}

function subtestStatus(command, predicate) {
  return command?.testResult?.subtests?.find((item) => predicate(item.name))?.status ?? null;
}

function browserAcceptanceStatus(id, commands, runtime, sourceAcceptanceEligible) {
  const verification = commands.find((item) => item.id === "browser-verify");
  const focused = commands.find((item) => item.id === "browser-runtime-focused");
  const relevant = id === "AC-P13-012"
    ? (name) => /service worker policy/i.test(name)
    : (name) => /real chromium saves and restores/i.test(name);
  const testStatus = subtestStatus(focused, relevant);
  if (testStatus === "passed" && verification?.exitCode === 0) {
    if (!sourceAcceptanceEligible) return { status: "ENVIRONMENT_BLOCKED", reason: "The source baseline is not a clean committed acceptance baseline.", command: focused };
    return { status: "PASS", reason: "The registered real-browser test passed after approved runtime verification.", command: focused };
  }
  if (!sourceAcceptanceEligible && (testStatus !== null || verification?.exitCode !== undefined || focused?.exitCode !== undefined)) {
    return { status: "ENVIRONMENT_BLOCKED", reason: "The source baseline is not a clean committed acceptance baseline.", command: focused ?? verification };
  }
  if (testStatus === "failed" && !environmentFailure(focused, runtime, { browser: true }) && verification?.exitCode === 0) return { status: "PRODUCT_FAIL", reason: "The registered browser test executed and failed an application assertion.", command: focused };
  if (runtime.browser.valid === false || verification?.exitCode !== 0 && environmentFailure(verification, runtime, { browser: true }) || focused?.exitCode !== 0 && environmentFailure(focused, runtime, { browser: true })) {
    return { status: "ENVIRONMENT_BLOCKED", reason: runtime.browser.reason ?? verification?.stderrSafe ?? focused?.stderrSafe ?? "Approved Chromium could not execute the registered browser fixture.", command: focused ?? verification };
  }
  if (testStatus === "failed") return { status: "TEST_INFRA_FAILURE", reason: "The browser test failed without a recognized environment-blocker signature.", command: focused };
  return { status: "TEST_INFRA_FAILURE", reason: "The required browser subtest was not observed in the canonical runner output.", command: focused ?? verification };
}

function acceptanceResult(id, status, reason, command, host, versions, evidenceFiles, testResult = null) {
  return {
    acceptanceId: id,
    status,
    hostPlatform: host.platform,
    hostVersion: host.version,
    architecture: host.architecture,
    gitHead: host.gitHead,
    sourceFingerprint: host.sourceFingerprint,
    acceptanceDefinitionHash: host.sourceBaseline.acceptanceDefinitionHash,
    sourceBaselineMatch: host.sourceBaseline.match,
    runtimeVersions: versions,
    command: command?.command ?? "npm run test:phase13:evidence",
    exitCode: command?.exitCode ?? null,
    testResult: testResult ?? command?.testResult ?? null,
    evidenceFiles,
    timestamp: host.timestamp,
    reason,
  };
}

async function gitMetadata() {
  const readGit = async (args) => {
    try {
      const result = await execFile("git", args, { cwd: repositoryRoot, timeout: 10_000 });
      return result.stdout.trim();
    } catch {
      return null;
    }
  };
  const status = await readGit(["status", "--short"]);
  const lines = status === null || status === "" ? [] : status.split(/\r?\n/).filter(Boolean);
  const staged = await readGit(["diff", "--cached", "--name-only"]);
  const unstaged = await readGit(["diff", "--name-only"]);
  const untracked = await readGit(["ls-files", "--others", "--exclude-standard"]);
  return {
    head: await readGit(["rev-parse", "HEAD"]),
    branch: await readGit(["branch", "--show-current"]),
    dirty: lines.length > 0,
    statusLineCount: lines.length,
    stagedCount: staged === null || staged === "" ? 0 : staged.split(/\r?\n/).filter(Boolean).length,
    unstagedCount: unstaged === null || unstaged === "" ? 0 : unstaged.split(/\r?\n/).filter(Boolean).length,
    untrackedCount: untracked === null || untracked === "" ? 0 : untracked.split(/\r?\n/).filter(Boolean).length,
  };
}

async function npmVersion() {
  try {
    const command = resolvePortableCommand("npm", ["--version"]);
    const result = await execFile(command.command, command.args, { ...command.options, timeout: 10_000 });
    return result.stdout.trim();
  } catch {
    return null;
  }
}

async function createHostMetadata(expected, browser, electron, sourceBaseline) {
  const git = await gitMetadata();
  const npm = await npmVersion();
  const version = await hostVersion();
  const targetId = platformTarget();
  return {
    schemaVersion: evidenceSchemaVersion,
    timestamp: new Date().toISOString(),
    gitHead: git.head,
    branch: git.branch,
    dirtyState: {
      dirty: git.dirty,
      statusLineCount: git.statusLineCount,
      stagedCount: git.stagedCount,
      unstagedCount: git.unstagedCount,
      untrackedCount: git.untrackedCount,
    },
    platform: process.platform,
    platformLabel: process.platform === "darwin" ? "macOS" : process.platform === "win32" ? "Windows" : process.platform === "linux" ? "Linux" : process.platform,
    version,
    kernelRelease: os.release(),
    architecture: os.arch(),
    targetId,
    targetRole: platformRole(targetId),
    native: nativeHost(),
    nodeVersion: process.version,
    npmVersion: npm,
    nodeRequirement: expected.node,
    npmRequirement: expected.npm,
    nodeVersionSupported: supportedMajor(process.version, expected.node),
    npmVersionSupported: supportedMajor(npm, expected.npm),
    sourceFingerprint: sourceBaseline.sourceFingerprint,
    sourceBaseline: {
      manifestPath: sourceBaseline.manifestPath,
      lifecycle: sourceBaseline.manifest?.lifecycle ?? null,
      expectedSourceFingerprint: sourceBaseline.expectedSourceFingerprint,
      match: sourceBaseline.match,
      packageLockHash: sourceBaseline.packageLockHash,
      evidenceRunnerHash: sourceBaseline.evidenceRunnerHash,
      acceptanceDefinitionHash: sourceBaseline.acceptanceDefinitionHash,
      validationErrors: sourceBaseline.errors,
      includedFiles: sourceBaseline.includedFiles,
    },
    browserEnvironment: browser.valid ? "VALID_BROWSER_ENVIRONMENT" : "ENVIRONMENT_BLOCKED",
    electronEnvironment: electron.launchable ? "VALID_NATIVE_ENVIRONMENT" : "ENVIRONMENT_BLOCKED",
  };
}

async function createOutputDirectory(requested) {
  if (requested !== null) {
    const target = path.resolve(repositoryRoot, requested);
    await mkdir(path.dirname(target), { recursive: true });
    await mkdir(target, { recursive: false });
    return target;
  }
  await mkdir(evidenceRoot, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-").replace(".", "-");
  const head = (await gitMetadata()).head?.slice(0, 12) ?? "unknown-head";
  for (let index = 0; index < 20; index += 1) {
    const suffix = index === 0 ? "" : `-${index}`;
    const target = path.join(evidenceRoot, `${stamp}-${head}${suffix}`);
    try {
      await mkdir(target, { recursive: false });
      return target;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
  }
  throw new Error("Unable to allocate a unique Phase 13 evidence output directory.");
}

async function writeJson(target, value) {
  await writeFile(target, jsonText(value), { encoding: "utf8", flag: "wx", mode: 0o600 });
}

async function scanFiles(root, relativeFiles) {
  const findings = [];
  let redactions = 0;
  for (const relative of relativeFiles) {
    const target = path.join(root, relative);
    let text;
    try { text = await readFile(target, "utf8"); } catch { continue; }
    for (const item of secretPatterns) if (item.pattern.test(text)) findings.push({ file: relative, patternId: item.id });
    redactions += (text.match(/\[redacted(?:-[^\]]+)?\]/g) ?? []).length;
  }
  return {
    schemaVersion: evidenceSchemaVersion,
    status: findings.length === 0 ? "PASS" : "TEST_INFRA_FAILURE",
    scannedFiles: relativeFiles,
    unauthorizedOccurrences: findings.length,
    findings,
    redactionsAppliedInArtifacts: redactions,
    timestamp: new Date().toISOString(),
  };
}

async function fileEntries(root, relativeFiles) {
  const entries = [];
  for (const relative of relativeFiles) {
    const target = path.join(root, relative);
    const item = await stat(target);
    entries.push({ path: relative, bytes: item.size, sha256: await sha256(target) });
  }
  return entries;
}

async function finalizeBundle(outputDir, payload) {
  const coreFiles = ["environment.json", "runtime.json", "test-results.json", "acceptance-results.json", "matrix-entry.json"];
  for (const [name, value] of Object.entries(payload.files)) await writeJson(path.join(outputDir, name), value);
  let scan = await scanFiles(outputDir, coreFiles);
  await writeJson(path.join(outputDir, "secret-scan.json"), scan);
  let entries = await fileEntries(outputDir, [...coreFiles, "secret-scan.json"]);
  const bundle = {
    schemaVersion: evidenceSchemaVersion,
    kind: "phase13-evidence-bundle",
    timestamp: payload.host.timestamp,
    gitHead: payload.host.gitHead,
    branch: payload.host.branch,
    environmentClassification: payload.environmentClassification,
    phaseStatus: payload.phaseStatus,
    phase14Readiness: payload.phase14Readiness,
    sourceFingerprint: payload.host.sourceFingerprint,
    acceptanceDefinitionHash: payload.host.sourceBaseline.acceptanceDefinitionHash,
    sourceBaselineMatch: payload.host.sourceBaseline.match,
    cleanCommittedSource: payload.host.sourceAcceptanceEligible,
    acceptanceIds: allTrackedAcceptanceIds,
    matrixTargetId: payload.matrix.targetId,
    files: entries,
    secretScan: scan,
    generatedBy: "tools/testing/run-phase13-evidence.mjs",
  };
  await writeJson(path.join(outputDir, "bundle.json"), bundle);
  scan = await scanFiles(outputDir, [...coreFiles, "secret-scan.json", "bundle.json"]);
  if (scan.status !== "PASS" || scan.unauthorizedOccurrences !== bundle.secretScan.unauthorizedOccurrences) {
    await writeFile(path.join(outputDir, "secret-scan.json"), jsonText(scan), { encoding: "utf8", flag: "w", mode: 0o600 });
    entries = await fileEntries(outputDir, [...coreFiles, "secret-scan.json"]);
    bundle.files = entries;
    bundle.secretScan = scan;
    await writeFile(path.join(outputDir, "bundle.json"), jsonText(bundle), { encoding: "utf8", flag: "w", mode: 0o600 });
  }
  return bundle;
}

function allCommandsPassed(commands, ids) {
  return ids.every((id) => commands.find((item) => item.id === id)?.exitCode === 0);
}

async function runEvidence(options) {
  const outputDir = await createOutputDirectory(options.outputDir);
  const expected = await readExpectedRuntime();
  const sourceBaseline = await inspectSourceBaseline(expected);
  const browser = await inspectBrowser(expected);
  const electron = await inspectElectron(expected);
  const host = await createHostMetadata(expected, browser, electron, sourceBaseline);
  host.sourceAcceptanceEligible = host.native && !host.dirtyState.dirty && host.sourceBaseline.match && expected.playwrightVersionMatches;
  const commands = [];
  const runRecorded = async (id, command, displayCommand, timeoutMs) => {
    const result = compactCommand(await runCommand(command.command, command.args, { ...command.options, displayCommand, timeoutMs }));
    commands.push({ id, ...result });
    return result;
  };

  const browserVerify = await runRecorded("browser-verify", resolvePortableCommand("npm", ["run", "browser:verify"]), "npm run browser:verify", 120_000);
  const browserFocused = await runRecorded("browser-runtime-focused", resolvePortableCommand("node", ["tools/testing/run-tests.mjs", "package:browser-runtime"]), "node tools/testing/run-tests.mjs package:browser-runtime", 10 * 60_000);
  const electronVersion = electron.executablePresent
    ? await runRecorded("electron-version", resolveDirectCommand(path.join(repositoryRoot, electron.executablePath), ["--version"]), `${electron.executablePath} --version`, 30_000)
    : { id: "electron-version", command: `${electron.executablePath ?? "node_modules/electron/dist/<platform-binary>"} --version`, exitCode: null, testResult: null, stderrSafe: "Electron binary is missing from the locked package.", redactionsApplied: 0 };
  if (!electron.executablePresent) commands.push(electronVersion);
  const desktopFocused = await runRecorded("desktop-focused", resolvePortableCommand("node", ["tools/testing/run-tests.mjs", "package:desktop"]), "node tools/testing/run-tests.mjs package:desktop", 5 * 60_000);

  if (electron.executablePresent) {
    const versionText = `${electronVersion.stdoutSafe ?? ""}`.trim();
    const expectedVersionOutput = `v${expected.electronVersion}`;
    electron.versionOutput = electronVersion.exitCode === 0 ? redactText(versionText, 200).text : null;
    const versionTokens = versionText.split(/\s+/);
    electron.versionMatches = electronVersion.exitCode === 0 && (versionTokens.includes(expectedVersionOutput) || versionTokens.includes(expected.electronVersion));
    electron.launchable = electron.versionMatches;
    if (!electron.launchable && electron.reason === null) electron.reason = electronVersion.exitCode === 0 ? "ELECTRON_VERSION_MISMATCH" : "ELECTRON_LAUNCH_FAILED";
  }
  const browserStatuses = Object.fromEntries(browserAcceptanceIds.map((id) => [id, browserAcceptanceStatus(id, commands, { browser, electron }, host.sourceAcceptanceEligible)]));
  const focusedBrowserPass = browserAcceptanceIds.every((id) => browserStatuses[id].status === "PASS");
  const focusedDesktopPass = desktopFocused.exitCode === 0 && desktopFocused.testResult?.failed === 0;
  const toolchainPass = host.nodeVersionSupported && host.npmVersionSupported && host.native && expected.playwrightVersionMatches && host.sourceAcceptanceEligible;
  const shouldRunFull = !options.skipFull && options.forceFull || !options.skipFull && focusedBrowserPass && focusedDesktopPass && toolchainPass;
  const fullCommandIds = [];
  if (shouldRunFull) {
    const fullCommands = [
      ["full-regression", resolvePortableCommand("npm", ["test"]), "npm test", 20 * 60_000],
      ["typecheck", resolvePortableCommand("npm", ["run", "typecheck"]), "npm run typecheck", 10 * 60_000],
      ["build", resolvePortableCommand("npm", ["run", "build"]), "npm run build", 10 * 60_000],
      ["lint", resolvePortableCommand("npm", ["run", "lint"]), "npm run lint", 5 * 60_000],
      ["format-check", resolvePortableCommand("npm", ["run", "format:check"]), "npm run format:check", 5 * 60_000],
      ["architecture", resolvePortableCommand("npm", ["run", "test:architecture"]), "npm run test:architecture", 5 * 60_000],
      ["contracts", resolvePortableCommand("npm", ["run", "contracts:check"]), "npm run contracts:check", 5 * 60_000],
      ["migrations", resolvePortableCommand("npm", ["run", "migrations:validate"]), "npm run migrations:validate", 5 * 60_000],
      ["security", resolvePortableCommand("npm", ["run", "security:check"]), "npm run security:check", 5 * 60_000],
      ["docs", resolvePortableCommand("npm", ["run", "docs:validate"]), "npm run docs:validate", 5 * 60_000],
      ["okf", resolvePortableCommand("npm", ["run", "okf:validate"]), "npm run okf:validate", 5 * 60_000],
      ["okf-tests", resolvePortableCommand("npm", ["run", "test:okf"]), "npm run test:okf", 10 * 60_000],
    ];
    for (const [id, command, display, timeoutMs] of fullCommands) {
      await runRecorded(id, command, display, timeoutMs);
      fullCommandIds.push(id);
    }
  }
  const fullRegression = {
    executed: shouldRunFull,
    commandIds: fullCommandIds,
    reason: shouldRunFull ? null : "Full regression is run only after focused browser, Electron, and toolchain preconditions pass; use --force-full for diagnostic execution.",
  };
  const versions = runtimeVersions(expected, host.npmVersion, browser, electron);
  const environmentClassification = !host.native
    ? "INVALID_FOR_ACCEPTANCE"
    : !toolchainPass
      ? "ENVIRONMENT_BLOCKED"
      : browser.valid && browserVerify.exitCode === 0 && electron.launchable
        ? "VALID_NATIVE_ENVIRONMENT"
        : browser.valid && browserVerify.exitCode === 0
          ? "VALID_BROWSER_ENVIRONMENT"
          : "ENVIRONMENT_BLOCKED";
  host.browserEnvironment = browser.valid && browserVerify.exitCode === 0 ? "VALID_BROWSER_ENVIRONMENT" : "ENVIRONMENT_BLOCKED";
  host.electronEnvironment = electron.launchable ? "VALID_NATIVE_ENVIRONMENT" : "ENVIRONMENT_BLOCKED";
  host.environmentClassification = environmentClassification;
  const evidenceFiles = (source) => ["environment.json", "runtime.json", "test-results.json", "acceptance-results.json", "matrix-entry.json", source];
  const acceptanceResults = [];
  for (const id of browserAcceptanceIds) {
    const result = browserStatuses[id];
    acceptanceResults.push(acceptanceResult(id, result.status, result.reason, result.command, host, versions, evidenceFiles(id === "AC-P13-012" ? "tests/browser/service-worker-policy.test.ts" : "tests/browser/session.test.ts")));
  }
  for (const id of carryOverAcceptanceIds) {
    const source = "tests/browser/session.test.ts";
    const sourceResult = browserStatuses["AC-P13-002"];
    acceptanceResults.push(acceptanceResult(id, sourceResult.status, `This carry-over row reuses the same real headed/fresh-context Session evidence: ${sourceResult.reason}`, sourceResult.command, host, versions, evidenceFiles(source)));
  }
  const desktopStatus = classifyDesktopStatus(desktopFocused, runtimeFromInspection(browser, electron));
  const fullGatePass = shouldRunFull && allCommandsPassed(commands, fullCommandIds);
  const fullFailures = commands.filter((item) => fullCommandIds.includes(item.id) && item.exitCode !== 0);
  const fullProductFailure = fullFailures.some((item) => item.exitCode !== null && item.testResult !== null && !environmentFailure(item, { browser, electron }));
  const fullTestInfrastructureFailure = fullFailures.some((item) => (item.exitCode === null || item.testResult === null) && !environmentFailure(item, { browser, electron }));
  const matrixStatus = host.sourceAcceptanceEligible && browserAcceptanceIds.every((id) => browserStatuses[id].status === "PASS") && desktopStatus === "PASS" && fullGatePass
    ? "PASS"
    : desktopStatus === "PRODUCT_FAIL" || browserAcceptanceIds.some((id) => browserStatuses[id].status === "PRODUCT_FAIL") || fullProductFailure
      ? "PRODUCT_FAIL"
      : desktopStatus === "TEST_INFRA_FAILURE" || browserAcceptanceIds.some((id) => browserStatuses[id].status === "TEST_INFRA_FAILURE") || fullTestInfrastructureFailure
        ? "TEST_INFRA_FAILURE"
      : environmentClassification === "INVALID_FOR_ACCEPTANCE"
        ? "INVALID_FOR_ACCEPTANCE"
        : "ENVIRONMENT_BLOCKED";
  const matrix = {
    schemaVersion: evidenceSchemaVersion,
    matrixEntryId: `${host.targetId}:${host.gitHead}`,
    targetId: host.targetId,
    targetRole: host.targetRole,
    platform: host.platform,
    platformLabel: host.platformLabel,
    hostVersion: host.version,
    architecture: host.architecture,
    native: host.native,
    environmentClassification,
    status: matrixStatus,
    gitHead: host.gitHead,
    sourceFingerprint: host.sourceFingerprint,
    acceptanceDefinitionHash: host.sourceBaseline.acceptanceDefinitionHash,
    sourceBaselineMatch: host.sourceBaseline.match,
    sourceAcceptanceEligible: host.sourceAcceptanceEligible,
    runtimeVersions: versions,
    acceptanceIds: browserAcceptanceIds,
    commandIds: ["browser-verify", "browser-runtime-focused", "electron-version", "desktop-focused", ...fullCommandIds],
    blockers: matrixStatus === "PASS" ? [] : [
      ...(browser.valid ? [] : [browser.reason]),
      ...(electron.executablePresent ? [] : [electron.reason]),
      ...(electron.versionMatches === false ? [electron.reason] : []),
      ...(host.npmVersionSupported ? [] : ["The repository requires npm 11; this host does not satisfy the declared engine range."]),
      ...(expected.playwrightVersionMatches ? [] : ["The installed Playwright version does not match the package contract."]),
      ...(host.dirtyState.dirty ? ["DIRTY_SOURCE_TREE"] : []),
      ...(host.sourceBaseline.match ? [] : ["SOURCE_BASELINE_MISMATCH"]),
      ...(matrixStatus === "ENVIRONMENT_BLOCKED" ? ["AC-P13-016 is aggregate-only and requires validated bundles from the required native matrix."] : []),
    ].filter(Boolean),
    timestamp: host.timestamp,
  };
  acceptanceResults.push(acceptanceResult(
    "AC-P13-016",
    matrixStatus === "PASS" ? "ENVIRONMENT_BLOCKED" : matrixStatus,
    matrixStatus === "PASS" ? "This bundle proves one native matrix row; aggregate AC-P13-016 still requires reconciliation across the required platforms." : matrix.blockers.join(" ") || "The native matrix row did not complete.",
    commands.find((item) => item.id === "desktop-focused"),
    host,
    versions,
    evidenceFiles("matrix-entry.json"),
    { status: matrixStatus, commandIds: matrix.commandIds, blockers: matrix.blockers },
  ));
  const phaseStatus = "PARTIAL";
  const phase14Readiness = "PHASE_14_BLOCKED";
  const testResults = {
    schemaVersion: evidenceSchemaVersion,
    timestamp: host.timestamp,
    gitHead: host.gitHead,
    sourceFingerprint: host.sourceFingerprint,
    acceptanceDefinitionHash: host.sourceBaseline.acceptanceDefinitionHash,
    commands,
    focusedCommandIds: ["browser-verify", "browser-runtime-focused", "electron-version", "desktop-focused"],
    fullRegression,
    totals: commands.filter((item) => item.testResult !== null).map((item) => ({ commandId: item.id, ...item.testResult })),
  };
  const runtime = {
    schemaVersion: evidenceSchemaVersion,
    timestamp: host.timestamp,
    gitHead: host.gitHead,
    expected: {
      node: expected.node,
      npm: expected.npm,
      playwright: expected.playwrightVersion,
      chromium: expected.chromium,
      electron: expected.electronVersion,
    },
    observed: {
      node: process.version,
      npm: host.npmVersion,
      playwright: expected.installedPlaywrightVersion,
      browser,
      electron,
    },
    sourceBaseline: host.sourceBaseline,
    provisioning: {
      chromiumCommand: "npm run browser:install",
      chromiumVerificationCommand: "npm run browser:verify",
      electronCommand: "node node_modules/electron/install.js",
      systemBrowserFallback: false,
      offlineArtifactImport: "not-supported; only the official Playwright artifact and verified manifest are accepted",
    },
  };
  const bundle = await finalizeBundle(outputDir, {
    host,
    matrix,
    environmentClassification,
    phaseStatus,
    phase14Readiness,
    files: {
      "environment.json": host,
      "runtime.json": runtime,
      "test-results.json": testResults,
      "acceptance-results.json": {
        schemaVersion: evidenceSchemaVersion,
        timestamp: host.timestamp,
        gitHead: host.gitHead,
        sourceFingerprint: host.sourceFingerprint,
        acceptanceDefinitionHash: host.sourceBaseline.acceptanceDefinitionHash,
        results: acceptanceResults,
      },
      "matrix-entry.json": matrix,
    },
  });
  process.stdout.write(`Phase 13 evidence bundle: ${relativeRepositoryPath(outputDir)}\n`);
  process.stdout.write(`Phase status: ${phaseStatus}; Phase 14 readiness: ${phase14Readiness}\n`);
  for (const row of acceptanceResults.filter((item) => mandatoryAcceptanceIds.includes(item.acceptanceId))) process.stdout.write(`${row.acceptanceId}: ${row.status}\n`);
  const executedFailure = browserAcceptanceIds.some((id) => browserStatuses[id].status !== "PASS") || desktopStatus !== "PASS" || (shouldRunFull && !fullGatePass) || bundle.secretScan.status !== "PASS";
  return { outputDir, bundle, exitCode: executedFailure ? 1 : 0 };
}

function runtimeFromInspection(browser, electron) {
  return { browser, electron };
}

async function loadBundle(bundlePath) {
  const target = path.resolve(process.cwd(), bundlePath);
  const directory = path.basename(target) === "bundle.json" ? path.dirname(target) : target;
  const errors = [];
  const read = async (name) => {
    try { return await readJsonFile(path.join(directory, name)); }
    catch (error) { errors.push(`${name}: ${error instanceof Error ? error.message : "unreadable JSON"}`); return null; }
  };
  const bundle = await read("bundle.json");
  const environment = await read("environment.json");
  const runtime = await read("runtime.json");
  const testResults = await read("test-results.json");
  const acceptance = await read("acceptance-results.json");
  const matrix = await read("matrix-entry.json");
  const secretScan = await read("secret-scan.json");
  if (!isRecord(bundle) || bundle.schemaVersion !== evidenceSchemaVersion || bundle.kind !== "phase13-evidence-bundle") errors.push("bundle.json: unsupported bundle schema or kind");
  const gitHead = bundle?.gitHead;
  if (typeof gitHead !== "string" || !/^[0-9a-f]{40}$/i.test(gitHead)) errors.push("bundle.json: gitHead must be a full commit hash");
  if (!isIsoTimestamp(bundle?.timestamp)) errors.push("bundle.json: timestamp is missing or invalid");
  const sourceFingerprint = bundle?.sourceFingerprint;
  const acceptanceDefinitionHash = bundle?.acceptanceDefinitionHash;
  if (!/^[0-9a-f]{64}$/i.test(sourceFingerprint ?? "")) errors.push("bundle.json: sourceFingerprint must be a SHA-256 value");
  if (!/^[0-9a-f]{64}$/i.test(acceptanceDefinitionHash ?? "")) errors.push("bundle.json: acceptanceDefinitionHash must be a SHA-256 value");
  if (typeof bundle?.sourceBaselineMatch !== "boolean" || typeof bundle?.cleanCommittedSource !== "boolean") errors.push("bundle.json: source-baseline eligibility metadata is missing");
  if (!isRecord(environment) || environment.gitHead !== gitHead || !isIsoTimestamp(environment?.timestamp)) errors.push("environment.json: git/timestamp metadata is inconsistent");
  if (environment?.sourceFingerprint !== sourceFingerprint || environment?.sourceBaseline?.acceptanceDefinitionHash !== acceptanceDefinitionHash) errors.push("environment.json: source fingerprint metadata is inconsistent");
  if (!isRecord(runtime) || runtime.gitHead !== gitHead || runtime.sourceBaseline?.acceptanceDefinitionHash !== acceptanceDefinitionHash) errors.push("runtime.json: git/source metadata is inconsistent");
  if (!isRecord(testResults) || testResults.gitHead !== gitHead || testResults.sourceFingerprint !== sourceFingerprint || testResults.acceptanceDefinitionHash !== acceptanceDefinitionHash || !Array.isArray(testResults.commands)) errors.push("test-results.json: command/source ledger is missing or inconsistent");
  if (!isRecord(acceptance) || acceptance.gitHead !== gitHead || acceptance.sourceFingerprint !== sourceFingerprint || acceptance.acceptanceDefinitionHash !== acceptanceDefinitionHash || !Array.isArray(acceptance.results)) errors.push("acceptance-results.json: results/source metadata are missing or inconsistent");
  if (!isRecord(matrix) || matrix.gitHead !== gitHead || matrix.sourceFingerprint !== sourceFingerprint || matrix.acceptanceDefinitionHash !== acceptanceDefinitionHash || typeof matrix.sourceAcceptanceEligible !== "boolean" || typeof matrix.targetId !== "string") errors.push("matrix-entry.json: target/source metadata is missing or inconsistent");
  if (!isRecord(secretScan) || secretScan.status !== "PASS" || secretScan.unauthorizedOccurrences !== 0) errors.push("secret-scan.json: the artifact scan did not pass with zero unauthorized occurrences");
  const results = Array.isArray(acceptance?.results) ? acceptance.results : [];
  const ids = new Set(results.map((item) => item?.acceptanceId));
  for (const id of allTrackedAcceptanceIds) if (!ids.has(id)) errors.push(`acceptance-results.json: missing ${id}`);
  if (ids.size !== results.length) errors.push("acceptance-results.json: duplicate acceptance IDs are not allowed");
  for (const item of results) {
    if (!isRecord(item) || !allTrackedAcceptanceIds.includes(item.acceptanceId)) { errors.push("acceptance-results.json: unknown or malformed acceptance result"); continue; }
    if (!allowedAcceptanceStatuses.has(item.status)) errors.push(`${item.acceptanceId}: unsupported status '${item.status}'`);
    if (item.gitHead !== gitHead || item.sourceFingerprint !== sourceFingerprint || item.acceptanceDefinitionHash !== acceptanceDefinitionHash || typeof item.sourceBaselineMatch !== "boolean" || !isIsoTimestamp(item.timestamp) || typeof item.command !== "string" || item.command.length === 0) errors.push(`${item.acceptanceId}: execution/source metadata is incomplete`);
    if (item.status === "PASS" && (item.exitCode !== 0 || item.testResult === null || item.testResult === undefined)) errors.push(`${item.acceptanceId}: PASS requires an executed zero-exit command and test result`);
    if (!Array.isArray(item.evidenceFiles) || !item.evidenceFiles.includes("test-results.json")) errors.push(`${item.acceptanceId}: evidenceFiles must include test-results.json`);
  }
  for (const name of requiredBundleFiles) {
    try { await access(path.join(directory, name)); } catch { errors.push(`bundle: required file '${name}' is missing`); }
  }
  if (Array.isArray(bundle?.files)) {
    for (const entry of bundle.files) {
      if (!isRecord(entry) || typeof entry.path !== "string" || !requiredBundleFiles.includes(entry.path)) { errors.push("bundle.json: file index contains an invalid entry"); continue; }
      try {
        const item = await stat(path.join(directory, entry.path));
        if (item.size !== entry.bytes || await sha256(path.join(directory, entry.path)) !== entry.sha256) errors.push(`bundle.json: integrity mismatch for ${entry.path}`);
      } catch { errors.push(`bundle.json: indexed file is missing: ${entry.path}`); }
    }
  }
  return { valid: errors.length === 0, errors, directory, bundle, environment, runtime, testResults, acceptance, matrix, secretScan };
}

function aggregateTarget(entries, prefix) {
  return entries.find((item) => item.matrix?.targetId?.startsWith(prefix) && item.matrix.status === "PASS") ?? null;
}

async function reconcileBundles(bundlePaths, outputPath) {
  if (bundlePaths.length === 0) throw new Error("reconcile requires at least one evidence bundle directory.");
  const loaded = [];
  for (const bundlePath of bundlePaths) loaded.push(await loadBundle(bundlePath));
  const errors = loaded.flatMap((item, index) => item.errors.map((error) => `bundle[${index}]: ${error}`));
  const heads = new Set(loaded.map((item) => item.bundle?.gitHead).filter(Boolean));
  if (heads.size !== 1) errors.push("All native evidence bundles must use the same Git HEAD.");
  const sourceFingerprints = new Set(loaded.map((item) => item.bundle?.sourceFingerprint).filter(Boolean));
  if (sourceFingerprints.size !== 1) errors.push("All native evidence bundles must use the same source fingerprint.");
  const acceptanceDefinitionHashes = new Set(loaded.map((item) => item.bundle?.acceptanceDefinitionHash).filter(Boolean));
  if (acceptanceDefinitionHashes.size !== 1) errors.push("All native evidence bundles must use the same acceptance-definition hash.");
  if (loaded.some((item) => item.bundle?.sourceBaselineMatch !== true || item.bundle?.cleanCommittedSource !== true || item.matrix?.sourceAcceptanceEligible !== true)) errors.push("Dirty or source-mismatched evidence cannot satisfy final Phase 13 reconciliation.");
  const targetIds = loaded.map((item) => item.matrix?.targetId).filter((item) => typeof item === "string");
  if (new Set(targetIds).size !== targetIds.length) errors.push("Duplicate native matrix target IDs are not accepted.");
  const windows = aggregateTarget(loaded, "windows-11-x64");
  const linux = aggregateTarget(loaded, "linux-");
  const macos = aggregateTarget(loaded, "macos-");
  const missingTargets = [windows === null ? "windows-11-x64" : null, linux === null ? "linux-native" : null, macos === null ? "macos-native" : null].filter(Boolean);
  if (missingTargets.length > 0) errors.push(`Required native matrix evidence is missing: ${missingTargets.join(", ")}.`);
  const allNativeRowsPass = [windows, linux, macos].every((item) => item !== null);
  const status = errors.length === 0 && allNativeRowsPass ? "PASS" : "ENVIRONMENT_BLOCKED";
  const gitHead = heads.size === 1 ? [...heads][0] : null;
  const timestamp = new Date().toISOString();
  const result = {
    schemaVersion: evidenceSchemaVersion,
    kind: "phase13-evidence-reconciliation",
    timestamp,
    gitHead,
    sourceFingerprint: sourceFingerprints.size === 1 ? [...sourceFingerprints][0] : null,
    acceptanceDefinitionHash: acceptanceDefinitionHashes.size === 1 ? [...acceptanceDefinitionHashes][0] : null,
    status,
    phaseStatus: status === "PASS" ? "COMPLETE" : "PARTIAL",
    phase14Readiness: status === "PASS" ? "PHASE_14_READY" : "PHASE_14_BLOCKED",
    bundles: loaded.map((item) => ({ directory: relativeRepositoryPath(item.directory), valid: item.valid, targetId: item.matrix?.targetId ?? null, status: item.matrix?.status ?? null })),
    matrix: {
      required: ["windows-11-x64", "linux-native", "macos-native"],
      observed: targetIds,
      optional: ["windows-10-x64"],
      missing: missingTargets,
      windows10Observed: loaded.some((item) => item.matrix?.targetId?.startsWith("windows-10-x64")),
    },
    acceptanceIds: mandatoryAcceptanceIds,
    errors,
    noAutomaticMatrixMutation: true,
  };
  const target = outputPath === null ? path.join(evidenceRoot, `reconciliation-${timestamp.replaceAll(":", "-").replace(".", "-")}.json`) : path.resolve(repositoryRoot, outputPath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, jsonText(result), { encoding: "utf8", flag: "wx", mode: 0o600 });
  process.stdout.write(`Phase 13 reconciliation: ${normalizedRepositoryPath(target)}\n`);
  process.stdout.write(`Status: ${status}; Phase 14 readiness: ${result.phase14Readiness}\n`);
  if (errors.length > 0) for (const error of errors) process.stdout.write(`- ${error}\n`);
  return { outputPath: target, result, exitCode: status === "PASS" ? 0 : 1 };
}

function normalizedRepositoryPath(target) {
  const relative = path.relative(repositoryRoot, target);
  return relative.startsWith("..") || path.isAbsolute(relative) ? normalizedPath(target) : normalizedPath(relative);
}

function parseArguments(args) {
  const operation = args[0] === "run" || args[0] === "validate" || args[0] === "reconcile" ? args[0] : "run";
  const remaining = operation === "run" && args[0] !== "run" ? args : args.slice(1);
  const options = { operation, outputDir: null, forceFull: false, skipFull: false, bundlePaths: [] };
  for (let index = 0; index < remaining.length; index += 1) {
    const arg = remaining[index];
    if (arg === "--output-dir" || arg === "--output") {
      options.outputDir = remaining[++index];
      if (!options.outputDir) throw new Error(`${arg} requires a path.`);
    } else if (arg === "--force-full") options.forceFull = true;
    else if (arg === "--skip-full") options.skipFull = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (operation === "validate" || operation === "reconcile") options.bundlePaths.push(arg);
    else throw new Error(`Unknown argument '${arg}'.`);
  }
  return options;
}

function help() {
  return [
    "Usage:",
    "  npm run test:phase13:evidence [-- --output-dir PATH] [--force-full] [--skip-full]",
    "  node tools/testing/run-phase13-evidence.mjs validate BUNDLE_DIR",
    "  node tools/testing/run-phase13-evidence.mjs reconcile BUNDLE_DIR... [--output PATH]",
    "",
    "The run command verifies the repository-owned Chromium/Electron runtimes, executes the focused browser and Desktop suites, and runs full regression/quality gates only after focused preconditions pass.",
    "The runner never installs a system browser, writes raw Storage State, or mutates the Acceptance Matrix.",
  ].join("\n");
}

export async function main(args = process.argv.slice(2)) {
  try {
    const options = parseArguments(args);
    if (options.help) { process.stdout.write(`${help()}\n`); return 0; }
    if (options.operation === "validate") {
      if (options.bundlePaths.length !== 1) throw new Error("validate requires exactly one evidence bundle directory.");
      const result = await loadBundle(options.bundlePaths[0]);
      process.stdout.write(`Evidence bundle: ${normalizedRepositoryPath(result.directory)}\n`);
      process.stdout.write(`Validation: ${result.valid ? "PASS" : "FAIL"}\n`);
      for (const error of result.errors) process.stdout.write(`- ${error}\n`);
      return result.valid ? 0 : 1;
    }
    if (options.operation === "reconcile") return (await reconcileBundles(options.bundlePaths.filter((item) => item !== options.outputDir), options.outputDir)).exitCode;
    return (await runEvidence(options)).exitCode;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.stderr.write(`${help()}\n`);
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await main();
