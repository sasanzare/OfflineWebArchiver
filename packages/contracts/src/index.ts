import { z } from "zod";

export const CONTRACT_VERSION = "1.6.0" as const;

export const COMMAND_TYPES = [
  "system.describe",
  "project.create",
  "project.open",
  "project.close",
  "project.validate",
  "project.export",
  "project.import",
  "project.info",
  "profile.create",
  "profile.get",
  "profile.update",
  "profile.validate",
  "profile.compare",
  "scope.evaluate",
  "scope.evaluateBatch",
  "scope.explain",
  "scope.previewNormalization",
  "scope.getEngineInfo",
  "queue.enqueue",
  "queue.enqueueBatch",
  "queue.claimNext",
  "queue.complete",
  "queue.fail",
  "queue.scheduleRetry",
  "queue.releaseDueRetries",
  "queue.skip",
  "queue.block",
  "queue.get",
  "queue.list",
  "queue.getStatistics",
  "queue.getHistory",
  "queue.clearPending",
  "recovery.inspect",
  "recovery.recover",
  "recovery.getReport",
  "recovery.heartbeat",
  "recovery.renewLease",
  "recovery.releaseLease",
  "checkpoint.save",
  "checkpoint.getLatest",
  "checkpoint.list",
  "artifactCheckpoint.save",
  "artifactCheckpoint.validate",
  "run.requestPause",
  "run.getPauseStatus",
  "run.acknowledgePause",
  "run.resume",
  "run.getControlState",
  "lease.list",
  "lease.show",
  "browser.getRuntimeInfo",
  "browser.validateInstallation",
  "browser.getHealth",
  "browser.restart",
  "render.start",
  "render.getStatus",
  "render.getResult",
  "render.getEvents",
  "render.cancel",
  "interaction.profile.get",
  "interaction.profile.validate",
  "interaction.plan.validate",
  "interaction.run",
  "interaction.trace.list",
  "interaction.trace.inspect",
] as const;

export const SYSTEM_DESCRIBE_COMMAND = COMMAND_TYPES[0];
export const PROJECT_COMMAND_TYPES = COMMAND_TYPES.slice(1);

export const ERROR_CATEGORIES = [
  "validation",
  "configuration",
  "contract",
  "application",
  "domain",
  "platform",
  "security",
  "internal",
] as const;

export const ERROR_CODES = [
  "CONTRACT_UNSUPPORTED_VERSION",
  "CONTRACT_INVALID_PAYLOAD",
  "APPLICATION_COMMAND_FAILED",
  "CORE_CAPABILITY_NOT_IMPLEMENTED",
  "PLATFORM_OPERATION_FAILED",
  "SECURITY_UNAUTHORIZED_TRANSPORT",
  "INTERNAL_UNEXPECTED_ERROR",
  "PROJECT_ALREADY_EXISTS",
  "PROJECT_NOT_FOUND",
  "PROJECT_MANIFEST_INVALID",
  "PROJECT_FORMAT_UNSUPPORTED",
  "PROJECT_DATABASE_MISSING",
  "PROJECT_DATABASE_INVALID",
  "PROJECT_DATABASE_INTEGRITY_FAILED",
  "PROJECT_SCHEMA_UNSUPPORTED",
  "PROJECT_MIGRATION_REQUIRED",
  "PROJECT_MIGRATION_FAILED",
  "PROJECT_MIGRATION_CHECKSUM_MISMATCH",
  "PROJECT_BACKUP_FAILED",
  "PROJECT_LOCKED",
  "PROJECT_LOCK_INVALID",
  "PROJECT_NOT_OPEN",
  "PROJECT_VALIDATION_FAILED",
  "PROJECT_EXPORT_FAILED",
  "PROJECT_IMPORT_FAILED",
  "PROJECT_IMPORT_UNSAFE_ARCHIVE",
  "PROJECT_IMPORT_LIMIT_EXCEEDED",
  "PROJECT_ATOMIC_WRITE_FAILED",
  "PROFILE_INVALID",
  "PROFILE_NOT_FOUND",
  "PROFILE_ALREADY_EXISTS",
  "PROFILE_REVISION_CONFLICT",
  "PROFILE_NO_CHANGES",
  "PROFILE_INTEGRITY_MISMATCH",
  "SCOPE_BATCH_LIMIT_EXCEEDED",
  "QUEUE_JOB_NOT_FOUND",
  "QUEUE_JOB_ALREADY_EXISTS",
  "QUEUE_JOB_NOT_ELIGIBLE",
  "QUEUE_JOB_STATE_CONFLICT",
  "QUEUE_INVALID_TRANSITION",
  "QUEUE_CLAIM_CONFLICT",
  "QUEUE_CLAIM_TOKEN_INVALID",
  "QUEUE_JOB_ALREADY_COMPLETED",
  "QUEUE_COMPLETION_CONFLICT",
  "QUEUE_FAILURE_CONFLICT",
  "QUEUE_RETRY_NOT_ALLOWED",
  "QUEUE_MAX_ATTEMPTS_REACHED",
  "QUEUE_BATCH_LIMIT_EXCEEDED",
  "QUEUE_OPERATION_IDEMPOTENCY_CONFLICT",
  "QUEUE_PROFILE_REVISION_MISMATCH",
  "QUEUE_ENGINE_VERSION_MISMATCH",
  "QUEUE_RUN_NOT_FOUND",
  "QUEUE_PROJECT_NOT_OPEN",
  "QUEUE_PERSISTENCE_FAILURE",
  "QUEUE_TRANSACTION_FAILED",
  "QUEUE_INPUT_INVALID",
  "QUEUE_RESULT_TOO_LARGE",
  "QUEUE_PAGINATION_LIMIT_EXCEEDED",
  "QUEUE_CLEAR_NOT_ALLOWED",
  "LEASE_NOT_FOUND",
  "LEASE_EXPIRED",
  "LEASE_OWNER_MISMATCH",
  "LEASE_TOKEN_INVALID",
  "FENCING_GENERATION_STALE",
  "LEASE_RENEWAL_INVALID",
  "RUN_NOT_ACTIVE",
  "RUN_PAUSE_CONFLICT",
  "RECOVERY_ALREADY_RUNNING",
  "RECOVERY_OPERATION_NOT_FOUND",
  "RECOVERY_CONFIRMATION_REQUIRED",
  "CHECKPOINT_NOT_FOUND",
  "CHECKPOINT_INVALID",
  "CHECKPOINT_TOO_LARGE",
  "CHECKPOINT_OWNERSHIP_INVALID",
  "ARTIFACT_CHECKPOINT_INVALID",
  "OUTPUT_DESCRIPTOR_INVALID",
  "OUTPUT_VERIFICATION_FAILED",
  "RECOVERY_INPUT_INVALID",
  "RECOVERY_TRANSACTION_FAILED",
  "BROWSER_INSTALLATION_MISSING",
  "BROWSER_INSTALLATION_INVALID",
  "BROWSER_LAUNCH_FAILED",
  "BROWSER_UNHEALTHY",
  "BROWSER_CRASHED",
  "BROWSER_RESTART_LIMITED",
  "BROWSER_BUSY",
  "BROWSER_CONTEXT_FAILED",
  "PAGE_CREATE_FAILED",
  "PAGE_CRASHED",
  "NAVIGATION_TIMEOUT",
  "NAVIGATION_FAILED",
  "REDIRECT_BLOCKED",
  "RUNTIME_NETWORK_BLOCKED",
  "RENDER_TIMEOUT",
  "RENDER_STABILITY_TIMEOUT",
  "RENDER_BLANK_PAGE",
  "RENDER_HTML_TOO_LARGE",
  "RENDER_SCREENSHOT_TOO_LARGE",
  "RENDER_EXTRACTION_FAILED",
  "RENDER_COMMIT_FAILED",
  "RENDER_RESULT_NOT_FOUND",
  "RENDER_CANCELLED",
  "RENDER_INPUT_INVALID",
  "INTERACTION_PROFILE_INVALID",
  "INTERACTION_PLAN_INVALID",
  "INTERACTION_TARGET_INVALID",
  "INTERACTION_KEY_INVALID",
  "INTERACTION_BUDGET_EXCEEDED",
  "INTERACTION_TIMEOUT",
  "INTERACTION_CANCELLED",
  "INTERACTION_PAUSED",
  "INTERACTION_BROWSER_FAILED",
  "INTERACTION_TARGET_FAILED",
  "INTERACTION_SIDE_EFFECT_BLOCKED",
  "INTERACTION_POPUP_BLOCKED",
  "INTERACTION_DIALOG_BLOCKED",
  "INTERACTION_TRACE_LIMIT",
  "INTERACTION_PERSISTENCE_FAILED",
] as const;

