import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const browserRoot = path.join(repositoryRoot, ".runtime", "browsers");
const manifestPath = path.join(browserRoot, "browser-manifest.json");
const playwrightVersion = "1.56.1";
const allowedDownloadHosts = new Set([
  "https://cdn.playwright.dev",
  "https://playwright.download.prss.microsoft.com",
  "https://cdn.playwright.dev/dbazure/download/playwright",
  "https://playwright.download.prss.microsoft.com/dbazure/download/playwright",
]);

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function findExecutable(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const found = await findExecutable(target);
      if (found !== null) return found;
    } else if (entry.isFile() && (entry.name === "chrome.exe" || entry.name === "chrome")) {
      return target;
    }
  }
  return null;
}

async function chromiumVersion(executablePath) {
  const browser = await chromium.launch({ executablePath, headless: true, chromiumSandbox: true });
  try {
    return browser.version();
  } finally {
    await browser.close();
  }
}

async function writeManifest() {
  const executablePath = await findExecutable(browserRoot);
  if (executablePath === null) throw new Error("No Playwright Chromium executable was found under the repository-owned browser root.");
  const relativePath = path.relative(browserRoot, executablePath).replaceAll(path.sep, "/");
  const revision = relativePath.split("/").find((segment) => /^(?:chromium|chromium_headless_shell)-\d+$/.test(segment))?.split("-").at(-1);
  if (revision === undefined) throw new Error("The installed Chromium revision could not be identified.");
  const manifest = {
    manifestVersion: 1,
    provider: "playwright-core",
    playwrightVersion,
    chromiumVersion: await chromiumVersion(executablePath),
    browserRevision: revision,
    executablePath: relativePath,
    executableSha256: await sha256(executablePath),
    installedAt: new Date().toISOString(),
    source: "official-playwright",
  };
  const temporaryPath = `${manifestPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await rename(temporaryPath, manifestPath);
  return manifest;
}

async function readManifest() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.manifestVersion !== 1 || manifest.playwrightVersion !== playwrightVersion || manifest.provider !== "playwright-core") {
    throw new Error("The browser manifest is missing or incompatible with this application build.");
  }
  const executablePath = path.resolve(browserRoot, manifest.executablePath);
  const relative = path.relative(browserRoot, executablePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("The browser manifest executable escapes the repository-owned root.");
  if (await sha256(executablePath) !== manifest.executableSha256) throw new Error("The Chromium executable checksum does not match its manifest.");
  return { manifest, executablePath };
}

async function install() {
  await mkdir(browserRoot, { recursive: true });
  const hostArgument = process.argv.find((value) => value.startsWith("--download-host="));
  const downloadHost = hostArgument?.slice("--download-host=".length);
  if (downloadHost !== undefined && !allowedDownloadHosts.has(downloadHost)) {
    throw new Error("The requested browser download host is not an allowlisted official Playwright host.");
  }
  const cli = path.join(repositoryRoot, "node_modules", "playwright-core", "cli.js");
  const child = spawn(process.execPath, [cli, "install", "--no-shell", "chromium"], {
    cwd: repositoryRoot,
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: browserRoot,
      PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT: "120000",
      PLAYWRIGHT_SKIP_BROWSER_GC: "1",
      ...(downloadHost === undefined ? {} : { PLAYWRIGHT_DOWNLOAD_HOST: downloadHost }),
    },
  });
  const status = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
  if (status !== 0) process.exit(status);
  const manifest = await writeManifest();
  process.stdout.write(`Installed Playwright Chromium ${manifest.chromiumVersion} revision ${manifest.browserRevision} under .runtime/browsers.\n`);
}

async function verify() {
  const { manifest, executablePath } = await readManifest();
  const browser = await chromium.launch({ executablePath, headless: true, chromiumSandbox: true });
  try {
    const context = await browser.newContext({ serviceWorkers: "block", acceptDownloads: false });
    const page = await context.newPage();
    await page.setContent("<!doctype html><title>Browser verification</title><p>ready</p>");
    if (await page.title() !== "Browser verification") throw new Error("Chromium did not complete the local verification page.");
    await context.close();
  } finally {
    await browser.close();
  }
  process.stdout.write(`Verified Playwright ${playwrightVersion} with Chromium ${manifest.chromiumVersion}; sandbox is explicitly enabled and no system-browser fallback exists.\n`);
}

async function info() {
  const { manifest } = await readManifest();
  process.stdout.write(`${JSON.stringify({
    provider: manifest.provider,
    playwrightVersion: manifest.playwrightVersion,
    chromiumVersion: manifest.chromiumVersion,
    browserRevision: manifest.browserRevision,
    executable: manifest.executablePath,
    executableSha256: manifest.executableSha256,
    source: manifest.source,
    resourceRoot: ".runtime/browsers",
    systemBrowserFallback: false,
    launchDownloadAllowed: false,
    chromiumSandbox: true,
  }, null, 2)}\n`);
}

async function manifest() {
  await mkdir(browserRoot, { recursive: true });
  const value = await writeManifest();
  process.stdout.write(`Recorded Playwright Chromium ${value.chromiumVersion} revision ${value.browserRevision} under .runtime/browsers.\n`);
}

const operation = process.argv[2];
if (operation === "install") await install();
else if (operation === "verify") await verify();
else if (operation === "info") await info();
else if (operation === "manifest") await manifest();
else {
  process.stderr.write("Usage: node tools/browser/provision.mjs <install|verify|info|manifest>\n");
  process.exit(2);
}
