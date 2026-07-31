import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

test("Electron renderer executes Project, Profile, Scope, and Queue flows through the secure bridge", { timeout: 45_000 }, () => {
  const root = mkdtempSync(path.join(tmpdir(), "owa-electron-"));
  try {
    const electron = path.resolve("node_modules/electron/dist/electron.exe");
    const result = spawnSync(electron, ["apps/desktop", "--architecture-smoke", `--project-smoke-root=${root}`], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 40_000,
      env: { ...process.env, OWAB_LOG_LEVEL: "error", ELECTRON_DISABLE_SECURITY_WARNINGS: "true" },
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const line = result.stdout.split(/\r?\n/).find((value) => value.startsWith("ARCHITECTURE_SMOKE="));
    assert.ok(line, result.stdout);
    const report = JSON.parse(line.slice("ARCHITECTURE_SMOKE=".length));
    assert.equal(report.status, "passed");
    assert.deepEqual(report.bridgeKeys, ["execute", "selectPath"]);
    assert.deepEqual(report.rendererBoundary, { requireType: "undefined", processType: "undefined", ipcRendererType: "undefined" });
    assert.equal(report.profileEditorFields.length, 15);
    assert.ok(report.profileEditorFields.every(Boolean));
    assert.equal(report.queueFields.length, 6);
    assert.ok(report.queueFields.every(Boolean));
    assert.equal(report.operations.created.status, "success");
    assert.equal(report.operations.profileUpdate.result.profile.name, "Desktop Profile Updated");
    const expectedProfileChanges = ["authorization.approvedAt", "authorization.approvedBy", "authorization.legalBasisReference", "authorization.status", "name"];
    assert.deepEqual(report.operations.profileUpdate.result.changedPaths, expectedProfileChanges);
    assert.deepEqual(report.operations.profileComparison.result.comparison.changedPaths, expectedProfileChanges);
    assert.equal(report.operations.queueEnqueue.result.enqueue.outcome, "created");
    assert.equal(report.operations.queueDuplicate.result.enqueue.outcome, "existing");
    assert.equal(report.operations.queueListBefore.result.jobs.length, 1);
    assert.equal(report.operations.queueComplete.result.job.state, "completed");
    assert.ok(report.operations.queueHistory.result.history.transitions.length >= 3);
    assert.equal(report.operations.queueCompletedFilter.result.jobs.length, 1);
    assert.equal(report.operations.validated.result.report.valid, true);
    assert.equal(report.operations.importedValidation.result.report.valid, true);
    assert.equal(report.invalidVersion.error.code, "CONTRACT_UNSUPPORTED_VERSION");
    assert.deepEqual(report.security, { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
