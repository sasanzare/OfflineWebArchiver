import assert from "node:assert/strict";
import test from "node:test";
import { RecoveryOperationError } from "@offline-web-archive/archive-core";
import {
  DEFAULT_LEASE_CONFIGURATION,
  RECOVERY_LIMITS,
  calculateLeaseExpiry,
  classifyNetworkInterruption,
  createFakeClock,
  decidePartialFileRecovery,
  isLeaseExpired,
  nextLeaseExpiry,
  validateCheckpointPayload,
  validateLeaseConfiguration,
  validatePortableRelativePath,
} from "@offline-web-archive/recovery";

test("Clock, Lease expiry boundary, renewal, and configuration are deterministic", () => {
  const clock = createFakeClock("2026-08-01T00:00:00.000Z");
  const expiresAt = calculateLeaseExpiry(clock.now(), 60_000);
  const lease = { status: "active" as const, expiresAt };
  clock.advance(59_999);
  assert.equal(isLeaseExpired(lease, clock.now()), false);
  clock.advance(1);
  assert.equal(isLeaseExpired(lease, clock.now()), true);
  assert.throws(() => nextLeaseExpiry(lease, clock.now(), 60_000), (error) => error instanceof RecoveryOperationError && error.code === "LEASE_EXPIRED");
  assert.deepEqual(validateLeaseConfiguration(DEFAULT_LEASE_CONFIGURATION), DEFAULT_LEASE_CONFIGURATION);
  assert.throws(() => validateLeaseConfiguration({ ...DEFAULT_LEASE_CONFIGURATION, heartbeatIntervalMs: DEFAULT_LEASE_CONFIGURATION.durationMs }), RecoveryOperationError);
});

test("Checkpoint payloads and artifact paths are bounded and reject credential material", () => {
  assert.equal(validateCheckpointPayload({ phase: "serialize", cursor: 12, relativePath: "archive/page.html" }), '{"cursor":12,"phase":"serialize","relativePath":"archive/page.html"}');
  for (const payload of [{ token: "secret" }, { nested: { cookie: "secret" } }, { authorizationHeader: "secret" }]) {
    assert.throws(() => validateCheckpointPayload(payload), (error) => error instanceof RecoveryOperationError && error.code === "CHECKPOINT_INVALID");
  }
  assert.throws(() => validateCheckpointPayload({ data: "x".repeat(RECOVERY_LIMITS.checkpointPayloadBytes + 1) }), (error) => error instanceof RecoveryOperationError && error.code === "CHECKPOINT_TOO_LARGE");
  assert.equal(validatePortableRelativePath("archive/assets/app.js.part"), "archive/assets/app.js.part");
  for (const value of ["../outside", "/absolute", "C:\\absolute", "archive\\file", "archive//file"]) assert.throws(() => validatePortableRelativePath(value), RecoveryOperationError);
});

test("Partial-file and network interruption decisions fail safe", () => {
  assert.deepEqual(decidePartialFileRecovery({ localBytes: 100, expectedBytes: 200, rangeSupported: true, storedValidator: "etag-1", remoteValidator: "etag-1", storedSha256: null, actualSha256: null }), { decision: "resume", reasonCode: "RANGE_RESUME_SAFE", resumeOffset: 100 });
  assert.equal(decidePartialFileRecovery({ localBytes: 100, expectedBytes: 200, rangeSupported: false, storedValidator: "etag-1", remoteValidator: "etag-1", storedSha256: null, actualSha256: null }).decision, "restart");
  assert.equal(decidePartialFileRecovery({ localBytes: 100, expectedBytes: 200, rangeSupported: true, storedValidator: "etag-1", remoteValidator: "etag-2", storedSha256: null, actualSha256: null }).reasonCode, "REMOTE_VALIDATOR_CHANGED");
  assert.equal(decidePartialFileRecovery({ localBytes: 200, expectedBytes: 200, rangeSupported: true, storedValidator: "etag-1", remoteValidator: "etag-1", storedSha256: "a".repeat(64), actualSha256: "b".repeat(64) }).decision, "discard");
  assert.equal(classifyNetworkInterruption({ responseStarted: true, bytesWritten: 10, retryableTransportError: true }), "retry-from-checkpoint");
  assert.equal(classifyNetworkInterruption({ responseStarted: false, bytesWritten: 0, retryableTransportError: true }), "restart-request");
  assert.equal(classifyNetworkInterruption({ responseStarted: true, bytesWritten: 10, retryableTransportError: false }), "terminal-network-failure");
});
