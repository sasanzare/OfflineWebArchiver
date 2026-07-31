import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { QueueOperationError } from "@offline-web-archive/archive-core";
import { createQueueFixture } from "../support/queue-fixture.js";

const operation = () => ({
  idempotencyKey: `mutation-${randomUUID()}`,
  operationId: `operation-${randomUUID()}`,
  correlationId: `correlation-${randomUUID()}`,
});

test("eligible enqueue, identity deduplication, discovery evidence, and reopen persistence work together", async () => {
  const fixture = await createQueueFixture();
  try {
    const firstInput = fixture.enqueueInput("https://example.com/articles?id=1&utm_source=one", { idempotencyKey: "enqueue-first", sourceDepth: 5 });
    const first = await fixture.storage.enqueue(firstInput);
    assert.equal(first.outcome, "created");
    if (first.job === null) throw new Error("Expected a created Page Job");

    const replay = await fixture.storage.enqueue({ ...firstInput, operationId: "operation-replay", correlationId: "correlation-replay" });
    assert.deepEqual(replay, first);
    const trackingDuplicate = await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/articles?utm_source=two&id=1#section", { idempotencyKey: "enqueue-tracking", sourceDepth: 7 }));
    assert.equal(trackingDuplicate.outcome, "existing");
    assert.equal(trackingDuplicate.job?.jobId, first.job.jobId);
    assert.equal(trackingDuplicate.job?.depth, 5);

    const functionalVariant = await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/articles?id=2", { idempotencyKey: "enqueue-functional" }));
    assert.equal(functionalVariant.outcome, "created");
    assert.notEqual(functionalVariant.job?.jobId, first.job.jobId);

    const rejected = await fixture.storage.enqueue(fixture.enqueueInput("https://outside.example/page", { idempotencyKey: "enqueue-rejected" }));
    assert.equal(rejected.outcome, "rejected");
    assert.equal(rejected.job, null);

    const parentOne = await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/parent-one", { idempotencyKey: "parent-one" }));
    const parentTwo = await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/parent-two", { idempotencyKey: "parent-two" }));
    if (parentOne.job === null || parentTwo.job === null) throw new Error("Expected parent Jobs");
    const childAtDepthFive = await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/child", { idempotencyKey: "child-depth-five", parentJobId: parentOne.job.jobId, sourceUrl: parentOne.job.safeDisplayUrl, sourceDepth: 5, discoveryType: "dom-link" }));
    const childAtDepthTwo = await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/child", { idempotencyKey: "child-depth-two", parentJobId: parentTwo.job.jobId, sourceUrl: parentTwo.job.safeDisplayUrl, sourceDepth: 2, discoveryType: "canonical" }));
    if (childAtDepthFive.job === null || childAtDepthTwo.job === null) throw new Error("Expected child Job");
    assert.equal(childAtDepthTwo.outcome, "existing");
    assert.equal(childAtDepthTwo.job.depth, 2);
    const history = await fixture.storage.getHistory({ projectId: fixture.projectId, runId: fixture.runId, jobId: childAtDepthTwo.job.jobId });
    assert.deepEqual(history.discoveries.map((item) => item.resultDepth).sort((left, right) => left - right), [2, 5]);
    assert.deepEqual(new Set(history.discoveries.map((item) => item.parentJobId)), new Set([parentOne.job.jobId, parentTwo.job.jobId]));

    await fixture.storage.close();
    await fixture.storage.open(fixture.projectPath);
    const reopened = await fixture.storage.get({ projectId: fixture.projectId, runId: fixture.runId, jobId: childAtDepthTwo.job.jobId });
    assert.equal(reopened.depth, 2);
    assert.equal((await fixture.storage.getHistory({ projectId: fixture.projectId, runId: fixture.runId, jobId: reopened.jobId })).discoveries.length, 2);
    assert.deepEqual(await fixture.storage.enqueue(firstInput), first);
  } finally {
    await fixture.dispose();
  }
});

test("best-effort batch preserves order and reports every outcome", async () => {
  const fixture = await createQueueFixture();
  try {
    const inputs = [
      fixture.enqueueInput("https://example.com/batch-a", { idempotencyKey: "batch-a" }),
      fixture.enqueueInput("https://outside.example/batch-b", { idempotencyKey: "batch-b" }),
      fixture.enqueueInput("https://example.com/batch-a#duplicate", { idempotencyKey: "batch-c" }),
    ];
    const batch = await fixture.storage.enqueueBatch(inputs);
    assert.deepEqual(batch.items.map((item) => item.outcome), ["created", "rejected", "existing"]);
    assert.deepEqual(batch.counts, { created: 1, existing: 1, rejected: 1, blocked: 0, invalid: 0, failed: 0 });
    await assert.rejects(() => fixture.storage.enqueueBatch(Array.from({ length: 251 }, (_, index) => fixture.enqueueInput(`https://example.com/${index}`))), (error) => error instanceof QueueOperationError && error.code === "QUEUE_BATCH_LIMIT_EXCEEDED");
  } finally {
    await fixture.dispose();
  }
});