const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const timestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/);
const localPathSchema = z.string().min(1).max(2_048).refine((value) => !value.includes("\0"));
const baseUrlSchema = z.url().superRefine((value, context) => {
  if (!/^https?:\/\//i.test(value)) {
    context.addIssue({ code: "custom", message: "Base URL must use HTTP or HTTPS" });
  }
  if (/^https?:\/\/[^/?#]*@/i.test(value)) {
    context.addIssue({ code: "custom", message: "Base URL cannot contain credentials" });
  }
});

export const ErrorContractSchema = z
  .object({
    code: z.enum(ERROR_CODES),
    category: z.enum(ERROR_CATEGORIES),
    message: z.string().min(1).max(800),
    userMessage: z.string().min(1).max(400),
    retryable: z.boolean(),
    details: z.record(z.string(), z.unknown()).optional(),
    causeId: identifierSchema.optional(),
  })
  .strict();

const commandBase = {
  contractVersion: z.literal(CONTRACT_VERSION),
  commandId: identifierSchema,
  correlationId: identifierSchema,
  timestamp: timestampSchema,
};

export const SystemDescribeCommandSchema = z.object({
  ...commandBase,
  commandType: z.literal("system.describe"),
  payload: z.object({}).strict(),
}).strict();

export const ProjectCreateCommandSchema = z.object({
  ...commandBase,
  commandType: z.literal("project.create"),
  payload: z.object({
    destinationPath: localPathSchema,
    name: z.string().trim().min(1).max(120),
    slug: z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    baseUrl: baseUrlSchema.nullable().optional(),
  }).strict(),
}).strict();

export const ProjectOpenCommandSchema = z.object({
  ...commandBase,
  commandType: z.literal("project.open"),
  payload: z.object({ projectPath: localPathSchema }).strict(),
}).strict();

export const ProjectCloseCommandSchema = z.object({
  ...commandBase,
  commandType: z.literal("project.close"),
  payload: z.object({}).strict(),
}).strict();

export const ProjectValidateCommandSchema = z.object({
  ...commandBase,
  commandType: z.literal("project.validate"),
  payload: z.object({ projectPath: localPathSchema }).strict(),
}).strict();

export const ProjectExportCommandSchema = z.object({
  ...commandBase,
  commandType: z.literal("project.export"),
  payload: z.object({ projectPath: localPathSchema, archivePath: localPathSchema }).strict(),
}).strict();

export const ProjectImportCommandSchema = z.object({
  ...commandBase,
  commandType: z.literal("project.import"),
  payload: z.object({ archivePath: localPathSchema, destinationPath: localPathSchema }).strict(),
}).strict();

export const ProjectInfoCommandSchema = z.object({
  ...commandBase,
  commandType: z.literal("project.info"),
  payload: z.object({ projectPath: localPathSchema.optional() }).strict(),
}).strict();

const profileDraftFields = {
  name: z.string().trim().min(1).max(120),
  baseUrl: baseUrlSchema,
  seedUrls: z.array(z.string().min(1).max(8_192)).min(1).max(100),
  authorization: z.object({
    status: z.enum(["incomplete", "approved"]), legalBasisReference: z.string().min(1).max(256).nullable(),
    approvedBy: z.array(z.string().min(1).max(120)).max(20), approvedAt: timestampSchema.nullable(), expiresAt: timestampSchema.nullable(),
  }).strict(),
  domainRules: z.array(z.object({
    ruleId: z.string().min(1).max(80), effect: z.enum(["allow", "deny"]), match: z.enum(["exact", "subdomains"]),
    hostname: z.string().min(1).max(253), schemes: z.array(z.enum(["http", "https"])).min(1).max(2), ports: z.array(z.number().int().min(1).max(65_535)).max(20),
  }).strict()).min(1).max(200),
  pathRules: z.array(z.object({ ruleId: z.string().min(1).max(80), effect: z.enum(["allow", "deny"]), match: z.enum(["exact", "prefix"]), path: z.string().min(1).max(2_048) }).strict()).max(500),
  queryPolicy: z.object({ unknown: z.enum(["identity", "ignored", "denied"]), rules: z.array(z.object({ key: z.string().min(1).max(128), classification: z.enum(["identity", "functional", "tracking", "ignored", "denied"]), sensitive: z.boolean() }).strict()).max(500) }).strict(),
  fragmentPolicy: z.enum(["ignore-all", "preserve-all", "preserve-hash-routes"]),
  redirectPolicy: z.object({ allowApprovedExternal: z.boolean(), allowHttpsDowngrade: z.boolean() }).strict(),
  canonicalPolicy: z.object({ external: z.enum(["ignore", "reject"]) }).strict(),
  networkPolicy: z.object({ allowedIpClasses: z.array(z.enum(["public", "loopback", "private", "link-local", "multicast", "reserved", "unspecified"])).max(7) }).strict(),
  limits: z.object({ maxDepth: z.number().int().nonnegative().max(1_000).nullable(), maxPages: z.number().int().nonnegative().max(10_000_000).nullable(), maxRedirects: z.number().int().nonnegative().max(20), maxBatchSize: z.number().int().positive().max(500) }).strict(),
};

export const SiteProfileDraftContractSchema = z.object(profileDraftFields).strict();
export const SiteProfileContractSchema = z.object({
  schemaVersion: z.literal(1), engineVersion: z.literal(1), profileId: z.string().uuid(), projectId: z.string().uuid(),
  revisionId: z.string().uuid(), sequence: z.number().int().positive(), createdAt: timestampSchema, updatedAt: timestampSchema,
  ...profileDraftFields,
}).strict();

const projectPathPayload = z.object({ projectPath: localPathSchema }).strict();
export const ProfileCreateCommandSchema = z.object({ ...commandBase, commandType: z.literal("profile.create"), payload: z.object({ projectPath: localPathSchema, name: z.string().trim().min(1).max(120), seedUrl: z.string().min(1).max(8_192) }).strict() }).strict();
export const ProfileGetCommandSchema = z.object({ ...commandBase, commandType: z.literal("profile.get"), payload: projectPathPayload }).strict();
export const ProfileUpdateCommandSchema = z.object({ ...commandBase, commandType: z.literal("profile.update"), payload: z.object({ projectPath: localPathSchema, expectedRevisionId: z.string().uuid(), draft: SiteProfileDraftContractSchema }).strict() }).strict();
export const ProfileValidateCommandSchema = z.object({ ...commandBase, commandType: z.literal("profile.validate"), payload: projectPathPayload }).strict();
export const ProfileCompareCommandSchema = z.object({ ...commandBase, commandType: z.literal("profile.compare"), payload: z.object({ projectPath: localPathSchema, fromSequence: z.number().int().positive(), toSequence: z.number().int().positive() }).strict() }).strict();

const scopeInputSchema = z.object({
  rawUrl: z.string().min(1).max(8_193).optional(), url: z.string().min(1).max(8_193).optional(), sourceUrl: z.string().min(1).max(8_192).optional(), baseUrl: z.string().min(1).max(8_192).optional(),
  sourceDepth: z.number().int().nonnegative().max(1_001).optional(), depth: z.number().int().nonnegative().max(1_001).optional(),
  discoveryType: z.enum(["seed", "dom-link", "canonical", "redirect", "sitemap", "history-api", "navigation-action", "json-discovery", "manual"]).optional(),
  profileRevision: z.string().uuid().optional(),
  currentEligibleCount: z.number().int().nonnegative().max(10_000_000).optional(), knownIdentityHashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(10_000).optional(),
}).strict().superRefine((value, context) => {
  if ((value.rawUrl === undefined) === (value.url === undefined)) context.addIssue({ code: "custom", message: "Exactly one of rawUrl or url is required" });
});
export const ScopeEvaluateCommandSchema = z.object({ ...commandBase, commandType: z.literal("scope.evaluate"), payload: z.object({ projectPath: localPathSchema, input: scopeInputSchema }).strict() }).strict();
export const ScopeEvaluateBatchCommandSchema = z.object({ ...commandBase, commandType: z.literal("scope.evaluateBatch"), payload: z.object({ projectPath: localPathSchema, inputs: z.array(scopeInputSchema).max(500) }).strict() }).strict();
export const ScopeExplainCommandSchema = z.object({ ...commandBase, commandType: z.literal("scope.explain"), payload: z.object({ projectPath: localPathSchema, input: scopeInputSchema }).strict() }).strict();
export const ScopePreviewNormalizationCommandSchema = z.object({ ...commandBase, commandType: z.literal("scope.previewNormalization"), payload: z.object({ projectPath: localPathSchema, input: scopeInputSchema }).strict() }).strict();
export const ScopeGetEngineInfoCommandSchema = z.object({ ...commandBase, commandType: z.literal("scope.getEngineInfo"), payload: z.object({}).strict() }).strict();

const queueStateSchema = z.enum(["pending", "processing", "completed", "failed", "retrying", "skipped", "blocked", "interrupted", "paused"]);
const queueDiscoveryTypeSchema = z.enum(["seed", "dom-link", "canonical", "redirect", "sitemap", "history-api", "navigation-action", "json-discovery", "manual"]);
const queueFailureCategorySchema = z.enum(["validation", "configuration", "application", "domain", "platform", "internal"]);
const queueKeySchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const queueReasonSchema = z.string().min(1).max(120).regex(/^[A-Z0-9][A-Z0-9._:-]*$/);
const queueMutationFields = { idempotencyKey: queueKeySchema, operationId: identifierSchema };
const queueOwnerFields = { projectPath: localPathSchema, runId: z.string().uuid() };
const leaseOwnershipFields = {
  jobId: z.string().uuid(),
  leaseToken: z.string().uuid(),
  fencingGeneration: z.number().int().positive(),
  ownerId: z.string().min(1).max(120),
  operationId: identifierSchema,
};
const outputDescriptorInputSchema = z.object({
  relativePath: z.string().min(1).max(2_048),
  byteLength: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  verificationPolicy: z.literal("size-and-sha256"),
}).strict();
const queueEnqueueItemSchema = z.object({
  url: z.string().min(1).max(8_193),
  sourceUrl: z.string().min(1).max(8_192).optional(),
  parentJobId: z.string().uuid().nullable().optional(),
  sourceDepth: z.number().int().nonnegative().max(1_000).nullable().optional(),
  discoveryType: queueDiscoveryTypeSchema,
  requestedPriority: z.number().int().min(0).max(1_000).optional(),
  maxAttempts: z.number().int().min(1).max(100).default(3),
}).strict();
const queueTestResultSummarySchema = z.object({
  resultType: z.literal("queue-test"),
  statusCode: z.number().int().min(100).max(599).nullable(),
  contentStored: z.literal(false),
  metadata: z.record(z.string().max(80), z.union([z.string().max(256), z.number().finite(), z.boolean(), z.null()])).optional(),
}).strict().refine((value) => JSON.stringify(value).length <= 4_096, "Result metadata exceeds the Phase 6 limit");
const renderQueueResultSummarySchema = z.object({
  resultType: z.literal("render"),
  statusCode: z.number().int().min(100).max(599).nullable(),
  contentStored: z.literal(true),
  renderResultId: z.string().uuid(),
  htmlSha256: z.string().regex(/^[a-f0-9]{64}$/),
  relativePath: z.string().min(1).max(2_048),
}).strict();
const queueResultSummarySchema = z.discriminatedUnion("resultType", [queueTestResultSummarySchema, renderQueueResultSummarySchema]);

export const QueueEnqueueCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.enqueue"), payload: z.object({ ...queueOwnerFields, profileRevision: z.string().uuid(), ...queueEnqueueItemSchema.shape, ...queueMutationFields }).strict() }).strict();
export const QueueEnqueueBatchCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.enqueueBatch"), payload: z.object({ ...queueOwnerFields, profileRevision: z.string().uuid(), items: z.array(queueEnqueueItemSchema).min(1).max(250), ...queueMutationFields }).strict() }).strict();
export const QueueClaimNextCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.claimNext"), payload: z.object({ ...queueOwnerFields, claimedBy: z.string().min(1).max(120), leaseDurationMs: z.number().int().min(5_000).max(86_400_000).default(60_000), ...queueMutationFields }).strict() }).strict();
export const QueueCompleteCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.complete"), payload: z.object({ ...queueOwnerFields, jobId: z.string().uuid(), claimToken: z.string().uuid(), ownerId: z.string().min(1).max(120), fencingGeneration: z.number().int().positive(), completionKey: queueKeySchema, resultSummary: queueTestResultSummarySchema, outputs: z.array(outputDescriptorInputSchema).max(1_000).optional(), completedAt: timestampSchema, ...queueMutationFields }).strict() }).strict();
export const QueueFailCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.fail"), payload: z.object({ ...queueOwnerFields, jobId: z.string().uuid(), claimToken: z.string().uuid(), ownerId: z.string().min(1).max(120), fencingGeneration: z.number().int().positive(), failureKey: queueKeySchema, failureCode: queueReasonSchema, failureCategory: queueFailureCategorySchema, retryable: z.boolean(), safeMessage: z.string().min(1).max(800), failedAt: timestampSchema, nextEligibleAt: timestampSchema.optional(), ...queueMutationFields }).strict() }).strict();
export const QueueScheduleRetryCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.scheduleRetry"), payload: z.object({ ...queueOwnerFields, jobId: z.string().uuid(), nextEligibleAt: timestampSchema, reasonCode: queueReasonSchema, ...queueMutationFields }).strict() }).strict();
export const QueueReleaseDueRetriesCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.releaseDueRetries"), payload: z.object({ ...queueOwnerFields, dueAt: timestampSchema, limit: z.number().int().min(1).max(200), ...queueMutationFields }).strict() }).strict();
const queueTerminalCommandPayload = z.object({ ...queueOwnerFields, jobId: z.string().uuid(), reasonCode: queueReasonSchema, safeMessage: z.string().min(1).max(800), claimToken: z.string().uuid().optional(), ...queueMutationFields }).strict();
export const QueueSkipCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.skip"), payload: queueTerminalCommandPayload }).strict();
export const QueueBlockCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.block"), payload: queueTerminalCommandPayload }).strict();
export const QueueGetCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.get"), payload: z.object({ ...queueOwnerFields, jobId: z.string().uuid() }).strict() }).strict();
export const QueueListCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.list"), payload: z.object({ ...queueOwnerFields, state: queueStateSchema.optional(), afterSequence: z.number().int().nonnegative().optional(), limit: z.number().int().min(1).max(200) }).strict() }).strict();
export const QueueGetStatisticsCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.getStatistics"), payload: z.object(queueOwnerFields).strict() }).strict();
export const QueueGetHistoryCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.getHistory"), payload: z.object({ ...queueOwnerFields, jobId: z.string().uuid() }).strict() }).strict();
export const QueueClearPendingCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.clearPending"), payload: z.object({ ...queueOwnerFields, confirmation: z.literal("CLEAR-PENDING-QUEUE"), reasonCode: queueReasonSchema, ...queueMutationFields }).strict() }).strict();

const recoveryReadFields = { ...queueOwnerFields };
export const RecoveryInspectCommandSchema = z.object({ ...commandBase, commandType: z.literal("recovery.inspect"), payload: z.object({ ...recoveryReadFields, evaluationTime: timestampSchema, afterSequence: z.number().int().nonnegative().optional(), limit: z.number().int().min(1).max(500).default(100) }).strict() }).strict();
export const RecoveryRecoverCommandSchema = z.object({ ...commandBase, commandType: z.literal("recovery.recover"), payload: z.object({ ...recoveryReadFields, evaluationTime: timestampSchema, limit: z.number().int().min(1).max(500).default(100), confirmation: z.literal("APPLY-RECOVERY"), ...queueMutationFields }).strict() }).strict();
export const RecoveryGetReportCommandSchema = z.object({ ...commandBase, commandType: z.literal("recovery.getReport"), payload: z.object({ ...recoveryReadFields, recoveryOperationId: z.string().uuid() }).strict() }).strict();
export const RecoveryHeartbeatCommandSchema = z.object({ ...commandBase, commandType: z.literal("recovery.heartbeat"), payload: z.object({ ...recoveryReadFields, ...leaseOwnershipFields }).strict() }).strict();
export const RecoveryRenewLeaseCommandSchema = z.object({ ...commandBase, commandType: z.literal("recovery.renewLease"), payload: z.object({ ...recoveryReadFields, ...leaseOwnershipFields, extensionMs: z.number().int().min(5_000).max(86_400_000) }).strict() }).strict();
export const RecoveryReleaseLeaseCommandSchema = z.object({ ...commandBase, commandType: z.literal("recovery.releaseLease"), payload: z.object({ ...recoveryReadFields, ...leaseOwnershipFields, reasonCode: queueReasonSchema }).strict() }).strict();
export const CheckpointSaveCommandSchema = z.object({ ...commandBase, commandType: z.literal("checkpoint.save"), payload: z.object({ ...recoveryReadFields, ...leaseOwnershipFields, phase: z.string().min(1).max(120), progress: z.number().min(0).max(1), relativePath: z.string().min(1).max(2_048).nullable().optional(), payload: z.record(z.string().max(120), z.unknown()) }).strict() }).strict();
export const CheckpointGetLatestCommandSchema = z.object({ ...commandBase, commandType: z.literal("checkpoint.getLatest"), payload: z.object({ ...recoveryReadFields, jobId: z.string().uuid() }).strict() }).strict();
export const CheckpointListCommandSchema = z.object({ ...commandBase, commandType: z.literal("checkpoint.list"), payload: z.object({ ...recoveryReadFields, jobId: z.string().uuid(), limit: z.number().int().min(1).max(200).default(50) }).strict() }).strict();
export const ArtifactCheckpointSaveCommandSchema = z.object({ ...commandBase, commandType: z.literal("artifactCheckpoint.save"), payload: z.object({ ...recoveryReadFields, ...leaseOwnershipFields, artifactKey: z.string().min(1).max(160), artifactKind: z.enum(["document", "asset", "metadata", "partial-file"]), relativePath: z.string().min(1).max(2_048), bytesWritten: z.number().int().nonnegative(), expectedBytes: z.number().int().nonnegative().nullable().optional(), sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable().optional(), validator: z.string().max(512).nullable().optional(), resumeOffset: z.number().int().nonnegative(), committed: z.boolean() }).strict() }).strict();
export const ArtifactCheckpointValidateCommandSchema = z.object({ ...commandBase, commandType: z.literal("artifactCheckpoint.validate"), payload: z.object({ ...recoveryReadFields, jobId: z.string().uuid(), artifactKey: z.string().min(1).max(160) }).strict() }).strict();
export const RunRequestPauseCommandSchema = z.object({ ...commandBase, commandType: z.literal("run.requestPause"), payload: z.object({ ...recoveryReadFields, operationId: identifierSchema }).strict() }).strict();
export const RunGetPauseStatusCommandSchema = z.object({ ...commandBase, commandType: z.literal("run.getPauseStatus"), payload: z.object(recoveryReadFields).strict() }).strict();
export const RunAcknowledgePauseCommandSchema = z.object({ ...commandBase, commandType: z.literal("run.acknowledgePause"), payload: z.object({ ...recoveryReadFields, ...leaseOwnershipFields }).strict() }).strict();
export const RunResumeCommandSchema = z.object({ ...commandBase, commandType: z.literal("run.resume"), payload: z.object({ ...recoveryReadFields, operationId: identifierSchema }).strict() }).strict();
export const RunGetControlStateCommandSchema = z.object({ ...commandBase, commandType: z.literal("run.getControlState"), payload: z.object(recoveryReadFields).strict() }).strict();
export const LeaseListCommandSchema = z.object({ ...commandBase, commandType: z.literal("lease.list"), payload: z.object({ ...recoveryReadFields, status: z.enum(["active", "released", "expired", "recovered"]).optional(), limit: z.number().int().min(1).max(200).default(50) }).strict() }).strict();
export const LeaseShowCommandSchema = z.object({ ...commandBase, commandType: z.literal("lease.show"), payload: z.object({ ...recoveryReadFields, jobId: z.string().uuid() }).strict() }).strict();

export const BrowserGetRuntimeInfoCommandSchema = z.object({ ...commandBase, commandType: z.literal("browser.getRuntimeInfo"), payload: z.object({}).strict() }).strict();
export const BrowserValidateInstallationCommandSchema = z.object({ ...commandBase, commandType: z.literal("browser.validateInstallation"), payload: z.object({}).strict() }).strict();
export const BrowserGetHealthCommandSchema = z.object({ ...commandBase, commandType: z.literal("browser.getHealth"), payload: z.object({}).strict() }).strict();
export const BrowserRestartCommandSchema = z.object({ ...commandBase, commandType: z.literal("browser.restart"), payload: z.object({ operationId: identifierSchema }).strict() }).strict();

const renderReadFields = { ...queueOwnerFields, jobId: z.string().uuid() };
const renderPolicySchema = z.object({
  navigationTimeoutMs: z.number().int().min(100).max(120_000).optional(),
  renderTimeoutMs: z.number().int().min(500).max(300_000).optional(),
  stabilityTimeoutMs: z.number().int().min(100).max(120_000).optional(),
  domQuietMs: z.number().int().min(50).max(10_000).optional(),
  networkQuietMs: z.number().int().min(50).max(10_000).optional(),
  completionSelector: z.string().min(1).max(240).optional(),
  captureScreenshot: z.boolean().default(false),
  fixtureScroll: z.boolean().default(false),
}).strict();
export const RenderStartCommandSchema = z.object({ ...commandBase, commandType: z.literal("render.start"), payload: z.object({ ...renderReadFields, ownerId: z.string().min(1).max(120), leaseDurationMs: z.number().int().min(5_000).max(86_400_000).default(60_000), idempotencyKey: queueKeySchema, operationId: identifierSchema, policy: renderPolicySchema.optional() }).strict() }).strict();
export const RenderGetStatusCommandSchema = z.object({ ...commandBase, commandType: z.literal("render.getStatus"), payload: z.object(renderReadFields).strict() }).strict();
export const RenderGetResultCommandSchema = z.object({ ...commandBase, commandType: z.literal("render.getResult"), payload: z.object(renderReadFields).strict() }).strict();
export const RenderGetEventsCommandSchema = z.object({ ...commandBase, commandType: z.literal("render.getEvents"), payload: z.object({ ...renderReadFields, limit: z.number().int().min(1).max(200).default(100) }).strict() }).strict();
export const RenderCancelCommandSchema = z.object({ ...commandBase, commandType: z.literal("render.cancel"), payload: z.object({ ...renderReadFields, operationId: identifierSchema }).strict() }).strict();

const interactionTargetContractSchema = z.discriminatedUnion("strategy", [
  z.object({ strategy: z.literal("role"), role: z.string().min(1).max(64), name: z.string().max(512).optional(), exact: z.boolean().optional() }).strict(),
  z.object({ strategy: z.literal("label"), text: z.string().min(1).max(512), exact: z.boolean().optional() }).strict(),
  z.object({ strategy: z.literal("placeholder"), text: z.string().min(1).max(512), exact: z.boolean().optional() }).strict(),
  z.object({ strategy: z.literal("test-id"), value: z.string().min(1).max(512) }).strict(),
  z.object({ strategy: z.literal("css"), selector: z.string().min(1).max(512).refine((value) => !/^javascript\s*:/i.test(value) && !/[{};]/.test(value), "Unsafe CSS selector") }).strict(),
  z.object({ strategy: z.literal("discovery-ref"), reference: z.string().min(1).max(512).regex(/^[A-Za-z0-9._:-]+$/) }).strict(),
]);
const interactionProfileContractSchema = z.object({
  schemaVersion: z.literal(1), profileId: z.string().min(1).max(128), profileRevisionId: z.string().min(1).max(128), projectId: z.string().uuid().nullable(),
  enabled: z.boolean(), mode: z.enum(["disabled", "human-paced"]), seed: z.string().min(1).max(128),
  actionDelayMinMs: z.number().int().min(0).max(10_000), actionDelayMaxMs: z.number().int().min(0).max(10_000),
  typingDelayMinMs: z.number().int().min(0).max(10_000), typingDelayMaxMs: z.number().int().min(0).max(10_000),
  pointerMoveDurationMinMs: z.number().int().min(0).max(5_000), pointerMoveDurationMaxMs: z.number().int().min(0).max(5_000),
  incrementalScroll: z.boolean(), scrollStepMinPx: z.number().int().min(0).max(5_000), scrollStepMaxPx: z.number().int().min(0).max(5_000),
  scrollDelayMinMs: z.number().int().min(0).max(10_000), scrollDelayMaxMs: z.number().int().min(0).max(10_000),
  maxActionsPerPage: z.number().int().min(0).max(500), maxInteractionDurationMs: z.number().int().min(0).max(600_000),
  maxScrollSteps: z.number().int().min(0).max(100), maxTabSteps: z.number().int().min(0).max(100), maxPopupsPerPage: z.number().int().min(0).max(10), maxDialogsPerPage: z.number().int().min(0).max(20),
  maxTypedTextLength: z.number().int().min(0).max(4_096), maxTargetLength: z.number().int().min(1).max(512), maxTraceEvents: z.number().int().min(1).max(500), maxTraceBytes: z.number().int().min(1).max(262_144), maxScrollDistancePx: z.number().int().min(0).max(100_000),
  dialogPolicy: z.object({ defaultAction: z.enum(["dismiss", "accept"]), byType: z.object({ alert: z.enum(["dismiss", "accept"]).optional(), confirm: z.enum(["dismiss", "accept"]).optional(), prompt: z.enum(["dismiss", "accept"]).optional(), beforeunload: z.enum(["dismiss", "accept"]).optional() }).strict(), maximumHandlingDurationMs: z.number().int().min(1).max(30_000) }).strict(),
  popupPolicy: z.object({ defaultAction: z.enum(["observe-close", "allow-in-scope"]), allowedOrigins: z.array(z.string().url().max(256)).max(20), maximumHandlingDurationMs: z.number().int().min(1).max(30_000) }).strict(),
  cookieBannerRules: z.array(z.object({ ruleId: z.string().min(1).max(80), bannerTarget: interactionTargetContractSchema, action: z.enum(["accept", "reject", "dismiss", "no_action"]), actionTarget: interactionTargetContractSchema.optional(), maxExecutions: z.number().int().min(1).max(3) }).strict()).max(50),
}).strict().superRefine((value, context) => {
  const ranges: Array<[number, number, string]> = [[value.actionDelayMinMs, value.actionDelayMaxMs, "actionDelay"], [value.typingDelayMinMs, value.typingDelayMaxMs, "typingDelay"], [value.pointerMoveDurationMinMs, value.pointerMoveDurationMaxMs, "pointerMoveDuration"], [value.scrollStepMinPx, value.scrollStepMaxPx, "scrollStep"], [value.scrollDelayMinMs, value.scrollDelayMaxMs, "scrollDelay"]];
  for (const [minimum, maximum, name] of ranges) if (minimum > maximum) context.addIssue({ code: "custom", path: [name], message: "Minimum must not exceed maximum" });
  if (value.enabled && value.mode !== "human-paced") context.addIssue({ code: "custom", path: ["mode"], message: "Enabled profiles must use human-paced mode" });
  value.cookieBannerRules.forEach((rule, index) => { if (rule.action !== "no_action" && rule.actionTarget === undefined) context.addIssue({ code: "custom", path: ["cookieBannerRules", index, "actionTarget"], message: "An explicit action target is required" }); });
});
const interactionPreconditionContractSchema = z.object({ kind: z.enum(["visible", "enabled", "attached", "focused", "url-origin"]), target: interactionTargetContractSchema.optional(), value: z.string().max(512).optional() }).strict().superRefine((value, context) => {
  if (value.kind === "url-origin" && value.value === undefined) context.addIssue({ code: "custom", path: ["value"], message: "URL-origin preconditions require a value" });
  if (value.kind !== "url-origin" && value.target === undefined) context.addIssue({ code: "custom", path: ["target"], message: "Target preconditions require an approved target" });
});
const interactionPostconditionContractSchema = z.object({ kind: z.enum(["visible", "hidden", "enabled", "focused", "url-origin", "dom-change", "route-change"]), target: interactionTargetContractSchema.optional(), value: z.string().max(512).optional() }).strict().superRefine((value, context) => {
  if (value.kind === "url-origin" && value.value === undefined) context.addIssue({ code: "custom", path: ["value"], message: "URL-origin postconditions require a value" });
  if (["visible", "hidden", "enabled", "focused"].includes(value.kind) && value.target === undefined) context.addIssue({ code: "custom", path: ["target"], message: "Target postconditions require an approved target" });
  if (["dom-change", "route-change"].includes(value.kind) && (value.target !== undefined || value.value !== undefined)) context.addIssue({ code: "custom", path: [], message: "DOM and route postconditions do not accept a target or value" });
});
const interactionPlanStepContractSchema = z.object({
  stepId: z.string().min(1).max(80), stepType: z.enum(["focus", "click", "hover", "mouse_move", "type_text", "press_key", "tab_navigation", "incremental_scroll", "wait_for_state", "cookie_banner"]),
  timeoutMs: z.number().int().min(1).max(120_000).optional(), preconditions: z.array(interactionPreconditionContractSchema).max(10).optional(), postcondition: interactionPostconditionContractSchema.optional(), failurePolicy: z.enum(["stop", "skip", "retry"]).optional(), maxExecutions: z.number().int().min(1).max(3).optional(), sideEffect: z.enum(["read-only", "navigation"]), tracePolicy: z.enum(["metadata", "none"]).optional(),
  target: interactionTargetContractSchema.optional(), button: z.enum(["left", "middle", "right"]).optional(), clickCount: z.union([z.literal(1), z.literal(2)]).optional(), x: z.number().int().min(0).max(16_384).optional(), y: z.number().int().min(0).max(16_384).optional(), durationMs: z.number().int().min(0).max(5_000).optional(),
  textCategory: z.enum(["non-sensitive", "ephemeral"]).optional(), characterCount: z.number().int().min(0).max(4_096).optional(), key: z.string().min(1).max(40).optional(), direction: z.enum(["forward", "backward", "up", "down"]).optional(), steps: z.number().int().min(1).max(100).optional(), distancePx: z.number().int().min(0).max(100_000).optional(), state: z.enum(["visible", "hidden", "attached", "detached"]).optional(), ruleId: z.string().min(1).max(80).optional(),
}).strict().superRefine((value, context) => {
  if (["focus", "click", "hover", "type_text", "wait_for_state"].includes(value.stepType) && value.target === undefined) context.addIssue({ code: "custom", path: ["target"], message: "This step requires an approved target" });
  if (value.stepType === "type_text" && value.characterCount === undefined) context.addIssue({ code: "custom", path: ["characterCount"], message: "Raw text is intentionally excluded; provide only a character count" });
  if (value.stepType === "type_text" && ("text" in value)) context.addIssue({ code: "custom", path: ["text"], message: "Raw typed text is forbidden on the transport boundary" });
  if (value.stepType === "press_key" && value.key === undefined) context.addIssue({ code: "custom", path: ["key"], message: "Key is required" });
  if (value.stepType === "mouse_move" && (value.x === undefined || value.y === undefined)) context.addIssue({ code: "custom", path: ["x"], message: "Mouse coordinates are required" });
  if (value.stepType === "tab_navigation" && value.direction !== "forward" && value.direction !== "backward") context.addIssue({ code: "custom", path: ["direction"], message: "Tab direction is required" });
  if (value.stepType === "cookie_banner" && value.ruleId === undefined) context.addIssue({ code: "custom", path: ["ruleId"], message: "An explicit Cookie Banner rule is required" });
});
const interactionPlanContractSchema = z.object({ schemaVersion: z.literal(1), planId: z.string().min(1).max(128), approved: z.literal(true), approvalReason: z.string().min(1).max(256), steps: z.array(interactionPlanStepContractSchema).max(500) }).strict();
const interactionTraceEventContractSchema = z.object({
  sequence: z.number().int().nonnegative().max(500), stepId: z.string().max(80).nullable(), stepType: z.enum(["focus", "click", "hover", "mouse_move", "type_text", "press_key", "tab_navigation", "incremental_scroll", "wait_for_state", "cookie_banner", "dialog", "popup", "context", "plan"]), targetId: z.string().max(80).nullable(), startedAt: timestampSchema, endedAt: timestampSchema, effectiveDelayMs: z.number().int().nonnegative().max(10_000), status: z.enum(["started", "completed", "skipped", "failed", "paused", "cancelled", "blocked"]), failureCategory: z.string().max(40).nullable(), failureCode: z.string().max(120).nullable(), navigationOutcome: z.enum(["none", "dom-change", "spa-route", "full-navigation", "popup", "dialog", "blocked"]), domChanged: z.boolean(), routeChanged: z.boolean(), popupOutcome: z.enum(["none", "observed-closed", "allowed", "blocked"]), dialogOutcome: z.enum(["none", "dismissed", "accepted", "blocked"]), discoveredUrlCount: z.number().int().nonnegative().max(500), inputCategory: z.enum(["none", "non-sensitive", "ephemeral"]), characterCount: z.number().int().nonnegative().max(4_096).nullable(), recoveryStatus: z.enum(["none", "interrupted", "uncertain"]),
}).strict();
const interactionTraceContractSchema = z.object({ schemaVersion: z.literal(1), traceId: z.string().min(1).max(128), projectId: z.string().uuid(), runId: z.string().uuid(), jobId: z.string().uuid(), ownerId: z.string().max(120).nullable(), fencingGeneration: z.number().int().positive(), profileId: z.string().min(1).max(128), profileRevisionId: z.string().min(1).max(128), contextProfileId: z.string().max(128).nullable(), createdAt: timestampSchema, completedAt: timestampSchema.nullable(), status: z.enum(["completed", "skipped", "failed", "paused", "cancelled", "outcome-uncertain"]), events: z.array(interactionTraceEventContractSchema).max(500), truncated: z.boolean(), serializedBytes: z.number().int().nonnegative().max(262_144) }).strict();
export const InteractionProfileGetCommandSchema = z.object({ ...commandBase, commandType: z.literal("interaction.profile.get"), payload: projectPathPayload }).strict();
export const InteractionProfileValidateCommandSchema = z.object({ ...commandBase, commandType: z.literal("interaction.profile.validate"), payload: z.object({ projectPath: localPathSchema, profile: interactionProfileContractSchema.optional() }).strict() }).strict();
export const InteractionPlanValidateCommandSchema = z.object({ ...commandBase, commandType: z.literal("interaction.plan.validate"), payload: z.object({ projectPath: localPathSchema, profile: interactionProfileContractSchema, plan: interactionPlanContractSchema }).strict() }).strict();
export const InteractionRunCommandSchema = z.object({ ...commandBase, commandType: z.literal("interaction.run"), payload: z.object({ ...renderReadFields, ownerId: z.string().min(1).max(120), leaseDurationMs: z.number().int().min(5_000).max(86_400_000).default(60_000), planId: z.string().min(1).max(128), idempotencyKey: queueKeySchema, operationId: identifierSchema }).strict() }).strict();
export const InteractionTraceListCommandSchema = z.object({ ...commandBase, commandType: z.literal("interaction.trace.list"), payload: z.object({ ...renderReadFields, limit: z.number().int().min(1).max(200).default(100) }).strict() }).strict();
export const InteractionTraceInspectCommandSchema = z.object({ ...commandBase, commandType: z.literal("interaction.trace.inspect"), payload: z.object({ ...renderReadFields, traceId: z.string().min(1).max(128) }).strict() }).strict();

export const CommandEnvelopeSchema = z.discriminatedUnion("commandType", [
  SystemDescribeCommandSchema,
  ProjectCreateCommandSchema,
  ProjectOpenCommandSchema,
  ProjectCloseCommandSchema,
  ProjectValidateCommandSchema,
  ProjectExportCommandSchema,
  ProjectImportCommandSchema,
  ProjectInfoCommandSchema,
  ProfileCreateCommandSchema,
  ProfileGetCommandSchema,
  ProfileUpdateCommandSchema,
  ProfileValidateCommandSchema,
  ProfileCompareCommandSchema,
  ScopeEvaluateCommandSchema,
  ScopeEvaluateBatchCommandSchema,
  ScopeExplainCommandSchema,
  ScopePreviewNormalizationCommandSchema,
  ScopeGetEngineInfoCommandSchema,
  QueueEnqueueCommandSchema,
  QueueEnqueueBatchCommandSchema,
  QueueClaimNextCommandSchema,
  QueueCompleteCommandSchema,
  QueueFailCommandSchema,
  QueueScheduleRetryCommandSchema,
  QueueReleaseDueRetriesCommandSchema,
  QueueSkipCommandSchema,
  QueueBlockCommandSchema,
  QueueGetCommandSchema,
  QueueListCommandSchema,
  QueueGetStatisticsCommandSchema,
  QueueGetHistoryCommandSchema,
  QueueClearPendingCommandSchema,
  RecoveryInspectCommandSchema,
  RecoveryRecoverCommandSchema,
  RecoveryGetReportCommandSchema,
  RecoveryHeartbeatCommandSchema,
  RecoveryRenewLeaseCommandSchema,
  RecoveryReleaseLeaseCommandSchema,
  CheckpointSaveCommandSchema,
  CheckpointGetLatestCommandSchema,
  CheckpointListCommandSchema,
  ArtifactCheckpointSaveCommandSchema,
  ArtifactCheckpointValidateCommandSchema,
  RunRequestPauseCommandSchema,
  RunGetPauseStatusCommandSchema,
  RunAcknowledgePauseCommandSchema,
  RunResumeCommandSchema,
  RunGetControlStateCommandSchema,
  LeaseListCommandSchema,
  LeaseShowCommandSchema,
  BrowserGetRuntimeInfoCommandSchema,
  BrowserValidateInstallationCommandSchema,
  BrowserGetHealthCommandSchema,
  BrowserRestartCommandSchema,
  RenderStartCommandSchema,
  RenderGetStatusCommandSchema,
  RenderGetResultCommandSchema,
  RenderGetEventsCommandSchema,
  RenderCancelCommandSchema,
  InteractionProfileGetCommandSchema,
  InteractionProfileValidateCommandSchema,
  InteractionPlanValidateCommandSchema,
  InteractionRunCommandSchema,
  InteractionTraceListCommandSchema,
  InteractionTraceInspectCommandSchema,
]);

export const RuntimeInfoSchema = z.object({
  name: z.literal("Node.js"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
}).strict();

export const PlatformInfoSchema = z.object({
  operatingSystem: z.enum(["windows", "linux", "macos", "unknown"]),
  architecture: z.enum(["x64", "arm64", "ia32", "unknown"]),
}).strict();

export const SystemDescriptionSchema = z.object({
  resultType: z.literal("system.description"),
  applicationName: z.literal("Offline Web Archive Builder"),
  applicationVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  contractVersion: z.literal(CONTRACT_VERSION),
  coreStatus: z.literal("rendering-engine-ready"),
  implementedCapabilities: z.array(z.enum(COMMAND_TYPES)).min(1),
  plannedCapabilities: z.array(z.string().min(1)).min(1),
  runtime: RuntimeInfoSchema,
  platform: PlatformInfoSchema,
}).strict();

export const ProjectCompatibilitySchema = z.object({
  compatible: z.boolean(),
  formatVersion: z.string().nullable(),
  schemaVersion: z.number().int().nonnegative().nullable(),
  currentSchemaVersion: z.number().int().positive(),
  requiresMigration: z.boolean(),
  reason: z.string().nullable(),
}).strict();

export const ProjectSummarySchema = z.object({
  projectPath: localPathSchema,
  projectId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  formatVersion: z.string(),
  schemaVersion: z.number().int().positive(),
  revisionId: z.string().uuid(),
  runId: z.string().uuid(),
  createdAt: timestampSchema,
  lastOpenedAt: timestampSchema,
  state: z.enum(["ready", "closed"]),
  migrationStatus: z.enum(["current", "migrated"]),
  recoveryStatus: z.enum(["clean", "recovery-available", "recovery-required", "recovery-blocked"]),
  recoverySummary: z.object({ processingJobs: z.number().int().nonnegative(), activeLeases: z.number().int().nonnegative(), expiredLeases: z.number().int().nonnegative(), abandonedJobs: z.number().int().nonnegative(), outputIssues: z.number().int().nonnegative(), uncleanSessions: z.number().int().nonnegative() }).strict(),
}).strict();

export const ProjectValidationIssueSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["error", "warning"]),
  category: z.enum(["manifest", "compatibility", "filesystem", "database", "migration", "identity", "security"]),
  message: z.string().min(1),
  relativePath: z.string().optional(),
}).strict();

