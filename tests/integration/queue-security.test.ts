import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { QueueOperationError } from "@offline-web-archive/archive-core";
import { createQueueFixture } from "../support/queue-fixture.js";

const mutation = (key: string) => ({ idempotencyKey: key, operationId: `operation-${randomUUID()}`, correlationId: `correlation-${randomUUID()}` });

test("Queue persistence rejects cross-owner, injection, claim, state, idempotency, and oversized-result attacks", async () => {
  const fixture = await createQueueFixture("owa-queue-security-");
  try {
    const input = fixture.enqueueInput("https://example.com/private?id=1&token=super-secret", { idempotencyKey: "security-enqueue", operationId: "operation-security", correlationId: "correlation-security" });
    const enqueued = await fixture.storage.enqueue(input);
    if (enqueued.job === null) throw new Error("Expected security-test Job");
    const serializedJob = JSON.stringify(enqueued.job);
    assert.equal(serializedJob.includes("super-secret"), false);
    const database = new DatabaseSync(fixture.databasePath);
    const rawSecretCount = (database.prepare(`SELECT COUNT(*) AS count FROM page_jobs
      WHERE normalized_url LIKE '%super-secret%' OR identity_url LIKE '%super-secret%' OR safe_display_url LIKE '%super-secret%'`).get() as { count: number }).count;
    assert.equal(rawSecretCount, 0);
    assert.throws(() => database.prepare("UPDATE page_jobs SET state = 'leased' WHERE job_id = ?").run(enqueued.job!.jobId));
    database.close();

    await assert.rejects(() => fixture.storage.enqueue({ ...fixture.enqueueInput("https://example.com/different"), idempotencyKey: input.idempotencyKey, operationId: input.operationId, correlationId: input.correlationId }), (error) => error instanceof QueueOperationError && error.code === "QUEUE_OPERATION_IDEMPOTENCY_CONFLICT");
    await assert.rejects(() => fixture.storage.get({ projectId: randomUUID(), runId: fixture.runId, jobId: enqueued.job!.jobId }), (error) => error instanceof QueueOperationError && error.code === "QUEUE_PROJECT_NOT_OPEN");
    await assert.rejects(() => fixture.storage.get({ projectId: fixture.projectId, runId: randomUUID(), jobId: enqueued.job!.jobId }), (error) => error instanceof QueueOperationError && error.code === "QUEUE_RUN_NOT_FOUND");
    await assert.rejects(() => fixture.storage.get({ projectId: fixture.projectId, runId: fixture.runId, jobId: "' OR 1=1 --" }), (error) => error instanceof QueueOperationError && error.code === "QUEUE_JOB_NOT_FOUND");

    const claimed = await fixture.storage.claimNext({ projectId: fixture.projectId, runId: fixture.runId, claimedBy: "security-test", ...mutation("security-claim") });
    if (claimed === null || claimed.claimToken === null) throw new Error("Expected claimed security-test Job");
    const claimToken = claimed.claimToken;
    await assert.rejects(() => fixture.storage.fail({ projectId: fixture.projectId, runId: fixture.runId, jobId: claimed.jobId, claimToken: randomUUID(), failureKey: "bad-claim", failureCode: "SECURITY_TEST", failureCategory: "domain", retryable: false, safeMessage: "safe", failedAt: "2026-07-31T12:01:00.000Z", ...mutation("bad-claim-operation") }), (error) => error instanceof QueueOperationError && error.code === "QUEUE_CLAIM_TOKEN_INVALID");
    await assert.rejects(() => fixture.storage.complete({ projectId: fixture.projectId, runId: fixture.runId, jobId: claimed.jobId, claimToken, completionKey: "oversized-result", resultSummary: { resultType: "queue-test", statusCode: null, contentStored: false, metadata: { oversized: "x".repeat(4_096) } }, completedAt: "2026-07-31T12:01:00.000Z", ...mutation("oversized-result-operation") }), (error) => error instanceof QueueOperationError && error.code === "QUEUE_RESULT_TOO_LARGE");
    const failed = await fixture.storage.fail({ projectId: fixture.projectId, runId: fixture.runId, jobId: claimed.jobId, claimToken, failureKey: "redacted-failure", failureCode: "SECURITY_TEST", failureCategory: "domain", retryable: false, safeMessage: "See https://example.com/?token=super-secret password=hunter2", failedAt: "2026-07-31T12:02:00.000Z", ...mutation("redacted-failure-operation") });
    assert.equal(failed.lastErrorMessage?.includes("super-secret"), false);
    assert.equal(failed.lastErrorMessage?.includes("hunter2"), false);
  } finally {
    await fixture.dispose();
  }
});
