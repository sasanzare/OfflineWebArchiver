import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTRACT_VERSION,
  ContractValidationError,
  createProjectCommand,
  createSystemDescribeCommand,
  parseCommandEnvelope,
  parseEventEnvelope,
  parseResponseEnvelope,
} from "@offline-web-archive/contracts";

const metadata = {
  commandId: "command-1",
  correlationId: "correlation-1",
  timestamp: "2026-07-31T12:00:00.000Z",
};

const draft = {
  name: "Profile", baseUrl: "https://example.com/", seedUrls: ["https://example.com/"],
  authorization: { status: "incomplete" as const, legalBasisReference: null, approvedBy: [], approvedAt: null, expiresAt: null },
  domainRules: [{ ruleId: "seed", effect: "allow" as const, match: "exact" as const, hostname: "example.com", schemes: ["https" as const], ports: [] }],
  pathRules: [], queryPolicy: { unknown: "identity" as const, rules: [] }, fragmentPolicy: "ignore-all" as const,
  redirectPolicy: { allowApprovedExternal: false, allowHttpsDowngrade: false }, canonicalPolicy: { external: "ignore" as const },
  networkPolicy: { allowedIpClasses: ["public" as const] }, limits: { maxDepth: 10, maxPages: 100, maxRedirects: 5, maxBatchSize: 10 },
};

const queueOwner = { projectPath: "/archive", runId: "00000000-0000-4000-8000-000000000601" };
const queueMutation = { idempotencyKey: "queue-operation-001", operationId: "operation-queue-001" };
const queueItem = { url: "https://example.com/page", discoveryType: "manual" as const, maxAttempts: 3 };

function pageJob() {
  return {
    jobId: "00000000-0000-4000-8000-000000000602", projectId: "00000000-0000-4000-8000-000000000603", runId: queueOwner.runId,
    projectRevisionId: "00000000-0000-4000-8000-000000000604", profileId: "00000000-0000-4000-8000-000000000605", profileRevisionId: "00000000-0000-4000-8000-000000000606",
    normalizationEngineVersion: 1, jobType: "page", normalizedUrl: "https://example.com/page", identityUrl: "https://example.com/page", safeDisplayUrl: "https://example.com/page",
    identityHash: "a".repeat(64), scopeDecisionId: "b".repeat(64), scopeReasonCode: "URL_ACCEPTED", state: "pending", priority: 750, prioritySource: "policy", queueSequence: 1,
    depth: 0, discoveryType: "manual", attemptCount: 0, maxAttempts: 3, nextEligibleAt: metadata.timestamp, claimToken: null, claimedBy: null, claimedAt: null, lastAttemptAt: null,
    completedAt: null, failedAt: null, completionKey: null, resultVersion: null, resultSummary: null, lastErrorCode: null, lastErrorCategory: null, lastErrorMessage: null,
    createdAt: metadata.timestamp, updatedAt: metadata.timestamp, queuedAt: metadata.timestamp,
  };
}

