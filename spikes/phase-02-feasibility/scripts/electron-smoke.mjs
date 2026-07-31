import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const spikeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const electronPath = require("electron");
const runKey = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const outputRoot = path.join(spikeRoot, "output", "electron-smoke", runKey);

const child = spawn(electronPath, [".", "--automation"], {
  cwd: spikeRoot,
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    OWAB_SPIKE_OUTPUT_ROOT: outputRoot,
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
  },
});
let stdout = "";
let stderr = "";
child.stdout.on("data", (chunk) => { stdout += String(chunk); });
child.stderr.on("data", (chunk) => { stderr += String(chunk); });
const exitCode = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code) => resolve(code ?? 1));
});

if (exitCode !== 0) {
  process.stderr.write(`${stderr}\n${stdout}`);
  process.exit(exitCode);
}
const report = JSON.parse(await readFile(path.join(outputRoot, "automation-result.json"), "utf8"));
const expectedBridge = ["getRuntimeInfo", "onProgress", "openOutput", "reopenPreview", "run"];
const requiredStages = [
  "Preparing fixture",
  "Starting Chromium",
  "Loading SPA",
  "Waiting for rendered state",
  "Extracting HTML",
  "Saving archive",
  "Starting offline server",
  "Opening offline preview",
  "Completed",
];
const checks = {
  status: report.status === "passed",
  developmentMode: report.packaged === false,
  bridgeAllowlist: JSON.stringify(report.bridgeKeys) === JSON.stringify(expectedBridge),
  progress: requiredStages.every((stage) => report.progressStages.includes(stage)),
  contextIsolation: report.security.contextIsolation === true,
  nodeIntegration: report.security.nodeIntegration === false,
  sandbox: report.security.sandbox === true,
  noRendererRequire: report.security.rendererRequireType === "undefined",
  offlineContent: report.result?.offlineContentVisible === true,
};
if (Object.values(checks).some((value) => !value)) {
  process.stderr.write(`${JSON.stringify(checks, null, 2)}\n`);
  process.exit(1);
}
process.stdout.write(`${JSON.stringify({ status: "passed", checks, runtime: report.runtime }, null, 2)}\n`);
