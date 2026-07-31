import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { Worker } from "node:worker_threads";
import type { PageJob, QueueEnqueueInput } from "@offline-web-archive/archive-core";
import { createQueueFixture, QUEUE_TEST_TIME } from "../support/queue-fixture.js";

interface Work {
  method: "enqueue" | "claimNext" | "complete" | "fail" | "scheduleRetry" | "releaseDueRetries" | "getStatistics";
  input: unknown;
  now?: string;
}

type WorkerResult = { ok: true; result: unknown } | { ok: false; code: string; message: string };

async function race(databasePath: string, work: readonly Work[]): Promise<WorkerResult[]> {
  const workers = work.map((item) => new Worker(new URL("../support/queue-worker.js", import.meta.url), { workerData: { databasePath, now: item.now ?? QUEUE_TEST_TIME, method: item.method, input: item.input } }));
  try {
    await Promise.all(workers.map((worker) => new Promise<void>((resolve, reject) => {
      worker.once("error", reject);
      worker.once("message", (message: { type?: string }) => message.type === "ready" ? resolve() : reject(new Error("Queue worker did not become ready")));
    })));
    const results = workers.map((worker) => new Promise<WorkerResult>((resolve, reject) => {
      worker.once("error", reject);
      worker.once("message", (message: { type?: string } & WorkerResult) => {
        if (message.type === "result") resolve(message);
        else reject(new Error("Queue worker returned an invalid result"));
      });
    }));
    for (const worker of workers) worker.postMessage("start");
    return await Promise.all(results);
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate().catch(() => undefined)));
  }
}

const mutation = (prefix: string) => ({ idempotencyKey: `${prefix}-${randomUUID()}`, operationId: `operation-${randomUUID()}`, correlationId: `correlation-${randomUUID()}` });

function successfulJobs(results: readonly WorkerResult[]): PageJob[] {
  return results.filter((entry): entry is Extract<WorkerResult, { ok: true }> => entry.ok).map((entry) => entry.result).filter((entry): entry is PageJob => typeof entry === "object" && entry !== null && "jobId" in entry);
}

test("real SQLite connections serialize identical enqueue and duplicate discovery races", async () => {
  const fixture = await createQueueFixture("owa-queue-concurrency-");
  try {
    const identical = fixture.enqueueInput("https://example.com/concurrent-enqueue", { idempotencyKey: "concurrent-identical", operationId: "operation-identical", correlationId: "correlation-identical" });
    const identicalResults = await race(fixture.databasePath, [{ method: "enqueue", input: identical }, { method: "enqueue", input: identical }]);
    assert.equal(identicalResults.every((entry) => entry.ok), true);
    const identicalJobs = identicalResults.map((entry) => (entry as Extract<WorkerResult, { ok: true }>).result as { job: PageJob }).map((entry) => entry.job);
    assert.equal(new Set(identicalJobs.map((job) => job.jobId)).size, 1);

    const first = fixture.enqueueInput("https://example.com/discovery-race", { idempotencyKey: "discovery-race-a", operationId: "operation-discovery-a", correlationId: "correlation-discovery" });
    const second: QueueEnqueueInput = { ...first, idempotencyKey: "discovery-race-b", operationId: "operation-discovery-b" };
    const discoveryResults = await race(fixture.databasePath, [{ method: "enqueue", input: first }, { method: "enqueue", input: second }]);
    assert.equal(discoveryResults.every((entry) => entry.ok), true);
    const outcomes = discoveryResults.map((entry) => ((entry as Extract<WorkerResult, { ok: true }>).result as { outcome: string }).outcome).sort();
    assert.deepEqual(outcomes, ["created", "existing"]);
    const database = new DatabaseSync(fixture.databasePath, { readOnly: true });
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM page_jobs WHERE identity_hash = ?").get(first.scopeDecision.identityHash) as { count: number }).count, 1);
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM job_discoveries WHERE child_job_id = (SELECT job_id FROM page_jobs WHERE identity_hash = ?)").get(first.scopeDecision.identityHash) as { count: number }).count, 1);
    assert.equal(database.prepare("PRAGMA integrity_check").get()!["integrity_check"], "ok");
    database.close();
  } finally {
    await fixture.dispose();
  }
});

