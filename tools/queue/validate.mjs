import { QueueOperationError } from "@offline-web-archive/archive-core";
import {
  QUEUE_LIMITS,
  assertAttemptPolicy,
  assertIdempotencyKey,
  calculatePriority,
  deriveBatchItemIdempotencyKey,
  sanitizeSafeMessage,
  validateResultSummary,
} from "@offline-web-archive/queue";

assertAttemptPolicy(0, QUEUE_LIMITS.maximumAttempts);
assertIdempotencyKey("queue-validation:001");
if (calculatePriority({ discoveryType: "seed" }).priority !== 1_000) throw new Error("Seed priority policy drifted");
if (deriveBatchItemIdempotencyKey("queue-validation", 0) === deriveBatchItemIdempotencyKey("queue-validation", 1)) throw new Error("Batch keys collided");
if (sanitizeSafeMessage("https://example.com/?token=secret password=hunter2").includes("secret")) throw new Error("Queue redaction failed");
validateResultSummary({ resultType: "queue-test", statusCode: null, contentStored: false });
try {
  validateResultSummary({ resultType: "queue-test", statusCode: null, contentStored: false, metadata: { oversized: "x".repeat(QUEUE_LIMITS.resultMetadataBytes) } });
  throw new Error("Oversized Queue result was accepted");
} catch (error) {
  if (!(error instanceof QueueOperationError) || error.code !== "QUEUE_RESULT_TOO_LARGE") throw error;
}
process.stdout.write(`Queue limits, priority, idempotency, result validation, and redaction passed (batch ${QUEUE_LIMITS.batch}, list ${QUEUE_LIMITS.list}).\n`);
