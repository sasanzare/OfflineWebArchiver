import assert from "node:assert/strict";
import test from "node:test";
import { QueueOperationError, type PageJob } from "@offline-web-archive/archive-core";
import {
  PAGE_JOB_PRIORITY,
  QUEUE_LIMITS,
  QUEUE_STATE_MACHINE_VERSION,
  VALID_JOB_TRANSITIONS,
  assertAttemptPolicy,
  assertIdempotencyKey,
  assertTransition,
  calculatePriority,
  canTransition,
  classifyDuplicate,
  compareQueueOrder,
  deriveBatchItemIdempotencyKey,
  isPageJobState,
  isTerminalState,
  minimumDepth,
  sanitizeSafeMessage,
  serializeSafeJob,
  shouldRetry,
  validateResultSummary,
} from "@offline-web-archive/queue";

function job(overrides: Partial<PageJob> = {}): PageJob {
  return {
    jobId: "00000000-0000-4000-8000-000000000601",
    projectId: "00000000-0000-4000-8000-000000000602",
    runId: "00000000-0000-4000-8000-000000000603",
    projectRevisionId: "00000000-0000-4000-8000-000000000604",
    profileId: "00000000-0000-4000-8000-000000000605",
    profileRevisionId: "00000000-0000-4000-8000-000000000606",
    normalizationEngineVersion: 1,
    jobType: "page",
    normalizedUrl: "https://example.com/page?token=must-not-log",
    identityUrl: "https://example.com/page?token=must-not-log",
    safeDisplayUrl: "https://example.com/page",
    identityHash: "a".repeat(64),
    scopeDecisionId: "b".repeat(64),
    scopeReasonCode: "URL_ACCEPTED",
    state: "pending",
    priority: 500,
    prioritySource: "policy",
    queueSequence: 1,
    depth: 2,
    discoveryType: "dom-link",
    attemptCount: 0,
    fencingGeneration: 0,
    maxAttempts: 3,
    nextEligibleAt: "2026-07-31T12:00:00.000Z",
    claimToken: null,
    claimedBy: null,
    claimedAt: null,
    lastAttemptAt: null,
    completedAt: null,
    failedAt: null,
    completionKey: null,
    resultVersion: null,
    resultSummary: null,
    lastErrorCode: null,
    lastErrorCategory: null,
    lastErrorMessage: null,
    createdAt: "2026-07-31T12:00:00.000Z",
    updatedAt: "2026-07-31T12:00:00.000Z",
    queuedAt: "2026-07-31T12:00:00.000Z",
    ...overrides,
  };
}

test("Page Job states, terminal classification, and transition matrix are closed and versioned", () => {
  assert.equal(QUEUE_STATE_MACHINE_VERSION, 2);
  for (const state of ["pending", "processing", "completed", "failed", "retrying", "skipped", "blocked", "interrupted", "paused"] as const) assert.equal(isPageJobState(state), true);
  assert.equal(isPageJobState("leased"), false);
  for (const state of ["completed", "failed", "skipped", "blocked"] as const) assert.equal(isTerminalState(state), true);
  for (const [from, destinations] of Object.entries(VALID_JOB_TRANSITIONS)) {
    for (const to of destinations) assert.equal(canTransition(from as keyof typeof VALID_JOB_TRANSITIONS, to), true);
  }
  assert.throws(() => assertTransition("completed", "pending"), (error) => error instanceof QueueOperationError && error.code === "QUEUE_INVALID_TRANSITION");
  assert.throws(() => assertTransition("pending", "completed"), QueueOperationError);
});

test("priority, retry eligibility, attempt limits, keys, and minimum depth are deterministic", () => {
  assert.deepEqual(calculatePriority({ discoveryType: "seed" }), { priority: PAGE_JOB_PRIORITY.seed, source: "policy" });
  assert.deepEqual(calculatePriority({ discoveryType: "manual", requestedPriority: 321 }), { priority: 321, source: "explicit" });
  assert.equal(shouldRetry(1, 3, true), true);
  assert.equal(shouldRetry(3, 3, true), false);
  assert.equal(shouldRetry(1, 3, false), false);
  assert.doesNotThrow(() => assertAttemptPolicy(0, 1));
  assert.throws(() => assertAttemptPolicy(0, QUEUE_LIMITS.maximumAttempts + 1), QueueOperationError);
  assert.equal(minimumDepth(9, 2), 2);
  assert.equal(minimumDepth(2, 9), 2);
  assert.doesNotThrow(() => assertIdempotencyKey("queue.key:001"));
  assert.throws(() => assertIdempotencyKey("bad key"), QueueOperationError);
  assert.equal(deriveBatchItemIdempotencyKey("batch-001", 4), deriveBatchItemIdempotencyKey("batch-001", 4));
  assert.notEqual(deriveBatchItemIdempotencyKey("batch-001", 3), deriveBatchItemIdempotencyKey("batch-001", 4));
});

test("queue comparator uses stable ordinal tie-breakers", () => {
  const jobs = [
    job({ jobId: "00000000-0000-4000-8000-000000000699", queueSequence: 4, priority: 500, depth: 1 }),
    job({ jobId: "00000000-0000-4000-8000-000000000698", queueSequence: 2, priority: 500, depth: 1 }),
    job({ jobId: "00000000-0000-4000-8000-000000000697", queueSequence: 3, priority: 900, depth: 8 }),
  ];
  const original = String.prototype.localeCompare;
  String.prototype.localeCompare = () => { throw new Error("locale-dependent comparison called"); };
  try {
    jobs.sort(compareQueueOrder);
  } finally {
    String.prototype.localeCompare = original;
  }
  assert.deepEqual(jobs.map((item) => item.queueSequence), [3, 2, 4]);
});

test("safe serialization, result limits, and error redaction omit sensitive values", () => {
  const summary = serializeSafeJob(job({ claimToken: "00000000-0000-4000-8000-000000000688" }));
  const serialized = JSON.stringify(summary);
  assert.equal(serialized.includes("token=must-not-log"), false);
  assert.equal(serialized.includes("00000000-0000-4000-8000-000000000688"), false);
  assert.equal(sanitizeSafeMessage("https://example.com/?token=secret password=hunter2"), "[redacted-url] password=[redacted]");
  assert.deepEqual(validateResultSummary({ resultType: "queue-test", statusCode: 204, contentStored: false }), { resultType: "queue-test", statusCode: 204, contentStored: false });
  assert.throws(() => validateResultSummary({ resultType: "queue-test", statusCode: null, contentStored: false, metadata: { large: "x".repeat(QUEUE_LIMITS.resultMetadataBytes) } }), (error) => error instanceof QueueOperationError && error.code === "QUEUE_RESULT_TOO_LARGE");
  assert.equal(classifyDuplicate(null), "created");
  assert.equal(classifyDuplicate(job()), "existing");
});
