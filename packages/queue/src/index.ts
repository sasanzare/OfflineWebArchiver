import {
  PAGE_JOB_STATES,
  QueueOperationError,
  type PageJob,
  type PageJobDiscoveryType,
  type PageJobState,
  type QueueResultSummary,
} from "@offline-web-archive/archive-core";

export const QUEUE_STATE_MACHINE_VERSION = 2 as const;
export const QUEUE_PRIORITY_POLICY_VERSION = 1 as const;
export const QUEUE_LIMITS = Object.freeze({
  batch: 250,
  list: 200,
  retryRelease: 200,
  priorityMinimum: 0,
  priorityMaximum: 1_000,
  maximumAttempts: 100,
  idempotencyKeyLength: 128,
  safeMessageLength: 400,
  resultMetadataBytes: 4_096,
  resultMetadataDepth: 4,
});

export const PAGE_JOB_PRIORITY = Object.freeze({
  seed: 1_000,
  high: 750,
  normal: 500,
  low: 250,
  background: 100,
});

export const VALID_JOB_TRANSITIONS: Readonly<Record<PageJobState, readonly PageJobState[]>> = Object.freeze({
  pending: Object.freeze<PageJobState[]>(["processing", "skipped", "blocked"]),
  processing: Object.freeze<PageJobState[]>(["completed", "failed", "retrying", "skipped", "blocked", "interrupted", "paused"]),
  retrying: Object.freeze<PageJobState[]>(["pending", "failed"]),
  interrupted: Object.freeze<PageJobState[]>(["pending", "failed", "blocked"]),
  paused: Object.freeze<PageJobState[]>(["pending"]),
  completed: Object.freeze<PageJobState[]>([]),
  failed: Object.freeze<PageJobState[]>([]),
  skipped: Object.freeze<PageJobState[]>([]),
  blocked: Object.freeze<PageJobState[]>([]),
});

const TERMINAL_STATES = new Set<PageJobState>(["completed", "failed", "skipped", "blocked"]);
const KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function isPageJobState(value: unknown): value is PageJobState {
  return typeof value === "string" && (PAGE_JOB_STATES as readonly string[]).includes(value);
}

export function isTerminalState(state: PageJobState): boolean {
  return TERMINAL_STATES.has(state);
}

export function canTransition(from: PageJobState, to: PageJobState): boolean {
  return VALID_JOB_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: PageJobState, to: PageJobState): void {
  if (!canTransition(from, to)) {
    throw new QueueOperationError("QUEUE_INVALID_TRANSITION", `Page Job transition ${from} -> ${to} is not allowed`);
  }
}

export function assertUtcTimestamp(value: string, field: string): void {
  if (!UTC_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    throw new QueueOperationError("QUEUE_INPUT_INVALID", `${field} must be a UTC timestamp with milliseconds`);
  }
}

export function assertIdempotencyKey(value: string, field = "idempotencyKey"): void {
  if (value.length < 1 || value.length > QUEUE_LIMITS.idempotencyKeyLength || !KEY_PATTERN.test(value)) {
    throw new QueueOperationError("QUEUE_INPUT_INVALID", `${field} is invalid`);
  }
}

export function assertPriority(priority: number): void {
  if (!Number.isInteger(priority) || priority < QUEUE_LIMITS.priorityMinimum || priority > QUEUE_LIMITS.priorityMaximum) {
    throw new QueueOperationError("QUEUE_INPUT_INVALID", `Priority must be an integer from ${QUEUE_LIMITS.priorityMinimum} to ${QUEUE_LIMITS.priorityMaximum}`);
  }
}

export function assertAttemptPolicy(attemptCount: number, maxAttempts: number): void {
  if (!Number.isInteger(attemptCount) || attemptCount < 0) {
    throw new QueueOperationError("QUEUE_INPUT_INVALID", "Attempt count must be a non-negative integer");
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > QUEUE_LIMITS.maximumAttempts) {
    throw new QueueOperationError("QUEUE_INPUT_INVALID", `Maximum attempts must be from 1 to ${QUEUE_LIMITS.maximumAttempts}`);
  }
  if (attemptCount > maxAttempts) {
    throw new QueueOperationError("QUEUE_MAX_ATTEMPTS_REACHED", "Attempt count exceeds the maximum-attempt policy");
  }
}

export function calculatePriority(input: {
  discoveryType: PageJobDiscoveryType;
  requestedPriority?: number;
}): { priority: number; source: "policy" | "explicit" } {
  if (input.requestedPriority !== undefined) {
    assertPriority(input.requestedPriority);
    return { priority: input.requestedPriority, source: "explicit" };
  }
  if (input.discoveryType === "seed") return { priority: PAGE_JOB_PRIORITY.seed, source: "policy" };
  if (input.discoveryType === "manual") return { priority: PAGE_JOB_PRIORITY.high, source: "policy" };
  if (input.discoveryType === "sitemap") return { priority: 600, source: "policy" };
  if (input.discoveryType === "canonical" || input.discoveryType === "redirect") {
    return { priority: 625, source: "policy" };
  }
  return { priority: PAGE_JOB_PRIORITY.normal, source: "policy" };
}