test("all Project, Profile, Scope, and Queue command contracts survive JSON serialization", () => {
  const commands = [
    createSystemDescribeCommand(metadata),
    createProjectCommand("project.create", { destinationPath: "C:\\archive", name: "Archive", slug: "archive" }, metadata),
    createProjectCommand("project.open", { projectPath: "/archive" }, metadata),
    createProjectCommand("project.close", {}, metadata),
    createProjectCommand("project.validate", { projectPath: "/archive" }, metadata),
    createProjectCommand("project.export", { projectPath: "/archive", archivePath: "/archive.zip" }, metadata),
    createProjectCommand("project.import", { archivePath: "/archive.zip", destinationPath: "/copy" }, metadata),
    createProjectCommand("project.info", {}, metadata),
    createProjectCommand("profile.create", { projectPath: "/archive", name: "Profile", seedUrl: "https://example.com/" }, metadata),
    createProjectCommand("profile.get", { projectPath: "/archive" }, metadata),
    createProjectCommand("profile.update", { projectPath: "/archive", expectedRevisionId: "00000000-0000-4000-8000-000000000001", draft }, metadata),
    createProjectCommand("profile.validate", { projectPath: "/archive" }, metadata),
    createProjectCommand("profile.compare", { projectPath: "/archive", fromSequence: 1, toSequence: 2 }, metadata),
    createProjectCommand("scope.evaluate", { projectPath: "/archive", input: { rawUrl: "../page", sourceUrl: "https://example.com/docs/", sourceDepth: 2, discoveryType: "dom-link", profileRevision: "00000000-0000-4000-8000-000000000001" } }, metadata),
    createProjectCommand("scope.evaluateBatch", { projectPath: "/archive", inputs: [{ url: "https://example.com/" }] }, metadata),
    createProjectCommand("scope.explain", { projectPath: "/archive", input: { url: "https://example.com/" } }, metadata),
    createProjectCommand("scope.previewNormalization", { projectPath: "/archive", input: { url: "https://example.com/" } }, metadata),
    createProjectCommand("scope.getEngineInfo", {}, metadata),
    createProjectCommand("queue.enqueue", { ...queueOwner, profileRevision: "00000000-0000-4000-8000-000000000606", ...queueItem, ...queueMutation }, metadata),
    createProjectCommand("queue.enqueueBatch", { ...queueOwner, profileRevision: "00000000-0000-4000-8000-000000000606", items: [queueItem], ...queueMutation }, metadata),
    createProjectCommand("queue.claimNext", { ...queueOwner, claimedBy: "contract-test", ...queueMutation }, metadata),
    createProjectCommand("queue.complete", { ...queueOwner, jobId: pageJob().jobId, claimToken: "00000000-0000-4000-8000-000000000607", completionKey: "completion-001", resultSummary: { resultType: "queue-test", statusCode: null, contentStored: false }, completedAt: metadata.timestamp, ...queueMutation }, metadata),
    createProjectCommand("queue.fail", { ...queueOwner, jobId: pageJob().jobId, claimToken: "00000000-0000-4000-8000-000000000607", failureKey: "failure-001", failureCode: "TEST_FAILURE", failureCategory: "domain", retryable: true, safeMessage: "safe failure", failedAt: metadata.timestamp, nextEligibleAt: "2026-07-31T12:01:00.000Z", ...queueMutation }, metadata),
    createProjectCommand("queue.scheduleRetry", { ...queueOwner, jobId: pageJob().jobId, nextEligibleAt: "2026-07-31T12:01:00.000Z", reasonCode: "TEST_RETRY", ...queueMutation }, metadata),
    createProjectCommand("queue.releaseDueRetries", { ...queueOwner, dueAt: metadata.timestamp, limit: 25, ...queueMutation }, metadata),
    createProjectCommand("queue.skip", { ...queueOwner, jobId: pageJob().jobId, reasonCode: "TEST_SKIP", safeMessage: "safe skip", ...queueMutation }, metadata),
    createProjectCommand("queue.block", { ...queueOwner, jobId: pageJob().jobId, reasonCode: "TEST_BLOCK", safeMessage: "safe block", ...queueMutation }, metadata),
    createProjectCommand("queue.get", { ...queueOwner, jobId: pageJob().jobId }, metadata),
    createProjectCommand("queue.list", { ...queueOwner, state: "pending", afterSequence: 0, limit: 50 }, metadata),
    createProjectCommand("queue.getStatistics", queueOwner, metadata),
    createProjectCommand("queue.getHistory", { ...queueOwner, jobId: pageJob().jobId }, metadata),
    createProjectCommand("queue.clearPending", { ...queueOwner, confirmation: "CLEAR-PENDING-QUEUE", reasonCode: "TEST_CLEAR", ...queueMutation }, metadata),
  ];
  commands.forEach((command) => assert.deepEqual(parseCommandEnvelope(JSON.parse(JSON.stringify(command))), command));
});

