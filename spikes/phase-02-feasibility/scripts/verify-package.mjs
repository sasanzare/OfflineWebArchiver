import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const spikeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(spikeRoot, "dist", "win-unpacked");
const resourcesRoot = path.join(packageRoot, "resources");
const browserRoot = path.join(resourcesRoot, "playwright-browsers");

const portable = (value) => value.split(path.sep).join("/");
const relative = (value) => portable(path.relative(spikeRoot, value));
const ensureWithin = (root, candidate) => {
  const rel = path.relative(path.resolve(root), path.resolve(candidate));
  if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new Error("Package verification path escaped the expected root.");
  }
};

async function walk(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    ensureWithin(root, target);
    if (entry.isDirectory()) files.push(...await walk(target));
    if (entry.isFile()) files.push(target);
  }
  return files;
}

const files = await walk(packageRoot);
const browserFiles = await walk(browserRoot);
const appExecutable = path.join(packageRoot, "OfflineWebArchiveBuilderPhase02Spike.exe");
const chromeExecutables = browserFiles.filter((file) => path.basename(file).toLowerCase() === "chrome.exe");
const required = [
  appExecutable,
  path.join(resourcesRoot, "app.asar"),
  path.join(resourcesRoot, "phase-02-fixture", "index.html"),
  path.join(resourcesRoot, "THIRD_PARTY_NOTICES.md"),
  path.join(packageRoot, "LICENSE.electron.txt"),
  path.join(packageRoot, "LICENSES.chromium.html"),
];
const fileSet = new Set(files.map((file) => path.resolve(file).toLowerCase()));
const missing = required.filter((file) => !fileSet.has(path.resolve(file).toLowerCase()));
const prohibited = files.filter((file) => {
  const normalized = portable(path.relative(packageRoot, file)).toLowerCase();
  return normalized.includes("/.git/") ||
    normalized.endsWith("/.env") ||
    normalized.includes("pasted-text") ||
    normalized.endsWith("/node.exe");
});
if (missing.length > 0 || chromeExecutables.length === 0 || prohibited.length > 0) {
  process.stderr.write(`${JSON.stringify({
    missing: missing.map(relative),
    chromiumExecutables: chromeExecutables.map(relative),
    prohibited: prohibited.map(relative),
  }, null, 2)}\n`);
  process.exit(1);
}

let packageBytes = 0;
for (const file of files) packageBytes += (await stat(file)).size;
let browserBytes = 0;
for (const file of browserFiles) browserBytes += (await stat(file)).size;

const report = {
  schemaVersion: "phase-02-package-verification-v1",
  experimental: true,
  status: "passed",
  artifact: "dist/win-unpacked",
  applicationExecutable: relative(appExecutable),
  browserSource: ".playwright-browsers",
  packagedBrowserRoot: "dist/win-unpacked/resources/playwright-browsers",
  chromiumExecutables: chromeExecutables.map(relative),
  fixture: "dist/win-unpacked/resources/phase-02-fixture/index.html",
  architecture: process.arch,
  packageBytes,
  packageMiB: Number((packageBytes / 1024 / 1024).toFixed(2)),
  browserBytes,
  browserMiB: Number((browserBytes / 1024 / 1024).toFixed(2)),
  fileCount: files.length,
  browserFileCount: browserFiles.length,
  prohibitedFindings: [],
};
await writeFile(
  path.join(spikeRoot, "dist", "package-verification.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