export const ProjectSummaryResultSchema = z.object({
  resultType: z.literal("project.summary"),
  project: ProjectSummarySchema,
}).strict();

export const ProjectValidationResultSchema = z.object({
  resultType: z.literal("project.validation"),
  report: z.object({
    valid: z.boolean(),
    projectPath: localPathSchema,
    checkedAt: timestampSchema,
    compatibility: ProjectCompatibilitySchema,
    issues: z.array(ProjectValidationIssueSchema),
    project: ProjectSummarySchema.nullable(),
  }).strict(),
}).strict();

export const ProjectExportResultSchema = z.object({
  resultType: z.literal("project.export"),
  export: z.object({
    archivePath: localPathSchema,
    projectId: z.string().uuid(),
    entryCount: z.number().int().positive(),
    expandedBytes: z.number().int().nonnegative(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
}).strict();

export const ProjectImportResultSchema = z.object({
  resultType: z.literal("project.import"),
  import: z.object({
    project: ProjectSummarySchema,
    archiveSha256: z.string().regex(/^[a-f0-9]{64}$/),
    entryCount: z.number().int().positive(),
  }).strict(),
}).strict();

export const ProjectInfoResultSchema = z.object({
  resultType: z.literal("project.info"),
  currentProject: ProjectSummarySchema.nullable(),
  compatibility: ProjectCompatibilitySchema.nullable(),
}).strict();

export const ProfileResultSchema = z.object({ resultType: z.literal("profile.value"), profile: SiteProfileContractSchema, changedPaths: z.array(z.string()).optional() }).strict();
export const ProfileValidationResultSchema = z.object({
  resultType: z.literal("profile.validation"),
  validation: z.object({
    valid: z.boolean(),
    errors: z.array(z.object({ code: z.string(), path: z.string(), message: z.string() }).strict()),
    warnings: z.array(z.object({ code: z.string(), path: z.string(), message: z.string() }).strict()),
  }).strict(),
}).strict();
export const ProfileComparisonResultSchema = z.object({
  resultType: z.literal("profile.comparison"),
  comparison: z.object({ fromRevisionId: z.string().uuid(), toRevisionId: z.string().uuid(), changedPaths: z.array(z.string()) }).strict(),
}).strict();

export const ScopeDecisionContractSchema = z.object({
  decisionId: z.string().regex(/^[a-f0-9]{64}$/), engineVersion: z.literal(1), profileId: z.string().uuid(), profileRevisionId: z.string().uuid(),
  eligible: z.boolean(), shouldQueue: z.boolean(), reasonCodes: z.array(z.string()), normalizedUrl: z.string().nullable(), identityUrl: z.string().nullable(),
  identityHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(), displayUrl: z.string().nullable(), matchedRuleIds: z.array(z.string()), depth: z.number().int().nonnegative(),
  matchedRules: z.array(z.object({ ruleId: z.string(), ruleType: z.enum(["domain", "path", "query"]), ruleAction: z.enum(["allow", "deny", "identity", "functional", "tracking", "ignored", "denied"]), ruleMatch: z.enum(["exact", "subdomains", "prefix", "key"]) }).strict()),
  security: z.object({ hostClass: z.enum(["public", "loopback", "private", "link-local", "multicast", "reserved", "unspecified", "invalid", "unknown-hostname"]), networkAuthorized: z.boolean(), networkPreflightRequired: z.boolean() }).strict(),
  relation: z.enum(["same-origin", "same-host", "same-registrable-domain", "external", "unknown"]),
  query: z.object({ identityKeys: z.array(z.string()), omittedKeys: z.array(z.string()), deniedKeys: z.array(z.string()) }).strict(),
}).strict();
export const ScopeDecisionResultSchema = z.object({ resultType: z.literal("scope.decision"), mode: z.enum(["evaluate", "explain", "normalize"]), decision: ScopeDecisionContractSchema }).strict();
export const ScopeBatchResultSchema = z.object({ resultType: z.literal("scope.batch"), decisions: z.array(ScopeDecisionContractSchema).max(500) }).strict();
export const ScopeEngineInfoResultSchema = z.object({
  resultType: z.literal("scope.engineInfo"),
  info: z.object({ engineVersion: z.literal(1), profileSchemaVersion: z.literal(1), identityAlgorithm: z.string(), limits: z.object({ urlLength: z.number(), seeds: z.number(), domainRules: z.number(), pathRules: z.number(), queryRules: z.number(), batch: z.number() }).strict(), networkAccess: z.literal(false) }).strict(),
}).strict();

export const PageJobContractSchema = z.object({
  jobId: z.string().uuid(), projectId: z.string().uuid(), runId: z.string().uuid(), projectRevisionId: z.string().uuid(),
  profileId: z.string().uuid(), profileRevisionId: z.string().uuid(), normalizationEngineVersion: z.number().int().positive(), jobType: z.literal("page"),
  normalizedUrl: z.string().min(1).max(8_192), identityUrl: z.string().min(1).max(8_192), safeDisplayUrl: z.string().min(1).max(8_192), identityHash: z.string().regex(/^[a-f0-9]{64}$/),
  scopeDecisionId: z.string().regex(/^[a-f0-9]{64}$/), scopeReasonCode: z.string().min(1).max(120), state: queueStateSchema,
  priority: z.number().int().min(0).max(1_000), prioritySource: z.enum(["policy", "explicit"]), queueSequence: z.number().int().positive(),
  depth: z.number().int().nonnegative(), discoveryType: queueDiscoveryTypeSchema, attemptCount: z.number().int().nonnegative(), maxAttempts: z.number().int().min(1).max(100),
  fencingGeneration: z.number().int().nonnegative(),
  nextEligibleAt: timestampSchema, claimToken: z.string().uuid().nullable(), claimedBy: z.string().max(120).nullable(), claimedAt: timestampSchema.nullable(), lastAttemptAt: timestampSchema.nullable(),
  completedAt: timestampSchema.nullable(), failedAt: timestampSchema.nullable(), completionKey: queueKeySchema.nullable(), resultVersion: z.number().int().positive().nullable(),
  resultSummary: queueResultSummarySchema.nullable(), lastErrorCode: z.string().max(120).nullable(), lastErrorCategory: queueFailureCategorySchema.nullable(), lastErrorMessage: z.string().max(400).nullable(),
  createdAt: timestampSchema, updatedAt: timestampSchema, queuedAt: timestampSchema,
}).strict();

const PageJobDiscoveryContractSchema = z.object({
  discoveryId: z.string().uuid(), parentJobId: z.string().uuid().nullable(), childJobId: z.string().uuid(), safeSourceUrl: z.string().max(8_192).nullable(),
  discoveryType: queueDiscoveryTypeSchema, sourceDepth: z.number().int().nonnegative().nullable(), resultDepth: z.number().int().nonnegative(), scopeDecisionId: z.string().regex(/^[a-f0-9]{64}$/), discoveredAt: timestampSchema,
}).strict();
const PageJobTransitionContractSchema = z.object({
  transitionId: z.string().uuid(), jobId: z.string().uuid(), fromState: queueStateSchema.nullable(), toState: queueStateSchema,
  reasonCode: z.string().min(1).max(120), operationId: identifierSchema, correlationId: identifierSchema, occurredAt: timestampSchema,
}).strict();
const PageJobAttemptContractSchema = z.object({
  attemptId: z.string().uuid(), jobId: z.string().uuid(), attemptNumber: z.number().int().positive(), claimToken: z.string().uuid(),
  startedAt: timestampSchema, finishedAt: timestampSchema.nullable(), outcome: z.enum(["processing", "completed", "failed", "retrying", "skipped", "blocked", "interrupted", "paused"]),
  errorCode: z.string().max(120).nullable(), errorCategory: queueFailureCategorySchema.nullable(), safeErrorMessage: z.string().max(400).nullable(),
}).strict();
const QueueEnqueueOutcomeSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("created"), job: PageJobContractSchema, discovery: PageJobDiscoveryContractSchema }).strict(),
  z.object({ outcome: z.literal("existing"), job: PageJobContractSchema, discovery: PageJobDiscoveryContractSchema, duplicateReason: z.literal("logical-identity") }).strict(),
  z.object({ outcome: z.enum(["rejected", "blocked"]), job: z.null(), reasonCodes: z.array(z.string().max(120)) }).strict(),
  z.object({ outcome: z.enum(["invalid", "failed"]), job: z.null(), errorCode: z.enum(ERROR_CODES) }).strict(),
]);

