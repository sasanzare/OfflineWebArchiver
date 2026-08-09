import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { RecoveryOperationError } from "@offline-web-archive/archive-core";
import { createQueueFixture } from "../support/queue-fixture.js";

function mutation(name: string) {
  return { idempotencyKey: `${name}-${randomUUID()}`, operationId: `operation-${randomUUID()}`, correlationId: `correlation-${randomUUID()}` };
}

test("Lease claim, heartbeat, renewal, Checkpoint, expiry recovery, and fencing survive restart semantics", async () => {
  const fixture = await createQueueFixture("owa-recovery-lifecycle-");
  try {
    await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/recovery"));
    const claimInput = { projectId: fixture.projectId, runId: fixture.runId, ownerId: "owner-one", leaseDurationMs: 60_000, ...mutation("claim-one") };
    const claim = await fixture.storage.claimNextWithLease(claimInput);
    assert.ok(claim);
    assert.equal(claim.job.fencingGeneration, 1);
    const replayedClaim = await fixture.storage.claimNextWithLease(claimInput);
    assert.equal(replayedClaim?.leaseToken, claim.leaseToken);
    const database = new DatabaseSync(fixture.databasePath, { readOnly: true });
    try {
      const operation = database.prepare("SELECT result_json FROM queue_operations WHERE operation_type = 'recovery.claimNextWithLease' AND idempotency_key = ?").get(claimInput.idempotencyKey) as { result_json: string };
      assert.deepEqual(JSON.parse(operation.result_json), { jobId: claim.job.jobId });
    } finally {
      database.close();
    }
    const initialExpiry = claim.lease.expiresAt;
    fixture.setNow("2026-07-31T12:00:15.000Z");
    assert.equal((await fixture.storage.heartbeatLease({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: 1, ownerId: "owner-one", operationId: "heartbeat-one" })).expiresAt, initialExpiry);
    const renewed = await fixture.storage.renewLease({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: 1, ownerId: "owner-one", extensionMs: 60_000, operationId: "renew-one" });
    assert.equal(renewed.expiresAt, "2026-07-31T12:01:15.000Z");
    const first = await fixture.storage.saveJobCheckpoint({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: 1, ownerId: "owner-one", phase: "document", progress: 0.25, relativePath: "temp/page.html.part", payload: { cursor: 25 }, operationId: "checkpoint-one" });
    const second = await fixture.storage.saveJobCheckpoint({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: 1, ownerId: "owner-one", phase: "document", progress: 0.75, relativePath: "temp/page.html.part", payload: { cursor: 75 }, operationId: "checkpoint-two" });
    assert.equal(second.supersedesCheckpointId, first.checkpointId);
    assert.equal((await fixture.storage.listJobCheckpoints({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, limit: 10 })).length, 2);
    await fixture.storage.saveArtifactCheckpoint({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: 1, ownerId: "owner-one", artifactKey: "document", artifactKind: "partial-file", relativePath: "temp/page.html.part", bytesWritten: 75, expectedBytes: 100, sha256: null, validator: "etag-1", resumeOffset: 75, committed: true, operationId: "artifact-one" });
    assert.equal((await fixture.storage.validateArtifactCheckpoint({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, artifactKey: "document" })).valid, true);

    fixture.setNow("2026-07-31T12:01:15.000Z");
    const inspection = await fixture.storage.inspectRecovery({ projectId: fixture.projectId, runId: fixture.runId, evaluationTime: "2026-07-31T12:01:15.000Z", limit: 100 });
    assert.equal(inspection.dryRun, true);
    assert.equal(inspection.items[0]?.reasonCode, "LEASE_EXPIRED");
    assert.equal((await fixture.storage.get({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId })).state, "processing");
    const recovered = await fixture.storage.recover({ projectId: fixture.projectId, runId: fixture.runId, evaluationTime: "2026-07-31T12:01:15.000Z", limit: 100, confirmation: "APPLY-RECOVERY", ...mutation("recover-one") });
    assert.equal(recovered.interrupted, 1);
    assert.equal(recovered.requeued, 1);
    assert.equal((await fixture.storage.get({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId })).state, "pending");
    await assert.rejects(() => fixture.storage.heartbeatLease({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: 1, ownerId: "owner-one", operationId: "stale-heartbeat" }), (error) => error instanceof RecoveryOperationError && error.code === "LEASE_NOT_FOUND");

    const secondClaim = await fixture.storage.claimNextWithLease({ projectId: fixture.projectId, runId: fixture.runId, ownerId: "owner-two", leaseDurationMs: 60_000, ...mutation("claim-two") });
    assert.ok(secondClaim);
    assert.equal(secondClaim.job.fencingGeneration, 2);
    await assert.rejects(() => fixture.storage.complete({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, claimToken: claim.leaseToken, completionKey: "stale-complete", resultSummary: { resultType: "queue-test", statusCode: null, contentStored: false }, completedAt: "2026-07-31T12:01:16.000Z", ...mutation("stale-complete") }));
  } finally {
    await fixture.dispose();
  }
});

