import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { Worker } from "node:worker_threads";
import { RecoveryOperationError } from "@offline-web-archive/archive-core";
import { createQueueFixture } from "../support/queue-fixture.js";

interface Work { method: "claim" | "recover" | "heartbeat"; input: unknown; now: string }
type WorkerResult = { ok: true; result: unknown } | { ok: false; code: string; message: string };

async function race(databasePath: string, work: readonly Work[]): Promise<WorkerResult[]> {
  const workers = work.map((item) => new Worker(new URL("../support/recovery-worker.js", import.meta.url), { workerData: { databasePath, ...item } }));
  try {
    await Promise.all(workers.map((worker) => new Promise<void>((resolve, reject) => {
      worker.once("error", reject);
      worker.once("message", (message: { type?: string }) => message.type === "ready" ? resolve() : reject(new Error("Recovery worker did not become ready")));
    })));
    const results = workers.map((worker) => new Promise<WorkerResult>((resolve, reject) => {
      worker.once("error", reject);
      worker.once("message", (message: { type?: string } & WorkerResult) => message.type === "result" ? resolve(message) : reject(new Error("Recovery worker returned an invalid result")));
    }));
    workers.forEach((worker) => worker.postMessage("start"));
    return await Promise.all(results);
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate().catch(() => undefined)));
  }
}

const mutation = (name: string) => ({ idempotencyKey: `${name}-${randomUUID()}`, operationId: `operation-${randomUUID()}`, correlationId: `correlation-${randomUUID()}` });

test("independent SQLite owners permit one Lease claim and one effective recovery", async () => {
  const fixture = await createQueueFixture("owa-recovery-concurrency-");
  try {
    await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/recovery-race"));
    const claims = await race(fixture.databasePath, [
      { method: "claim", now: "2026-07-31T12:00:00.000Z", input: { projectId: fixture.projectId, runId: fixture.runId, ownerId: "worker-a", leaseDurationMs: 60_000, ...mutation("worker-a") } },
      { method: "claim", now: "2026-07-31T12:00:00.000Z", input: { projectId: fixture.projectId, runId: fixture.runId, ownerId: "worker-b", leaseDurationMs: 60_000, ...mutation("worker-b") } },
    ]);
    assert.equal(claims.every((entry) => entry.ok), true);
    const values = claims.map((entry) => (entry as Extract<WorkerResult, { ok: true }>).result).filter((value) => value !== null) as { job: { jobId: string }; leaseToken: string; lease: { fencingGeneration: number; ownerId: string } }[];
    assert.equal(values.length, 1);
    const first = values[0]!;
    const recoveries = await race(fixture.databasePath, [
      { method: "recover", now: "2026-07-31T12:01:00.000Z", input: { projectId: fixture.projectId, runId: fixture.runId, evaluationTime: "2026-07-31T12:01:00.000Z", limit: 100, confirmation: "APPLY-RECOVERY", ...mutation("recover-a") } },
      { method: "recover", now: "2026-07-31T12:01:00.000Z", input: { projectId: fixture.projectId, runId: fixture.runId, evaluationTime: "2026-07-31T12:01:00.000Z", limit: 100, confirmation: "APPLY-RECOVERY", ...mutation("recover-b") } },
    ]);
    assert.equal(recoveries.every((entry) => entry.ok), true);
    const requeued = recoveries.reduce((sum, entry) => sum + Number(((entry as Extract<WorkerResult, { ok: true }>).result as { requeued: number }).requeued), 0);
    assert.equal(requeued, 1);
    const database = new DatabaseSync(fixture.databasePath, { readOnly: true });
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM recovery_events WHERE job_id = ? AND to_state = 'interrupted'").get(first.job.jobId) as { count: number }).count, 1);
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM recovery_events WHERE job_id = ? AND to_state = 'pending'").get(first.job.jobId) as { count: number }).count, 1);
    assert.equal(database.prepare("PRAGMA integrity_check").get()!["integrity_check"], "ok");
    database.close();

    fixture.setNow("2026-07-31T12:01:01.000Z");
    const second = await fixture.storage.claimNextWithLease({ projectId: fixture.projectId, runId: fixture.runId, ownerId: "new-owner", leaseDurationMs: 60_000, ...mutation("new-owner") });
    assert.ok(second);
    assert.equal(second.lease.fencingGeneration, 2);
    await assert.rejects(() => fixture.storage.heartbeatLease({ projectId: fixture.projectId, runId: fixture.runId, jobId: first.job.jobId, leaseToken: first.leaseToken, fencingGeneration: first.lease.fencingGeneration, ownerId: first.lease.ownerId, operationId: "stale-owner" }), (error) => error instanceof RecoveryOperationError && (error.code === "LEASE_TOKEN_INVALID" || error.code === "LEASE_NOT_FOUND"));
  } finally {
    await fixture.dispose();
  }
});
