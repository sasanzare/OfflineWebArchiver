import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const spikeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const browserRoot = path.join(spikeRoot, ".playwright-browsers");
process.env.PLAYWRIGHT_BROWSERS_PATH = browserRoot;
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";

const { chromium } = await import("playwright");
const executable = chromium.executablePath();
const relative = path.relative(browserRoot, executable);
const contained = relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
if (!contained || !existsSync(executable)) {
  process.stderr.write("SPIKE_BROWSER_NOT_FOUND: bundled Chromium is missing. Run npm run browser-install.\n");
  process.exit(1);
}
process.stdout.write(`Bundled Chromium detected: .playwright-browsers/${relative.split(path.sep).join("/")}\n`);