test("unknown fields, malformed payloads, and unsupported versions fail closed", () => {
  const base = createSystemDescribeCommand(metadata);
  assert.throws(() => parseCommandEnvelope({ ...base, unexpected: true }), ContractValidationError);
  assert.throws(
    () => parseCommandEnvelope({ ...base, contractVersion: "2.0.0" }),
    (error) => error instanceof ContractValidationError && error.code === "CONTRACT_UNSUPPORTED_VERSION",
  );
  assert.throws(() => createProjectCommand("project.create", { destinationPath: "/x", name: "X", slug: "Bad Slug" }, metadata));
  assert.throws(() => createProjectCommand("queue.enqueueBatch", { ...queueOwner, profileRevision: "00000000-0000-4000-8000-000000000606", items: Array.from({ length: 251 }, () => queueItem), ...queueMutation }, metadata));
  assert.throws(() => createProjectCommand("queue.list", { ...queueOwner, limit: 201 }, metadata));
  assert.throws(() => createProjectCommand("queue.get", { ...queueOwner, jobId: "' OR 1=1 --" }, metadata));
  assert.throws(() => createProjectCommand("queue.list", { ...queueOwner, state: "leased", limit: 25 }, metadata));
});

test("Queue Job, statistics, transition event, and stable Queue error responses validate", () => {
  const jobResponse = parseResponseEnvelope({ contractVersion: CONTRACT_VERSION, commandId: metadata.commandId, correlationId: metadata.correlationId, timestamp: metadata.timestamp, status: "success", result: { resultType: "queue.job", action: "get", job: pageJob() }, error: null });
  assert.equal(jobResponse.status, "success");
  const statisticsResponse = parseResponseEnvelope({ contractVersion: CONTRACT_VERSION, commandId: metadata.commandId, correlationId: metadata.correlationId, timestamp: metadata.timestamp, status: "success", result: { resultType: "queue.statistics", statistics: { total: 1, pending: 1, processing: 0, completed: 0, failed: 0, retrying: 0, skipped: 0, blocked: 0, dueRetries: 0, exhaustedRetries: 0, maximumDepth: 0, averageDepth: 0, oldestPendingAt: metadata.timestamp, newestJobAt: metadata.timestamp, duplicateDiscoveries: 0 } }, error: null });
  assert.equal(statisticsResponse.status, "success");
  const transition = parseEventEnvelope({ contractVersion: CONTRACT_VERSION, eventId: "queue-event-1", eventType: "queue.job.claimed", correlationId: metadata.correlationId, sequence: 1, timestamp: metadata.timestamp, payload: { operation: "queue.claimNext", stage: "processing", percent: 100 } });
  assert.equal(transition.eventType, "queue.job.claimed");
  const queueError = parseResponseEnvelope({ contractVersion: CONTRACT_VERSION, commandId: metadata.commandId, correlationId: metadata.correlationId, timestamp: metadata.timestamp, status: "error", result: null, error: { code: "QUEUE_CLAIM_TOKEN_INVALID", category: "domain", message: "The claim token is invalid.", userMessage: "The claim token is invalid.", retryable: false } });
  assert.equal(queueError.status, "error");
});

test("response and progress event envelopes preserve correlation", () => {
  const response = parseResponseEnvelope({
    contractVersion: CONTRACT_VERSION,
    commandId: metadata.commandId,
    correlationId: metadata.correlationId,
    timestamp: metadata.timestamp,
    status: "error",
    result: null,
    error: { code: "PROJECT_LOCKED", category: "application", message: "Fixture failure.", userMessage: "The operation failed.", retryable: true },
  });
  const event = parseEventEnvelope({
    contractVersion: CONTRACT_VERSION,
    eventId: "event-1",
    eventType: "project.operation.progress",
    correlationId: response.correlationId,
    sequence: 0,
    timestamp: response.timestamp,
    payload: { operation: "project.import", stage: "inspect", percent: 10 },
  });
  assert.equal(event.correlationId, "correlation-1");
});
