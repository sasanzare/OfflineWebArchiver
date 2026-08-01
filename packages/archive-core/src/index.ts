export const IMPLEMENTED_CORE_CAPABILITIES = [
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
] as const;

export const PLANNED_CORE_CAPABILITIES = [
  "crawl.execution",
  "browser.rendering",
  "archive.generation",
  "authentication",
  "proxy.management",
] as const;

export type ProjectOperationErrorCode =
  | "PROJECT_ALREADY_EXISTS"
  | "PROJECT_NOT_FOUND"
  | "PROJECT_MANIFEST_INVALID"
  | "PROJECT_FORMAT_UNSUPPORTED"
  | "PROJECT_DATABASE_MISSING"
  | "PROJECT_DATABASE_INVALID"
  | "PROJECT_DATABASE_INTEGRITY_FAILED"
  | "PROJECT_SCHEMA_UNSUPPORTED"
  | "PROJECT_MIGRATION_REQUIRED"
  | "PROJECT_MIGRATION_FAILED"
  | "PROJECT_MIGRATION_CHECKSUM_MISMATCH"
  | "PROJECT_BACKUP_FAILED"
  | "PROJECT_LOCKED"
  | "PROJECT_LOCK_INVALID"
  | "PROJECT_NOT_OPEN"
  | "PROJECT_VALIDATION_FAILED"
  | "PROJECT_EXPORT_FAILED"
  | "PROJECT_IMPORT_FAILED"
  | "PROJECT_IMPORT_UNSAFE_ARCHIVE"
  | "PROJECT_IMPORT_LIMIT_EXCEEDED"
  | "PROJECT_ATOMIC_WRITE_FAILED";

export type ValidationSeverity = "error" | "warning";
export type ValidationCategory =
  | "manifest"
  | "compatibility"
  | "filesystem"
  | "database"
  | "migration"
  | "identity"
  | "security";

export interface ProjectValidationIssue {
  code: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  message: string;
  relativePath?: string;
}

export interface ProjectCompatibility {
  compatible: boolean;
  formatVersion: string | null;
  schemaVersion: number | null;
  currentSchemaVersion: number;
  requiresMigration: boolean;
  reason: string | null;
}

export interface ProjectSummary {
  projectPath: string;
  projectId: string;
  name: string;
  slug: string;
  formatVersion: string;
  schemaVersion: number;
  revisionId: string;
  runId: string;
  createdAt: string;
  lastOpenedAt: string;
  state: "ready" | "closed";
  migrationStatus: "current" | "migrated";
  recoveryStatus: "clean" | "recovery-available" | "recovery-required" | "recovery-blocked";
  recoverySummary: {
    processingJobs: number;
    activeLeases: number;
    expiredLeases: number;
    abandonedJobs: number;
    outputIssues: number;
    uncleanSessions: number;
  };
}

export interface ProjectValidationReport {
  valid: boolean;
  projectPath: string;
  checkedAt: string;
  compatibility: ProjectCompatibility;
  issues: readonly ProjectValidationIssue[];
  project: ProjectSummary | null;
}

export interface ProjectExportResult {
  archivePath: string;
  projectId: string;
  entryCount: number;
  expandedBytes: number;
  sha256: string;
}

export interface ProjectImportResult {
  project: ProjectSummary;
  archiveSha256: string;
  entryCount: number;
}

export interface CreateProjectInput {
  destinationPath: string;
  name: string;
  slug: string;
  baseUrl?: string | null;
}

export interface ExportProjectInput {
  projectPath: string;
  archivePath: string;
}

export interface ImportProjectInput {
  archivePath: string;
  destinationPath: string;
}

export interface ProjectStoragePort {
  create(input: CreateProjectInput): Promise<ProjectSummary>;
  open(projectPath: string): Promise<ProjectSummary>;
  close(): Promise<ProjectSummary>;
  validate(projectPath: string): Promise<ProjectValidationReport>;
  exportProject(input: ExportProjectInput): Promise<ProjectExportResult>;
  importProject(input: ImportProjectInput): Promise<ProjectImportResult>;
  getCompatibility(projectPath: string): Promise<ProjectCompatibility>;
  getCurrent(): ProjectSummary | null;
}

export class ProjectOperationError extends Error {
  public constructor(
    public readonly code: ProjectOperationErrorCode,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "ProjectOperationError";
  }
}

export const PAGE_JOB_STATES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "retrying",
  "skipped",
  "blocked",
  "interrupted",
  "paused",
] as const;