test("real SQLite connections permit exactly one claim and one completion transition", async () => {
  const fixture = await createQueueFixture("owa-queue-claim-race-");
  try {
    const enqueued = await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/claim-race", { idempotencyKey: "claim-race" }));
    if (enqueued.job === null) throw new Error("Expected Job");
    const claims = await race(fixture.databasePath, [
      { method: "claimNext", input: { projectId: fixture.projectId, runId: fixture.runId, claimedBy: "worker-a", ...mutation("claim-a") } },
      { method: "claimNext", input: { projectId: fixture.projectId, runId: fixture.runId, claimedBy: "worker-b", ...mutation("claim-b") } },
    ]);
    assert.equal(claims.every((entry) => entry.ok), true);
    const claimed = successfulJobs(claims);
    assert.equal(claimed.length, 1);
    assert.equal(claimed[0]!.attemptCount, 1);
    const claimToken = claimed[0]!.claimToken;
    if (claimToken === null) throw new Error("Expected claim token");
    const completion = { projectId: fixture.projectId, runId: fixture.runId, jobId: enqueued.job.jobId, claimToken, completionKey: "concurrent-completion", resultSummary: { resultType: "queue-test", statusCode: null, contentStored: false }, completedAt: "2026-07-31T12:01:00.000Z", idempotencyKey: "concurrent-complete", operationId: "operation-complete", correlationId: "correlation-complete" };
    const completions = await race(fixture.databasePath, [{ method: "complete", input: completion }, { method: "complete", input: completion }]);
    assert.equal(completions.every((entry) => entry.ok), true);
    const database = new DatabaseSync(fixture.databasePath, { readOnly: true });
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM job_attempts WHERE job_id = ?").get(enqueued.job.jobId) as { count: number }).count, 1);
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM job_transitions WHERE job_id = ? AND to_state = 'processing'").get(enqueued.job.jobId) as { count: number }).count, 1);
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM job_transitions WHERE job_id = ? AND to_state = 'completed'").get(enqueued.job.jobId) as { count: number }).count, 1);
    database.close();
  } finally {
    await fixture.dispose();
  }
});

test("concurrent identical failures replay one durable retry transition", async () => {
  const fixture = await createQueueFixture("owa-queue-failure-race-");
  try {
    const enqueued = await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/failure-race", { idempotencyKey: "failure-race", maxAttempts: 3 }));
    if (enqueued.job === null) throw new Error("Expected failure-race Job");
    const claim = await fixture.storage.claimNext({ projectId: fixture.projectId, runId: fixture.runId, claimedBy: "failure-owner", ...mutation("failure-claim") });
    if (claim === null || claim.claimToken === null) throw new Error("Expected failure-race claim");
    const failure = { projectId: fixture.projectId, runId: fixture.runId, jobId: claim.jobId, claimToken: claim.claimToken, failureKey: "concurrent-failure", failureCode: "TEST_RETRYABLE", failureCategory: "platform", retryable: true, safeMessage: "temporary failure", failedAt: "2026-07-31T12:03:00.000Z", nextEligibleAt: "2026-07-31T12:04:00.000Z", idempotencyKey: "concurrent-failure-operation", operationId: "operation-failure", correlationId: "correlation-failure" };
    const failures = await race(fixture.databasePath, [{ method: "fail", input: failure }, { method: "fail", input: failure }]);
    assert.equal(failures.every((entry) => entry.ok && (entry.result as PageJob).state === "retrying"), true);
    const database = new DatabaseSync(fixture.databasePath, { readOnly: true });
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM job_transitions WHERE job_id = ? AND to_state = 'retrying'").get(claim.jobId) as { count: number }).count, 1);
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM queue_operations WHERE operation_type = 'queue.fail' AND idempotency_key = ?").get(failure.idempotencyKey) as { count: number }).count, 1);
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM job_attempts WHERE job_id = ? AND outcome = 'retrying'").get(claim.jobId) as { count: number }).count, 1);
    database.close();
  } finally {
    await fixture.dispose();
  }
});