test("Pause is cooperative and persistent; Resume requeues paused work idempotently", async () => {
  const fixture = await createQueueFixture("owa-pause-resume-");
  try {
    await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/pause"));
    const claim = await fixture.storage.claimNextWithLease({ projectId: fixture.projectId, runId: fixture.runId, ownerId: "pause-owner", leaseDurationMs: 60_000, ...mutation("pause-claim") });
    assert.ok(claim);
    const requested = await fixture.storage.requestPause({ projectId: fixture.projectId, runId: fixture.runId, operationId: "pause-request" });
    assert.equal(requested.controlState, "pause_requested");
    assert.equal(requested.runState, "pausing");
    await assert.rejects(() => fixture.storage.claimNextWithLease({ projectId: fixture.projectId, runId: fixture.runId, ownerId: "blocked-owner", leaseDurationMs: 60_000, ...mutation("blocked-claim") }), (error) => error instanceof RecoveryOperationError && error.code === "RUN_NOT_ACTIVE");
    const paused = await fixture.storage.acknowledgePause({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: "pause-owner", operationId: "pause-ack", correlationId: "pause-correlation" });
    assert.equal(paused.state, "paused");
    assert.equal((await fixture.storage.getPauseStatus({ projectId: fixture.projectId, runId: fixture.runId })).runState, "paused");
    await fixture.storage.close();
    await fixture.storage.open(fixture.projectPath);
    assert.equal((await fixture.storage.getRunState({ projectId: fixture.projectId, runId: fixture.runId })).runState, "paused");
    const resumed = await fixture.storage.resumeRun({ projectId: fixture.projectId, runId: fixture.runId, operationId: "resume-one", correlationId: "resume-correlation" });
    assert.equal(resumed.controlState, "active");
    assert.equal(resumed.runState, "running");
    assert.equal((await fixture.storage.get({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId })).state, "pending");
    assert.equal((await fixture.storage.resumeRun({ projectId: fixture.projectId, runId: fixture.runId, operationId: "resume-two", correlationId: "resume-correlation-two" })).controlState, "active");
  } finally {
    await fixture.dispose();
  }
});

test("Completed output descriptors verify size and SHA-256 without silently reopening terminal Jobs", async () => {
  const fixture = await createQueueFixture("owa-output-verification-");
  try {
    await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/output"));
    const claim = await fixture.storage.claimNextWithLease({ projectId: fixture.projectId, runId: fixture.runId, ownerId: "output-owner", leaseDurationMs: 60_000, ...mutation("output-claim") });
    assert.ok(claim);
    const bytes = Buffer.from("verified-output", "utf8");
    const relativePath = "archive/output.bin";
    await mkdir(path.join(fixture.projectPath, "archive"), { recursive: true });
    await writeFile(path.join(fixture.projectPath, ...relativePath.split("/")), bytes);
    await fixture.storage.saveCompletedOutputs({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: "output-owner", outputs: [{ relativePath, byteLength: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex"), verificationPolicy: "size-and-sha256" }], operationId: "output-descriptor" });
    await fixture.storage.complete({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, claimToken: claim.leaseToken, completionKey: "output-complete", resultSummary: { resultType: "queue-test", statusCode: null, contentStored: false }, completedAt: "2026-07-31T12:00:30.000Z", ...mutation("output-complete") });
    assert.equal((await fixture.storage.verifyCompletedOutput({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, projectRoot: fixture.projectPath }))[0]?.verificationStatus, "valid");
    await writeFile(path.join(fixture.projectPath, ...relativePath.split("/")), "changed");
    assert.equal((await fixture.storage.verifyCompletedOutput({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, projectRoot: fixture.projectPath }))[0]?.verificationStatus, "size-mismatch");
    assert.equal((await fixture.storage.get({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId })).state, "completed");
  } finally {
    await fixture.dispose();
  }
});

test("Resume remains deterministic after 5m, 6h, 24h, 3d, and 14d clock advances", async () => {
  const fixture = await createQueueFixture("owa-multiday-resume-");
  const horizons = [5 * 60_000, 6 * 60 * 60_000, 24 * 60 * 60_000, 3 * 24 * 60 * 60_000, 14 * 24 * 60 * 60_000];
  let instant = Date.parse("2026-07-31T12:00:00.000Z");
  try {
    for (const [index, horizon] of horizons.entries()) {
      fixture.setNow(new Date(instant).toISOString());
      const enqueued = await fixture.storage.enqueue(fixture.enqueueInput(`https://example.com/multiday-${index}`));
      assert.ok(enqueued.job);
      const claim = await fixture.storage.claimNextWithLease({ projectId: fixture.projectId, runId: fixture.runId, ownerId: `multiday-${index}`, leaseDurationMs: 60_000, ...mutation(`multiday-claim-${index}`) });
      assert.ok(claim);
      await fixture.storage.saveJobCheckpoint({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: `multiday-${index}`, phase: "multiday", progress: 0.5, payload: { horizon }, operationId: `multiday-checkpoint-${index}` });
      instant += horizon;
      fixture.setNow(new Date(instant).toISOString());
      const recovered = await fixture.storage.recover({ projectId: fixture.projectId, runId: fixture.runId, evaluationTime: new Date(instant).toISOString(), limit: 100, confirmation: "APPLY-RECOVERY", ...mutation(`multiday-recover-${index}`) });
      assert.equal(recovered.requeued, 1);
      assert.equal((await fixture.storage.getLatestJobCheckpoint({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId }))?.phase, "multiday");
      await fixture.storage.skip({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.job.jobId, reasonCode: "MULTIDAY_DONE", safeMessage: "Multi-day test completed.", ...mutation(`multiday-skip-${index}`) });
    }
  } finally {
    await fixture.dispose();
  }
});