export type PageJobState = (typeof PAGE_JOB_STATES)[number];
export type PageJobTerminalState = "completed" | "failed" | "skipped" | "blocked";
export type PageJobDiscoveryType =
  | "seed"
  | "dom-link"
  | "canonical"
  | "redirect"
  | "sitemap"
  | "history-api"
  | "navigation-action"
  | "json-discovery"
  | "manual";
export type QueueFailureCategory =
  | "validation"
  | "configuration"
  | "application"
  | "domain"
  | "platform"
  | "internal";

export type QueueOperationErrorCode =
  | "QUEUE_JOB_NOT_FOUND"
  | "QUEUE_JOB_ALREADY_EXISTS"
  | "QUEUE_JOB_NOT_ELIGIBLE"
  | "QUEUE_JOB_STATE_CONFLICT"
  | "QUEUE_INVALID_TRANSITION"
  | "QUEUE_CLAIM_CONFLICT"
  | "QUEUE_CLAIM_TOKEN_INVALID"
  | "QUEUE_JOB_ALREADY_COMPLETED"
  | "QUEUE_COMPLETION_CONFLICT"
  | "QUEUE_FAILURE_CONFLICT"
  | "QUEUE_RETRY_NOT_ALLOWED"
  | "QUEUE_MAX_ATTEMPTS_REACHED"
  | "QUEUE_BATCH_LIMIT_EXCEEDED"
  | "QUEUE_OPERATION_IDEMPOTENCY_CONFLICT"
  | "QUEUE_PROFILE_REVISION_MISMATCH"
  | "QUEUE_ENGINE_VERSION_MISMATCH"
  | "QUEUE_RUN_NOT_FOUND"
  | "QUEUE_PROJECT_NOT_OPEN"
  | "QUEUE_PERSISTENCE_FAILURE"
  | "QUEUE_TRANSACTION_FAILED"
  | "QUEUE_INPUT_INVALID"
  | "QUEUE_RESULT_TOO_LARGE"
  | "QUEUE_PAGINATION_LIMIT_EXCEEDED"
  | "QUEUE_CLEAR_NOT_ALLOWED";

export class QueueOperationError extends Error {
  public constructor(
    public readonly code: QueueOperationErrorCode,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "QueueOperationError";
  }
}

export interface PageJob {
  jobId: string;
  projectId: string;
  runId: string;
  projectRevisionId: string;
  profileId: string;
  profileRevisionId: string;
  normalizationEngineVersion: number;
  jobType: "page";
  normalizedUrl: string;
  identityUrl: string;
  safeDisplayUrl: string;
  identityHash: string;
  scopeDecisionId: string;
  scopeReasonCode: string;
  state: PageJobState;
  priority: number;
  prioritySource: "policy" | "explicit";
  queueSequence: number;
  depth: number;
  discoveryType: PageJobDiscoveryType;
  attemptCount: number;
  fencingGeneration: number;
  maxAttempts: number;
  nextEligibleAt: string;
  claimToken: string | null;
  claimedBy: string | null;
  claimedAt: string | null;
  lastAttemptAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  completionKey: string | null;
  resultVersion: number | null;
  resultSummary: QueueResultSummary | null;
  lastErrorCode: string | null;
  lastErrorCategory: QueueFailureCategory | null;
  lastErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  queuedAt: string;
}

