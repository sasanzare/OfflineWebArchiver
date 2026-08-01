import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { startRenderFixtureServer } from "../support/render-fixture-server.js";

function runElectron(executable: string, arguments_: readonly string[], timeoutMs: number): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, [...arguments_], { cwd: process.cwd(), env: { ...process.env, OWAB_LOG_LEVEL: "error", ELECTRON_DISABLE_SECURITY_WARNINGS: "true" }, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    const timeout = setTimeout(() => { child.kill("SIGKILL"); reject(new Error(`Electron smoke timed out: ${stdout}\n${stderr}`)); }, timeoutMs);
    child.once("error", (error) => { clearTimeout(timeout); reject(error); });
    child.once("exit", (status) => { clearTimeout(timeout); resolve({ status, stdout, stderr }); });
  });
}

test("Electron renderer executes Project, Profile, Scope, Queue, Recovery, Browser, and Render flows through the secure bridge", { timeout: 60_000 }, async () => {
  const root = mkdtempSync(path.join(tmpdir(), "owa-electron-"));
  const fixture = await startRenderFixtureServer();
  try {
    const electron = path.resolve("node_modules/electron/dist/electron.exe");
    const result = await runElectron(electron, ["apps/desktop", "--architecture-smoke", `--project-smoke-root=${root}`, `--render-smoke-origin=${fixture.origin}`], 55_000);
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
    const expectedProfileChanges = ["authorization.approvedAt", "authorization.approvedBy", "authorization.legalBasisReference", "authorization.status", "name", "networkPolicy.allowedIpClasses"];
    assert.deepEqual(report.operations.profileUpdate.result.changedPaths, expectedProfileChanges);
    assert.deepEqual(report.operations.profileComparison.result.comparison.changedPaths, expectedProfileChanges);
    assert.equal(report.operations.queueEnqueue.result.enqueue.outcome, "created");
    assert.equal(report.operations.queueDuplicate.result.enqueue.outcome, "existing");
    assert.equal(report.operations.queueListBefore.result.jobs.length, 1);
    assert.equal(report.operations.queueComplete.result.job.state, "completed");
    assert.equal(report.operations.renderStart.status, "success");
    assert.equal(report.operations.renderStatus.result.status.resultStatus, "completed");
    assert.match(report.operations.renderResult.result.result.htmlArtifact.relativePath, /rendered\.html$/);
    assert.match(report.operations.renderResult.result.result.screenshotArtifact.relativePath, /screenshot\.png$/);
    assert.ok(report.operations.renderEvents.result.events.length >= 1);
    assert.ok(report.operations.queueHistory.result.history.transitions.length >= 3);
    assert.equal(report.operations.queueCompletedFilter.result.jobs.length, 2);
    assert.equal(report.operations.validated.result.report.valid, true);
    assert.equal(report.operations.importedValidation.result.report.valid, true);
    assert.equal(report.invalidVersion.error.code, "CONTRACT_UNSUPPORTED_VERSION");
    assert.deepEqual(report.security, { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true });
  } finally {
    await fixture.close();
    rmSync(root, { recursive: true, force: true });
  }
});
