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
const runId = "00000000-0000-4000-8000-000000000601";
const jobId = "00000000-0000-4000-8000-000000000603";
const leaseToken = "00000000-0000-4000-8000-000000000604";
const recoveryOperationId = "00000000-0000-4000-8000-000000000605";
const leaseOwnership = { jobId, leaseToken, fencingGeneration: 1, ownerId: "contract-check", operationId: "operation-owner" };
const interactionProfile = {
  schemaVersion: 1, profileId: "interaction-profile", profileRevisionId: "interaction-revision", projectId: "00000000-0000-4000-8000-000000000607",
  enabled: true, mode: "human-paced", seed: "contract-seed", actionDelayMinMs: 10, actionDelayMaxMs: 20, typingDelayMinMs: 5, typingDelayMaxMs: 10,
  pointerMoveDurationMinMs: 10, pointerMoveDurationMaxMs: 20, incrementalScroll: true, scrollStepMinPx: 10, scrollStepMaxPx: 20, scrollDelayMinMs: 5, scrollDelayMaxMs: 10,
  maxActionsPerPage: 10, maxInteractionDurationMs: 10_000, maxScrollSteps: 10, maxTabSteps: 10, maxPopupsPerPage: 2, maxDialogsPerPage: 2,
  maxTypedTextLength: 100, maxTargetLength: 128, maxTraceEvents: 50, maxTraceBytes: 16_384, maxScrollDistancePx: 1_000,
  dialogPolicy: { defaultAction: "dismiss", byType: {}, maximumHandlingDurationMs: 1_000 },
  popupPolicy: { defaultAction: "observe-close", allowedOrigins: [], maximumHandlingDurationMs: 1_000 }, cookieBannerRules: [],
};
const interactionPlan = {
  schemaVersion: 1, planId: "interaction-plan", approved: true, approvalReason: "contract fixture",
  steps: [
    { stepId: "focus", stepType: "focus", target: { strategy: "role", role: "textbox", name: "Search" }, sideEffect: "read-only", postcondition: { kind: "focused", target: { strategy: "role", role: "textbox", name: "Search" } } },
    { stepId: "type", stepType: "type_text", target: { strategy: "role", role: "textbox", name: "Search" }, characterCount: 3, textCategory: "non-sensitive", sideEffect: "read-only" },
  ],
};
const draft = {
  name: "Profile", baseUrl: "https://example.com/", seedUrls: ["https://example.com/"], authorization: { status: "incomplete", legalBasisReference: null, approvedBy: [], approvedAt: null, expiresAt: null },
  domainRules: [{ ruleId: "seed", effect: "allow", match: "exact", hostname: "example.com", schemes: ["https"], ports: [] }], pathRules: [],
  queryPolicy: { unknown: "identity", rules: [] }, fragmentPolicy: "ignore-all", redirectPolicy: { allowApprovedExternal: false, allowHttpsDowngrade: false },
  canonicalPolicy: { external: "ignore" }, networkPolicy: { allowedIpClasses: ["public"] }, limits: { maxDepth: 10, maxPages: 100, maxRedirects: 5, maxBatchSize: 10 },
};
const proxyId = "proxy-contract-fixture";
const proxyDraft = {
  id: proxyId,
  label: "Contract proxy",
  protocol: "http",
  host: "proxy.example.com",
  port: 8080,
  bypass: ["localhost"],
  weight: 1,
  priority: 0,
  maxConcurrency: 2,
  enabled: true,
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
  createProjectCommand("session.setProxyAffinity", { projectPath: "/projects/sample", sessionId: "00000000-0000-4000-8000-000000000608", proxyId }, metadata),
  createProjectCommand("proxy.create", { projectPath: "/projects/sample", proxy: proxyDraft }, metadata),
  createProjectCommand("proxy.get", { projectPath: "/projects/sample", proxyId }, metadata),
  createProjectCommand("proxy.list", { projectPath: "/projects/sample" }, metadata),
  createProjectCommand("proxy.update", { projectPath: "/projects/sample", proxyId, expectedRevision: 1, proxy: { ...proxyDraft, id: undefined, port: 8081 } }, metadata),
  createProjectCommand("proxy.enable", { projectPath: "/projects/sample", proxyId, expectedRevision: 1 }, metadata),
  createProjectCommand("proxy.disable", { projectPath: "/projects/sample", proxyId, expectedRevision: 1 }, metadata),
  createProjectCommand("proxy.delete", { projectPath: "/projects/sample", proxyId }, metadata),
  createProjectCommand("proxy.import", { projectPath: "/projects/sample", format: "csv", content: "protocol,host,port\nhttp,proxy.example.com,8080\n", operationId: "proxy-import-contract" }, metadata),
  createProjectCommand("proxy.test", { projectPath: "/projects/sample", proxyId, targetUrl: "https://example.com/", ipCheckUrl: "https://example.com/", timeoutMs: 5_000 }, metadata),
  createProjectCommand("proxy.eligibility", { projectPath: "/projects/sample", proxyId, now: timestamp }, metadata),
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
  createProjectCommand("queue.complete", { projectPath: "/projects/sample", runId, jobId, claimToken: leaseToken, ownerId: "contract-check", fencingGeneration: 1, completionKey: "completion-001", resultSummary: { resultType: "queue-test", statusCode: null, contentStored: false }, completedAt: timestamp, idempotencyKey: "complete-001", operationId: "operation-complete" }, metadata),
  createProjectCommand("queue.fail", { projectPath: "/projects/sample", runId, jobId, claimToken: leaseToken, ownerId: "contract-check", fencingGeneration: 1, failureKey: "failure-001", failureCode: "TEST_FAILURE", failureCategory: "domain", retryable: false, safeMessage: "safe test failure", failedAt: timestamp, idempotencyKey: "fail-001", operationId: "operation-fail" }, metadata),
  createProjectCommand("queue.scheduleRetry", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", jobId: "00000000-0000-4000-8000-000000000603", nextEligibleAt: timestamp, reasonCode: "TEST_RETRY", idempotencyKey: "retry-001", operationId: "operation-retry" }, metadata),
  createProjectCommand("queue.releaseDueRetries", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", dueAt: timestamp, limit: 10, idempotencyKey: "release-001", operationId: "operation-release" }, metadata),
  createProjectCommand("queue.skip", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", jobId: "00000000-0000-4000-8000-000000000603", reasonCode: "TEST_SKIP", safeMessage: "safe test skip", idempotencyKey: "skip-001", operationId: "operation-skip" }, metadata),
  createProjectCommand("queue.block", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", jobId: "00000000-0000-4000-8000-000000000603", reasonCode: "TEST_BLOCK", safeMessage: "safe test block", idempotencyKey: "block-001", operationId: "operation-block" }, metadata),
  createProjectCommand("queue.get", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", jobId: "00000000-0000-4000-8000-000000000603" }, metadata),
  createProjectCommand("queue.list", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", limit: 50 }, metadata),
  createProjectCommand("queue.getStatistics", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601" }, metadata),
  createProjectCommand("queue.getHistory", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", jobId: "00000000-0000-4000-8000-000000000603" }, metadata),
  createProjectCommand("queue.clearPending", { projectPath: "/projects/sample", runId: "00000000-0000-4000-8000-000000000601", confirmation: "CLEAR-PENDING-QUEUE", reasonCode: "TEST_CLEAR", idempotencyKey: "clear-001", operationId: "operation-clear" }, metadata),
  createProjectCommand("recovery.inspect", { projectPath: "/projects/sample", runId, evaluationTime: timestamp, limit: 100 }, metadata),
  createProjectCommand("recovery.recover", { projectPath: "/projects/sample", runId, evaluationTime: timestamp, limit: 100, confirmation: "APPLY-RECOVERY", idempotencyKey: "recovery-001", operationId: "operation-recovery" }, metadata),
  createProjectCommand("recovery.getReport", { projectPath: "/projects/sample", runId, recoveryOperationId }, metadata),
  createProjectCommand("recovery.heartbeat", { projectPath: "/projects/sample", runId, ...leaseOwnership }, metadata),
  createProjectCommand("recovery.renewLease", { projectPath: "/projects/sample", runId, ...leaseOwnership, extensionMs: 60_000 }, metadata),
  createProjectCommand("recovery.releaseLease", { projectPath: "/projects/sample", runId, ...leaseOwnership, reasonCode: "TEST_RELEASE" }, metadata),
  createProjectCommand("checkpoint.save", { projectPath: "/projects/sample", runId, ...leaseOwnership, phase: "render", progress: 0.5, relativePath: "pages/index.html", payload: { cursor: 1 } }, metadata),
  createProjectCommand("checkpoint.getLatest", { projectPath: "/projects/sample", runId, jobId }, metadata),
  createProjectCommand("checkpoint.list", { projectPath: "/projects/sample", runId, jobId, limit: 50 }, metadata),
  createProjectCommand("artifactCheckpoint.save", { projectPath: "/projects/sample", runId, ...leaseOwnership, artifactKey: "asset-1", artifactKind: "partial-file", relativePath: "assets/file.part", bytesWritten: 10, expectedBytes: 20, sha256: null, validator: "etag-1", resumeOffset: 10, committed: false }, metadata),
  createProjectCommand("artifactCheckpoint.validate", { projectPath: "/projects/sample", runId, jobId, artifactKey: "asset-1" }, metadata),
  createProjectCommand("run.requestPause", { projectPath: "/projects/sample", runId, operationId: "operation-pause" }, metadata),
  createProjectCommand("run.getPauseStatus", { projectPath: "/projects/sample", runId }, metadata),
  createProjectCommand("run.acknowledgePause", { projectPath: "/projects/sample", runId, ...leaseOwnership }, metadata),
  createProjectCommand("run.resume", { projectPath: "/projects/sample", runId, operationId: "operation-resume" }, metadata),
  createProjectCommand("run.getControlState", { projectPath: "/projects/sample", runId }, metadata),
  createProjectCommand("lease.list", { projectPath: "/projects/sample", runId, status: "active", limit: 50 }, metadata),
  createProjectCommand("lease.show", { projectPath: "/projects/sample", runId, jobId }, metadata),
  createProjectCommand("interaction.profile.get", { projectPath: "/projects/sample" }, metadata),
  createProjectCommand("interaction.profile.validate", { projectPath: "/projects/sample", profile: interactionProfile }, metadata),
  createProjectCommand("interaction.plan.validate", { projectPath: "/projects/sample", profile: interactionProfile, plan: interactionPlan }, metadata),
  createProjectCommand("interaction.run", { projectPath: "/projects/sample", runId, jobId, ownerId: "contract-check", leaseDurationMs: 60_000, planId: interactionPlan.planId, idempotencyKey: "interaction-run-001", operationId: "interaction-operation-001" }, metadata),
  createProjectCommand("interaction.trace.list", { projectPath: "/projects/sample", runId, jobId, limit: 50 }, metadata),
  createProjectCommand("interaction.trace.inspect", { projectPath: "/projects/sample", runId, jobId, traceId: "interaction-trace-001" }, metadata),
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