test("claim, completion, failure, retry, skip, block, history, and statistics enforce the state machine", async () => {
  const fixture = await createQueueFixture();
  try {
    const high = await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/high", { requestedPriority: 900, idempotencyKey: "high", maxAttempts: 2 }));
    const low = await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/low", { requestedPriority: 100, idempotencyKey: "low", maxAttempts: 2 }));
    if (high.job === null || low.job === null) throw new Error("Expected queue Jobs");
    const claim = await fixture.storage.claimNext({ projectId: fixture.projectId, runId: fixture.runId, claimedBy: "integration-test", ...operation() });
    assert.equal(claim?.jobId, high.job.jobId);
    assert.equal(claim?.attemptCount, 1);
    assert.notEqual(claim?.claimToken, null);
    if (claim?.claimToken === null || claim === null) throw new Error("Expected claim token");
    await assert.rejects(() => fixture.storage.complete({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.jobId, claimToken: randomUUID(), completionKey: "complete-high", resultSummary: { resultType: "queue-test", statusCode: null, contentStored: false }, completedAt: "2026-07-31T12:01:00.000Z", ...operation() }), (error) => error instanceof QueueOperationError && error.code === "QUEUE_CLAIM_TOKEN_INVALID");
    const completionInput = { projectId: fixture.projectId, runId: fixture.runId, jobId: claim.jobId, claimToken: claim.claimToken, completionKey: "complete-high", resultSummary: { resultType: "queue-test" as const, statusCode: null, contentStored: false as const }, completedAt: "2026-07-31T12:01:00.000Z", ...operation() };
    const completed = await fixture.storage.complete(completionInput);
    assert.equal(completed.state, "completed");
    assert.deepEqual(await fixture.storage.complete(completionInput), completed);
    await assert.rejects(() => fixture.storage.complete({ ...completionInput, idempotencyKey: "complete-conflict", resultSummary: { resultType: "queue-test", statusCode: 204, contentStored: false } }), (error) => error instanceof QueueOperationError && error.code === "QUEUE_COMPLETION_CONFLICT");

    const lowClaim = await fixture.storage.claimNext({ projectId: fixture.projectId, runId: fixture.runId, claimedBy: "integration-test", ...operation() });
    assert.equal(lowClaim?.jobId, low.job.jobId);
    if (lowClaim?.claimToken === null || lowClaim === null) throw new Error("Expected low claim token");
    const failedToRetry = await fixture.storage.fail({ projectId: fixture.projectId, runId: fixture.runId, jobId: lowClaim.jobId, claimToken: lowClaim.claimToken, failureKey: "failure-low-1", failureCode: "TEST_RETRYABLE", failureCategory: "platform", retryable: true, safeMessage: "temporary at https://example.com/?token=secret", failedAt: "2026-07-31T12:02:00.000Z", nextEligibleAt: "2026-07-31T12:10:00.000Z", ...operation() });
    assert.equal(failedToRetry.state, "retrying");
    assert.equal(failedToRetry.lastErrorMessage?.includes("token=secret"), false);
    const scheduled = await fixture.storage.scheduleRetry({ projectId: fixture.projectId, runId: fixture.runId, jobId: lowClaim.jobId, nextEligibleAt: "2026-07-31T12:20:00.000Z", reasonCode: "TEST_DELAY", ...operation() });
    assert.equal(scheduled.nextEligibleAt, "2026-07-31T12:20:00.000Z");
    assert.equal((await fixture.storage.releaseDueRetries({ projectId: fixture.projectId, runId: fixture.runId, dueAt: "2026-07-31T12:19:59.999Z", limit: 10, ...operation() })).length, 0);
    assert.equal((await fixture.storage.releaseDueRetries({ projectId: fixture.projectId, runId: fixture.runId, dueAt: "2026-07-31T12:20:00.000Z", limit: 10, ...operation() })).length, 1);
    fixture.setNow("2026-07-31T12:20:00.000Z");
    const secondClaim = await fixture.storage.claimNext({ projectId: fixture.projectId, runId: fixture.runId, claimedBy: "integration-test", ...operation() });
    assert.equal(secondClaim?.jobId, low.job.jobId);
    assert.equal(secondClaim?.attemptCount, 2);
    if (secondClaim?.claimToken === null || secondClaim === null) throw new Error("Expected second claim token");
    const exhausted = await fixture.storage.fail({ projectId: fixture.projectId, runId: fixture.runId, jobId: secondClaim.jobId, claimToken: secondClaim.claimToken, failureKey: "failure-low-2", failureCode: "TEST_EXHAUSTED", failureCategory: "platform", retryable: true, safeMessage: "still unavailable", failedAt: "2026-07-31T12:21:00.000Z", nextEligibleAt: "2026-07-31T12:30:00.000Z", ...operation() });
    assert.equal(exhausted.state, "failed");

    const skipCandidate = await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/skip", { idempotencyKey: "skip-candidate" }));
    const blockCandidate = await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/block", { idempotencyKey: "block-candidate" }));
    if (skipCandidate.job === null || blockCandidate.job === null) throw new Error("Expected terminal-action candidates");
    assert.equal((await fixture.storage.skip({ projectId: fixture.projectId, runId: fixture.runId, jobId: skipCandidate.job.jobId, reasonCode: "TEST_SKIP", safeMessage: "explicit test skip", ...operation() })).state, "skipped");
    assert.equal((await fixture.storage.block({ projectId: fixture.projectId, runId: fixture.runId, jobId: blockCandidate.job.jobId, reasonCode: "TEST_BLOCK", safeMessage: "explicit test block", ...operation() })).state, "blocked");

    const statistics = await fixture.storage.getStatistics({ projectId: fixture.projectId, runId: fixture.runId, asOf: "2026-07-31T12:30:00.000Z" });
    assert.deepEqual({ total: statistics.total, completed: statistics.completed, failed: statistics.failed, skipped: statistics.skipped, blocked: statistics.blocked }, { total: 4, completed: 1, failed: 1, skipped: 1, blocked: 1 });
    const lowHistory = await fixture.storage.getHistory({ projectId: fixture.projectId, runId: fixture.runId, jobId: low.job.jobId });
    assert.deepEqual(lowHistory.transitions.map((item) => item.toState), ["pending", "processing", "retrying", "pending", "processing", "failed"]);
    assert.deepEqual(lowHistory.attempts.map((item) => item.attemptNumber), [1, 2]);
    assert.deepEqual(lowHistory.attempts.map((item) => item.outcome), ["retrying", "failed"]);
  } finally {
    await fixture.dispose();
  }
});

