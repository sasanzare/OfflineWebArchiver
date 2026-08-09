import {
  RecoveryOperationError,
  validateCanonicalRelativePath,
  type ArtifactCheckpoint,
  type Clock,
  type CompletedOutputDescriptor,
  type JobLease,
} from "@offline-web-archive/archive-core";

export const RECOVERY_MODEL_VERSION = 1 as const;
export const CHECKPOINT_MODEL_VERSION = 1 as const;
export const LEASE_CONFIGURATION_VERSION = 1 as const;

export const RECOVERY_LIMITS = Object.freeze({
  leaseMinimumMs: 5_000,
  leaseMaximumMs: 86_400_000,
  leaseDefaultMs: 60_000,
  heartbeatDefaultMs: 15_000,
  checkpointPayloadBytes: 16_384,
  checkpointPayloadDepth: 6,
  checkpointList: 200,
  leaseList: 200,
  recoveryBatch: 100,
  recoveryBatchMaximum: 500,
  artifactKeyLength: 160,
  artifactPathLength: 2_048,
});

export interface LeaseConfiguration {
  version: typeof LEASE_CONFIGURATION_VERSION;
  durationMs: number;
  heartbeatIntervalMs: number;
  renewalExtensionMs: number;
  recoveryBatchSize: number;
  projectOpenPolicy: "inspect";
}

export const DEFAULT_LEASE_CONFIGURATION: LeaseConfiguration = Object.freeze({
  version: LEASE_CONFIGURATION_VERSION,
  durationMs: RECOVERY_LIMITS.leaseDefaultMs,
  heartbeatIntervalMs: RECOVERY_LIMITS.heartbeatDefaultMs,
  renewalExtensionMs: RECOVERY_LIMITS.leaseDefaultMs,
  recoveryBatchSize: RECOVERY_LIMITS.recoveryBatch,
  projectOpenPolicy: "inspect",
});

const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const SECRET_KEY_PATTERN = /(?:token|secret|password|cookie|authorization|credential|api[-_]?key)/i;

export function createSystemClock(): Clock {
  return Object.freeze({ now: () => new Date().toISOString() });
}

export function createFakeClock(initial: string): Clock & { set(value: string): void; advance(milliseconds: number): void } {
  let instant = parseUtc(initial, "initial");
  return {
    now: () => new Date(instant).toISOString(),
    set(value: string): void { instant = parseUtc(value, "clock value"); },
    advance(milliseconds: number): void {
      if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) throw new RecoveryOperationError("RECOVERY_INPUT_INVALID", "Clock advance must be a non-negative safe integer");
      instant += milliseconds;
    },
  };
}

export function parseUtc(value: string, field: string): number {
  if (!UTC_PATTERN.test(value)) throw new RecoveryOperationError("RECOVERY_INPUT_INVALID", `${field} must be a UTC timestamp with milliseconds`);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new RecoveryOperationError("RECOVERY_INPUT_INVALID", `${field} is not a valid timestamp`);
  return timestamp;
}

export function validateLeaseConfiguration(value: LeaseConfiguration): LeaseConfiguration {
  if (value.version !== LEASE_CONFIGURATION_VERSION) throw new RecoveryOperationError("RECOVERY_INPUT_INVALID", "Lease configuration version is unsupported");
  validateLeaseDuration(value.durationMs);
  validateLeaseDuration(value.renewalExtensionMs);
  if (!Number.isSafeInteger(value.heartbeatIntervalMs) || value.heartbeatIntervalMs < 1_000 || value.heartbeatIntervalMs >= value.durationMs) {
    throw new RecoveryOperationError("RECOVERY_INPUT_INVALID", "Heartbeat interval must be at least one second and shorter than the Lease duration");
  }
  validateRecoveryLimit(value.recoveryBatchSize);
  if (value.projectOpenPolicy !== "inspect") throw new RecoveryOperationError("RECOVERY_INPUT_INVALID", "Project open may inspect recovery state but cannot mutate it automatically");
  return Object.freeze({ ...value });
}

