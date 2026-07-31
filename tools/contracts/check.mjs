import {
  CONTRACT_VERSION,
  createProjectCommand,
  createSystemDescribeCommand,
  parseCommandEnvelope,
  parseEventEnvelope,
  parseResponseEnvelope,
} from "@offline-web-archive/contracts";

const timestamp = "2026-07-31T12:00:00.000Z";
const metadata = { commandId: "contract-check-command", correlationId: "contract-check-correlation", timestamp };
const draft = {
  name: "Profile", baseUrl: "https://example.com/", seedUrls: ["https://example.com/"], authorization: { status: "incomplete", legalBasisReference: null, approvedBy: [], approvedAt: null, expiresAt: null },
  domainRules: [{ ruleId: "seed", effect: "allow", match: "exact", hostname: "example.com", schemes: ["https"], ports: [] }], pathRules: [],
  queryPolicy: { unknown: "identity", rules: [] }, fragmentPolicy: "ignore-all", redirectPolicy: { allowApprovedExternal: false, allowHttpsDowngrade: false },
  canonicalPolicy: { external: "ignore" }, networkPolicy: { allowedIpClasses: ["public"] }, limits: { maxDepth: 10, maxPages: 100, maxRedirects: 5, maxBatchSize: 10 },
};
const commands = [
  createSystemDescribeCommand(metadata),
  createProjectCommand("project.create", { destinationPath: "C:\\Projects\\sample", name: "Sample", slug: "sample" }, metadata),
  createProjectCommand("project.open", { projectPath: "/projects/sample" }, metadata),
  createProjectCommand("project.close", {}, metadata),
  createProjectCommand("project.validate", { projectPath: "/projects/sample" }, metadata),
  createProjectCommand("project.export", { projectPath: "/projects/sample", archivePath: "/exports/sample.zip" }, metadata),
  createProjectCommand("project.import", { archivePath: "/exports/sample.zip", destinationPath: "/projects/imported" }, metadata),
  createProjectCommand("project.info", { projectPath: "/projects/sample" }, metadata),
  createProjectCommand("profile.create", { projectPath: "/projects/sample", name: "Profile", seedUrl: "https://example.com/" }, metadata),
  createProjectCommand("profile.get", { projectPath: "/projects/sample" }, metadata),
  createProjectCommand("profile.update", { projectPath: "/projects/sample", expectedRevisionId: "00000000-0000-4000-8000-000000000001", draft }, metadata),
  createProjectCommand("profile.validate", { projectPath: "/projects/sample" }, metadata),
  createProjectCommand("profile.compare", { projectPath: "/projects/sample", fromSequence: 1, toSequence: 2 }, metadata),
  createProjectCommand("scope.evaluate", { projectPath: "/projects/sample", input: { url: "https://example.com/" } }, metadata),
  createProjectCommand("scope.evaluateBatch", { projectPath: "/projects/sample", inputs: [{ url: "https://example.com/" }] }, metadata),
  createProjectCommand("scope.explain", { projectPath: "/projects/sample", input: { url: "https://example.com/" } }, metadata),
  createProjectCommand("scope.previewNormalization", { projectPath: "/projects/sample", input: { url: "https://example.com/" } }, metadata),
  createProjectCommand("scope.getEngineInfo", {}, metadata),
  createProjectCommand("queue.enqueue", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", profileRevision: "00000000-0000-4000-8000-000000000602", url: "https://example.com/", discoveryType: "manual", maxAttempts: 3, idempotencyKey: "enqueue-001", operationId: "operation-enqueue" }, metadata),
  createProjectCommand("queue.enqueueBatch", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", profileRevision: "00000000-0000-4000-8000-000000000602", items: [{ url: "https://example.com/", discoveryType: "manual", maxAttempts: 3 }], idempotencyKey: "batch-001", operationId: "operation-batch" }, metadata),
  createProjectCommand("queue.claimNext", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", claimedBy: "contract-check", idempotencyKey: "claim-001", operationId: "operation-claim" }, metadata),
  createProjectCommand("queue.complete", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", jobId: "00000000-0000-4000-8000-000000000603", claimToken: "00000000-0000-4000-8000-000000000604", completionKey: "completion-001", resultSummary: { resultType: "queue-test", statusCode: null, contentStored: false }, completedAt: timestamp, idempotencyKey: "complete-001", operationId: "operation-complete" }, metadata),
  createProjectCommand("queue.fail", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", jobId: "00000000-0000-4000-8000-000000000603", claimToken: "00000000-0000-4000-8000-000000000604", failureKey: "failure-001", failureCode: "TEST_FAILURE", failureCategory: "domain", retryable: false, safeMessage: "safe test failure", failedAt: timestamp, idempotencyKey: "fail-001", operationId: "operation-fail" }, metadata),
  createProjectCommand("queue.scheduleRetry", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", jobId: "00000000-0000-4000-8000-000000000603", nextEligibleAt: timestamp, reasonCode: "TEST_RETRY", idempotencyKey: "retry-001", operationId: "operation-retry" }, metadata),
  createProjectCommand("queue.releaseDueRetries", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", dueAt: timestamp, limit: 10, idempotencyKey: "release-001", operationId: "operation-release" }, metadata),
  createProjectCommand("queue.skip", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", jobId: "00000000-0000-4000-8000-000000000603", reasonCode: "TEST_SKIP", safeMessage: "safe test skip", idempotencyKey: "skip-001", operationId: "operation-skip" }, metadata),
  createProjectCommand("queue.block", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", jobId: "00000000-0000-4000-8000-000000000603", reasonCode: "TEST_BLOCK", safeMessage: "safe test block", idempotencyKey: "block-001", operationId: "operation-block" }, metadata),
  createProjectCommand("queue.get", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", jobId: "00000000-0000-4000-8000-000000000603" }, metadata),
  createProjectCommand("queue.list", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", limit: 50 }, metadata),
  createProjectCommand("queue.getStatistics", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601" }, metadata),
  createProjectCommand("queue.getHistory", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", jobId: "00000000-0000-4000-8000-000000000603" }, metadata),
  createProjectCommand("queue.clearPending", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", confirmation: "CLEAR-PENDING-QUEUE", reasonCode: "TEST_CLEAR", idempotencyKey: "clear-001", operationId: "operation-clear" }, metadata),
];
commands.forEach((command) => parseCommandEnvelope(JSON.parse(JSON.stringify(command))));
parseResponseEnvelope({
  contractVersion: CONTRACT_VERSION,
  commandId: metadata.commandId,
  correlationId: metadata.correlationId,
  timestamp,
  status: "error",
  result: null,
  error: {
    code: "PROJECT_LOCKED",
    category: "application",
    message: "Contract validation fixture.",
    userMessage: "The fixture did not complete.",
    retryable: true,
  },
});
parseEventEnvelope({
  contractVersion: CONTRACT_VERSION,
  eventId: "contract-check-event",
  eventType: "project.operation.progress",
  correlationId: metadata.correlationId,
  sequence: 0,
  timestamp,
  payload: { operation: "project.export", stage: "snapshot", percent: 50 },
});
process.stdout.write(`Contract ${CONTRACT_VERSION} validated ${commands.length} commands plus response, error, and event envelopes.\n`);
