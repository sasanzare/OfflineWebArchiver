import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createSqliteProjectStorage } from "@offline-web-archive/persistence-sqlite";
import { createQueueFixture } from "../support/queue-fixture.js";

type CrashMode = "claim" | "checkpoint" | "recover" | "outputs" | "open-storage";

async function crash(message: Record<string, unknown> & { mode: CrashMode }): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  const child = fork(new URL("../support/recovery-crash-child.js", import.meta.url), [], { stdio: ["ignore", "pipe", "pipe", "ipc"] });
  await new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("message", (value: { type?: string }) => value.type === "ready" ? resolve() : reject(new Error("Crash child did not become ready")));
  });
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  child.send(message);
  const result = await exited;
  assert.notEqual(result.code, 0);
  return result;
}

const mutation = (name: string) => ({ idempotencyKey: `${name}-${randomUUID()}`, operationId: `operation-${randomUUID()}`, correlationId: `correlation-${randomUUID()}` });

test("forced child termination rolls back attempt/checkpoint/recovery writes and preserves committed claim/output records", async () => {
  const fixture = await createQueueFixture("owa-process-kill-");
  try {
    const enqueued = await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/process-kill"));
    assert.ok(enqueued.job);
    const claimInput = { projectId: fixture.projectId, runId: fixture.runId, ownerId: "crash-owner", leaseDurationMs: 5_000, ...mutation("crash-claim") };
    await crash({ mode: "claim", databasePath: fixture.databasePath, now: "2026-07-31T12:00:00.000Z", faultPoint: "after-attempt-start", input: claimInput });
    let database = new DatabaseSync(fixture.databasePath, { readOnly: true });
    assert.equal((database.prepare("SELECT state FROM page_jobs WHERE job_id = ?").get(enqueued.job.jobId) as { state: string }).state, "pending");
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM job_attempts WHERE job_id = ?").get(enqueued.job.jobId) as { count: number }).count, 0);
    database.close();

    await crash({ mode: "claim", databasePath: fixture.databasePath, now: "2026-07-31T12:00:00.000Z", faultPoint: "after-claim-commit", input: { ...claimInput, idempotencyKey: "crash-claim-committed" } });
    database = new DatabaseSync(fixture.databasePath, { readOnly: true });
    assert.equal((database.prepare("SELECT state FROM page_jobs WHERE job_id = ?").get(enqueued.job.jobId) as { state: string }).state, "processing");
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM job_leases WHERE job_id = ? AND status = 'active'").get(enqueued.job.jobId) as { count: number }).count, 1);
    database.close();

    const recoveryInput = { projectId: fixture.projectId, runId: fixture.runId, evaluationTime: "2026-07-31T12:00:05.000Z", limit: 100, confirmation: "APPLY-RECOVERY" as const, ...mutation("crash-recovery") };
    await crash({ mode: "recover", databasePath: fixture.databasePath, now: "2026-07-31T12:00:05.000Z", faultPoint: "before-recovery-commit", input: recoveryInput });
    database = new DatabaseSync(fixture.databasePath, { readOnly: true });
    assert.equal((database.prepare("SELECT state FROM page_jobs WHERE job_id = ?").get(enqueued.job.jobId) as { state: string }).state, "processing");
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM recovery_operations WHERE idempotency_key = ?").get(recoveryInput.idempotencyKey) as { count: number }).count, 0);
    database.close();
    fixture.setNow("2026-07-31T12:00:05.000Z");
    assert.equal((await fixture.storage.recover(recoveryInput)).requeued, 1);

    const claim = await fixture.storage.claimNextWithLease({ projectId: fixture.projectId, runId: fixture.runId, ownerId: "checkpoint-owner", leaseDurationMs: 60_000, ...mutation("checkpoint-claim") });
    assert.ok(claim);
    const checkpointInput = { projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: "checkpoint-owner", phase: "crash-checkpoint", progress: 0.5, payload: { cursor: 50 }, operationId: "crash-checkpoint" };
    await crash({ mode: "checkpoint", databasePath: fixture.databasePath, now: "2026-07-31T12:00:06.000Z", faultPoint: "after-checkpoint-write", input: checkpointInput });
    assert.equal((await fixture.storage.listJobCheckpoints({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, limit: 10 })).length, 0);

    const outputsInput = { projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: "checkpoint-owner", outputs: [{ relativePath: "archive/process-kill.bin", byteLength: 10, sha256: "a".repeat(64), verificationPolicy: "size-and-sha256" as const }], operationId: "crash-output" };
    await crash({ mode: "outputs", databasePath: fixture.databasePath, now: "2026-07-31T12:00:06.000Z", faultPoint: "before-completion-descriptor-commit", input: outputsInput });
    database = new DatabaseSync(fixture.databasePath, { readOnly: true });
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM completed_outputs WHERE job_id = ?").get(claim.job.jobId) as { count: number }).count, 0);
    database.close();
    await crash({ mode: "outputs", databasePath: fixture.databasePath, now: "2026-07-31T12:00:06.000Z", faultPoint: "after-completion-descriptor-commit", input: outputsInput });
    database = new DatabaseSync(fixture.databasePath, { readOnly: true });
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM completed_outputs WHERE job_id = ?").get(claim.job.jobId) as { count: number }).count, 1);
    assert.equal(database.prepare("PRAGMA integrity_check").get()!["integrity_check"], "ok");
    database.close();
  } finally {
    await fixture.dispose();
  }
});

test("a killed Project owner leaves durable unclean-session evidence that the next open classifies", async () => {
  const fixture = await createQueueFixture("owa-unclean-session-");
  const projectPath = fixture.projectPath;
  const databasePath = fixture.databasePath;
  await fixture.storage.close();
  try {
    await crash({ mode: "open-storage", projectPath });
    const next = createSqliteProjectStorage({ applicationVersion: "0.7.0" });
    const summary = await next.open(projectPath);
    assert.equal(summary.recoveryStatus, "recovery-available");
    assert.equal(summary.recoverySummary.uncleanSessions >= 1, true);
    await next.close();
    const database = new DatabaseSync(databasePath, { readOnly: true });
    const sessions = database.prepare("SELECT close_kind, COUNT(*) AS count FROM execution_sessions GROUP BY close_kind ORDER BY close_kind").all() as { close_kind: string; count: number }[];
    assert.equal(sessions.some((row) => row.close_kind === "unclean-detected" && row.count >= 1), true);
    assert.equal(sessions.some((row) => row.close_kind === "clean" && row.count >= 2), true);
    database.close();
  } finally {
    await fixture.dispose();
  }
});
