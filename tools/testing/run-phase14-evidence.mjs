import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const evidenceRoot = path.join(repositoryRoot, ".artifacts", "phase14-evidence");
const schemaVersion = "2.0.0";
const contractVersion = "1.10.0";
const requiredCommandIds = ["phase13-bundle-validate", "full", "unit", "integration", "browser", "build", "typecheck", "lint", "format", "architecture", "contracts", "migrations", "security", "docs", "okf"];
const phase14Commands = [
  ["full", "test"], ["unit", "test:unit"], ["integration", "test:integration"], ["browser", "test:browser"],
  ["build", "build"], ["typecheck", "typecheck"], ["lint", "lint"], ["format", "format:check"],
  ["architecture", "test:architecture"], ["contracts", "contracts:check"], ["migrations", "migrations:validate"],
  ["security", "security:check"], ["docs", "docs:validate"], ["okf", "okf:validate"],
];
const sensitivePatterns = [
  { id: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i },
  { id: "bearer-credential", pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i },
  { id: "named-sensitive-value", pattern: /\b(?:phone|otp|password|token|secret|cookie|authorization)\s*[:=]\s*(?!\[redacted\])[^\s,;}]+/i },
  { id: "phone-like-value", pattern: /\+\d[\d .()\-]{8,}\d/ },
];

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
function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const started = Date.now(); let stdout = ""; let stderr = ""; let spawnError = null; let timedOut = false; let child;
    try { child = spawn(command, args, { cwd: repositoryRoot, env: { ...process.env, OWAB_LOG_LEVEL: "error" }, stdio: ["ignore", "pipe", "pipe"], windowsHide: process.platform === "win32" }); }
    catch (error) { resolve({ command, args, exitCode: null, durationMs: Date.now() - started, spawnError: String(error?.message ?? error), timedOut, stdout, stderr }); return; }
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); }); child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    const timeout = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); }, options.timeoutMs ?? 20 * 60_000);
    child.once("error", (error) => { spawnError = String(error?.message ?? error); });
    child.once("close", (exitCode, signal) => { clearTimeout(timeout); resolve({ command, args, exitCode, signal, durationMs: Date.now() - started, spawnError, timedOut, stdout, stderr }); });
  });
}
function scanSensitive(text) { return sensitivePatterns.flatMap(({ id, pattern }) => pattern.test(text) ? [id] : []); }
function redact(text) {
  return String(text ?? "").replace(/(\b(?:phone|otp|password|token|secret|cookie|authorization)\s*[:=]\s*)([^\s,;}]+)/gi, "$1[redacted]")
    .replace(/\+\d[\d .()\-]{8,}\d/g, "[redacted-phone]").replace(/Bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, "Bearer [redacted]");
}
function resultSummary(raw) {
  const output = `${raw.stdout}\n${raw.stderr}`;
  const tests = output.match(/^(?:#|ℹ)\s*tests\s+(\d+)$/m)?.[1]; const passed = output.match(/^(?:#|ℹ)\s*pass\s+(\d+)$/m)?.[1]; const failed = output.match(/^(?:#|ℹ)\s*fail\s+(\d+)$/m)?.[1];
  return { status: raw.exitCode === 0 && raw.spawnError === null && !raw.timedOut ? "PASS" : "FAIL", exitCode: raw.exitCode, signal: raw.signal ?? null, durationMs: raw.durationMs, timedOut: raw.timedOut, spawnError: raw.spawnError === null ? null : redact(raw.spawnError), testCounts: tests === undefined ? null : { total: Number(tests), passed: Number(passed ?? 0), failed: Number(failed ?? 0) }, safeOutputTail: redact(output).trim().split(/\r?\n/).filter(Boolean).slice(-6).join(" | ").slice(0, 1_500) };
}
async function gitFacts() {
  const branch = await run("git", ["branch", "--show-current"], { timeoutMs: 30_000 }); const head = await run("git", ["rev-parse", "HEAD"], { timeoutMs: 30_000 }); const status = await run("git", ["status", "--porcelain"], { timeoutMs: 30_000 });
  return { branch: branch.stdout.trim() || null, head: head.stdout.trim() || null, workingTreeClean: status.stdout.trim().length === 0, changedFiles: status.stdout.trim().split(/\r?\n/).filter(Boolean).map((line) => line.slice(3)).slice(0, 200) };
}
async function readJson(target) { return JSON.parse(await readFile(target, "utf8")); }
function validPhase13Reconciliation(value, head) {
  return value?.schemaVersion === "1.0.0" && value?.kind === "phase13-evidence-reconciliation" && value?.status === "PASS" && value?.phaseStatus === "COMPLETE" && value?.phase14Readiness === "PHASE_14_READY" && value?.gitHead === head && Array.isArray(value?.errors) && value.errors.length === 0 && Array.isArray(value?.matrix?.missing) && value.matrix.missing.length === 0;
}
function parseArguments(args) {
  const operation = args[0] === "run" || args[0] === "validate" ? args[0] : "run"; const remaining = operation === "run" && args[0] !== "run" ? args : args.slice(1);
  const options = { operation, phase13Bundle: null, phase13Reconciliation: null, outputDir: null, bundleDir: null };
  for (let index = 0; index < remaining.length; index += 1) { const arg = remaining[index]; if (arg === "--phase13-bundle") options.phase13Bundle = remaining[++index] ?? null; else if (arg === "--phase13-reconciliation") options.phase13Reconciliation = remaining[++index] ?? null; else if (arg === "--output-dir") options.outputDir = remaining[++index] ?? null; else if (operation === "validate" && options.bundleDir === null) options.bundleDir = arg; else throw new Error(`Unknown argument '${arg}'.`); }
  return options;
}
async function runEvidence(options) {
  if (options.phase13Bundle === null || options.phase13Reconciliation === null) throw new Error("run requires --phase13-bundle and --phase13-reconciliation from an accepted Phase 13 baseline.");
  const timestamp = new Date().toISOString(); const facts = await gitFacts(); const phase13Bundle = path.resolve(repositoryRoot, options.phase13Bundle); const phase13ReconciliationPath = path.resolve(repositoryRoot, options.phase13Reconciliation); const phase13Reconciliation = await readJson(phase13ReconciliationPath); const commandResults = []; const sensitiveFindings = [];
  const phase13Raw = await run(process.execPath, [path.join(repositoryRoot, "tools", "testing", "run-phase13-evidence.mjs"), "validate", phase13Bundle]);
  commandResults.push({ id: "phase13-bundle-validate", script: null, invocation: `${process.execPath} tools/testing/run-phase13-evidence.mjs validate ${repositoryPath(phase13Bundle)}`, ...resultSummary(phase13Raw) });
  const phase13DependencyPass = phase13Raw.exitCode === 0 && validPhase13Reconciliation(phase13Reconciliation, facts.head);
  for (const [id, script] of phase14Commands) { const invocation = npmInvocation(["run", script]); const raw = await run(invocation.command, invocation.args); const findings = [...new Set([...scanSensitive(raw.stdout), ...scanSensitive(raw.stderr)])]; if (findings.length > 0) sensitiveFindings.push({ command: id, patternIds: findings }); commandResults.push({ id, script, invocation: `${invocation.command} ${invocation.args.join(" ")}`, ...resultSummary(raw) }); }
  const validationPass = commandResults.every((item) => item.status === "PASS") && sensitiveFindings.length === 0; const promotionPass = validationPass && phase13DependencyPass && facts.workingTreeClean;
  const shortHead = typeof facts.head === "string" ? facts.head.slice(0, 12) : "unknown-head"; const directory = options.outputDir === null ? path.join(evidenceRoot, `${timestamp.replace(/[:.]/g, "-")}-${shortHead}`) : path.resolve(repositoryRoot, options.outputDir); await mkdir(directory, { recursive: true });
  const summary = { schemaVersion, kind: "phase14-evidence-bundle", phase: 14, phaseStatus: promotionPass ? "COMPLETE" : validationPass ? "PARTIAL" : "FAIL", validationStatus: validationPass ? "PASS" : "FAIL", releasePromotionStatus: promotionPass ? "PASS" : "BLOCKED", phase13Prerequisite: phase13DependencyPass ? "PASS" : "BLOCKED", contractVersion, sqliteSchemaVersion: 9, timestamp, repository: facts,
    phase13Evidence: { bundlePath: repositoryPath(phase13Bundle), reconciliationPath: repositoryPath(phase13ReconciliationPath), gitHead: phase13Reconciliation?.gitHead ?? null, bundleValidation: phase13Raw.exitCode === 0 ? "PASS" : "FAIL", reconciliationStatus: phase13Reconciliation?.status ?? null, dependencyStatus: phase13DependencyPass ? "PASS" : "BLOCKED" }, commands: commandResults,
    sensitiveScan: { status: sensitiveFindings.length === 0 ? "PASS" : "FAIL", unauthorizedOccurrences: sensitiveFindings.length, findings: sensitiveFindings, policy: "Raw phone, OTP, password, token, cookie, authorization, and browser-state values are not written to the evidence bundle." },
    acceptance: { sameRunAuthenticationRegression: commandResults.find((item) => item.id === "integration")?.status === "PASS" ? "PASS" : "FAIL", noOtpPersistence: commandResults.find((item) => item.id === "security")?.status === "PASS" ? "PASS" : "FAIL", schemaCompatibility: commandResults.find((item) => item.id === "migrations")?.status === "PASS" ? "PASS" : "FAIL" },
    notes: ["Phase 14 promotion requires an officially validated and reconciled Phase 13 bundle on the exact same clean committed Git HEAD.", "The bundle contains command status and bounded redacted output tails only; it does not contain raw browser state or sensitive input."] };
  await writeFile(path.join(directory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ directory: repositoryPath(directory), validationStatus: summary.validationStatus, phaseStatus: summary.phaseStatus, phase13Prerequisite: summary.phase13Prerequisite, releasePromotionStatus: summary.releasePromotionStatus }, null, 2)}\n`); return promotionPass ? 0 : 1;
}
async function validateEvidence(bundleDir) {
  if (bundleDir === null) throw new Error("validate requires exactly one Phase 14 evidence directory."); const directory = path.resolve(repositoryRoot, bundleDir); const errors = []; let summary;
  try { summary = await readJson(path.join(directory, "summary.json")); } catch (error) { errors.push(`summary.json is unreadable: ${error instanceof Error ? error.message : String(error)}`); }
  if (summary?.schemaVersion !== schemaVersion || summary?.kind !== "phase14-evidence-bundle") errors.push("summary.json has an unsupported schema or kind"); if (summary?.phaseStatus !== "COMPLETE" || summary?.validationStatus !== "PASS" || summary?.releasePromotionStatus !== "PASS") errors.push("Phase 14 validation/promotion is not complete"); if (summary?.phase13Prerequisite !== "PASS" || summary?.phase13Evidence?.dependencyStatus !== "PASS") errors.push("The Phase 13 dependency is not accepted"); if (summary?.repository?.workingTreeClean !== true || summary?.phase13Evidence?.gitHead !== summary?.repository?.head) errors.push("Evidence is not bound to the same clean committed HEAD as Phase 13"); if (summary?.contractVersion !== contractVersion || summary?.sqliteSchemaVersion !== 9) errors.push("Phase 14 contract or SQLite schema metadata is incorrect"); if (summary?.sensitiveScan?.status !== "PASS" || summary?.sensitiveScan?.unauthorizedOccurrences !== 0) errors.push("The sensitive evidence scan did not pass with zero findings");
  const commands = Array.isArray(summary?.commands) ? summary.commands : []; for (const id of requiredCommandIds) { const command = commands.find((item) => item?.id === id); if (command?.status !== "PASS" || command?.exitCode !== 0) errors.push(`Required command '${id}' did not pass`); }
  for (const id of ["full", "unit", "integration", "browser"]) { const counts = commands.find((item) => item?.id === id)?.testCounts; if (!counts || counts.total !== counts.passed || counts.failed !== 0) errors.push(`Required test counts for '${id}' are missing or failing`); }
  if (summary?.acceptance?.sameRunAuthenticationRegression !== "PASS" || summary?.acceptance?.noOtpPersistence !== "PASS" || summary?.acceptance?.schemaCompatibility !== "PASS") errors.push("A mandatory Phase 14 acceptance regression is not passing"); process.stdout.write(`Phase 14 evidence: ${repositoryPath(directory)}\nValidation: ${errors.length === 0 ? "PASS" : "FAIL"}\n`); for (const error of errors) process.stdout.write(`- ${error}\n`); return errors.length === 0 ? 0 : 1;
}
function help() { return ["Usage:", "  npm run test:phase14:evidence -- --phase13-bundle BUNDLE --phase13-reconciliation FILE [--output-dir DIR]", "  node tools/testing/run-phase14-evidence.mjs validate BUNDLE_DIR"].join("\n"); }
export async function main(args = process.argv.slice(2)) { try { const options = parseArguments(args); return options.operation === "validate" ? await validateEvidence(options.bundleDir) : await runEvidence(options); } catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n${help()}\n`); return 1; } }
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await main();
