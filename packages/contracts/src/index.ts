import { z } from "zod";

export const CONTRACT_VERSION = "1.3.0" as const;

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

const queueStateSchema = z.enum(["pending", "processing", "completed", "failed", "retrying", "skipped", "blocked"]);
const queueDiscoveryTypeSchema = z.enum(["seed", "dom-link", "canonical", "redirect", "sitemap", "history-api", "navigation-action", "json-discovery", "manual"]);
const queueFailureCategorySchema = z.enum(["validation", "configuration", "application", "domain", "platform", "internal"]);
const queueKeySchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const queueReasonSchema = z.string().min(1).max(120).regex(/^[A-Z0-9][A-Z0-9._:-]*$/);
const queueMutationFields = { idempotencyKey: queueKeySchema, operationId: identifierSchema };
const queueOwnerFields = { projectPath: localPathSchema, runId: z.string().uuid() };
const queueEnqueueItemSchema = z.object({
  url: z.string().min(1).max(8_193),
  sourceUrl: z.string().min(1).max(8_192).optional(),
  parentJobId: z.string().uuid().nullable().optional(),
  sourceDepth: z.number().int().nonnegative().max(1_000).nullable().optional(),
  discoveryType: queueDiscoveryTypeSchema,
  requestedPriority: z.number().int().min(0).max(1_000).optional(),
  maxAttempts: z.number().int().min(1).max(100).default(3),
}).strict();
const queueResultSummarySchema = z.object({
  resultType: z.literal("queue-test"),
  statusCode: z.number().int().min(100).max(599).nullable(),
  contentStored: z.literal(false),
  metadata: z.record(z.string().max(80), z.union([z.string().max(256), z.number().finite(), z.boolean(), z.null()])).optional(),
}).strict().refine((value) => JSON.stringify(value).length <= 4_096, "Result metadata exceeds the Phase 6 limit");

export const QueueEnqueueCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.enqueue"), payload: z.object({ ...queueOwnerFields, profileRevision: z.string().uuid(), ...queueEnqueueItemSchema.shape, ...queueMutationFields }).strict() }).strict();
export const QueueEnqueueBatchCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.enqueueBatch"), payload: z.object({ ...queueOwnerFields, profileRevision: z.string().uuid(), items: z.array(queueEnqueueItemSchema).min(1).max(250), ...queueMutationFields }).strict() }).strict();
export const QueueClaimNextCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.claimNext"), payload: z.object({ ...queueOwnerFields, claimedBy: z.string().min(1).max(120), ...queueMutationFields }).strict() }).strict();
export const QueueCompleteCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.complete"), payload: z.object({ ...queueOwnerFields, jobId: z.string().uuid(), claimToken: z.string().uuid(), completionKey: queueKeySchema, resultSummary: queueResultSummarySchema, completedAt: timestampSchema, ...queueMutationFields }).strict() }).strict();
export const QueueFailCommandSchema = z.object({ ...commandBase, commandType: z.literal("queue.fail"), payload: z.object({ ...queueOwnerFields, jobId: z.string().uuid(), claimToken: z.string().uuid(), failureKey: queueKeySchema, failureCode: queueReasonSchema, failureCategory: queueFailureCategorySchema, retryable: z.boolean(), safeMessage: z.string().min(1).max(800), failedAt: timestampSchema, nextEligibleAt: timestampSchema.optional(), ...queueMutationFields }).strict() }).strict();
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
  coreStatus: z.literal("queue-foundation-ready"),
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
  startedAt: timestampSchema, finishedAt: timestampSchema.nullable(), outcome: z.enum(["processing", "completed", "failed", "retrying", "skipped", "blocked"]),
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
  resultType: z.literal("queue.job"), action: z.enum(["claimNext", "complete", "fail", "scheduleRetry", "skip", "block", "get"]), job: PageJobContractSchema.nullable(),
}).strict();
export const QueueReleasedResultSchema = z.object({ resultType: z.literal("queue.released"), jobs: z.array(PageJobContractSchema).max(200) }).strict();
export const QueueListResultSchema = z.object({ resultType: z.literal("queue.list"), jobs: z.array(PageJobContractSchema).max(200), nextCursor: z.number().int().positive().nullable() }).strict();
export const QueueStatisticsResultSchema = z.object({
  resultType: z.literal("queue.statistics"), statistics: z.object({
    total: z.number().int().nonnegative(), pending: z.number().int().nonnegative(), processing: z.number().int().nonnegative(), completed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(), retrying: z.number().int().nonnegative(), skipped: z.number().int().nonnegative(), blocked: z.number().int().nonnegative(),
    dueRetries: z.number().int().nonnegative(), exhaustedRetries: z.number().int().nonnegative(), maximumDepth: z.number().int().nonnegative().nullable(),
    averageDepth: z.number().nonnegative().nullable(), oldestPendingAt: timestampSchema.nullable(), newestJobAt: timestampSchema.nullable(), duplicateDiscoveries: z.number().int().nonnegative(),
  }).strict(),
}).strict();
export const QueueHistoryResultSchema = z.object({
  resultType: z.literal("queue.history"), history: z.object({ job: PageJobContractSchema, transitions: z.array(PageJobTransitionContractSchema).max(10_000), attempts: z.array(PageJobAttemptContractSchema).max(100), discoveries: z.array(PageJobDiscoveryContractSchema).max(10_000) }).strict(),
}).strict();
export const QueueClearResultSchema = z.object({ resultType: z.literal("queue.clear"), skipped: z.number().int().nonnegative() }).strict();

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