export const QueueEnqueueResultSchema = z.object({ resultType: z.literal("queue.enqueue"), enqueue: QueueEnqueueOutcomeSchema }).strict();
export const QueueBatchResultSchema = z.object({
  resultType: z.literal("queue.batch"), items: z.array(QueueEnqueueOutcomeSchema).max(250),
  counts: z.object({ created: z.number().int().nonnegative(), existing: z.number().int().nonnegative(), rejected: z.number().int().nonnegative(), blocked: z.number().int().nonnegative(), invalid: z.number().int().nonnegative(), failed: z.number().int().nonnegative() }).strict(),
}).strict();
export const QueueJobResultSchema = z.object({
  resultType: z.literal("queue.job"), action: z.enum(["claimNext", "complete", "fail", "scheduleRetry", "skip", "block", "get", "pause"]), job: PageJobContractSchema.nullable(),
  lease: z.object({ leaseId: z.string().uuid(), jobId: z.string().uuid(), projectId: z.string().uuid(), runId: z.string().uuid(), ownerId: z.string().min(1).max(120), fencingGeneration: z.number().int().positive(), status: z.enum(["active", "released", "expired", "recovered"]), acquiredAt: timestampSchema, heartbeatAt: timestampSchema, expiresAt: timestampSchema, releasedAt: timestampSchema.nullable(), releaseReason: z.string().max(120).nullable() }).strict().optional(),
}).strict();
export const QueueReleasedResultSchema = z.object({ resultType: z.literal("queue.released"), jobs: z.array(PageJobContractSchema).max(200) }).strict();
export const QueueListResultSchema = z.object({ resultType: z.literal("queue.list"), jobs: z.array(PageJobContractSchema).max(200), nextCursor: z.number().int().positive().nullable() }).strict();
export const QueueStatisticsResultSchema = z.object({
  resultType: z.literal("queue.statistics"), statistics: z.object({
    total: z.number().int().nonnegative(), pending: z.number().int().nonnegative(), processing: z.number().int().nonnegative(), completed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(), retrying: z.number().int().nonnegative(), skipped: z.number().int().nonnegative(), blocked: z.number().int().nonnegative(),
    interrupted: z.number().int().nonnegative(), paused: z.number().int().nonnegative(),
    dueRetries: z.number().int().nonnegative(), exhaustedRetries: z.number().int().nonnegative(), maximumDepth: z.number().int().nonnegative().nullable(),
    averageDepth: z.number().nonnegative().nullable(), oldestPendingAt: timestampSchema.nullable(), newestJobAt: timestampSchema.nullable(), duplicateDiscoveries: z.number().int().nonnegative(),
  }).strict(),
}).strict();
export const QueueHistoryResultSchema = z.object({
  resultType: z.literal("queue.history"), history: z.object({ job: PageJobContractSchema, transitions: z.array(PageJobTransitionContractSchema).max(10_000), attempts: z.array(PageJobAttemptContractSchema).max(100), discoveries: z.array(PageJobDiscoveryContractSchema).max(10_000) }).strict(),
}).strict();
export const QueueClearResultSchema = z.object({ resultType: z.literal("queue.clear"), skipped: z.number().int().nonnegative() }).strict();