export interface QueueResultSummary {
  resultType: "queue-test";
  statusCode: number | null;
  contentStored: false;
  metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface QueueScopeDecisionSnapshot {
  decisionId: string;
  engineVersion: number;
  profileId: string;
  profileRevisionId: string;
  eligible: boolean;
  shouldQueue: boolean;
  reasonCodes: readonly string[];
  normalizedUrl: string | null;
  identityUrl: string | null;
  identityHash: string | null;
  displayUrl: string | null;
  depth: number;
  matchedRuleIds: readonly string[];
}

export interface PageJobDiscovery {
  discoveryId: string;
  parentJobId: string | null;
  childJobId: string;
  safeSourceUrl: string | null;
  discoveryType: PageJobDiscoveryType;
  sourceDepth: number | null;
  resultDepth: number;
  scopeDecisionId: string;
  discoveredAt: string;
}

export interface PageJobAttempt {
  attemptId: string;
  jobId: string;
  attemptNumber: number;
  claimToken: string;
  startedAt: string;
  finishedAt: string | null;
  outcome: "processing" | "completed" | "failed" | "retrying" | "skipped" | "blocked" | "interrupted" | "paused";
  errorCode: string | null;
  errorCategory: QueueFailureCategory | null;
  safeErrorMessage: string | null;
}

export interface PageJobTransition {
  transitionId: string;
  jobId: string;
  fromState: PageJobState | null;
  toState: PageJobState;
  reasonCode: string;
  operationId: string;
  correlationId: string;
  occurredAt: string;
}

export interface QueueHistory {
  job: PageJob;
  transitions: readonly PageJobTransition[];
  attempts: readonly PageJobAttempt[];
  discoveries: readonly PageJobDiscovery[];
}

export interface QueueStatistics {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
  skipped: number;
  blocked: number;
  interrupted: number;
  paused: number;
  dueRetries: number;
  exhaustedRetries: number;
  maximumDepth: number | null;
  averageDepth: number | null;
  oldestPendingAt: string | null;
  newestJobAt: string | null;
  duplicateDiscoveries: number;
}

export interface QueueEnqueueInput {
  projectId: string;
  runId: string;
  projectRevisionId: string;
  scopeDecision: QueueScopeDecisionSnapshot;
  sourceContext: {
    parentJobId?: string | null;
    safeSourceUrl?: string | null;
    discoveryType: PageJobDiscoveryType;
    sourceDepth?: number | null;
  };
  requestedPriority?: number;
  maxAttempts: number;
  maxPages: number | null;
  idempotencyKey: string;
  operationId: string;
  correlationId: string;
}

export type QueueEnqueueResult =
  | { outcome: "created"; job: PageJob; discovery: PageJobDiscovery }
  | { outcome: "existing"; job: PageJob; discovery: PageJobDiscovery; duplicateReason: "logical-identity" }
  | { outcome: "rejected" | "blocked"; job: null; reasonCodes: readonly string[] };

export interface QueueBatchResult {
  items: readonly (QueueEnqueueResult | { outcome: "invalid" | "failed"; job: null; errorCode: QueueOperationErrorCode })[];
  counts: { created: number; existing: number; rejected: number; blocked: number; invalid: number; failed: number };
}

export interface QueueListResult {
  jobs: readonly PageJob[];
  nextCursor: number | null;
}

export interface QueueRepositoryPort {
  enqueue(input: QueueEnqueueInput): Promise<QueueEnqueueResult>;
  enqueueBatch(inputs: readonly QueueEnqueueInput[]): Promise<QueueBatchResult>;
  hasIdentity(input: { projectId: string; runId: string; profileRevisionId: string; engineVersion: number; identityHash: string }): Promise<boolean>;
  countIdentities(input: { projectId: string; runId: string; profileRevisionId: string; engineVersion: number }): Promise<number>;
  claimNext(input: { projectId: string; runId: string; claimedBy: string; idempotencyKey: string; operationId: string; correlationId: string }): Promise<PageJob | null>;
  complete(input: { projectId: string; runId: string; jobId: string; claimToken: string; completionKey: string; resultSummary: QueueResultSummary; completedAt: string; idempotencyKey: string; operationId: string; correlationId: string }): Promise<PageJob>;
  fail(input: { projectId: string; runId: string; jobId: string; claimToken: string; failureKey: string; failureCode: string; failureCategory: QueueFailureCategory; retryable: boolean; safeMessage: string; failedAt: string; nextEligibleAt?: string; idempotencyKey: string; operationId: string; correlationId: string }): Promise<PageJob>;
  scheduleRetry(input: { projectId: string; runId: string; jobId: string; nextEligibleAt: string; reasonCode: string; idempotencyKey: string; operationId: string; correlationId: string }): Promise<PageJob>;
  releaseDueRetries(input: { projectId: string; runId: string; dueAt: string; limit: number; idempotencyKey: string; operationId: string; correlationId: string }): Promise<readonly PageJob[]>;
  skip(input: { projectId: string; runId: string; jobId: string; reasonCode: string; safeMessage: string; claimToken?: string; idempotencyKey: string; operationId: string; correlationId: string }): Promise<PageJob>;
  block(input: { projectId: string; runId: string; jobId: string; reasonCode: string; safeMessage: string; claimToken?: string; idempotencyKey: string; operationId: string; correlationId: string }): Promise<PageJob>;
  get(input: { projectId: string; runId: string; jobId: string }): Promise<PageJob>;
  list(input: { projectId: string; runId: string; state?: PageJobState; afterSequence?: number; limit: number }): Promise<QueueListResult>;
  getStatistics(input: { projectId: string; runId: string; asOf: string }): Promise<QueueStatistics>;
  getHistory(input: { projectId: string; runId: string; jobId: string }): Promise<QueueHistory>;
  clearPending(input: { projectId: string; runId: string; confirmation: "CLEAR-PENDING-QUEUE"; reasonCode: string; idempotencyKey: string; operationId: string; correlationId: string }): Promise<{ skipped: number }>;
}

export interface Clock {
  now(): string;
}

export type RunControlState = "active" | "pause_requested" | "paused" | "resuming" | "recovering" | "stopped" | "completed" | "failed";
export type JobLeaseStatus = "active" | "released" | "expired" | "recovered";

export type RecoveryOperationErrorCode =
  | "LEASE_NOT_FOUND"
  | "LEASE_EXPIRED"
  | "LEASE_OWNER_MISMATCH"
  | "LEASE_TOKEN_INVALID"
  | "FENCING_GENERATION_STALE"
  | "LEASE_RENEWAL_INVALID"
  | "RUN_NOT_ACTIVE"
  | "RUN_PAUSE_CONFLICT"
  | "RECOVERY_ALREADY_RUNNING"
  | "RECOVERY_OPERATION_NOT_FOUND"
  | "RECOVERY_CONFIRMATION_REQUIRED"
  | "CHECKPOINT_NOT_FOUND"
  | "CHECKPOINT_INVALID"
  | "CHECKPOINT_TOO_LARGE"
  | "CHECKPOINT_OWNERSHIP_INVALID"
  | "ARTIFACT_CHECKPOINT_INVALID"
  | "OUTPUT_DESCRIPTOR_INVALID"
  | "OUTPUT_VERIFICATION_FAILED"
  | "RECOVERY_INPUT_INVALID"
  | "RECOVERY_TRANSACTION_FAILED";

export class RecoveryOperationError extends Error {
  public constructor(
    public readonly code: RecoveryOperationErrorCode,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "RecoveryOperationError";
  }
}

export interface JobLease {
  leaseId: string;
  jobId: string;
  projectId: string;
  runId: string;
  ownerId: string;
  fencingGeneration: number;
  status: JobLeaseStatus;
  acquiredAt: string;
  heartbeatAt: string;
  expiresAt: string;
  releasedAt: string | null;
  releaseReason: string | null;
}

export interface LeaseClaim {
  job: PageJob;
  lease: JobLease;
  leaseToken: string;
}

export interface JobCheckpoint {
  checkpointId: string;
  jobId: string;
  attemptNumber: number;
  sequence: number;
  checkpointVersion: number;
  fencingGeneration: number;
  ownerId: string;
  phase: string;
  progress: number;
  relativePath: string | null;
  payload: Readonly<Record<string, unknown>>;
  committed: boolean;
  supersedesCheckpointId: string | null;
  createdAt: string;
}

export interface RunCheckpoint {
  checkpointId: string;
  projectId: string;
  runId: string;
  sequence: number;
  checkpointVersion: number;
  controlState: RunControlState;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  createdAt: string;
}

export interface ArtifactCheckpoint {
  artifactCheckpointId: string;
  jobId: string;
  artifactKey: string;
  artifactKind: "document" | "asset" | "metadata" | "partial-file";
  relativePath: string;
  bytesWritten: number;
  expectedBytes: number | null;
  sha256: string | null;
  validator: string | null;
  resumeOffset: number;
  fencingGeneration: number;
  committed: boolean;
  createdAt: string;
}

export interface CompletedOutputDescriptor {
  descriptorId: string;
  jobId: string;
  relativePath: string;
  byteLength: number;
  sha256: string;
  verificationPolicy: "size-and-sha256";
  verifiedAt: string | null;
  verificationStatus: "pending" | "valid" | "missing" | "size-mismatch" | "hash-mismatch";
}

export interface RecoveryInspectionItem {
  jobId: string;
  queueSequence: number;
  currentState: PageJobState;
  reasonCode: string;
  action: "requeue" | "pause" | "report-output" | "none";
  leaseId: string | null;
  fencingGeneration: number;
}

export interface RecoveryReport {
  recoveryOperationId: string;
  projectId: string;
  runId: string;
  status: "inspected" | "in_progress" | "completed" | "failed";
  dryRun: boolean;
  evaluationTime: string;
  scanned: number;
  interrupted: number;
  requeued: number;
  paused: number;
  outputIssues: number;
  cursor: number;
  hasMore: boolean;
  items: readonly RecoveryInspectionItem[];
  startedAt: string;
  completedAt: string | null;
}

export interface PauseStatus {
  projectId: string;
  runId: string;
  controlState: RunControlState;
  requestedAt: string | null;
  pausedAt: string | null;
  activeLeaseCount: number;
}

export interface RecoveryRepositoryPort {
  claimNextWithLease(input: { projectId: string; runId: string; ownerId: string; leaseDurationMs: number; idempotencyKey: string; operationId: string; correlationId: string }): Promise<LeaseClaim | null>;
  heartbeatLease(input: { projectId: string; runId: string; jobId: string; leaseToken: string; fencingGeneration: number; ownerId: string; operationId: string }): Promise<JobLease>;
  renewLease(input: { projectId: string; runId: string; jobId: string; leaseToken: string; fencingGeneration: number; ownerId: string; extensionMs: number; operationId: string }): Promise<JobLease>;
  releaseLease(input: { projectId: string; runId: string; jobId: string; leaseToken: string; fencingGeneration: number; ownerId: string; reasonCode: string; operationId: string }): Promise<JobLease>;
  listLeases(input: { projectId: string; runId: string; status?: JobLeaseStatus; limit: number }): Promise<readonly JobLease[]>;
  getLease(input: { projectId: string; runId: string; jobId: string }): Promise<JobLease>;
  saveJobCheckpoint(input: { projectId: string; runId: string; jobId: string; leaseToken: string; fencingGeneration: number; ownerId: string; phase: string; progress: number; relativePath?: string | null; payload: Readonly<Record<string, unknown>>; operationId: string }): Promise<JobCheckpoint>;
  getLatestJobCheckpoint(input: { projectId: string; runId: string; jobId: string }): Promise<JobCheckpoint | null>;
  listJobCheckpoints(input: { projectId: string; runId: string; jobId: string; limit: number }): Promise<readonly JobCheckpoint[]>;
  saveArtifactCheckpoint(input: { projectId: string; runId: string; jobId: string; leaseToken: string; fencingGeneration: number; ownerId: string; artifactKey: string; artifactKind: ArtifactCheckpoint["artifactKind"]; relativePath: string; bytesWritten: number; expectedBytes?: number | null; sha256?: string | null; validator?: string | null; resumeOffset: number; committed: boolean; operationId: string }): Promise<ArtifactCheckpoint>;
  validateArtifactCheckpoint(input: { projectId: string; runId: string; jobId: string; artifactKey: string }): Promise<{ valid: boolean; checkpoint: ArtifactCheckpoint | null; reasonCode: string | null }>;
  saveCompletedOutputs(input: { projectId: string; runId: string; jobId: string; leaseToken: string; fencingGeneration: number; ownerId: string; outputs: readonly Omit<CompletedOutputDescriptor, "descriptorId" | "jobId" | "verifiedAt" | "verificationStatus">[]; operationId: string }): Promise<readonly CompletedOutputDescriptor[]>;
  inspectRecovery(input: { projectId: string; runId: string; evaluationTime: string; limit: number; afterSequence?: number }): Promise<RecoveryReport>;
  recover(input: { projectId: string; runId: string; evaluationTime: string; limit: number; confirmation: "APPLY-RECOVERY"; idempotencyKey: string; operationId: string; correlationId: string }): Promise<RecoveryReport>;
  getRecoveryReport(input: { projectId: string; runId: string; recoveryOperationId: string }): Promise<RecoveryReport>;
  requestPause(input: { projectId: string; runId: string; operationId: string }): Promise<PauseStatus>;
  getPauseStatus(input: { projectId: string; runId: string }): Promise<PauseStatus>;
  acknowledgePause(input: { projectId: string; runId: string; jobId: string; leaseToken: string; fencingGeneration: number; ownerId: string; operationId: string; correlationId: string }): Promise<PageJob>;
  resumeRun(input: { projectId: string; runId: string; operationId: string; correlationId: string }): Promise<PauseStatus>;
  getRunControlState(input: { projectId: string; runId: string }): Promise<PauseStatus>;
  verifyCompletedOutput(input: { projectId: string; runId: string; jobId: string; projectRoot: string }): Promise<readonly CompletedOutputDescriptor[]>;
  beginExecutionSession(input: { projectId: string; runId: string; processId: number; hostId: string }): Promise<string>;
  endExecutionSession(input: { projectId: string; runId: string; sessionId: string }): Promise<void>;
}

export interface CoreSystemDescription {
  coreStatus: "recovery-foundation-ready";
  implementedCapabilities: typeof IMPLEMENTED_CORE_CAPABILITIES;
  plannedCapabilities: typeof PLANNED_CORE_CAPABILITIES;
}

export interface ArchiveCore {
  describeSystem(): CoreSystemDescription;
}

export function createArchiveCore(): ArchiveCore {
  return Object.freeze({
    describeSystem(): CoreSystemDescription {
      return {
        coreStatus: "recovery-foundation-ready",
        implementedCapabilities: IMPLEMENTED_CORE_CAPABILITIES,
        plannedCapabilities: PLANNED_CORE_CAPABILITIES,
      };
    },
  });
}
