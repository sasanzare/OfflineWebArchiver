import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

test("Electron renderer reaches the core through the secure bridge", { timeout: 30_000 }, () => {
  const electron = path.resolve("node_modules/electron/dist/electron.exe");
  const result = spawnSync(electron, ["apps/desktop", "--architecture-smoke"], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 25_000,
    env: { ...process.env, OWAB_LOG_LEVEL: "error", ELECTRON_DISABLE_SECURITY_WARNINGS: "true" },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const line = result.stdout.split(/\r?\n/).find((value) => value.startsWith("ARCHITECTURE_SMOKE="));
  assert.ok(line, result.stdout);
  const report = JSON.parse(line.slice("ARCHITECTURE_SMOKE=".length));
  assert.equal(report.status, "passed");
  assert.deepEqual(report.bridgeKeys, ["systemDescribe"]);
  assert.deepEqual(report.rendererBoundary, {
    requireType: "undefined",
    processType: "undefined",
    ipcRendererType: "undefined",
  });
  assert.equal(report.response.status, "success");
  assert.equal(report.response.result.coreStatus, "architecture-ready");
  assert.equal(report.errorResponse.status, "error");
  assert.equal(report.errorResponse.error.code, "CONTRACT_UNSUPPORTED_VERSION");
  assert.deepEqual(report.security, {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
  });
});