export const JobLeaseContractSchema = z.object({
  leaseId: z.string().uuid(), jobId: z.string().uuid(), projectId: z.string().uuid(), runId: z.string().uuid(), ownerId: z.string().min(1).max(120),
  fencingGeneration: z.number().int().positive(), status: z.enum(["active", "released", "expired", "recovered"]), acquiredAt: timestampSchema,
  heartbeatAt: timestampSchema, expiresAt: timestampSchema, releasedAt: timestampSchema.nullable(), releaseReason: z.string().max(120).nullable(),
}).strict();
export const JobCheckpointContractSchema = z.object({
  checkpointId: z.string().uuid(), jobId: z.string().uuid(), attemptNumber: z.number().int().positive(), sequence: z.number().int().positive(), checkpointVersion: z.literal(1),
  fencingGeneration: z.number().int().positive(), ownerId: z.string().min(1).max(120), phase: z.string().min(1).max(120), progress: z.number().min(0).max(1),
  relativePath: z.string().min(1).max(2_048).nullable(), payload: z.record(z.string(), z.unknown()), committed: z.boolean(), supersedesCheckpointId: z.string().uuid().nullable(), createdAt: timestampSchema,
}).strict();
export const ArtifactCheckpointContractSchema = z.object({
  artifactCheckpointId: z.string().uuid(), jobId: z.string().uuid(), artifactKey: z.string().min(1).max(160), artifactKind: z.enum(["document", "asset", "metadata", "partial-file"]),
  relativePath: z.string().min(1).max(2_048), bytesWritten: z.number().int().nonnegative(), expectedBytes: z.number().int().nonnegative().nullable(), sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  validator: z.string().max(512).nullable(), resumeOffset: z.number().int().nonnegative(), fencingGeneration: z.number().int().positive(), committed: z.boolean(), createdAt: timestampSchema,
}).strict();
const RecoveryInspectionItemContractSchema = z.object({
  jobId: z.string().uuid(), queueSequence: z.number().int().positive(), currentState: queueStateSchema, reasonCode: queueReasonSchema,
  action: z.enum(["requeue", "pause", "report-output", "none"]), leaseId: z.string().uuid().nullable(), fencingGeneration: z.number().int().nonnegative(),
}).strict();
export const RecoveryReportContractSchema = z.object({
  recoveryOperationId: z.string().uuid(), projectId: z.string().uuid(), runId: z.string().uuid(), status: z.enum(["inspected", "in_progress", "completed", "failed"]),
  dryRun: z.boolean(), evaluationTime: timestampSchema, scanned: z.number().int().nonnegative(), interrupted: z.number().int().nonnegative(), requeued: z.number().int().nonnegative(), paused: z.number().int().nonnegative(),
  outputIssues: z.number().int().nonnegative(), cursor: z.number().int().nonnegative(), hasMore: z.boolean(), items: z.array(RecoveryInspectionItemContractSchema).max(500), startedAt: timestampSchema, completedAt: timestampSchema.nullable(),
}).strict();
const PauseStatusContractSchema = z.object({ projectId: z.string().uuid(), runId: z.string().uuid(), controlState: z.enum(["active", "pause_requested", "paused", "resuming", "recovering", "stopped", "completed", "failed"]), requestedAt: timestampSchema.nullable(), pausedAt: timestampSchema.nullable(), activeLeaseCount: z.number().int().nonnegative() }).strict();
export const RecoveryReportResultSchema = z.object({ resultType: z.literal("recovery.report"), report: RecoveryReportContractSchema }).strict();
export const LeaseValueResultSchema = z.object({ resultType: z.literal("lease.value"), lease: JobLeaseContractSchema }).strict();
export const LeaseListResultSchema = z.object({ resultType: z.literal("lease.list"), leases: z.array(JobLeaseContractSchema).max(200) }).strict();
export const CheckpointValueResultSchema = z.object({ resultType: z.literal("checkpoint.value"), action: z.enum(["save", "latest"]), checkpoint: JobCheckpointContractSchema.nullable() }).strict();
export const CheckpointListResultSchema = z.object({ resultType: z.literal("checkpoint.list"), checkpoints: z.array(JobCheckpointContractSchema).max(200) }).strict();
export const ArtifactCheckpointValueResultSchema = z.object({ resultType: z.literal("artifactCheckpoint.value"), checkpoint: ArtifactCheckpointContractSchema }).strict();
export const ArtifactCheckpointValidationResultSchema = z.object({ resultType: z.literal("artifactCheckpoint.validation"), valid: z.boolean(), checkpoint: ArtifactCheckpointContractSchema.nullable(), reasonCode: z.string().max(120).nullable() }).strict();
export const RunControlResultSchema = z.object({ resultType: z.literal("run.control"), run: PauseStatusContractSchema }).strict();