test("complete/fail and retry/release races preserve one terminal result and attempt numbering", async () => {
  const fixture = await createQueueFixture("owa-queue-terminal-race-");
  try {
    const terminalCandidate = await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/terminal-race", { idempotencyKey: "terminal-race", maxAttempts: 2 }));
    if (terminalCandidate.job === null) throw new Error("Expected terminal candidate");
    const claim = await fixture.storage.claimNext({ projectId: fixture.projectId, runId: fixture.runId, claimedBy: "race-owner", ...mutation("terminal-claim") });
    if (claim?.claimToken === null || claim === null) throw new Error("Expected terminal claim");
    const complete = { projectId: fixture.projectId, runId: fixture.runId, jobId: claim.jobId, claimToken: claim.claimToken, completionKey: "terminal-complete", resultSummary: { resultType: "queue-test", statusCode: null, contentStored: false }, completedAt: "2026-07-31T12:02:00.000Z", ...mutation("terminal-complete") };
    const fail = { projectId: fixture.projectId, runId: fixture.runId, jobId: claim.jobId, claimToken: claim.claimToken, failureKey: "terminal-fail", failureCode: "TEST_TERMINAL", failureCategory: "domain", retryable: false, safeMessage: "terminal race", failedAt: "2026-07-31T12:02:00.000Z", ...mutation("terminal-fail") };
    const terminalRace = await race(fixture.databasePath, [{ method: "complete", input: complete }, { method: "fail", input: fail }]);
    assert.equal(terminalRace.filter((entry) => entry.ok).length, 1);
    assert.equal(terminalRace.filter((entry) => !entry.ok && entry.code === "QUEUE_JOB_STATE_CONFLICT").length, 1);
    const terminal = await fixture.storage.get({ projectId: fixture.projectId, runId: fixture.runId, jobId: claim.jobId });
    assert.equal(["completed", "failed"].includes(terminal.state), true);

    const retryCandidate = await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/retry-race", { idempotencyKey: "retry-race", maxAttempts: 3, requestedPriority: 1_000 }));
    if (retryCandidate.job === null) throw new Error("Expected retry candidate");
    const retryClaim = await fixture.storage.claimNext({ projectId: fixture.projectId, runId: fixture.runId, claimedBy: "retry-owner", ...mutation("retry-claim") });
    if (retryClaim?.claimToken === null || retryClaim === null) throw new Error("Expected retry claim");
    await fixture.storage.fail({ projectId: fixture.projectId, runId: fixture.runId, jobId: retryClaim.jobId, claimToken: retryClaim.claimToken, failureKey: "retry-failure", failureCode: "TEST_RETRY", failureCategory: "platform", retryable: true, safeMessage: "retry later", failedAt: "2026-07-31T12:03:00.000Z", nextEligibleAt: "2026-07-31T12:04:00.000Z", ...mutation("retry-fail") });
    const retryRace = await race(fixture.databasePath, [
      { method: "releaseDueRetries", now: "2026-07-31T12:04:00.000Z", input: { projectId: fixture.projectId, runId: fixture.runId, dueAt: "2026-07-31T12:04:00.000Z", limit: 10, ...mutation("release") } },
      { method: "claimNext", now: "2026-07-31T12:04:00.000Z", input: { projectId: fixture.projectId, runId: fixture.runId, claimedBy: "retry-racer", ...mutation("retry-race-claim") } },
    ]);
    assert.equal(retryRace.every((entry) => entry.ok), true);
    fixture.setNow("2026-07-31T12:04:00.000Z");
    let current = await fixture.storage.get({ projectId: fixture.projectId, runId: fixture.runId, jobId: retryCandidate.job.jobId });
    if (current.state === "pending") current = (await fixture.storage.claimNext({ projectId: fixture.projectId, runId: fixture.runId, claimedBy: "after-race", ...mutation("after-race") }))!;
    assert.equal(current.state, "processing");
    assert.equal(current.attemptCount, 2);
    const database = new DatabaseSync(fixture.databasePath, { readOnly: true });
    const attempts = database.prepare("SELECT attempt_number FROM job_attempts WHERE job_id = ? ORDER BY attempt_number").all(current.jobId) as { attempt_number: number }[];
    assert.deepEqual(attempts.map((row) => row.attempt_number), [1, 2]);
    assert.equal(database.prepare("PRAGMA integrity_check").get()!["integrity_check"], "ok");
    database.close();
  } finally {
    await fixture.dispose();
  }
});

test("concurrent statistics readers and Project close leave the durable ledger intact", async () => {
  const fixture = await createQueueFixture("owa-queue-read-race-");
  try {
    await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/statistics", { idempotencyKey: "statistics" }));
    const reads = await race(fixture.databasePath, Array.from({ length: 4 }, () => ({ method: "getStatistics" as const, input: { projectId: fixture.projectId, runId: fixture.runId, asOf: QUEUE_TEST_TIME } })));
    assert.equal(reads.every((entry) => entry.ok && (entry.result as { total: number }).total === 1), true);
    await fixture.storage.close();
    const database = new DatabaseSync(fixture.databasePath, { readOnly: true });
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM page_jobs").get() as { count: number }).count, 1);
    assert.equal(database.prepare("PRAGMA integrity_check").get()!["integrity_check"], "ok");
    database.close();
    await fixture.storage.open(fixture.projectPath);
    assert.equal((await fixture.storage.getStatistics({ projectId: fixture.projectId, runId: fixture.runId, asOf: QUEUE_TEST_TIME })).total, 1);
  } finally {
    await fixture.dispose();
  }
});
