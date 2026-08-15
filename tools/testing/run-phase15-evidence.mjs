import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const evidenceRoot = path.join(repositoryRoot, ".artifacts", "phase15-evidence");
const schemaVersion = "1.0.0";
const contractVersion = "1.11.0";
const sqliteSchemaVersion = 10;
const projectSchemaVersion = 10;
const phase14Bundle = ".artifacts/phase14-evidence/final-native-windows-11-x64";
const sensitivePatterns = [
  { id: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i },
  { id: "bearer-credential", pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i },
  { id: "named-sensitive-value", pattern: /\b(?:phone|otp|password|token|secret|cookie|authorization|proxy-authorization)\s*[:=]\s*(?!\[redacted\])[^\s,;}]+/i },
  { id: "proxy-canary", pattern: /(?:proxy-password-sentinel|proxy-user-sentinel|ephemeral-pass)/i },
  { id: "phone-like-value", pattern: /\+\d[\d .()\-]{8,}\d/ },
];
const commandDefinitions = [
  ["full", "test"],
  ["unit", "test:unit"],
  ["integration", "test:integration"],
  ["browser", "test:browser"],
  ["browser-proxy", "__node__", "tools/testing/run-tests.mjs", "package:browser-runtime"],
  ["application-proxy", "__node__", "tools/testing/run-tests.mjs", "package:application-service"],
  ["persistence-proxy", "__node__", "tools/testing/run-tests.mjs", "package:persistence-sqlite"],
  ["build", "build"],
  ["typecheck", "typecheck"],
  ["lint", "lint"],
  ["format", "format:check"],
  ["architecture", "test:architecture"],
  ["contracts", "contracts:check"],
  ["migrations", "migrations:validate"],
  ["project-format", "project-format:validate"],
  ["browser-verify", "browser:verify"],
  ["security", "security:check"],
  ["secret-leakage", "test:secret-leakage"],
  ["docs", "docs:validate"],
  ["okf", "okf:validate"],
];
const requiredCommandIds = ["phase14-baseline", ...commandDefinitions.map(([id]) => id)];