export const BrowserInstallationInfoContractSchema = z.object({
  installed: z.boolean(), valid: z.boolean(), provider: z.literal("playwright-core"), playwrightVersion: z.string().min(1).max(40),
  chromiumVersion: z.string().min(1).max(120).nullable(), browserRevision: z.string().min(1).max(40).nullable(), executableSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  resourceRootKind: z.enum(["repository-owned", "packaged-resource"]), systemBrowserFallback: z.literal(false), launchDownloadAllowed: z.literal(false), sandboxEnabled: z.literal(true), reasonCode: z.string().max(120).nullable(),
}).strict();
export const BrowserHealthContractSchema = z.object({
  state: z.enum(["stopped", "starting", "ready", "unhealthy", "crashed", "restarting", "closing"]), connected: z.boolean(), activeJobId: z.string().uuid().nullable(),
  restartCountInWindow: z.number().int().nonnegative().max(3), startedAt: timestampSchema.nullable(), lastCrashAt: timestampSchema.nullable(), browserVersion: z.string().max(120).nullable(),
}).strict();
export const BrowserRuntimeInfoResultSchema = z.object({ resultType: z.literal("browser.runtimeInfo"), action: z.enum(["info", "validate"]), info: BrowserInstallationInfoContractSchema }).strict();
export const BrowserHealthResultSchema = z.object({ resultType: z.literal("browser.health"), action: z.enum(["health", "restart"]), health: BrowserHealthContractSchema }).strict();

