import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withRestrictedPath } from "./process-env.mjs";

const spikeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const executable = path.join(
  spikeRoot,
  "dist",
  "win-unpacked",
  "OfflineWebArchiveBuilderPhase02Spike.exe",
);
const runKey = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const outputRoot = path.join(spikeRoot, "output", "packaged-smoke", runKey);
const child = spawn(executable, ["--automation"], {
  cwd: path.dirname(executable),
  stdio: ["ignore", "pipe", "pipe"],
  env: withRestrictedPath({
    OWAB_SPIKE_OUTPUT_ROOT: outputRoot,
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
  }),
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
const checks = {
  status: report.status === "passed",
  packagedMode: report.packaged === true,
  bundledChromium: report.result?.chromiumVersion?.length > 0,
  originalServerStopped: report.result?.originalFixtureUnavailable === true,
  offlineContent: report.result?.offlineContentVisible === true,
  noConsoleErrors: report.result?.consoleErrorCount === 0,
  noFailedRequests: report.result?.failedRequestCount === 0,
  restrictedPath: true,
  browserDownloadsDisabled: true,
};
if (Object.values(checks).some((value) => !value)) {
  process.stderr.write(`${JSON.stringify(checks, null, 2)}\n`);
  process.exit(1);
}
process.stdout.write(`${JSON.stringify({ status: "passed", checks, runtime: report.runtime, result: report.result }, null, 2)}\n`);