export function validateLeaseDuration(milliseconds: number): number {
  if (!Number.isSafeInteger(milliseconds) || milliseconds < RECOVERY_LIMITS.leaseMinimumMs || milliseconds > RECOVERY_LIMITS.leaseMaximumMs) {
    throw new RecoveryOperationError("RECOVERY_INPUT_INVALID", `Lease duration must be from ${RECOVERY_LIMITS.leaseMinimumMs} to ${RECOVERY_LIMITS.leaseMaximumMs} milliseconds`);
  }
  return milliseconds;
}

export function validateRecoveryLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 1 || limit > RECOVERY_LIMITS.recoveryBatchMaximum) {
    throw new RecoveryOperationError("RECOVERY_INPUT_INVALID", `Recovery batch size must be from 1 to ${RECOVERY_LIMITS.recoveryBatchMaximum}`);
  }
  return limit;
}

export function calculateLeaseExpiry(baseTime: string, durationMs: number): string {
  return new Date(parseUtc(baseTime, "Lease base time") + validateLeaseDuration(durationMs)).toISOString();
}

export function isLeaseExpired(lease: Pick<JobLease, "status" | "expiresAt">, evaluationTime: string): boolean {
  return lease.status === "active" && parseUtc(evaluationTime, "evaluationTime") >= parseUtc(lease.expiresAt, "expiresAt");
}

export function nextLeaseExpiry(lease: Pick<JobLease, "status" | "expiresAt">, renewalTime: string, extensionMs: number): string {
  if (lease.status !== "active") throw new RecoveryOperationError("LEASE_RENEWAL_INVALID", "Only an active Lease can be renewed");
  if (isLeaseExpired(lease, renewalTime)) throw new RecoveryOperationError("LEASE_EXPIRED", "An expired Lease cannot be renewed");
  return calculateLeaseExpiry(renewalTime, extensionMs);
}

export function validatePortableRelativePath(value: string): string {
  const result = validateCanonicalRelativePath(value);
  if (!result.valid || result.normalized === null || value.length > RECOVERY_LIMITS.artifactPathLength) {
    throw new RecoveryOperationError("ARTIFACT_CHECKPOINT_INVALID", result.message || "Artifact paths must be bounded portable relative paths");
  }
  return result.normalized;
}

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, ordered(child)]));
}

function valueDepth(value: unknown, depth = 0): number {
  if (typeof value !== "object" || value === null) return depth;
  const children = Array.isArray(value) ? value : Object.values(value);
  return children.reduce((maximum, child) => Math.max(maximum, valueDepth(child, depth + 1)), depth);
}

function utf8Bytes(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const point = character.codePointAt(0) ?? 0;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

export function validateCheckpointPayload(payload: Readonly<Record<string, unknown>>): string {
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (typeof value !== "object" || value === null) return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY_PATTERN.test(key)) throw new RecoveryOperationError("CHECKPOINT_INVALID", "Checkpoint payload keys cannot contain credential material");
      visit(child);
    }
  };
  visit(payload);
  if (valueDepth(payload) > RECOVERY_LIMITS.checkpointPayloadDepth) throw new RecoveryOperationError("CHECKPOINT_TOO_LARGE", "Checkpoint payload is nested too deeply");
  const canonical = JSON.stringify(ordered(payload));
  if (utf8Bytes(canonical) > RECOVERY_LIMITS.checkpointPayloadBytes) throw new RecoveryOperationError("CHECKPOINT_TOO_LARGE", "Checkpoint payload exceeds its byte limit");
  return canonical;
}

export function validateCheckpointProgress(progress: number): number {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) throw new RecoveryOperationError("CHECKPOINT_INVALID", "Checkpoint progress must be from zero to one");
  return progress;
}