const renderStageSchema = z.enum(["claimed", "browser-starting", "context-created", "page-created", "navigating", "waiting-for-stability", "extracting-html", "capturing-screenshot", "committing-result", "completed", "failed", "cancelled"]);
const consoleEntrySchema = z.object({ index: z.number().int().nonnegative().max(99), type: z.enum(["error", "warning"]), textSafe: z.string().max(800), locationSafe: z.string().max(2_048).nullable(), occurredAt: timestampSchema }).strict();
const pageErrorSchema = z.object({ index: z.number().int().nonnegative().max(99), messageSafe: z.string().max(800), occurredAt: timestampSchema }).strict();
const failedRequestSchema = z.object({ index: z.number().int().nonnegative().max(99), urlSafe: z.string().max(2_048), method: z.enum(["GET", "HEAD"]), resourceType: z.string().max(80), failureSafe: z.string().max(240), occurredAt: timestampSchema }).strict();
const redirectEntrySchema = z.object({ index: z.number().int().nonnegative().max(99), fromUrlSafe: z.string().max(2_048), toUrlSafe: z.string().max(2_048), status: z.number().int().min(0).max(599), occurredAt: timestampSchema }).strict();
export const BrowserEvidenceContractSchema = z.object({
  consoleEntries: z.array(consoleEntrySchema).max(100), pageErrors: z.array(pageErrorSchema).max(100), failedRequests: z.array(failedRequestSchema).max(100), redirects: z.array(redirectEntrySchema).max(100),
  blockedRequests: z.number().int().nonnegative(), evidenceTruncated: z.boolean(),
}).strict();
const renderArtifactSchema = z.object({ relativePath: z.string().min(1).max(2_048), byteLength: z.number().int().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export const RenderResultContractSchema = z.object({
  renderResultId: z.string().uuid(), renderResultVersion: z.literal(1), jobId: z.string().uuid(), attemptId: z.string().uuid(), projectId: z.string().uuid(), runId: z.string().uuid(),
  requestedUrlSafe: z.string().min(1).max(2_048), finalUrlSafe: z.string().min(1).max(2_048), httpStatus: z.number().int().min(100).max(599).nullable(), contentType: z.string().max(240).nullable(), pageTitleSafe: z.string().max(300),
  resultStatus: z.enum(["completed", "failed", "cancelled"]), qualityClassification: z.enum(["complete", "blank", "incomplete", "http-error"]),
  navigationStartedAt: timestampSchema, stabilityReachedAt: timestampSchema, extractionCompletedAt: timestampSchema, renderCompletedAt: timestampSchema,
  navigationDurationMs: z.number().int().nonnegative(), stabilityDurationMs: z.number().int().nonnegative(), totalDurationMs: z.number().int().nonnegative(),
  browserVersion: z.string().min(1).max(120), playwrightVersion: z.string().min(1).max(40), renderEngineVersion: z.number().int().positive(), contextProfileVersion: z.number().int().positive(),
  htmlArtifact: renderArtifactSchema, screenshotArtifact: renderArtifactSchema.nullable(), evidence: BrowserEvidenceContractSchema, createdAt: timestampSchema,
}).strict();
export const RenderStatusContractSchema = z.object({ jobId: z.string().uuid(), jobState: queueStateSchema, stage: renderStageSchema.nullable(), resultStatus: z.enum(["completed", "failed", "cancelled"]).nullable(), fencingGeneration: z.number().int().nonnegative(), updatedAt: timestampSchema }).strict();
export const RenderEventContractSchema = z.object({ renderEventId: z.string().uuid(), jobId: z.string().uuid(), attemptId: z.string().uuid(), leaseId: z.string().uuid(), fencingGeneration: z.number().int().positive(), stage: renderStageSchema, eventType: z.string().min(1).max(120), safeMetadata: z.record(z.string().max(120), z.union([z.string().max(512), z.number().finite(), z.boolean(), z.null()])), occurredAt: timestampSchema }).strict();
export const RenderResultResultSchema = z.object({ resultType: z.literal("render.result"), action: z.enum(["start", "get"]), result: RenderResultContractSchema }).strict();
export const RenderStatusResultSchema = z.object({ resultType: z.literal("render.status"), action: z.enum(["status", "cancel"]), status: RenderStatusContractSchema }).strict();
export const RenderEventsResultSchema = z.object({ resultType: z.literal("render.events"), events: z.array(RenderEventContractSchema).max(200) }).strict();
export const InteractionProfileResultSchema = z.object({ resultType: z.literal("interaction.profile"), profile: interactionProfileContractSchema }).strict();
export const InteractionValidationResultSchema = z.object({ resultType: z.literal("interaction.validation"), target: z.enum(["profile", "plan"]), valid: z.boolean(), errors: z.array(z.object({ code: z.string().max(120), path: z.string().max(512), message: z.string().max(800) }).strict()).max(500) }).strict();
export const InteractionResultSchema = z.object({ resultType: z.literal("interaction.result"), action: z.literal("run"), trace: interactionTraceContractSchema, completedStepCount: z.number().int().nonnegative().max(500), failureCategory: z.string().max(40).nullable(), failureCode: z.string().max(120).nullable(), navigationOutcome: z.enum(["none", "dom-change", "spa-route", "full-navigation", "popup", "dialog", "blocked"]), discoveredUrlCount: z.number().int().nonnegative().max(500), contextProfile: z.object({ version: z.number().int().positive(), profileId: z.string().min(1).max(128), locale: z.string().min(1).max(64), timezoneId: z.string().min(1).max(64), viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict(), deviceScaleFactor: z.number().positive(), acceptLanguage: z.string().min(1).max(128), userAgentPolicy: z.literal("fixed"), headless: z.boolean(), digest: z.string().min(1).max(128) }).strict() }).strict();
export const InteractionTraceListResultSchema = z.object({ resultType: z.literal("interaction.traces"), traces: z.array(interactionTraceContractSchema).max(200) }).strict();
export const InteractionTraceInspectResultSchema = z.object({ resultType: z.literal("interaction.trace"), trace: interactionTraceContractSchema }).strict();

export const ResultContractSchema = z.discriminatedUnion("resultType", [
  SystemDescriptionSchema,
  ProjectSummaryResultSchema,
  ProjectValidationResultSchema,
  ProjectExportResultSchema,
  ProjectImportResultSchema,
  ProjectInfoResultSchema,
  ProfileResultSchema,
  ProfileValidationResultSchema,
  ProfileComparisonResultSchema,
  ScopeDecisionResultSchema,
  ScopeBatchResultSchema,
  ScopeEngineInfoResultSchema,
  QueueEnqueueResultSchema,
  QueueBatchResultSchema,
  QueueJobResultSchema,
  QueueReleasedResultSchema,
  QueueListResultSchema,
  QueueStatisticsResultSchema,
  QueueHistoryResultSchema,
  QueueClearResultSchema,
  RecoveryReportResultSchema,
  LeaseValueResultSchema,
  LeaseListResultSchema,
  CheckpointValueResultSchema,
  CheckpointListResultSchema,
  ArtifactCheckpointValueResultSchema,
  ArtifactCheckpointValidationResultSchema,
  RunControlResultSchema,
  BrowserRuntimeInfoResultSchema,
  BrowserHealthResultSchema,
  RenderResultResultSchema,
  RenderStatusResultSchema,
  RenderEventsResultSchema,
  InteractionProfileResultSchema,
  InteractionValidationResultSchema,
  InteractionResultSchema,
  InteractionTraceListResultSchema,
  InteractionTraceInspectResultSchema,
]);

const responseBase = {
  contractVersion: z.literal(CONTRACT_VERSION),
  commandId: identifierSchema,
  correlationId: identifierSchema,
  timestamp: timestampSchema,
};

export const SuccessResponseEnvelopeSchema = z.object({
  ...responseBase,
  status: z.literal("success"),
  result: ResultContractSchema,
  error: z.null(),
}).strict();

export const ErrorResponseEnvelopeSchema = z.object({
  ...responseBase,
  status: z.literal("error"),
  result: z.null(),
  error: ErrorContractSchema,
}).strict();

export const ResponseEnvelopeSchema = z.discriminatedUnion("status", [
  SuccessResponseEnvelopeSchema,
  ErrorResponseEnvelopeSchema,
]);

export const EventEnvelopeSchema = z.object({
  contractVersion: z.literal(CONTRACT_VERSION),
  eventId: identifierSchema,
  eventType: z.enum([
    "system.describe.completed",
    "project.operation.progress",
    "project.operation.completed",
    "queue.job.created",
    "queue.job.existing",
    "queue.job.claimed",
    "queue.job.completed",
    "queue.job.failed",
    "queue.job.retry-scheduled",
    "queue.job.retry-released",
    "queue.job.skipped",
    "queue.job.blocked",
    "queue.batch.completed",
    "browser.started",
    "browser.ready",
    "browser.crashed",
    "browser.restarted",
    "browser.closed",
    "render.started",
    "render.stage.changed",
    "render.navigation.started",
    "render.navigation.completed",
    "render.stability.waiting",
    "render.stability.reached",
    "render.html.extracted",
    "render.screenshot.captured",
    "render.result.committed",
    "render.failed",
    "render.cancelled",
  ]),
  correlationId: identifierSchema,
  sequence: z.number().int().nonnegative(),
  timestamp: timestampSchema,
  payload: z.object({
    operation: z.enum(COMMAND_TYPES),
    stage: z.string().min(1).max(80),
    percent: z.number().min(0).max(100).optional(),
  }).strict(),
}).strict();

export const ApplicationConfigurationSchema = z.object({
  applicationName: z.literal("Offline Web Archive Builder"),
  applicationVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  contractVersion: z.literal(CONTRACT_VERSION),
  logLevel: z.enum(["debug", "info", "warn", "error"]),
}).strict();

export type ErrorContract = z.infer<typeof ErrorContractSchema>;
export type CommandEnvelope = z.infer<typeof CommandEnvelopeSchema>;
export type CommandType = CommandEnvelope["commandType"];
export type SystemDescribeCommand = z.infer<typeof SystemDescribeCommandSchema>;
export type SystemDescription = z.infer<typeof SystemDescriptionSchema>;
export type ProjectSummaryContract = z.infer<typeof ProjectSummarySchema>;
export type SiteProfileContract = z.infer<typeof SiteProfileContractSchema>;
export type PageJobContract = z.infer<typeof PageJobContractSchema>;
export type JobLeaseContract = z.infer<typeof JobLeaseContractSchema>;
export type JobCheckpointContract = z.infer<typeof JobCheckpointContractSchema>;
export type RecoveryReportContract = z.infer<typeof RecoveryReportContractSchema>;
export type BrowserInstallationInfoContract = z.infer<typeof BrowserInstallationInfoContractSchema>;
export type BrowserHealthContract = z.infer<typeof BrowserHealthContractSchema>;
export type RenderResultContract = z.infer<typeof RenderResultContractSchema>;
export type RenderStatusContract = z.infer<typeof RenderStatusContractSchema>;
export type RenderEventContract = z.infer<typeof RenderEventContractSchema>;
export type InteractionProfileContract = z.infer<typeof interactionProfileContractSchema>;
export type InteractionPlanContract = z.infer<typeof interactionPlanContractSchema>;
export type InteractionTraceContract = z.infer<typeof interactionTraceContractSchema>;
export type RuntimeInfo = z.infer<typeof RuntimeInfoSchema>;
export type PlatformInfo = z.infer<typeof PlatformInfoSchema>;
export type ResponseEnvelope = z.infer<typeof ResponseEnvelopeSchema>;
export type SuccessResponseEnvelope = z.infer<typeof SuccessResponseEnvelopeSchema>;
export type ErrorResponseEnvelope = z.infer<typeof ErrorResponseEnvelopeSchema>;
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
export type ApplicationConfiguration = z.infer<typeof ApplicationConfigurationSchema>;

export class ContractValidationError extends Error {
  public constructor(
    public readonly code: "CONTRACT_UNSUPPORTED_VERSION" | "CONTRACT_INVALID_PAYLOAD",
    message: string,
  ) {
    super(message);
    this.name = "ContractValidationError";
  }
}

function hasUnsupportedVersion(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { contractVersion?: unknown };
  return typeof candidate.contractVersion === "string" && candidate.contractVersion !== CONTRACT_VERSION;
}

export function parseCommandEnvelope(value: unknown): CommandEnvelope {
  if (hasUnsupportedVersion(value)) {
    throw new ContractValidationError("CONTRACT_UNSUPPORTED_VERSION", `Unsupported contract version. This build accepts ${CONTRACT_VERSION}.`);
  }
  const parsed = CommandEnvelopeSchema.safeParse(value);
  if (!parsed.success) throw new ContractValidationError("CONTRACT_INVALID_PAYLOAD", "The command envelope is invalid.");
  return parsed.data;
}

export function parseSystemDescribeCommand(value: unknown): SystemDescribeCommand {
  const command = parseCommandEnvelope(value);
  if (command.commandType !== "system.describe") {
    throw new ContractValidationError("CONTRACT_INVALID_PAYLOAD", "Expected a system.describe command.");
  }
  return command;
}

export function parseResponseEnvelope(value: unknown): ResponseEnvelope {
  if (hasUnsupportedVersion(value)) {
    throw new ContractValidationError("CONTRACT_UNSUPPORTED_VERSION", `Unsupported contract version. This build accepts ${CONTRACT_VERSION}.`);
  }
  const parsed = ResponseEnvelopeSchema.safeParse(value);
  if (!parsed.success) throw new ContractValidationError("CONTRACT_INVALID_PAYLOAD", "The response envelope is invalid.");
  return parsed.data;
}

export function parseEventEnvelope(value: unknown): EventEnvelope {
  const parsed = EventEnvelopeSchema.safeParse(value);
  if (!parsed.success) {
    throw new ContractValidationError(hasUnsupportedVersion(value) ? "CONTRACT_UNSUPPORTED_VERSION" : "CONTRACT_INVALID_PAYLOAD", "The event envelope is invalid.");
  }
  return parsed.data;
}

interface CommandMetadata {
  commandId: string;
  correlationId: string;
  timestamp: string;
}

export function createSystemDescribeCommand(input: CommandMetadata): SystemDescribeCommand {
  return parseSystemDescribeCommand({ ...input, contractVersion: CONTRACT_VERSION, commandType: "system.describe", payload: {} });
}

export function createProjectCommand(
  commandType: Exclude<CommandType, "system.describe">,
  payload: unknown,
  input: CommandMetadata,
): CommandEnvelope {
  return parseCommandEnvelope({ ...input, contractVersion: CONTRACT_VERSION, commandType, payload });
}