export function shouldRetry(attemptCount: number, maxAttempts: number, retryable: boolean): boolean {
  assertAttemptPolicy(attemptCount, maxAttempts);
  return retryable && attemptCount < maxAttempts;
}

export function minimumDepth(currentDepth: number, discoveredDepth: number): number {
  if (!Number.isInteger(currentDepth) || currentDepth < 0 || !Number.isInteger(discoveredDepth) || discoveredDepth < 0) {
    throw new QueueOperationError("QUEUE_INPUT_INVALID", "Discovery depth must be a non-negative integer");
  }
  return Math.min(currentDepth, discoveredDepth);
}

export function compareQueueOrder(left: PageJob, right: PageJob): number {
  if (left.priority !== right.priority) return right.priority - left.priority;
  const eligible = left.nextEligibleAt < right.nextEligibleAt ? -1 : left.nextEligibleAt > right.nextEligibleAt ? 1 : 0;
  if (eligible !== 0) return eligible;
  if (left.depth !== right.depth) return left.depth - right.depth;
  if (left.queueSequence !== right.queueSequence) return left.queueSequence - right.queueSequence;
  return left.jobId < right.jobId ? -1 : left.jobId > right.jobId ? 1 : 0;
}

function metadataDepth(value: unknown, depth = 0): number {
  if (typeof value !== "object" || value === null) return depth;
  const children = Array.isArray(value) ? value : Object.values(value);
  return children.reduce((maximum, child) => Math.max(maximum, metadataDepth(child, depth + 1)), depth);
}

export function validateResultSummary(value: QueueResultSummary): QueueResultSummary {
  if (value.resultType !== "queue-test" || value.contentStored !== false) {
    throw new QueueOperationError("QUEUE_INPUT_INVALID", "Phase 6 accepts queue-test result metadata only");
  }
  if (value.statusCode !== null && (!Number.isInteger(value.statusCode) || value.statusCode < 100 || value.statusCode > 599)) {
    throw new QueueOperationError("QUEUE_INPUT_INVALID", "Result status code is invalid");
  }
  const encoded = JSON.stringify(value);
  let encodedBytes = 0;
  for (const character of encoded) {
    const codePoint = character.codePointAt(0) ?? 0;
    encodedBytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  if (encodedBytes > QUEUE_LIMITS.resultMetadataBytes) {
    throw new QueueOperationError("QUEUE_RESULT_TOO_LARGE", "Result metadata exceeds the Phase 6 limit");
  }
  if (metadataDepth(value) > QUEUE_LIMITS.resultMetadataDepth) {
    throw new QueueOperationError("QUEUE_RESULT_TOO_LARGE", "Result metadata is nested too deeply");
  }
  return value;
}

export function sanitizeSafeMessage(value: string): string {
  const sanitized = value
    .replace(/https?:\/\/[^\s]+/gi, "[redacted-url]")
    .replace(/(token|password|secret|cookie|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim();
  if (sanitized.length < 1) return "Queue operation failed safely.";
  return sanitized.slice(0, QUEUE_LIMITS.safeMessageLength);
}

export function classifyDuplicate(existing: PageJob | null): "created" | "existing" {
  return existing === null ? "created" : "existing";
}

export function serializeSafeJob(job: PageJob): Readonly<Record<string, unknown>> {
  return Object.freeze({
    jobId: job.jobId,
    projectId: job.projectId,
    runId: job.runId,
    profileRevisionId: job.profileRevisionId,
    engineVersion: job.normalizationEngineVersion,
    identityHash: job.identityHash,
    state: job.state,
    priority: job.priority,
    queueSequence: job.queueSequence,
    depth: job.depth,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
  });
}

export function deriveBatchItemIdempotencyKey(batchKey: string, index: number): string {
  assertIdempotencyKey(batchKey);
  if (!Number.isInteger(index) || index < 0 || index >= QUEUE_LIMITS.batch) {
    throw new QueueOperationError("QUEUE_INPUT_INVALID", "Batch item index is invalid");
  }
  let checksum = 2_166_136_261;
  for (let cursor = 0; cursor < batchKey.length; cursor += 1) {
    checksum ^= batchKey.charCodeAt(cursor);
    checksum = Math.imul(checksum, 16_777_619) >>> 0;
  }
  return `${batchKey.slice(0, 80)}.item-${index}.${checksum.toString(16).padStart(8, "0")}`;
}
