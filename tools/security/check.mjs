import { readFile } from "node:fs/promises";
import path from "node:path";
import { repositoryRoot } from "../build/typescript.mjs";
import { readTextFiles, relative } from "../quality/shared.mjs";

const files = {
  main: await readFile(path.join(repositoryRoot, "apps/desktop/src/main/index.ts"), "utf8"),
  preload: await readFile(path.join(repositoryRoot, "apps/desktop/src/preload/index.ts"), "utf8"),
  renderer: await readFile(path.join(repositoryRoot, "apps/desktop/src/renderer/index.html"), "utf8"),
};
const scopeEngine = await readFile(path.join(repositoryRoot, "packages/scope-engine/src/index.ts"), "utf8");
const queueDomain = await readFile(path.join(repositoryRoot, "packages/queue/src/index.ts"), "utf8");
const queuePersistence = await readFile(path.join(repositoryRoot, "packages/persistence-sqlite/src/queue.ts"), "utf8");
const recoveryDomain = await readFile(path.join(repositoryRoot, "packages/recovery/src/index.ts"), "utf8");
const recoveryPersistence = await readFile(path.join(repositoryRoot, "packages/persistence-sqlite/src/recovery.ts"), "utf8");
const browserRuntime = await readFile(path.join(repositoryRoot, "packages/browser-runtime/src/index.ts"), "utf8");
const renderEngine = await readFile(path.join(repositoryRoot, "packages/rendering/src/index.ts"), "utf8");
const renderPersistence = await readFile(path.join(repositoryRoot, "packages/persistence-sqlite/src/render.ts"), "utf8");
const applicationService = await readFile(path.join(repositoryRoot, "packages/application-service/src/index.ts"), "utf8");
const required = [
  [files.main, "contextIsolation: true", "context isolation"],
  [files.main, "nodeIntegration: false", "disabled Node integration"],
  [files.main, "sandbox: true", "renderer sandbox"],
  [files.main, "webSecurity: true", "web security"],
  [files.main, "setPermissionRequestHandler", "permission denial"],
  [files.main, "setWindowOpenHandler", "window creation denial"],
  [files.main, "will-navigate", "navigation restriction"],
  [files.main, "will-download", "download denial"],
  [files.main, "will-attach-webview", "webview denial"],
  [files.main, "senderIsAuthorized", "IPC sender authorization"],
  [files.preload, "contextBridge.exposeInMainWorld", "narrow context bridge"],
  [files.renderer, "Content-Security-Policy", "renderer content security policy"],
];
const errors = required
  .filter(([text, token]) => !text.includes(token))
  .map(([, , description]) => `Missing desktop control: ${description}`);
