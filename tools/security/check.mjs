import { readFile } from "node:fs/promises";
import path from "node:path";
import { repositoryRoot } from "../build/typescript.mjs";
import { readTextFiles, relative } from "../quality/shared.mjs";

const files = {
  main: await readFile(path.join(repositoryRoot, "apps/desktop/src/main/index.ts"), "utf8"),
  preload: await readFile(path.join(repositoryRoot, "apps/desktop/src/preload/index.ts"), "utf8"),
  renderer: await readFile(path.join(repositoryRoot, "apps/desktop/src/renderer/index.html"), "utf8"),
};
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