export function validateArtifactCheckpoint(value: Pick<ArtifactCheckpoint, "artifactKey" | "relativePath" | "bytesWritten" | "expectedBytes" | "sha256" | "resumeOffset">): void {
  if (value.artifactKey.length < 1 || value.artifactKey.length > RECOVERY_LIMITS.artifactKeyLength) throw new RecoveryOperationError("ARTIFACT_CHECKPOINT_INVALID", "Artifact key is invalid");
  validatePortableRelativePath(value.relativePath);
  if (!Number.isSafeInteger(value.bytesWritten) || value.bytesWritten < 0 || !Number.isSafeInteger(value.resumeOffset) || value.resumeOffset < 0 || value.resumeOffset > value.bytesWritten) {
    throw new RecoveryOperationError("ARTIFACT_CHECKPOINT_INVALID", "Artifact byte counters are invalid");
  }
  if (value.expectedBytes !== null && (!Number.isSafeInteger(value.expectedBytes) || value.expectedBytes < value.bytesWritten)) throw new RecoveryOperationError("ARTIFACT_CHECKPOINT_INVALID", "Expected artifact size is invalid");
  if (value.sha256 !== null && !HASH_PATTERN.test(value.sha256)) throw new RecoveryOperationError("ARTIFACT_CHECKPOINT_INVALID", "Artifact SHA-256 is invalid");
}

export type PartialFileDecision = "resume" | "restart" | "discard" | "complete";

export function decidePartialFileRecovery(input: {
  localBytes: number;
  expectedBytes: number | null;
  rangeSupported: boolean;
  storedValidator: string | null;
  remoteValidator: string | null;
  storedSha256: string | null;
  actualSha256: string | null;
}): { decision: PartialFileDecision; reasonCode: string; resumeOffset: number } {
  if (!Number.isSafeInteger(input.localBytes) || input.localBytes < 0 || (input.expectedBytes !== null && (!Number.isSafeInteger(input.expectedBytes) || input.expectedBytes < 0))) {
    throw new RecoveryOperationError("ARTIFACT_CHECKPOINT_INVALID", "Partial-file sizes are invalid");
  }
  if (input.expectedBytes !== null && input.localBytes === input.expectedBytes) {
    const hashesMatch = input.storedSha256 === null || input.actualSha256 === input.storedSha256;
    return hashesMatch
      ? { decision: "complete", reasonCode: "PARTIAL_ALREADY_COMPLETE", resumeOffset: input.localBytes }
      : { decision: "discard", reasonCode: "PARTIAL_HASH_MISMATCH", resumeOffset: 0 };
  }
  if (input.localBytes === 0) return { decision: "restart", reasonCode: "PARTIAL_EMPTY", resumeOffset: 0 };
  if (!input.rangeSupported) return { decision: "restart", reasonCode: "RANGE_NOT_SUPPORTED", resumeOffset: 0 };
  if (input.storedValidator === null || input.remoteValidator === null || input.storedValidator !== input.remoteValidator) {
    return { decision: "restart", reasonCode: "REMOTE_VALIDATOR_CHANGED", resumeOffset: 0 };
  }
  if (input.expectedBytes !== null && input.localBytes > input.expectedBytes) return { decision: "discard", reasonCode: "PARTIAL_SIZE_EXCEEDED", resumeOffset: 0 };
  return { decision: "resume", reasonCode: "RANGE_RESUME_SAFE", resumeOffset: input.localBytes };
}

export function classifyNetworkInterruption(input: { responseStarted: boolean; bytesWritten: number; retryableTransportError: boolean }): "retry-from-checkpoint" | "restart-request" | "terminal-network-failure" {
  if (!input.retryableTransportError) return "terminal-network-failure";
  return input.responseStarted && input.bytesWritten > 0 ? "retry-from-checkpoint" : "restart-request";
}

export function validateCompletedOutputDescriptor(value: CompletedOutputDescriptor): CompletedOutputDescriptor {
  validatePortableRelativePath(value.relativePath);
  if (!Number.isSafeInteger(value.byteLength) || value.byteLength < 0 || !HASH_PATTERN.test(value.sha256) || value.verificationPolicy !== "size-and-sha256") {
    throw new RecoveryOperationError("OUTPUT_DESCRIPTOR_INVALID", "Completed output descriptor is invalid");
  }
  return value;
}
