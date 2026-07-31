import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const spikeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const browserRoot = path.join(spikeRoot, ".playwright-browsers");
const playwrightCli = path.join(spikeRoot, "node_modules", "playwright", "cli.js");
const hostArgument = process.argv.find((value) => value.startsWith("--download-host="));
const downloadHost = hostArgument?.slice("--download-host=".length);
const allowedDownloadHosts = new Set([
  "https://cdn.playwright.dev/dbazure/download/playwright",
  "https://playwright.download.prss.microsoft.com/dbazure/download/playwright",
  "https://cdn.playwright.dev",
]);
if (downloadHost !== undefined && !allowedDownloadHosts.has(downloadHost)) {
  process.stderr.write("The requested browser download host is not an allowlisted official Playwright host.\n");
  process.exit(2);
}
const child = spawn(process.execPath, [playwrightCli, "install", "--no-shell", "chromium"], {
  cwd: spikeRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: browserRoot,
    PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT: "120000",
    ...(downloadHost === undefined ? {} : { PLAYWRIGHT_DOWNLOAD_HOST: downloadHost }),
  },
});

const exitCode = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code) => resolve(code ?? 1));
});
if (exitCode !== 0) process.exit(exitCode);
process.stdout.write("Chromium installed in .playwright-browsers.\n");