if (/https?:\/\//.test(files.main) || /https?:\/\//.test(files.preload)) {
  errors.push("Desktop privileged code contains a remote URL");
}
if (/node:(?:http|https|net|tls|dns)|\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/.test(scopeEngine)) {
  errors.push("Scope Engine contains a network-capable API");
}
if (/\b(?:eval|Function)\s*\(|new\s+RegExp\s*\(/.test(scopeEngine)) {
  errors.push("Scope Engine contains dynamic evaluation or regular-expression construction");
}
if (/node:(?:http|https|net|tls|dns|child_process)|\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\b(?:eval|Function)\s*\(/.test(queueDomain + queuePersistence)) {
  errors.push("Queue production code contains a forbidden network, process, or dynamic-evaluation API");
}
if (/node:(?:http|https|net|tls|dns|child_process)|\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\b(?:eval|Function)\s*\(/.test(recoveryDomain + recoveryPersistence)) {
  errors.push("Recovery production code contains a forbidden network, process, or dynamic-evaluation API");
}
for (const token of ["resultMetadataBytes", "safeMessageLength", "idempotencyKeyLength", "QUEUE_PAGINATION_LIMIT_EXCEEDED", "QUEUE_CLAIM_TOKEN_INVALID", "BEGIN IMMEDIATE"]) {
  if (!(queueDomain + queuePersistence).includes(token)) errors.push(`Queue security control is missing: ${token}`);
}
if (/database\.exec\s*\(\s*input|prepare\s*\(\s*input/.test(queuePersistence)) errors.push("Queue persistence accepts caller-provided SQL");
for (const token of ["lease_token_hash", "fencingGeneration", "assertLease", "validateCheckpointPayload", "validatePortableRelativePath", "CHECKPOINT_TOO_LARGE", "FENCING_GENERATION_STALE", "BEGIN IMMEDIATE"]) {
  if (!(recoveryDomain + recoveryPersistence).includes(token)) errors.push(`Recovery security control is missing: ${token}`);
}
for (const token of ["chromiumSandbox: true", "Fetch.enable", "Fetch.failRequest", "BlockedByClient", "method !== \"GET\"", "serviceWorkers: CONTEXT_PROFILE.serviceWorkers", "executableSha256", "systemBrowserFallback: false", "launchDownloadAllowed: false"]) {
  if (!browserRuntime.includes(token)) errors.push(`Browser Runtime security control is missing: ${token}`);
}
for (const token of ["domQuietMs", "networkQuietMs", "activeRequests === 0", "captureScreenshot: false", "maxHtmlBytes", "RENDER_STABILITY_TIMEOUT"]) {
  if (!renderEngine.includes(token)) errors.push(`Render Engine bound is missing: ${token}`);
}
for (const token of ["assertOwnership", "fencing_generation", "atomicWriteFile", "BEGIN IMMEDIATE", "result_summary_json", "lease_token_hash"]) {
  if (!renderPersistence.includes(token)) errors.push(`Render persistence control is missing: ${token}`);
}
for (const token of ["lookup(url.hostname", "classifyHost", "RUNTIME_PRIVATE_OR_MIXED_ADDRESS_BLOCKED", "fixtureOrigins.includes(url.origin)", "renderTestMode"]) {
  if (!applicationService.includes(token)) errors.push(`Runtime network authorization control is missing: ${token}`);
}
if (/networkidle/i.test(renderEngine + browserRuntime)) errors.push("Browser/Render production code uses forbidden networkidle readiness");
if (/--no-sandbox|chromiumSandbox:\s*false|channel:\s*["']chrome/i.test(browserRuntime)) errors.push("Browser Runtime contains an unsafe sandbox or system-browser fallback");
if (/\b(?:proxy|httpCredentials|storageState)\s*:/.test(browserRuntime)) errors.push("Browser Runtime contains out-of-scope proxy or authentication state");
if (/database\.exec\s*\(\s*input|prepare\s*\(\s*input/.test(recoveryPersistence)) errors.push("Recovery persistence accepts caller-provided SQL");
if (/addDefinitionRow\([^\n]*(?:claimToken|leaseToken)/.test(files.renderer)) errors.push("Desktop renderer displays a Lease Token");
for (const token of ["URL_CREDENTIALS_FORBIDDEN", "SENSITIVE_QUERY_REMOVED", "PRIVATE_NETWORK_NOT_ALLOWED", "SCOPE_BATCH_LIMIT_EXCEEDED"]) {
  if (!scopeEngine.includes(token)) errors.push(`Scope Engine is missing security decision ${token}`);
}
const productionFiles = await readTextFiles(new Set([".ts", ".js", ".mjs", ".cjs", ".json", ".md", ".html"]));
const secretPatterns = [
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key material"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key"],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}\b/, "GitHub credential"],
  [/\bsk-[A-Za-z0-9]{32,}\b/, "API secret"],
  [/\bBearer\s+[A-Za-z0-9._~-]{20,}/i, "bearer credential"],
];
for (const { file, text } of productionFiles) {
  const name = relative(file);
  if (name.startsWith("spikes/") || name === "package-lock.json") continue;
  for (const [pattern, description] of secretPatterns) {
    if (pattern.test(text)) errors.push(`${name}: possible ${description}`);
  }
  for (const match of text.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
    try {
      const candidate = new URL(match[0]);
      const reservedFixture = /(?:^|\.)(?:example|invalid|test)$/.test(candidate.hostname);
      if ((candidate.username || candidate.password) && !reservedFixture) {
        errors.push(`${name}: possible credential-bearing URL`);
      }
    } catch {
      // Malformed strings are not usable credential-bearing URLs.
    }
  }
}
for (const { file, text } of productionFiles.filter(({ file }) => /^(?:apps|packages)[\\/]/.test(path.relative(repositoryRoot, file)))) {
  const name = relative(file);
  if (/node:child_process/.test(text)) errors.push(`${name}: runtime package exposes process execution`);
  if (/\b(?:createServer|listen|fetch)\s*\(/.test(text)) errors.push(`${name}: runtime package exposes an undeclared network service`);
  if (/telemetry|analytics/i.test(text)) errors.push(`${name}: runtime package mentions unapproved telemetry`);
}
if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write("Desktop privilege, transport, navigation, permission, and remote-content checks passed.\n");