test("bounded listing and clear-pending retain terminal history without deletion", async () => {
  const fixture = await createQueueFixture();
  try {
    for (let index = 0; index < 4; index += 1) await fixture.storage.enqueue(fixture.enqueueInput(`https://example.com/list-${index}`, { idempotencyKey: `list-${index}` }));
    const firstPage = await fixture.storage.list({ projectId: fixture.projectId, runId: fixture.runId, limit: 2 });
    assert.equal(firstPage.jobs.length, 2);
    assert.notEqual(firstPage.nextCursor, null);
    const secondPage = await fixture.storage.list({ projectId: fixture.projectId, runId: fixture.runId, limit: 2, afterSequence: firstPage.nextCursor! });
    assert.equal(secondPage.jobs.length, 2);
    await assert.rejects(() => fixture.storage.list({ projectId: fixture.projectId, runId: fixture.runId, limit: 201 }), (error) => error instanceof QueueOperationError && error.code === "QUEUE_PAGINATION_LIMIT_EXCEEDED");
    await assert.rejects(() => fixture.storage.clearPending({ projectId: fixture.projectId, runId: fixture.runId, confirmation: "WRONG" as "CLEAR-PENDING-QUEUE", reasonCode: "TEST_CLEAR", ...operation() }), (error) => error instanceof QueueOperationError && error.code === "QUEUE_CLEAR_NOT_ALLOWED");
    assert.deepEqual(await fixture.storage.clearPending({ projectId: fixture.projectId, runId: fixture.runId, confirmation: "CLEAR-PENDING-QUEUE", reasonCode: "TEST_CLEAR", ...operation() }), { skipped: 4 });
    const database = new DatabaseSync(fixture.databasePath, { readOnly: true });
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM page_jobs").get() as { count: number }).count, 4);
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM job_transitions WHERE to_state = 'skipped'").get() as { count: number }).count, 4);
    database.close();
  } finally {
    await fixture.dispose();
  }
});