function normalizedPath(value) { return String(value).replaceAll("\\", "/"); }
function repositoryPath(value) {
  const absolute = path.resolve(repositoryRoot, value);
  const relative = path.relative(repositoryRoot, absolute);
  return relative.startsWith("..") || path.isAbsolute(relative) ? normalizedPath(absolute) : normalizedPath(relative);
}
function npmInvocation(args) {
  const npmExecPath = process.env.npm_execpath;
  if (typeof npmExecPath === "string" && path.isAbsolute(npmExecPath) && path.basename(npmExecPath).toLowerCase() === "npm-cli.js") return { command: process.execPath, args: [npmExecPath, ...args] };
  if (process.platform === "win32") return { command: process.execPath, args: [path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), ...args] };
  return { command: "npm", args };
}
function commandPlan(definition) {
  if (definition[1] === "__node__") return { command: process.execPath, args: [path.join(repositoryRoot, definition[2]), ...definition.slice(3)] };
  const invocation = npmInvocation(["run", definition[1]]);
  return invocation;
}
function invocationText(invocation) { return `${invocation.command} ${invocation.args.map((value) => JSON.stringify(value)).join(" ")}`; }
function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    let stdout = "";
    let stderr = "";
    let spawnError = null;
    let timedOut = false;
    let child;
    try {
      child = spawn(command, args, { cwd: repositoryRoot, env: { ...process.env, OWAB_LOG_LEVEL: "error", OWAB_TEST_MODE: "1" }, stdio: ["ignore", "pipe", "pipe"], windowsHide: process.platform === "win32" });
    } catch (error) {
      resolve({ command, args, exitCode: null, signal: null, durationMs: Date.now() - started, spawnError: String(error?.message ?? error), timedOut, stdout, stderr });
      return;
    }
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    const timeout = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); }, options.timeoutMs ?? 20 * 60_000);
    child.once("error", (error) => { spawnError = String(error?.message ?? error); });
    child.once("close", (exitCode, signal) => { clearTimeout(timeout); resolve({ command, args, exitCode, signal, durationMs: Date.now() - started, spawnError, timedOut, stdout, stderr }); });
  });
}
function redact(text) {
  return String(text ?? "")
    .replace(/(\b(?:phone|otp|password|token|secret|cookie|authorization|proxy-authorization)\s*[:=]\s*)([^\s,;}]+)/gi, "$1[redacted]")
    .replace(/proxy-(?:password|user)-sentinel|ephemeral-pass/gi, "[redacted-proxy-canary]")
    .replace(/\+\d[\d .()\-]{8,}\d/g, "[redacted-phone]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, "Bearer [redacted]");
}
function scanSensitive(text) { return sensitivePatterns.flatMap(({ id, pattern }) => pattern.test(text) ? [id] : []); }
function resultSummary(raw) {
  const output = `${raw.stdout}\n${raw.stderr}`;
  const tests = output.match(/^(?:#|ℹ)\s*tests\s+(\d+)$/m)?.[1];
  const passed = output.match(/^(?:#|ℹ)\s*pass\s+(\d+)$/m)?.[1];
  const failed = output.match(/^(?:#|ℹ)\s*fail\s+(\d+)$/m)?.[1];
  return {
    status: raw.exitCode === 0 && raw.spawnError === null && !raw.timedOut ? "PASS" : "FAIL",
    exitCode: raw.exitCode,
    signal: raw.signal ?? null,
    durationMs: raw.durationMs,
    timedOut: raw.timedOut,
    spawnError: raw.spawnError === null ? null : redact(raw.spawnError),
    testCounts: tests === undefined ? null : { total: Number(tests), passed: Number(passed ?? 0), failed: Number(failed ?? 0) },
    safeOutputTail: redact(output).trim().split(/\r?\n/).filter(Boolean).slice(-8).join(" | ").slice(0, 2_000),
  };
}
async function gitFacts() {
  const branch = await run("git", ["branch", "--show-current"], { timeoutMs: 30_000 });
  const head = await run("git", ["rev-parse", "HEAD"], { timeoutMs: 30_000 });
  const status = await run("git", ["status", "--porcelain"], { timeoutMs: 30_000 });
  return { branch: branch.stdout.trim() || null, head: head.stdout.trim() || null, workingTreeClean: status.stdout.trim().length === 0, changedFiles: status.stdout.trim().split(/\r?\n/).filter(Boolean).map((line) => line.slice(3)).slice(0, 200) };
}
async function readJson(target) { return JSON.parse(await readFile(target, "utf8")); }
async function environmentFacts() {
  const packageJson = await readJson(path.join(repositoryRoot, "package.json"));
  const npmVersionInvocation = npmInvocation(["--version"]);
  const npmVersion = await run(npmVersionInvocation.command, npmVersionInvocation.args, { timeoutMs: 30_000 });
  let browserManifest = null;
  try { browserManifest = await readJson(path.join(repositoryRoot, ".runtime", "browsers", "browser-manifest.json")); } catch { browserManifest = null; }
  return {
    os: process.platform,
    osVersion: os.version(),
    architecture: process.arch,
    node: process.version,
    npm: npmVersion.exitCode === 0 ? npmVersion.stdout.trim() : "unknown",
    electron: packageJson.devDependencies?.electron ?? null,
    playwright: packageJson.dependencies?.["playwright-core"] ?? null,
    chromium: browserManifest === null ? null : { version: browserManifest.chromiumVersion ?? null, revision: browserManifest.browserRevision ?? null, provider: browserManifest.provider ?? null, source: browserManifest.source ?? null },
    browserManifestPresent: browserManifest !== null,
    supportedNativeBaseline: process.platform === "win32" && process.arch === "x64" && browserManifest !== null && browserManifest.provider === "playwright-core" && browserManifest.source === "official-playwright",
  };
}
function parseArguments(args) {
  const operation = args[0] === "run" || args[0] === "validate" ? args[0] : "run";
  const remaining = operation === "run" && args[0] !== "run" ? args : args.slice(1);
  const options = { operation, outputDir: null, phase14Bundle: phase14Bundle };
  for (let index = 0; index < remaining.length; index += 1) {
    const arg = remaining[index];
    if (arg === "--output-dir") options.outputDir = remaining[++index] ?? null;
    else if (arg === "--phase14-bundle") options.phase14Bundle = remaining[++index] ?? null;
    else if (operation === "validate" && options.outputDir === null) options.outputDir = arg;
    else throw new Error(`Unknown argument '${arg}'.`);
  }
  return options;
}
function commandById(commands, id) { return commands.find((item) => item?.id === id); }
function commandPassed(commands, id) { return commandById(commands, id)?.status === "PASS" && commandById(commands, id)?.exitCode === 0; }
function acceptanceResults(commands, environment, phase14Pass) {
  const proxy = commandPassed(commands, "browser-proxy");
  const app = commandPassed(commands, "application-proxy");
  const persistence = commandPassed(commands, "persistence-proxy");
  const security = commandPassed(commands, "security") && commandPassed(commands, "secret-leakage");
  const docs = commandPassed(commands, "docs") && commandPassed(commands, "okf");
  const full = commandPassed(commands, "full");
  const migration = commandPassed(commands, "migrations") && persistence;
  return {
    "AC-P15-001": proxy ? "PASS" : "FAIL",
    "AC-P15-002": proxy ? "PASS" : "FAIL",
    "AC-P15-003": proxy ? "PASS" : "FAIL",
    "AC-P15-004": app && persistence ? "PASS" : "FAIL",
    "AC-P15-005": app ? "PASS" : "FAIL",
    "AC-P15-006": app && security ? "PASS" : "FAIL",
    "AC-P15-007": proxy && app ? "PASS" : "FAIL",
    "AC-P15-008": app && persistence ? "PASS" : "FAIL",
    "AC-P15-009": app ? "PASS" : "FAIL",
    "AC-P15-010": app ? "PASS" : "FAIL",
    "AC-P15-011": proxy && app ? "PASS" : "FAIL",
    "AC-P15-012": proxy && app ? "PASS" : "FAIL",
    "AC-P15-013": app ? "PASS" : "FAIL",
    "AC-P15-014": security ? "PASS" : "FAIL",
    "AC-P15-015": migration && phase14Pass ? "PASS" : "FAIL",
    "AC-P15-016": full ? "PASS" : "FAIL",
    "AC-P15-017": proxy && environment.supportedNativeBaseline ? "PASS" : "FAIL",
    "AC-P15-018": docs && commandPassed(commands, "contracts") && commandPassed(commands, "typecheck") ? "PASS" : "FAIL",
  };
}
async function runEvidence(options) {
  const before = await gitFacts();
  const environment = await environmentFacts();
  const phase14Path = path.resolve(repositoryRoot, options.phase14Bundle ?? phase14Bundle);
  const phase14Invocation = { command: process.execPath, args: [path.join(repositoryRoot, "tools", "testing", "run-phase14-evidence.mjs"), "validate", phase14Path] };
  const phase14Raw = await run(phase14Invocation.command, phase14Invocation.args);
  const phase14Result = { id: "phase14-baseline", invocation: invocationText(phase14Invocation), ...resultSummary(phase14Raw), bundlePath: repositoryPath(phase14Path) };
  const commands = [phase14Result];
  const sensitiveFindings = [];
  for (const definition of commandDefinitions) {
    const invocation = commandPlan(definition);
    const raw = await run(invocation.command, invocation.args);
    const findings = [...new Set([...scanSensitive(raw.stdout), ...scanSensitive(raw.stderr)])];
    if (findings.length > 0) sensitiveFindings.push({ command: definition[0], patternIds: findings });
    commands.push({ id: definition[0], script: definition[1] === "__node__" ? null : definition[1], invocation: invocationText(invocation), ...resultSummary(raw) });
  }
  const after = await gitFacts();
  const phase14Pass = phase14Result.status === "PASS" && phase14Result.exitCode === 0;
  const acceptance = acceptanceResults(commands, environment, phase14Pass);
  const validationPass = commands.every((item) => item.status === "PASS" && item.exitCode === 0) && sensitiveFindings.length === 0;
  const promotionPass = validationPass && environment.supportedNativeBaseline && before.workingTreeClean && after.workingTreeClean && before.head === after.head && Object.values(acceptance).every((value) => value === "PASS");
  const timestamp = new Date().toISOString();
  const shortHead = typeof after.head === "string" ? after.head.slice(0, 12) : "unknown-head";
  const directory = options.outputDir === null ? path.join(evidenceRoot, `${timestamp.replace(/[:.]/g, "-")}-${shortHead}`) : path.resolve(repositoryRoot, options.outputDir);
  await mkdir(directory, { recursive: true });
  const summary = {
    schemaVersion,
    kind: "phase15-evidence-bundle",
    phase: 15,
    phaseStatus: promotionPass ? "COMPLETE" : validationPass ? "PARTIAL" : "FAIL",
    validationStatus: validationPass ? "PASS" : "FAIL",
    releasePromotionStatus: promotionPass ? "PASS" : "BLOCKED",
    contractVersion,
    sqliteSchemaVersion,
    projectSchemaVersion,
    timestamp,
    repository: { starting: before, ...after, headAtStart: before.head, headAfterRun: after.head, cleanAtStart: before.workingTreeClean, cleanAfterRun: after.workingTreeClean },
    environment,
    phase14Baseline: phase14Result,
    commands,
    sensitiveScan: { status: sensitiveFindings.length === 0 ? "PASS" : "FAIL", unauthorizedOccurrences: sensitiveFindings.length, findings: sensitiveFindings, policy: "Proxy usernames, passwords, credential URLs, session state, OTP, phone, token, cookie, and authorization values are absent from evidence output." },
    acceptance,
    phase16Boundary: { workerScheduling: "not implemented", weightedRoundRobin: "not implemented", rateLimitOrchestration: "not implemented", proxyRotation: "not implemented", circuitBreaker: "not implemented" },
    notes: ["Phase 15 owns proxy metadata, Secret Store references, connectivity testing, health/cooldown, eligibility, and Session Affinity fail-closed behavior.", "The HTTPS protocol fixture uses a generated local certificate and a test-only Chromium trust flag gated by OWAB_TEST_MODE; production Browser Runtime remains strict by default.", "Phase 15 does not implement Worker Pool scheduling, rate-limit orchestration, proxy rotation, or Circuit Breaker behavior reserved for Phase 16."],
  };
  await writeFile(path.join(directory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ directory: repositoryPath(directory), validationStatus: summary.validationStatus, phaseStatus: summary.phaseStatus, releasePromotionStatus: summary.releasePromotionStatus, head: after.head }, null, 2)}\n`);
  return promotionPass ? 0 : 1;
}
async function validateEvidence(bundleDir) {
  if (bundleDir === null) throw new Error("validate requires one Phase 15 evidence directory");
  const directory = path.resolve(repositoryRoot, bundleDir);
  const errors = [];
  let summary;
  try { summary = await readJson(path.join(directory, "summary.json")); } catch (error) { errors.push(`summary.json is unreadable: ${error instanceof Error ? error.message : String(error)}`); }
  if (summary?.schemaVersion !== schemaVersion || summary?.kind !== "phase15-evidence-bundle") errors.push("Unsupported evidence schema or kind");
  if (summary?.phaseStatus !== "COMPLETE" || summary?.validationStatus !== "PASS" || summary?.releasePromotionStatus !== "PASS") errors.push("Phase 15 evidence is not a complete promotion bundle");
  if (summary?.contractVersion !== contractVersion || summary?.sqliteSchemaVersion !== sqliteSchemaVersion || summary?.projectSchemaVersion !== projectSchemaVersion) errors.push("Phase 15 version metadata is incorrect");
  if (summary?.repository?.cleanAtStart !== true || summary?.repository?.cleanAfterRun !== true || summary?.repository?.headAtStart !== summary?.repository?.headAfterRun || summary?.repository?.starting?.head !== summary?.repository?.headAfterRun || summary?.repository?.head !== summary?.repository?.headAfterRun) errors.push("Evidence is not bound to one clean unchanged Git HEAD");
  if (summary?.environment?.supportedNativeBaseline !== true || summary?.environment?.os !== "win32" || summary?.environment?.architecture !== "x64") errors.push("Evidence environment is not the supported Windows x64 baseline");
  if (summary?.phase14Baseline?.status !== "PASS" || summary?.phase14Baseline?.exitCode !== 0) errors.push("Phase 14 baseline gate did not pass");
  if (summary?.sensitiveScan?.status !== "PASS" || summary?.sensitiveScan?.unauthorizedOccurrences !== 0) errors.push("Sensitive evidence scan did not pass with zero findings");
  const commands = Array.isArray(summary?.commands) ? summary.commands : [];
  for (const id of requiredCommandIds) { const command = commandById(commands, id); if (command?.status !== "PASS" || command?.exitCode !== 0) errors.push(`Required command '${id}' did not pass`); }
  for (const id of ["full", "unit", "integration", "browser", "browser-proxy", "application-proxy", "persistence-proxy"]) {
    const counts = commandById(commands, id)?.testCounts;
    if (!counts || counts.total !== counts.passed || counts.failed !== 0) errors.push(`Test counts for '${id}' are missing or failing`);
  }
  const acceptance = summary?.acceptance ?? {};
  for (const id of ["AC-P15-001", "AC-P15-002", "AC-P15-003", "AC-P15-004", "AC-P15-005", "AC-P15-006", "AC-P15-007", "AC-P15-008", "AC-P15-009", "AC-P15-010", "AC-P15-011", "AC-P15-012", "AC-P15-013", "AC-P15-014", "AC-P15-015", "AC-P15-016", "AC-P15-017", "AC-P15-018"]) if (acceptance[id] !== "PASS") errors.push(`Acceptance '${id}' is not PASS`);
  if (summary?.phase16Boundary?.workerScheduling !== "not implemented" || summary?.phase16Boundary?.proxyRotation !== "not implemented") errors.push("Phase 16 boundary is not explicitly preserved");
  const current = await gitFacts();
  if (current.head !== summary?.repository?.headAfterRun || !current.workingTreeClean) errors.push("Current repository no longer matches the evidence HEAD or is dirty");
  process.stdout.write(`Phase 15 evidence: ${repositoryPath(directory)}\nValidation: ${errors.length === 0 ? "PASS" : "FAIL"}\n`);
  for (const error of errors) process.stdout.write(`- ${error}\n`);
  return errors.length === 0 ? 0 : 1;
}
function help() { return ["Usage:", "  npm run test:phase15:evidence -- --output-dir .artifacts/phase15-evidence/final-native-windows-11-x64", "  node tools/testing/run-phase15-evidence.mjs validate BUNDLE_DIR"].join("\n"); }
export async function main(args = process.argv.slice(2)) { try { const options = parseArguments(args); return options.operation === "validate" ? await validateEvidence(options.outputDir) : await runEvidence(options); } catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n${help()}\n`); return 1; } }
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await main();
