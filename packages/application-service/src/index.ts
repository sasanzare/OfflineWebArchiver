import path from "node:path";
import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import {
  BROWSER_CONTEXT_PROFILE_VERSION,
  createArchiveCore,
  InteractionOperationError,
  InteractionTraceBuilder,
  isSafeInteractionKey,
  parseInteractionPlan,
  parseInteractionProfile,
  validateInteractionProfile,
  ProjectOperationError,
  QueueOperationError,
  RecoveryOperationError,
  RenderOperationError,
  RENDER_ENGINE_VERSION,
  SecretStoreError,
  SessionOperationError,
  SESSION_STORAGE_CAPABILITIES,
  assertSessionMetadata,
  assertSessionTransition,
  sessionRequiresReauthentication,
  type BrowserAuthenticationPolicy,
  type BrowserAuthenticationSession,
  type SessionMetadata,
  type SessionMetadataInput,
  type SessionRepositoryPort,
  type SessionValidationResult,
  type SessionState,
  type SessionFailureReason,
  parseSecretRef,
  type ArchiveCore,
  type ProjectStoragePort,
  type QueueEnqueueInput,
  type QueueRepositoryPort,
  type RecoveryRepositoryPort,
  type BrowserRuntimePort,
  type RenderEnginePort,
  type RenderPolicy,
  type RenderRepositoryPort,
  type InteractionPlan,
  type InteractionProfile,
  type InteractionProfileRepositoryPort,
  type InteractionTraceRepositoryPort,
  type RuntimeNetworkDecision,
  type SecretRef,
  type SecretStorePort,
} from "@offline-web-archive/archive-core";
import { createPlaywrightBrowserRuntime, PLAYWRIGHT_VERSION } from "@offline-web-archive/browser-runtime";
import {
  CONTRACT_VERSION,
  ContractValidationError,
  parseCommandEnvelope,
  parseResponseEnvelope,
  type ApplicationConfiguration,
  type CommandEnvelope,
  type ErrorContract,
  type PlatformInfo,
  type ResponseEnvelope,
  type RuntimeInfo,
  type SuccessResponseEnvelope,
} from "@offline-web-archive/contracts";
import { createSilentLogger, type Logger } from "@offline-web-archive/observability";
import { createSqliteProjectStorage } from "@offline-web-archive/persistence-sqlite";
import { deriveBatchItemIdempotencyKey } from "@offline-web-archive/queue";
import { classifyRenderFailure, createRenderEngine, DEFAULT_RENDER_POLICY } from "@offline-web-archive/rendering";
import { createProductionSecretStore } from "@offline-web-archive/secrets";
import {
  classifyHost,
  evaluateScope,
  evaluateScopeBatch,
  createDefaultSiteProfileDraft,
  getScopeEngineInfo,
  ScopeEngineError,
  type ProfileStoragePort,
} from "@offline-web-archive/scope-engine";

export type LocalTransport = "cli" | "electron-ipc";

export interface TransportContext {
  transport: LocalTransport;
  authorized: boolean;
}

export interface ApplicationService {
  execute(command: unknown, context: TransportContext): Promise<ResponseEnvelope>;
  close(): Promise<void>;
}

export interface ApplicationServiceDependencies {
  configuration: ApplicationConfiguration;
  runtime: RuntimeInfo;
  platform: PlatformInfo;
  core?: ArchiveCore;
  projectStorage?: ApplicationStorage;
  browserRuntime?: BrowserRuntimePort;
  renderEngine?: RenderEnginePort;
  interactionPlanProvider?: (input: { projectId: string; runId: string; jobId: string; planId: string }) => Promise<InteractionPlan>;
  browserRoot?: string;
  renderTestMode?: boolean;
  fixtureOrigins?: readonly string[];
  renderHeartbeatIntervalMs?: number;
  logger?: Logger;
  now?: () => string;
  secretStoreFactory?: (input: { readonly projectRoot: string; readonly projectId: string; readonly now: () => string }) => SecretStorePort;
}

function safeIdentifiers(raw: unknown): { commandId: string; correlationId: string } {
  if (typeof raw !== "object" || raw === null) return { commandId: "unknown-command", correlationId: "unknown-correlation" };
  const candidate = raw as Record<string, unknown>;
  const safe = (value: unknown, fallback: string): string =>
    typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value) ? value : fallback;
  return {
    commandId: safe(candidate["commandId"], "unknown-command"),
    correlationId: safe(candidate["correlationId"], "unknown-correlation"),
  };
}

function contractError(error: ContractValidationError): ErrorContract {
  return {
    code: error.code,
    category: "contract",
    message: error.message,
    userMessage: error.code === "CONTRACT_UNSUPPORTED_VERSION"
      ? "This command uses an unsupported contract version."
      : "The command could not be validated.",
    retryable: false,
  };
}

function projectError(error: ProjectOperationError): ErrorContract {
  const validationCodes = new Set([
    "PROJECT_MANIFEST_INVALID",
    "PROJECT_FORMAT_UNSUPPORTED",
    "PROJECT_DATABASE_MISSING",
    "PROJECT_DATABASE_INVALID",
    "PROJECT_DATABASE_INTEGRITY_FAILED",
    "PROJECT_SCHEMA_UNSUPPORTED",
    "PROJECT_MIGRATION_REQUIRED",
    "PROJECT_MIGRATION_CHECKSUM_MISMATCH",
    "PROJECT_VALIDATION_FAILED",
  ]);
  const securityCodes = new Set([
    "PROJECT_IMPORT_UNSAFE_ARCHIVE",
    "PROJECT_IMPORT_LIMIT_EXCEEDED",
    "PROJECT_LOCK_INVALID",
  ]);
  const userMessages: Partial<Record<ProjectOperationError["code"], string>> = {
    PROJECT_ALREADY_EXISTS: "The selected destination already exists.",
    PROJECT_NOT_FOUND: "The selected Project could not be found.",
    PROJECT_MANIFEST_INVALID: "The Project manifest is invalid.",
    PROJECT_FORMAT_UNSUPPORTED: "This Project format is not supported by this application version.",
    PROJECT_DATABASE_INTEGRITY_FAILED: "The Project database failed its integrity check.",
    PROJECT_SCHEMA_UNSUPPORTED: "This Project database schema is not supported.",
    PROJECT_MIGRATION_CHECKSUM_MISMATCH: "The Project migration history has been modified and cannot be trusted.",
    PROJECT_LOCKED: "The Project is already open by another process.",
    PROJECT_IMPORT_UNSAFE_ARCHIVE: "The selected archive contains an unsafe or invalid entry.",
    PROJECT_IMPORT_LIMIT_EXCEEDED: "The selected archive exceeds the safe import limits.",
    PROJECT_NOT_OPEN: "No Project is currently open.",
  };
  return {
    code: error.code,
    category: securityCodes.has(error.code) ? "security" : validationCodes.has(error.code) ? "validation" : "application",
    message: error.message,
    userMessage: userMessages[error.code] ?? "The Project operation could not be completed safely.",
    retryable: error.retryable,
  };
}

function internalError(): ErrorContract {
  return {
    code: "INTERNAL_UNEXPECTED_ERROR",
    category: "internal",
    message: "The application service failed unexpectedly.",
    userMessage: "The operation could not be completed.",
    retryable: true,
  };
}

function scopeError(error: ScopeEngineError): ErrorContract {
  return {
    code: error.code,
    category: error.code === "PROFILE_INTEGRITY_MISMATCH" ? "security" : "validation",
    message: error.message,
    userMessage: error.code === "PROFILE_NOT_FOUND"
      ? "The selected Project does not have a Site Profile."
      : error.code === "PROFILE_NO_CHANGES"
        ? "No Site Profile changes were detected."
        : "The Site Profile or scope request could not be validated.",
    retryable: error.code === "PROFILE_REVISION_CONFLICT",
  };
}

function queueError(error: QueueOperationError): ErrorContract {
  const validationCodes = new Set([
    "QUEUE_JOB_NOT_ELIGIBLE",
    "QUEUE_INVALID_TRANSITION",
    "QUEUE_CLAIM_TOKEN_INVALID",
    "QUEUE_BATCH_LIMIT_EXCEEDED",
    "QUEUE_PROFILE_REVISION_MISMATCH",
    "QUEUE_ENGINE_VERSION_MISMATCH",
    "QUEUE_INPUT_INVALID",
    "QUEUE_RESULT_TOO_LARGE",
    "QUEUE_PAGINATION_LIMIT_EXCEEDED",
    "QUEUE_CLEAR_NOT_ALLOWED",
  ]);
  const userMessages: Partial<Record<QueueOperationError["code"], string>> = {
    QUEUE_JOB_NOT_FOUND: "The selected Page Job was not found in this Project and Run.",
    QUEUE_JOB_STATE_CONFLICT: "The Page Job is not in a state that permits this operation.",
    QUEUE_INVALID_TRANSITION: "The requested Page Job state transition is not allowed.",
    QUEUE_CLAIM_CONFLICT: "Another caller claimed this Page Job.",
    QUEUE_CLAIM_TOKEN_INVALID: "The claim token does not own this Page Job.",
    QUEUE_COMPLETION_CONFLICT: "This Page Job already has a different completion result.",
    QUEUE_OPERATION_IDEMPOTENCY_CONFLICT: "The idempotency key was already used for a different queue operation.",
    QUEUE_MAX_ATTEMPTS_REACHED: "This Page Job has reached its maximum attempt count.",
    QUEUE_RUN_NOT_FOUND: "The selected Run does not belong to this Project.",
    QUEUE_PROJECT_NOT_OPEN: "Open the selected Project before using its queue.",
  };
  return {
    code: error.code,
    category: validationCodes.has(error.code) ? "validation" : error.code.includes("CONFLICT") ? "domain" : "application",
    message: error.message,
    userMessage: userMessages[error.code] ?? "The queue operation could not be completed safely.",
    retryable: error.retryable,
  };
}

function recoveryError(error: RecoveryOperationError): ErrorContract {
  const securityCodes = new Set(["LEASE_OWNER_MISMATCH", "LEASE_TOKEN_INVALID", "FENCING_GENERATION_STALE", "CHECKPOINT_OWNERSHIP_INVALID", "OUTPUT_DESCRIPTOR_INVALID"]);
  const validationCodes = new Set(["CHECKPOINT_INVALID", "CHECKPOINT_TOO_LARGE", "ARTIFACT_CHECKPOINT_INVALID", "RECOVERY_INPUT_INVALID", "RECOVERY_CONFIRMATION_REQUIRED"]);
  const userMessages: Partial<Record<RecoveryOperationError["code"], string>> = {
    LEASE_NOT_FOUND: "No active Lease owns the selected Page Job.",
    LEASE_EXPIRED: "The Page Job Lease expired before this operation.",
    LEASE_OWNER_MISMATCH: "The Lease belongs to another owner.",
    LEASE_TOKEN_INVALID: "The Lease Token is invalid.",
    FENCING_GENERATION_STALE: "A newer owner has fenced this operation.",
    RUN_NOT_ACTIVE: "The Run is not accepting new claims.",
    RUN_PAUSE_CONFLICT: "The Run cannot perform that pause or resume operation in its current state.",
    RECOVERY_CONFIRMATION_REQUIRED: "Recovery must be explicitly confirmed before it changes persisted state.",
  };
  return {
    code: error.code,
    category: securityCodes.has(error.code) ? "security" : validationCodes.has(error.code) ? "validation" : "application",
    message: error.message,
    userMessage: userMessages[error.code] ?? "The recovery operation could not be completed safely.",
    retryable: error.retryable,
  };
}

function renderError(error: RenderOperationError): ErrorContract {
  const securityCodes = new Set(["RUNTIME_NETWORK_BLOCKED", "REDIRECT_BLOCKED", "BROWSER_INSTALLATION_INVALID"]);
  const validationCodes = new Set(["BROWSER_INSTALLATION_MISSING", "RENDER_INPUT_INVALID", "RENDER_HTML_TOO_LARGE", "RENDER_SCREENSHOT_TOO_LARGE", "RENDER_BLANK_PAGE"]);
  return {
    code: error.code,
    category: securityCodes.has(error.code) ? "security" : validationCodes.has(error.code) ? "validation" : error.code.startsWith("BROWSER_") || error.code === "PAGE_CRASHED" ? "platform" : "application",
    message: error.message,
    userMessage: error.code === "BROWSER_INSTALLATION_MISSING"
      ? "The approved Chromium runtime is not installed. Run the explicit browser installation command."
      : error.code === "RUNTIME_NETWORK_BLOCKED" || error.code === "REDIRECT_BLOCKED"
        ? "Browser navigation was blocked by the approved Scope or runtime-network policy."
        : error.code === "RENDER_RESULT_NOT_FOUND"
          ? "No committed Render Result exists for this Page Job."
          : "The Page Job could not be rendered safely.",
    retryable: error.retryable,
  };
}

function interactionError(error: InteractionOperationError): ErrorContract {
  const securityCodes = new Set(["INTERACTION_SIDE_EFFECT_BLOCKED", "INTERACTION_POPUP_BLOCKED", "INTERACTION_DIALOG_BLOCKED"]);
  const validationCodes = new Set(["INTERACTION_PROFILE_INVALID", "INTERACTION_PLAN_INVALID", "INTERACTION_TARGET_INVALID", "INTERACTION_KEY_INVALID", "INTERACTION_TRACE_LIMIT"]);
  return {
    code: error.code,
    category: securityCodes.has(error.code) ? "security" : validationCodes.has(error.code) ? "validation" : error.code === "INTERACTION_BROWSER_FAILED" ? "platform" : "application",
    message: error.message,
    userMessage: validationCodes.has(error.code)
      ? "The Human-Paced Browser Interaction request is invalid."
      : securityCodes.has(error.code)
        ? "The requested interaction was blocked by the safety policy."
        : "The Human-Paced Browser Interaction could not be completed safely.",
    retryable: error.retryable,
  };
}

function secretStoreError(error: SecretStoreError): ErrorContract {
  const securityCodes = new Set<SecretStoreError["code"]>([
    "SECRET_REFERENCE_PROJECT_MISMATCH",
    "SECRET_PURPOSE_NOT_ALLOWED",
    "SECRET_TAMPER_DETECTED",
    "SECRET_INSECURE_BACKEND",
    "SECRET_PRODUCTION_TEST_BACKEND",
  ]);
  const validationCodes = new Set<SecretStoreError["code"]>([
    "SECRET_REFERENCE_INVALID",
    "SECRET_REFERENCE_VERSION_UNSUPPORTED",
    "SECRET_KIND_INVALID",
    "SECRET_SCOPE_INVALID",
    "SECRET_PURPOSE_INVALID",
    "SECRET_METADATA_INVALID",
    "SECRET_VALUE_INVALID",
    "SECRET_VALUE_TOO_LARGE",
    "SECRET_FORMAT_UNSUPPORTED",
    "SECRET_ALGORITHM_UNSUPPORTED",
    "SECRET_KDF_INVALID",
    "SECRET_EXPORT_CONFIRMATION_REQUIRED",
  ]);
  const userMessages: Partial<Record<SecretStoreError["code"], string>> = {
    SECRET_STORE_LOCKED: "Unlock the Secret Store before using protected Secret data.",
    SECRET_STORE_UNINITIALIZED: "The Secret Store has not been initialized for this Project.",
    SECRET_UNLOCK_FAILED: "The Secret Store could not be unlocked.",
    SECRET_UNLOCK_RATE_LIMITED: "Unlock attempts are temporarily rate-limited.",
    SECRET_TAMPER_DETECTED: "The Secret Store failed its integrity check.",
    SECRET_INSECURE_BACKEND: "The selected Secret Store backend is not secure enough for protected data.",
    SECRET_BACKEND_UNAVAILABLE: "The selected Secret Store backend is unavailable.",
    SECRET_NOT_FOUND: "The selected Secret Reference was not found.",
    SECRET_REFERENCE_PROJECT_MISMATCH: "The Secret Reference belongs to another Project.",
    SECRET_EXPORT_FORBIDDEN: "The selected Secret is not eligible for Secure Export.",
  };
  return {
    code: error.code,
    category: securityCodes.has(error.code) ? "security" : validationCodes.has(error.code) ? "validation" : "application",
    message: error.message,
    userMessage: userMessages[error.code] ?? "The Secret Store operation could not be completed safely.",
    retryable: error.retryable,
  };
}

function sessionError(error: SessionOperationError): ErrorContract {
  const securityCodes = new Set<SessionOperationError["code"]>(["SESSION_PROJECT_MISMATCH", "SESSION_SECRET_INCONSISTENT", "SESSION_PROFILE_INCOMPATIBLE"]);
  const validationCodes = new Set<SessionOperationError["code"]>(["SESSION_METADATA_INVALID", "SESSION_STATE_CONFLICT", "SESSION_STORAGE_STATE_INVALID", "SESSION_VALIDATION_FAILED", "SESSION_VALIDATION_UNAVAILABLE"]);
  const userMessages: Partial<Record<SessionOperationError["code"], string>> = {
    SESSION_NOT_FOUND: "The selected authenticated Session was not found.",
    SESSION_ALREADY_EXISTS: "The selected Session already exists.",
    SESSION_PROJECT_MISMATCH: "The selected Session belongs to another Project.",
    SESSION_PROFILE_INCOMPATIBLE: "The authenticated Session is not compatible with the current Browser Profile.",
    SESSION_STORAGE_STATE_INVALID: "The authenticated Session state is corrupt and must be replaced by manual re-authentication.",
    SESSION_VALIDATION_UNAVAILABLE: "Authentication validation could not reach the validation page. Retry without treating the Session as expired.",
    SESSION_SECRET_INCONSISTENT: "The authenticated Session metadata and Secret Store reference are inconsistent.",
  };
  return {
    code: error.code,
    category: securityCodes.has(error.code) ? "security" : validationCodes.has(error.code) ? "validation" : "application",
    message: error.message,
    userMessage: userMessages[error.code] ?? "The authenticated Session operation could not be completed safely.",
    retryable: error.retryable,
  };
}

function safeSessionMetadata(metadata: SessionMetadata): Record<string, unknown> {
  return {
    sessionId: metadata.sessionId,
    projectId: metadata.projectId,
    profileId: metadata.profileId,
    browserProfileVersion: metadata.browserProfileVersion,
    sessionFormatVersion: metadata.sessionFormatVersion,
    storageStateFormatVersion: metadata.storageStateFormatVersion,
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
    lastValidatedAt: metadata.lastValidatedAt,
    validationResult: metadata.validationResult,
    failureReason: metadata.failureReason,
    state: metadata.state,
    validationPolicy: metadata.validationPolicy,
    affinity: metadata.affinity,
    capabilities: metadata.capabilities,
    revision: metadata.revision,
    requiresReauthentication: sessionRequiresReauthentication(metadata),
  };
}

function sessionBrowserStatus(session: BrowserAuthenticationSession): Record<string, unknown> {
  const profile = session.getContextProfile();
  return {
    mode: session.mode,
    headless: profile.headless,
    profileId: profile.profileId,
    profileVersion: profile.version,
    currentUrlSafe: session.getCurrentUrlSafe(),
  };
}

function resultLogMetadata(result: SuccessResponseEnvelope["result"]): Record<string, unknown> {
  if (result.resultType === "profile.value") return { resultType: result.resultType, profileId: result.profile.profileId, profileRevisionId: result.profile.revisionId, engineVersion: result.profile.engineVersion, changedPaths: result.changedPaths ?? [] };
  if (result.resultType === "profile.validation") return { resultType: result.resultType, valid: result.validation.valid, errorCodes: result.validation.errors.map((entry) => entry.code), warningCodes: result.validation.warnings.map((entry) => entry.code) };
  if (result.resultType === "profile.comparison") return { resultType: result.resultType, fromRevisionId: result.comparison.fromRevisionId, toRevisionId: result.comparison.toRevisionId, changedPaths: result.comparison.changedPaths };
  if (result.resultType === "scope.decision") return { resultType: result.resultType, mode: result.mode, engineVersion: result.decision.engineVersion, profileRevisionId: result.decision.profileRevisionId, eligible: result.decision.eligible, reasonCodes: result.decision.reasonCodes, matchedRules: result.decision.matchedRules, redacted: result.decision.reasonCodes.some((code) => code.includes("SENSITIVE")) };
  if (result.resultType === "scope.batch") return { resultType: result.resultType, decisionCount: result.decisions.length, rejectedCount: result.decisions.filter((decision) => !decision.eligible).length, redactedCount: result.decisions.filter((decision) => decision.reasonCodes.some((code) => code.includes("SENSITIVE"))).length };
  if (result.resultType === "scope.engineInfo") return { resultType: result.resultType, engineVersion: result.info.engineVersion, profileSchemaVersion: result.info.profileSchemaVersion };
  if (result.resultType === "queue.enqueue") return { resultType: result.resultType, outcome: result.enqueue.outcome, jobId: result.enqueue.job?.jobId ?? null, identityHash: result.enqueue.job?.identityHash ?? null };
  if (result.resultType === "queue.batch") return { resultType: result.resultType, ...result.counts };
  if (result.resultType === "queue.job") return { resultType: result.resultType, action: result.action, jobId: result.job?.jobId ?? null, state: result.job?.state ?? null, attemptNumber: result.job?.attemptCount ?? null };
  if (result.resultType === "queue.released") return { resultType: result.resultType, releasedCount: result.jobs.length, jobIds: result.jobs.map((job) => job.jobId) };
  if (result.resultType === "queue.list") return { resultType: result.resultType, jobCount: result.jobs.length, nextCursor: result.nextCursor };
  if (result.resultType === "queue.statistics") return { resultType: result.resultType, ...result.statistics };
  if (result.resultType === "queue.history") return { resultType: result.resultType, jobId: result.history.job.jobId, transitions: result.history.transitions.length, attempts: result.history.attempts.length, discoveries: result.history.discoveries.length };
  if (result.resultType === "queue.clear") return { resultType: result.resultType, skipped: result.skipped };
  if (result.resultType === "recovery.report") return { resultType: result.resultType, recoveryOperationId: result.report.recoveryOperationId, status: result.report.status, dryRun: result.report.dryRun, scanned: result.report.scanned, interrupted: result.report.interrupted, requeued: result.report.requeued, paused: result.report.paused, outputIssues: result.report.outputIssues, hasMore: result.report.hasMore };
  if (result.resultType === "lease.value") return { resultType: result.resultType, leaseId: result.lease.leaseId, jobId: result.lease.jobId, ownerId: result.lease.ownerId, fencingGeneration: result.lease.fencingGeneration, status: result.lease.status, expiresAt: result.lease.expiresAt };
  if (result.resultType === "lease.list") return { resultType: result.resultType, leaseCount: result.leases.length };
  if (result.resultType === "checkpoint.value") return { resultType: result.resultType, action: result.action, checkpointId: result.checkpoint?.checkpointId ?? null, jobId: result.checkpoint?.jobId ?? null, phase: result.checkpoint?.phase ?? null, progress: result.checkpoint?.progress ?? null };
  if (result.resultType === "checkpoint.list") return { resultType: result.resultType, checkpointCount: result.checkpoints.length };
  if (result.resultType === "artifactCheckpoint.value") return { resultType: result.resultType, artifactCheckpointId: result.checkpoint.artifactCheckpointId, jobId: result.checkpoint.jobId, artifactKind: result.checkpoint.artifactKind, bytesWritten: result.checkpoint.bytesWritten, committed: result.checkpoint.committed };
  if (result.resultType === "artifactCheckpoint.validation") return { resultType: result.resultType, valid: result.valid, reasonCode: result.reasonCode };
  if (result.resultType === "run.control") return { resultType: result.resultType, runId: result.run.runId, controlState: result.run.controlState, runState: result.run.runState, activeLeaseCount: result.run.activeLeaseCount };
  if (result.resultType === "browser.runtimeInfo") return { resultType: result.resultType, action: result.action, valid: result.info.valid, playwrightVersion: result.info.playwrightVersion, chromiumVersion: result.info.chromiumVersion, sandboxEnabled: result.info.sandboxEnabled };
  if (result.resultType === "browser.health") return { resultType: result.resultType, action: result.action, state: result.health.state, connected: result.health.connected, activeJobId: result.health.activeJobId };
  if (result.resultType === "render.result") return { resultType: result.resultType, action: result.action, renderResultId: result.result.renderResultId, jobId: result.result.jobId, status: result.result.resultStatus, quality: result.result.qualityClassification, totalDurationMs: result.result.totalDurationMs, htmlSha256: result.result.htmlArtifact.sha256 };
  if (result.resultType === "render.status") return { resultType: result.resultType, action: result.action, jobId: result.status.jobId, jobState: result.status.jobState, stage: result.status.stage, resultStatus: result.status.resultStatus };
  if (result.resultType === "render.events") return { resultType: result.resultType, eventCount: result.events.length };
  if (result.resultType === "interaction.profile") return { resultType: result.resultType, profileId: result.profile.profileId, profileRevisionId: result.profile.profileRevisionId, enabled: result.profile.enabled, mode: result.profile.mode };
  if (result.resultType === "interaction.validation") return { resultType: result.resultType, target: result.target, valid: result.valid, errorCount: result.errors.length };
  if (result.resultType === "interaction.result") return { resultType: result.resultType, status: result.trace.status, traceId: result.trace.traceId, completedStepCount: result.completedStepCount, failureCode: result.failureCode };
  if (result.resultType === "interaction.traces") return { resultType: result.resultType, traceCount: result.traces.length };
  if (result.resultType === "interaction.trace") return { resultType: result.resultType, traceId: result.trace.traceId, status: result.trace.status, eventCount: result.trace.events.length };
  if (result.resultType === "secret.backend.status") return { resultType: result.resultType, backend: result.status.backend, state: result.status.state, vaultState: result.status.vaultState, initialized: result.status.initialized, locked: result.status.locked };
  if (result.resultType === "secret.list") return { resultType: result.resultType, metadataCount: result.metadata.length, refs: result.metadata.map((metadata) => metadata.ref) };
  if (result.resultType === "secret.vault.lock") return { resultType: result.resultType, backend: result.status.backend, vaultState: result.status.vaultState, locked: result.status.locked };
  if (result.resultType === "secret.delete") return { resultType: result.resultType, ref: result.ref };
  if (result.resultType === "session.metadata") return { resultType: result.resultType, action: result.action, sessionId: result.session.sessionId, state: result.session.state, validationResult: result.session.validationResult, requiresReauthentication: result.session.requiresReauthentication };
  if (result.resultType === "session.list") return { resultType: result.resultType, sessionCount: result.sessions.length, sessionIds: result.sessions.map((session) => session.sessionId) };
  if (result.resultType === "session.delete") return { resultType: result.resultType, sessionId: result.sessionId };
  return { resultType: result.resultType };
}

function unauthorizedError(): ErrorContract {
  return {
    code: "SECURITY_UNAUTHORIZED_TRANSPORT",
    category: "security",
    message: "The local transport did not pass its authorization boundary.",
    userMessage: "The request was not authorized.",
    retryable: false,
  };
}

interface ActiveRender {
  controller: AbortController;
  operationId: string;
}

interface ActiveInteraction {
  controller: AbortController;
  operationId: string;
}

interface ActiveAuthentication {
  readonly projectId: string;
  readonly projectPath: string;
  readonly sessionId: string;
  readonly browserSession: BrowserAuthenticationSession;
  readonly previousMetadata: SessionMetadata | null;
}

type ApplicationStorage = ProjectStoragePort & ProfileStoragePort & QueueRepositoryPort & RecoveryRepositoryPort & RenderRepositoryPort & InteractionProfileRepositoryPort & InteractionTraceRepositoryPort & SessionRepositoryPort;

type SecretStoreFactory = NonNullable<ApplicationServiceDependencies["secretStoreFactory"]>;

function secretStoreKey(projectPath: string): string {
  return path.resolve(projectPath).toLowerCase();
}

function getOrCreateSecretStore(
  stores: Map<string, SecretStorePort>,
  factory: SecretStoreFactory,
  projectPath: string,
  projectId: string,
  now: () => string,
): SecretStorePort {
  const key = secretStoreKey(projectPath);
  const existing = stores.get(key);
  if (existing !== undefined) return existing;
  const created = factory({ projectRoot: path.resolve(projectPath), projectId, now });
  stores.set(key, created);
  return created;
}

async function authorizeRuntimeUrl(
  rawUrl: string,
  profile: Awaited<ReturnType<ProfileStoragePort["getProfile"]>>,
  testMode: boolean,
  fixtureOrigins: readonly string[],
): Promise<RuntimeNetworkDecision> {
  let url: URL;
  try { url = new URL(rawUrl); }
  catch { return { allowed: false, reasonCode: "RUNTIME_URL_INVALID", safeUrl: "invalid-url", resolvedAddresses: [] }; }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username !== "" || url.password !== "") {
    return { allowed: false, reasonCode: "RUNTIME_SCHEME_OR_CREDENTIALS_BLOCKED", safeUrl: `${url.protocol}//${url.hostname}/`, resolvedAddresses: [] };
  }
  const fixtureAllowed = testMode && fixtureOrigins.includes(url.origin);
  const scope = evaluateScope(profile, { rawUrl, discoveryType: "manual", profileRevision: profile.revisionId, currentEligibleCount: 0 });
  if (!fixtureAllowed && !scope.eligible) return { allowed: false, reasonCode: scope.reasonCodes[0] ?? "RUNTIME_SCOPE_BLOCKED", safeUrl: scope.displayUrl ?? `${url.origin}${url.pathname}`, resolvedAddresses: [] };
  let addresses: readonly string[];
  try { addresses = [...new Set((await lookup(url.hostname, { all: true, verbatim: true })).map((entry) => entry.address))]; }
  catch { return { allowed: false, reasonCode: "RUNTIME_DNS_FAILED", safeUrl: scope.displayUrl ?? `${url.origin}${url.pathname}`, resolvedAddresses: [] }; }
  if (addresses.length === 0) return { allowed: false, reasonCode: "RUNTIME_DNS_EMPTY", safeUrl: scope.displayUrl ?? `${url.origin}${url.pathname}`, resolvedAddresses: [] };
  const classes = addresses.map(classifyHost);
  const allowed = fixtureAllowed ? classes.every((value) => value === "loopback") : classes.every((value) => value === "public");
  return { allowed, reasonCode: allowed ? (fixtureAllowed ? "RUNTIME_TEST_LOOPBACK_ALLOWED" : "RUNTIME_PUBLIC_ADDRESS_ALLOWED") : "RUNTIME_PRIVATE_OR_MIXED_ADDRESS_BLOCKED", safeUrl: scope.displayUrl ?? `${url.origin}${url.pathname}`, resolvedAddresses: addresses };
}

async function authorizeAuthenticationUrl(
  rawUrl: string,
  profile: Awaited<ReturnType<ProfileStoragePort["getProfile"]>>,
  allowedOrigins: readonly string[],
  testMode: boolean,
  fixtureOrigins: readonly string[],
): Promise<RuntimeNetworkDecision> {
  let url: URL;
  try { url = new URL(rawUrl); }
  catch { return { allowed: false, reasonCode: "AUTH_URL_INVALID", safeUrl: "invalid-url", resolvedAddresses: [] }; }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username !== "" || url.password !== "") return { allowed: false, reasonCode: "AUTH_URL_CREDENTIALS_BLOCKED", safeUrl: `${url.protocol}//${url.hostname}/`, resolvedAddresses: [] };
  if (!allowedOrigins.includes(url.origin)) return { allowed: false, reasonCode: "AUTH_ORIGIN_NOT_APPROVED", safeUrl: `${url.origin}${url.pathname}`, resolvedAddresses: [] };
  const fixtureAllowed = testMode && fixtureOrigins.includes(url.origin);
  const scope = evaluateScope(profile, { rawUrl, discoveryType: "manual", profileRevision: profile.revisionId, currentEligibleCount: 0 });
  let addresses: readonly string[];
  try { addresses = [...new Set((await lookup(url.hostname, { all: true, verbatim: true })).map((entry) => entry.address))]; }
  catch { return { allowed: false, reasonCode: "AUTH_DNS_FAILED", safeUrl: scope.displayUrl ?? `${url.origin}${url.pathname}`, resolvedAddresses: [] }; }
  if (addresses.length === 0) return { allowed: false, reasonCode: "AUTH_DNS_EMPTY", safeUrl: scope.displayUrl ?? `${url.origin}${url.pathname}`, resolvedAddresses: [] };
  const classes = addresses.map(classifyHost);
  const allowed = fixtureAllowed ? classes.every((value) => value === "loopback") : classes.every((value) => value === "public");
  return { allowed, reasonCode: allowed ? (fixtureAllowed ? "AUTH_TEST_LOOPBACK_ALLOWED" : "AUTH_PUBLIC_ORIGIN_ALLOWED") : "AUTH_PRIVATE_OR_MIXED_ADDRESS_BLOCKED", safeUrl: scope.displayUrl ?? `${url.origin}${url.pathname}`, resolvedAddresses: addresses };
}

function normalizedSessionOrigin(value: string): string {
  try {
    const url = new URL(value);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username !== "" || url.password !== "" || url.pathname !== "/" || url.search !== "" || url.hash !== "") throw new Error("invalid origin");
    return url.origin;
  } catch {
    throw new SessionOperationError("SESSION_METADATA_INVALID", "The Session origin is invalid");
  }
}

function sessionValidationPolicy(input: { validationUrl: string; markerSelector?: string | null; markerText?: string | null }): import("@offline-web-archive/archive-core").SessionValidationPolicy {
  let url: URL;
  try {
    url = new URL(input.validationUrl);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") throw new Error("unsafe validation URL");
  } catch {
    throw new SessionOperationError("SESSION_METADATA_INVALID", "The Session validation URL is invalid");
  }
  return { validationUrl: input.validationUrl, expectedOrigin: url.origin, expectedPath: url.pathname || "/", markerSelector: input.markerSelector ?? null, markerText: input.markerText ?? null };
}

function sessionAuthPolicy(
  input: { loginUrl: string; allowedOrigins: readonly string[]; validationUrl: string; markerSelector?: string | null; markerText?: string | null },
  profile: Awaited<ReturnType<ProfileStoragePort["getProfile"]>>,
  testMode: boolean,
  fixtureOrigins: readonly string[],
): BrowserAuthenticationPolicy {
  let loginUrl: URL;
  try {
    loginUrl = new URL(input.loginUrl);
    if ((loginUrl.protocol !== "http:" && loginUrl.protocol !== "https:") || loginUrl.username !== "" || loginUrl.password !== "" || loginUrl.search !== "" || loginUrl.hash !== "") throw new Error("unsafe login URL");
  } catch {
    throw new SessionOperationError("SESSION_METADATA_INVALID", "The Session login URL is invalid");
  }
  const validation = sessionValidationPolicy(input);
  const allowedOrigins = [...new Set(input.allowedOrigins.map(normalizedSessionOrigin))];
  if (!allowedOrigins.includes(loginUrl.origin) || !allowedOrigins.includes(validation.expectedOrigin)) throw new SessionOperationError("SESSION_METADATA_INVALID", "The login and validation origins must be explicitly approved");
  return { initialUrl: input.loginUrl, allowedOrigins, validation, navigationTimeoutMs: 120_000, testMode, authorizeUrl: (url) => authorizeAuthenticationUrl(url, profile, allowedOrigins, testMode, fixtureOrigins) };
}

function updateSessionMetadata(
  current: SessionMetadata,
  now: () => string,
  patch: Partial<Pick<SessionMetadata, "secretRef" | "lastValidatedAt" | "validationResult" | "failureReason" | "state" | "validationPolicy" | "affinity" | "capabilities">>,
): SessionMetadata {
  const next = { ...current, ...patch, updatedAt: now(), revision: current.revision + 1 };
  if (next.state !== current.state) assertSessionTransition(current.state, next.state);
  assertSessionMetadata(next);
  return next;
}

function validationOutcome(
  current: SessionMetadata,
  now: () => string,
  status: "valid" | "expired" | "invalid" | "unavailable" | "configuration_missing" | "incompatible_profile" | "corrupt",
): SessionMetadata {
  const mapping: Record<typeof status, { state: SessionState; failureReason: SessionFailureReason }> = {
    valid: { state: "valid", failureReason: "none" },
    expired: { state: "reauth_required", failureReason: "authentication_expired" },
    invalid: { state: "reauth_required", failureReason: "authentication_rejected" },
    unavailable: { state: "validation_required", failureReason: "network_unavailable" },
    configuration_missing: { state: "validation_required", failureReason: "validation_configuration_missing" },
    incompatible_profile: { state: "reauth_required", failureReason: "browser_profile_incompatible" },
    corrupt: { state: "corrupt", failureReason: "storage_state_corrupt" },
  };
  const result = mapping[status];
  return updateSessionMetadata(current, now, { state: result.state, validationResult: status, failureReason: result.failureReason, ...(status === "valid" ? { lastValidatedAt: now() } : {}) });
}

function validationOutcomeWithReason(
  current: SessionMetadata,
  now: () => string,
  status: "corrupt" | "unavailable",
  failureReason: SessionFailureReason,
): SessionMetadata {
  const state: SessionState = status === "corrupt" ? "corrupt" : "validation_required";
  return updateSessionMetadata(current, now, { state, validationResult: status, failureReason });
}

function renderPolicy(commandPolicy: Extract<CommandEnvelope, { commandType: "render.start" }>["payload"]["policy"], testMode: boolean): RenderPolicy {
  const merged: RenderPolicy = {
    ...DEFAULT_RENDER_POLICY,
    navigationTimeoutMs: commandPolicy?.navigationTimeoutMs ?? DEFAULT_RENDER_POLICY.navigationTimeoutMs,
    renderTimeoutMs: commandPolicy?.renderTimeoutMs ?? DEFAULT_RENDER_POLICY.renderTimeoutMs,
    stabilityTimeoutMs: commandPolicy?.stabilityTimeoutMs ?? DEFAULT_RENDER_POLICY.stabilityTimeoutMs,
    domQuietMs: commandPolicy?.domQuietMs ?? DEFAULT_RENDER_POLICY.domQuietMs,
    networkQuietMs: commandPolicy?.networkQuietMs ?? DEFAULT_RENDER_POLICY.networkQuietMs,
    fixtureScroll: commandPolicy?.fixtureScroll ?? false,
    captureScreenshot: commandPolicy?.captureScreenshot ?? false,
    ...(commandPolicy?.completionSelector === undefined ? {} : { completionSelector: commandPolicy.completionSelector }),
  };
  if (merged.fixtureScroll && !testMode) throw new RenderOperationError("RENDER_INPUT_INVALID", "Fixture scrolling is disabled in production Render mode");
  return merged;
}

async function executeRenderStart(
  command: Extract<CommandEnvelope, { commandType: "render.start" }>,
  storage: ProjectStoragePort & ProfileStoragePort & QueueRepositoryPort & RecoveryRepositoryPort & RenderRepositoryPort,
  runtime: BrowserRuntimePort,
  engine: RenderEnginePort,
  activeRenders: Map<string, ActiveRender>,
  now: () => string,
  testMode: boolean,
  fixtureOrigins: readonly string[],
  heartbeatIntervalMs: number,
): Promise<unknown> {
  const project = storage.getCurrent();
  if (project === null) throw new RenderOperationError("RENDER_INPUT_INVALID", "Open the selected Project before starting a Render");
  if (project.runId !== command.payload.runId) throw new QueueOperationError("QUEUE_RUN_NOT_FOUND", "The selected Run does not belong to the open Project");
  if (activeRenders.has(command.payload.jobId)) throw new RenderOperationError("BROWSER_BUSY", "The selected Page Job already has an active Render operation");
  const policy = renderPolicy(command.payload.policy, testMode);
  const profile = await storage.getProfile(command.payload.projectPath);
  try {
    return { resultType: "render.result", action: "start", result: await storage.getRenderResult({ projectId: project.projectId, runId: project.runId, jobId: command.payload.jobId }) };
  } catch (error) {
    if (!(error instanceof RenderOperationError) || error.code !== "RENDER_RESULT_NOT_FOUND") throw error;
  }
  const requestedLeaseMs = Math.min(86_400_000, Math.max(command.payload.leaseDurationMs, policy.renderTimeoutMs + 60_000));
  const claim = await storage.claimJobWithLease({
    projectId: project.projectId, runId: command.payload.runId, jobId: command.payload.jobId, ownerId: command.payload.ownerId,
    leaseDurationMs: requestedLeaseMs, idempotencyKey: command.payload.idempotencyKey, operationId: command.payload.operationId, correlationId: command.correlationId,
  });
  const controller = new AbortController();
  activeRenders.set(command.payload.jobId, { controller, operationId: command.payload.operationId });
  let page: Awaited<ReturnType<BrowserRuntimePort["createPageSession"]>> | null = null;
  let lease = claim.lease;
  let heartbeatRunning = false;
  let heartbeatFailure: unknown = null;
  const heartbeat = async (): Promise<void> => {
    if (heartbeatRunning) return;
    heartbeatRunning = true;
    try {
      lease = await storage.heartbeatLease({ projectId: project.projectId, runId: project.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: command.payload.ownerId, operationId: `${command.payload.operationId}:heartbeat` });
      if (Date.parse(lease.expiresAt) - Date.parse(now()) < 30_000) {
        lease = await storage.renewLease({ projectId: project.projectId, runId: project.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: command.payload.ownerId, extensionMs: requestedLeaseMs, operationId: `${command.payload.operationId}:renew` });
      }
    } catch (error) {
      heartbeatFailure = error;
      controller.abort();
    } finally {
      heartbeatRunning = false;
    }
  };
  const heartbeatTimer = setInterval(() => void heartbeat(), heartbeatIntervalMs);
  const persistStage = async (stage: Parameters<RenderEnginePort["render"]>[0]["onStage"] extends (stage: infer S, ...arguments_: never[]) => unknown ? S : never, progress: number, safeMetadata: Readonly<Record<string, string | number | boolean | null>> = {}): Promise<void> => {
    await storage.recordRenderEvent({ projectId: project.projectId, runId: project.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: command.payload.ownerId, stage, eventType: `render.${stage}`, safeMetadata: { progress, ...safeMetadata }, occurredAt: now() });
    await storage.saveJobCheckpoint({ projectId: project.projectId, runId: project.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: command.payload.ownerId, phase: stage, progress, payload: { stage, ...safeMetadata }, operationId: `${command.payload.operationId}:${stage}` });
  };
  try {
    await persistStage("claimed", 0.05, { attemptNumber: claim.job.attemptCount, contextProfileVersion: BROWSER_CONTEXT_PROFILE_VERSION });
    const installation = await runtime.validateInstallation();
    if (!installation.valid) throw new RenderOperationError(installation.reasonCode === "BROWSER_INSTALLATION_MISSING" ? "BROWSER_INSTALLATION_MISSING" : "BROWSER_INSTALLATION_INVALID", "The approved Chromium runtime did not pass validation");
    await persistStage("browser-starting", 0.1, { playwrightVersion: installation.playwrightVersion });
    const browserHealth = await runtime.start();
    await persistStage("context-created", 0.12, { contextProfileVersion: BROWSER_CONTEXT_PROFILE_VERSION });
    page = await runtime.createPageSession(claim.job.jobId, {
      testMode,
      allowedFixtureOrigins: fixtureOrigins,
      maxEvidenceEntries: policy.maxEvidenceEntries,
      serviceWorkerPolicy: profile.serviceWorkerPolicy,
      authorizeUrl: (url) => authorizeRuntimeUrl(url, profile, testMode, fixtureOrigins),
    });
    await persistStage("page-created", 0.15);
    const output = await engine.render({
      jobId: claim.job.jobId,
      requestedUrl: claim.job.normalizedUrl,
      page,
      policy,
      signal: controller.signal,
      now,
      onStage: persistStage,
      heartbeat,
      shouldPause: async () => (await storage.getRunControlState({ projectId: project.projectId, runId: project.runId })).controlState === "pause_requested",
    });
    if (heartbeatFailure !== null) throw heartbeatFailure;
    if (output.qualityClassification !== "complete") throw new RenderOperationError(output.qualityClassification === "http-error" ? "NAVIGATION_FAILED" : "RENDER_BLANK_PAGE", "The Page output did not meet the successful Render quality policy");
    await persistStage("committing-result", 0.92, { htmlBytes: new TextEncoder().encode(output.html).byteLength, screenshot: output.screenshot !== null });
    const result = await storage.commitRenderResult({
      projectId: project.projectId, runId: project.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration,
      ownerId: command.payload.ownerId, operationId: command.payload.operationId,
      result: {
        renderResultVersion: 1, jobId: claim.job.jobId, projectId: project.projectId, runId: project.runId,
        requestedUrlSafe: output.navigation.requestedUrlSafe, finalUrlSafe: output.navigation.finalUrlSafe, httpStatus: output.navigation.statusCode,
        contentType: output.navigation.contentType, pageTitleSafe: output.titleSafe, resultStatus: "completed", qualityClassification: output.qualityClassification,
        navigationStartedAt: output.navigation.startedAt, stabilityReachedAt: output.stabilityReachedAt, extractionCompletedAt: output.extractionCompletedAt,
        renderCompletedAt: now(), navigationDurationMs: output.navigation.durationMs, stabilityDurationMs: output.stabilityDurationMs, totalDurationMs: output.totalDurationMs,
        browserVersion: browserHealth.browserVersion ?? installation.chromiumVersion ?? "unknown", playwrightVersion: PLAYWRIGHT_VERSION, renderEngineVersion: RENDER_ENGINE_VERSION,
        contextProfileVersion: BROWSER_CONTEXT_PROFILE_VERSION, evidence: output.evidence,
      },
      html: output.html,
      screenshot: output.screenshot,
    });
    return { resultType: "render.result", action: "start", result };
  } catch (error) {
    if (error instanceof RenderOperationError && error.code === "RENDER_COMMIT_FAILED") {
      try { return { resultType: "render.result", action: "start", result: await storage.getRenderResult({ projectId: project.projectId, runId: project.runId, jobId: claim.job.jobId }) }; }
      catch { /* The commit did not become durable. */ }
    }
    const pauseRequested = (await storage.getRunControlState({ projectId: project.projectId, runId: project.runId })).controlState === "pause_requested";
    if (pauseRequested) {
      await storage.saveJobCheckpoint({ projectId: project.projectId, runId: project.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: command.payload.ownerId, phase: "cancelled", progress: 0, payload: { reasonCode: "RUN_PAUSE_REQUESTED" }, operationId: `${command.payload.operationId}:pause` }).catch(() => undefined);
      await storage.acknowledgePause({ projectId: project.projectId, runId: project.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: command.payload.ownerId, operationId: `${command.payload.operationId}:pause-ack`, correlationId: command.correlationId }).catch(() => undefined);
      throw new RenderOperationError("RENDER_CANCELLED", "The Render stopped at a cooperative pause boundary", true);
    }
    const failure = classifyRenderFailure(error);
    await storage.recordRenderFailure({ projectId: project.projectId, runId: project.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: command.payload.ownerId, operationId: `${command.payload.operationId}:failure`, failureCode: failure.code, failureCategory: failure.category, retryable: failure.retryable || failure.code === "RENDER_CANCELLED", safeMessage: failure.safeMessage, occurredAt: now() }).catch(() => undefined);
    throw error;
  } finally {
    clearInterval(heartbeatTimer);
    await page?.close().catch(() => undefined);
    activeRenders.delete(command.payload.jobId);
  }
}

async function executeInteractionRun(
  command: Extract<CommandEnvelope, { commandType: "interaction.run" }>,
  storage: ApplicationStorage,
  runtime: BrowserRuntimePort,
  activeInteractions: Map<string, ActiveInteraction>,
  planProvider: NonNullable<ApplicationServiceDependencies["interactionPlanProvider"]> | undefined,
  now: () => string,
  testMode: boolean,
  fixtureOrigins: readonly string[],
  heartbeatIntervalMs: number,
): Promise<unknown> {
  const project = storage.getCurrent();
  if (project === null) throw new InteractionOperationError("INTERACTION_PERSISTENCE_FAILED", "Open the selected Project before starting an Interaction");
  if (project.runId !== command.payload.runId) throw new QueueOperationError("QUEUE_RUN_NOT_FOUND", "The selected Run does not belong to the open Project");
  if (activeInteractions.has(command.payload.jobId)) throw new InteractionOperationError("INTERACTION_BROWSER_FAILED", "The selected Page Job already has an active Interaction");
  if (planProvider === undefined) throw new InteractionOperationError("INTERACTION_PLAN_INVALID", "No approved Interaction Plan provider is configured");
  const profile = parseInteractionProfile(await storage.getInteractionProfile({ projectId: project.projectId }));
  const plan = parseInteractionPlan(await planProvider({ projectId: project.projectId, runId: project.runId, jobId: command.payload.jobId, planId: command.payload.planId }), profile);
  const siteProfile = await storage.getProfile(command.payload.projectPath);
  const requestedLeaseMs = Math.min(86_400_000, Math.max(command.payload.leaseDurationMs, profile.maxInteractionDurationMs + 60_000));
  const claim = await storage.claimJobWithLease({ projectId: project.projectId, runId: project.runId, jobId: command.payload.jobId, ownerId: command.payload.ownerId, leaseDurationMs: requestedLeaseMs, idempotencyKey: command.payload.idempotencyKey, operationId: command.payload.operationId, correlationId: command.correlationId });
  const controller = new AbortController();
  activeInteractions.set(command.payload.jobId, { controller, operationId: command.payload.operationId });
  const trace = new InteractionTraceBuilder({ maxEvents: profile.maxTraceEvents, maxBytes: profile.maxTraceBytes });
  let page: Awaited<ReturnType<BrowserRuntimePort["createPageSession"]>> | null = null;
  let lease = claim.lease;
  let heartbeatRunning = false;
  let heartbeatFailure: unknown = null;
  const heartbeat = async (): Promise<void> => {
    if (heartbeatRunning) return;
    heartbeatRunning = true;
    try {
      lease = await storage.heartbeatLease({ projectId: project.projectId, runId: project.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: command.payload.ownerId, operationId: `${command.payload.operationId}:heartbeat` });
      if (Date.parse(lease.expiresAt) - Date.parse(now()) < 30_000) lease = await storage.renewLease({ projectId: project.projectId, runId: project.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: command.payload.ownerId, extensionMs: requestedLeaseMs, operationId: `${command.payload.operationId}:renew` });
    } catch (error) {
      heartbeatFailure = error;
      controller.abort();
    } finally {
      heartbeatRunning = false;
    }
  };
  const heartbeatTimer = setInterval(() => void heartbeat(), heartbeatIntervalMs);
  try {
    await storage.saveJobCheckpoint({ projectId: project.projectId, runId: project.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: command.payload.ownerId, phase: "interaction.pending", progress: 0, payload: { planId: plan.planId, profileId: profile.profileId, profileRevisionId: profile.profileRevisionId }, operationId: `${command.payload.operationId}:pending` });
    const installation = await runtime.validateInstallation();
    if (!installation.valid) throw new InteractionOperationError("INTERACTION_BROWSER_FAILED", "The approved Chromium runtime did not pass validation", true);
    await runtime.start();
    page = await runtime.createPageSession(claim.job.jobId, { testMode, allowedFixtureOrigins: fixtureOrigins, maxEvidenceEntries: 100, serviceWorkerPolicy: siteProfile.serviceWorkerPolicy, authorizeUrl: (url) => authorizeRuntimeUrl(url, siteProfile, testMode, fixtureOrigins) });
    const executeInteractionPlan = page.executeInteractionPlan;
    const getContextProfile = page.getContextProfile;
    if (executeInteractionPlan === undefined || getContextProfile === undefined) throw new InteractionOperationError("INTERACTION_BROWSER_FAILED", "The selected Browser Runtime does not expose the Phase 10 Interaction adapter");
    await page.navigate(claim.job.normalizedUrl, 15_000);
    const result = await executeInteractionPlan.call(page, { profile, plan, signal: controller.signal, now, trace, projectId: project.projectId, runId: project.runId, jobId: claim.job.jobId, ownerId: command.payload.ownerId, fencingGeneration: claim.lease.fencingGeneration, traceId: claim.lease.leaseId, contextProfile: getContextProfile.call(page), shouldPause: async () => (await storage.getRunControlState({ projectId: project.projectId, runId: project.runId })).controlState === "pause_requested", authorizeUrl: async (url) => (await authorizeRuntimeUrl(url, siteProfile, testMode, fixtureOrigins)).allowed });
    if (heartbeatFailure !== null) throw heartbeatFailure;
    await storage.saveInteractionTrace({ projectId: project.projectId, runId: project.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: command.payload.ownerId, operationId: command.payload.operationId, trace: result.trace });
    await storage.saveJobCheckpoint({ projectId: project.projectId, runId: project.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: command.payload.ownerId, phase: `interaction.${result.status}`, progress: result.status === "completed" || result.status === "skipped" ? 1 : 0, payload: { planId: plan.planId, traceId: result.trace.traceId, completedStepCount: result.completedStepCount }, operationId: `${command.payload.operationId}:completed` });
    await storage.releaseLease({ projectId: project.projectId, runId: project.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: command.payload.ownerId, reasonCode: `INTERACTION_${result.status.replace(/-/g, "_").toUpperCase()}`, operationId: `${command.payload.operationId}:release` });
    return { resultType: "interaction.result", action: "run", trace: result.trace, completedStepCount: result.completedStepCount, failureCategory: result.failureCategory, failureCode: result.failureCode, navigationOutcome: result.navigationOutcome, discoveredUrlCount: result.discoveredUrlCount, contextProfile: result.contextProfile };
  } finally {
    clearInterval(heartbeatTimer);
    await page?.close().catch(() => undefined);
    activeInteractions.delete(command.payload.jobId);
  }
}

function validateTransportInteractionPlan(plan: Extract<CommandEnvelope, { commandType: "interaction.plan.validate" }> ["payload"]["plan"], profile: InteractionProfile): { valid: boolean; errors: readonly { code: string; path: string; message: string }[] } {
  const errors: { code: string; path: string; message: string }[] = [];
  if (plan.steps.length > Math.min(profile.maxActionsPerPage, 500)) errors.push({ code: "INTERACTION_PLAN_STEPS_INVALID", path: "steps", message: "The interaction plan exceeds the configured action bound." });
  for (const [index, step] of plan.steps.entries()) {
    if (step.timeoutMs !== undefined && step.timeoutMs > profile.maxInteractionDurationMs) errors.push({ code: "INTERACTION_TIMEOUT", path: `steps.${index}.timeoutMs`, message: "The step timeout exceeds the profile duration bound." });
    if (step.stepType === "type_text" && (step.characterCount === undefined || step.characterCount > profile.maxTypedTextLength)) errors.push({ code: "INTERACTION_TEXT_LIMIT", path: `steps.${index}.characterCount`, message: "The typed text length exceeds the profile bound." });
    if (step.stepType === "press_key" && (step.key === undefined || !isSafeInteractionKey(step.key))) errors.push({ code: "INTERACTION_KEY_INVALID", path: `steps.${index}.key`, message: "The key or key combination is not approved." });
    if (step.stepType === "incremental_scroll") {
      if (!profile.incrementalScroll) errors.push({ code: "INTERACTION_SCROLL_DISABLED", path: `steps.${index}`, message: "Incremental scrolling is disabled by the profile." });
      if (step.distancePx !== undefined && step.distancePx > profile.maxScrollDistancePx) errors.push({ code: "INTERACTION_SCROLL_DISTANCE_LIMIT", path: `steps.${index}.distancePx`, message: "Scroll distance exceeds the profile bound." });
      if (step.steps !== undefined && step.steps > profile.maxScrollSteps) errors.push({ code: "INTERACTION_SCROLL_LIMIT", path: `steps.${index}.steps`, message: "Scroll steps exceed the profile bound." });
    }
  }
  return { valid: errors.length === 0, errors };
}

async function executeProjectCommand(
  command: Exclude<CommandEnvelope, { commandType: "system.describe" }>,
  storage: ApplicationStorage,
  secretStores: Map<string, SecretStorePort>,
  secretStoreFactory: SecretStoreFactory,
  runtime: BrowserRuntimePort,
  engine: RenderEnginePort,
  activeRenders: Map<string, ActiveRender>,
  activeInteractions: Map<string, ActiveInteraction>,
  activeAuthentications: Map<string, ActiveAuthentication>,
  interactionPlanProvider: NonNullable<ApplicationServiceDependencies["interactionPlanProvider"]> | undefined,
  renderTestMode: boolean,
  fixtureOrigins: readonly string[],
  heartbeatIntervalMs: number,
  now: () => string,
): Promise<unknown> {
  const lockSecretStore = async (projectPath: string): Promise<void> => {
    await secretStores.get(secretStoreKey(projectPath))?.lock();
  };
  const lockAllSecretStores = async (): Promise<void> => {
    for (const store of secretStores.values()) await store.lock();
  };
  const withOpenProject = async <T>(projectPath: string, operation: () => Promise<T>): Promise<T> => {
    const openedHere = storage.getCurrent() === null;
    if (openedHere) await storage.open(projectPath);
    try {
      return await operation();
    } finally {
      if (openedHere) {
        await lockSecretStore(projectPath);
        await storage.close();
      }
    }
  };
  const withSessionProject = async <T>(projectPath: string, keepOpen: boolean, operation: (project: NonNullable<ReturnType<ApplicationStorage["getCurrent"]>>) => Promise<T>): Promise<T> => {
    const current = storage.getCurrent();
    if (current !== null && path.resolve(current.projectPath) !== path.resolve(projectPath)) {
      throw new SessionOperationError("SESSION_PROJECT_MISMATCH", "Another Project is already open in this application service");
    }
    const openedHere = current === null;
    if (openedHere) await storage.open(projectPath);
    try {
      const project = storage.getCurrent();
      if (project === null) throw new ProjectOperationError("PROJECT_NOT_OPEN", "The selected Project is not open");
      return await operation(project);
    } catch (error) {
      if (openedHere && keepOpen) {
        await lockSecretStore(projectPath).catch(() => undefined);
        await storage.close().catch(() => undefined);
      }
      throw error;
    } finally {
      if (openedHere && !keepOpen) {
        await lockSecretStore(projectPath);
        await storage.close();
      }
    }
  };
  const activeAuthenticationFor = (sessionId: string): ActiveAuthentication | undefined => activeAuthentications.get(sessionId);
  const assertAuthenticationSlot = (sessionId?: string): void => {
    for (const active of activeAuthentications.values()) {
      if (active.sessionId !== sessionId) throw new SessionOperationError("SESSION_STATE_CONFLICT", "Another manual Authentication Browser is already open");
    }
  };
  const restorePreviousMetadata = async (active: ActiveAuthentication): Promise<SessionMetadata | null> => {
    if (active.previousMetadata === null) return null;
    const current = await storage.getSession({ projectId: active.projectId, sessionId: active.sessionId });
    const restored: SessionMetadata = {
      ...active.previousMetadata,
      updatedAt: now(),
      revision: current.revision + 1,
    };
    assertSessionMetadata(restored);
    return storage.updateSession({ projectId: active.projectId, sessionId: active.sessionId, expectedRevision: current.revision, metadata: restored });
  };
  const closeAuthentication = async (active: ActiveAuthentication, restorePrevious: boolean): Promise<SessionMetadata | null> => {
    await active.browserSession.close().catch(() => undefined);
    activeAuthentications.delete(active.sessionId);
    if (!restorePrevious || storage.getCurrent()?.projectId !== active.projectId) return null;
    return restorePreviousMetadata(active).catch(() => null);
  };
  const persistedValidationOutcome = async (
    current: SessionMetadata,
    status: "valid" | "expired" | "invalid" | "unavailable" | "configuration_missing" | "incompatible_profile" | "corrupt",
    reason?: SessionFailureReason,
  ): Promise<SessionMetadata> => {
    const next = reason === undefined
      ? validationOutcome(current, now, status)
      : validationOutcomeWithReason(current, now, status === "corrupt" ? "corrupt" : "unavailable", reason);
    return storage.updateSession({ projectId: current.projectId, sessionId: current.sessionId, expectedRevision: current.revision, metadata: next });
  };
  const sessionResult = (action: "open" | "reauthenticate" | "save" | "get" | "validate" | "restore", metadata: SessionMetadata, browser: BrowserAuthenticationSession | null): Record<string, unknown> => ({
    resultType: "session.metadata",
    action,
    session: safeSessionMetadata(metadata),
    browser: browser === null ? null : sessionBrowserStatus(browser),
  });
  const storedSessionValidation = async (
    project: NonNullable<ReturnType<ApplicationStorage["getCurrent"]>>,
    current: SessionMetadata,
    action: "validate" | "restore",
  ): Promise<Record<string, unknown>> => {
    const contextProfile = runtime.getContextProfile();
    if (current.profileId !== contextProfile.profileId || current.browserProfileVersion !== contextProfile.version) {
      const next = await persistedValidationOutcome(current, "incompatible_profile");
      return sessionResult(action, next, null);
    }
    if (current.secretRef === null) {
      const next = await persistedValidationOutcome(current, "corrupt", "secret_missing");
      return sessionResult(action, next, null);
    }
    const policy = sessionAuthPolicy({
      loginUrl: current.validationPolicy.validationUrl,
      allowedOrigins: [current.validationPolicy.expectedOrigin],
      validationUrl: current.validationPolicy.validationUrl,
      markerSelector: current.validationPolicy.markerSelector,
      markerText: current.validationPolicy.markerText,
    }, await storage.getProfile(project.projectPath), renderTestMode, fixtureOrigins);
    const store = getOrCreateSecretStore(secretStores, secretStoreFactory, project.projectPath, project.projectId, now);
    let browser: BrowserAuthenticationSession | null = null;
    let browserStatus: Record<string, unknown> | null = null;
    try {
      const validation = await store.withSecret(
        { projectId: project.projectId, scopeId: current.sessionId, purpose: "future_session_restore" },
        current.secretRef,
        async (secretBytes) => {
          try {
            browser = await runtime.restoreAuthenticationSession(current.sessionId, secretBytes, policy);
            const outcome = await browser.validate();
            browserStatus = sessionBrowserStatus(browser);
            return outcome;
          } finally {
            secretBytes.fill(0);
          }
        },
      );
      const next = await persistedValidationOutcome(current, validation.status);
      return sessionResult(action, next, browserStatus === null ? null : browser);
    } catch (error) {
      if (error instanceof SecretStoreError) {
        if (error.code === "SECRET_NOT_FOUND") {
          const next = await persistedValidationOutcome(current, "corrupt", "secret_missing");
          return sessionResult(action, next, null);
        }
        if (["SECRET_TAMPER_DETECTED", "SECRET_FORMAT_UNSUPPORTED", "SECRET_ALGORITHM_UNSUPPORTED", "SECRET_KDF_INVALID", "SECRET_VALUE_INVALID"].includes(error.code)) {
          const next = await persistedValidationOutcome(current, "corrupt", "secret_integrity_failed");
          return sessionResult(action, next, null);
        }
        const next = await persistedValidationOutcome(current, "unavailable", "validation_required");
        return sessionResult(action, next, null);
      }
      if (error instanceof RenderOperationError && ["BROWSER_STORAGE_STATE_INVALID", "BROWSER_AUTHENTICATION_CONTEXT_FAILED"].includes(error.code)) {
        const next = await persistedValidationOutcome(current, "corrupt");
        return sessionResult(action, next, null);
      }
      throw error;
    } finally {
      const browserForCleanup = browser as BrowserAuthenticationSession | null;
      if (browserForCleanup !== null) await browserForCleanup.close().catch(() => undefined);
    }
  };
  const executeSessionCommand = async (command: Extract<CommandEnvelope, { commandType: "session.open" | "session.reauthenticate" | "session.save" | "session.get" | "session.list" | "session.validate" | "session.restore" | "session.delete" }>): Promise<unknown> => {
    if (command.commandType === "session.open" || command.commandType === "session.reauthenticate") {
      const sessionId = command.commandType === "session.open" ? randomUUID() : command.payload.sessionId;
      assertAuthenticationSlot(sessionId);
      return withSessionProject(command.payload.projectPath, true, async (project) => {
        const profile = await storage.getProfile(project.projectPath);
        const policy = sessionAuthPolicy({
          loginUrl: command.payload.loginUrl,
          allowedOrigins: command.payload.allowedOrigins,
          validationUrl: command.payload.validationUrl,
          markerSelector: command.payload.markerSelector ?? null,
          markerText: command.payload.markerText ?? null,
        }, profile, renderTestMode, fixtureOrigins);
        const contextProfile = runtime.getContextProfile();
        let previousMetadata: SessionMetadata | null = null;
        let metadata: SessionMetadata;
        if (command.commandType === "session.open") {
          metadata = await storage.createSession({
            sessionId,
            projectId: project.projectId,
            profileId: contextProfile.profileId,
            browserProfileVersion: contextProfile.version,
            sessionFormatVersion: 1,
            storageStateFormatVersion: 1,
            secretRef: null,
            createdAt: now(),
            updatedAt: now(),
            lastValidatedAt: null,
            validationResult: "not_validated",
            failureReason: "none",
            state: "ready",
            validationPolicy: policy.validation,
            affinity: { version: 1, browserProfileId: contextProfile.profileId, browserProfileVersion: contextProfile.version, proxyId: null },
            capabilities: SESSION_STORAGE_CAPABILITIES,
          });
        } else {
          previousMetadata = await storage.getSession({ projectId: project.projectId, sessionId });
          if (previousMetadata.profileId !== contextProfile.profileId || previousMetadata.browserProfileVersion !== contextProfile.version) throw new SessionOperationError("SESSION_PROFILE_INCOMPATIBLE", "The Session was created with another Browser Profile");
          metadata = updateSessionMetadata(previousMetadata, now, { state: "login_browser_open", validationPolicy: policy.validation });
          metadata = await storage.updateSession({ projectId: project.projectId, sessionId, expectedRevision: previousMetadata.revision, metadata });
        }
        try {
          if (command.commandType === "session.open") {
            const opening = updateSessionMetadata(metadata, now, { state: "login_browser_open" });
            metadata = await storage.updateSession({ projectId: project.projectId, sessionId, expectedRevision: metadata.revision, metadata: opening });
          }
          const browserSession = await runtime.openManualLoginSession(sessionId, policy);
          activeAuthentications.set(sessionId, { projectId: project.projectId, projectPath: project.projectPath, sessionId, browserSession, previousMetadata });
          return sessionResult(command.commandType === "session.open" ? "open" : "reauthenticate", metadata, browserSession);
        } catch (error) {
          if (previousMetadata !== null) {
            const restored: SessionMetadata = { ...previousMetadata, updatedAt: now(), revision: metadata.revision + 1 };
            await storage.updateSession({ projectId: project.projectId, sessionId, expectedRevision: metadata.revision, metadata: restored }).catch(() => undefined);
          } else {
            await storage.deleteSession({ projectId: project.projectId, sessionId }).catch(() => undefined);
          }
          throw error;
        }
      });
    }
    if (command.commandType === "session.save") {
      const active = activeAuthenticationFor(command.payload.sessionId);
      if (active === undefined || active.projectPath !== path.resolve(command.payload.projectPath)) throw new SessionOperationError("SESSION_STATE_CONFLICT", "Open the manual Authentication Browser before saving this Session");
      return withSessionProject(command.payload.projectPath, true, async (project) => {
        let current = await storage.getSession({ projectId: project.projectId, sessionId: command.payload.sessionId });
        let validation;
        try {
          validation = await active.browserSession.validate();
        } catch (error) {
          if (error instanceof RenderOperationError) {
            if (active.previousMetadata !== null) await closeAuthentication(active, true);
            else {
              await persistedValidationOutcome(current, "unavailable");
            }
          }
          throw error;
        }
        const browser = active.browserSession;
        if (validation.status !== "valid") {
          if (active.previousMetadata !== null) {
            const restored = await closeAuthentication(active, true);
            if (restored !== null) current = restored;
          } else {
            current = await persistedValidationOutcome(current, validation.status);
            await closeAuthentication(active, false);
          }
          return sessionResult("save", current, null);
        }
        const saving = updateSessionMetadata(current, now, { state: "saving", validationResult: "valid", failureReason: "none" });
        current = await storage.updateSession({ projectId: project.projectId, sessionId: current.sessionId, expectedRevision: current.revision, metadata: saving });
        let createdRef: SecretRef | null = null;
        let storageState: Uint8Array | null = null;
        try {
          storageState = await browser.captureStorageState();
          const store = getOrCreateSecretStore(secretStores, secretStoreFactory, project.projectPath, project.projectId, now);
          if (current.secretRef === null) {
            const created = await store.createSecret({
              projectId: project.projectId,
              scope: { scopeType: "session", projectId: project.projectId, scopeId: current.sessionId },
              kind: "session_storage",
              value: storageState,
              displayLabel: "browser-session",
              secureExportPolicy: "forbidden",
            });
            createdRef = created.ref;
            current = { ...current, secretRef: created.ref };
          } else {
            const parsed = parseSecretRef(current.secretRef);
            await store.replaceSecret({ projectId: project.projectId, ref: parsed.serialized, value: storageState, displayLabel: "browser-session" });
          }
          const valid = updateSessionMetadata(current, now, { state: "valid", validationResult: "valid", failureReason: "none", lastValidatedAt: now() });
          const persisted = await storage.updateSession({ projectId: project.projectId, sessionId: current.sessionId, expectedRevision: current.revision, metadata: valid });
          await closeAuthentication(active, false);
          return sessionResult("save", persisted, null);
        } catch (error) {
          if (createdRef !== null) {
            const store = getOrCreateSecretStore(secretStores, secretStoreFactory, project.projectPath, project.projectId, now);
            await store.deleteSecret({ projectId: project.projectId, ref: createdRef }).catch(() => undefined);
          }
          if (error instanceof RenderOperationError && error.code === "BROWSER_STORAGE_STATE_INVALID") {
            await persistedValidationOutcome(current, "corrupt").catch(() => current);
            await closeAuthentication(active, active.previousMetadata !== null);
            throw new SessionOperationError("SESSION_STORAGE_STATE_INVALID", "The Browser Storage State could not be captured safely");
          }
          if (error instanceof SecretStoreError) {
            const restoredState = active.previousMetadata !== null ? await closeAuthentication(active, true) : null;
            if (restoredState === null && activeAuthentications.has(active.sessionId)) {
              const available = updateSessionMetadata({ ...current, secretRef: active.previousMetadata?.secretRef ?? null }, now, { state: "authenticated_unpersisted" });
              await storage.updateSession({ projectId: project.projectId, sessionId: current.sessionId, expectedRevision: current.revision, metadata: available }).catch(() => undefined);
            }
          }
          throw error;
        } finally {
          storageState?.fill(0);
        }
      });
    }
    if (command.commandType === "session.get") {
      return withSessionProject(command.payload.projectPath, false, async (project) => sessionResult("get", await storage.getSession({ projectId: project.projectId, sessionId: command.payload.sessionId }), null));
    }
    if (command.commandType === "session.list") {
      return withSessionProject(command.payload.projectPath, false, async (project) => ({ resultType: "session.list", sessions: (await storage.listSessions({ projectId: project.projectId })).map(safeSessionMetadata) }));
    }
    if (command.commandType === "session.validate" || command.commandType === "session.restore") {
      return withSessionProject(command.payload.projectPath, false, async (project) => {
        const current = await storage.getSession({ projectId: project.projectId, sessionId: command.payload.sessionId });
        return storedSessionValidation(project, current, command.commandType === "session.validate" ? "validate" : "restore");
      });
    }
    return withSessionProject(command.payload.projectPath, false, async (project) => {
      const current = await storage.getSession({ projectId: project.projectId, sessionId: command.payload.sessionId }).catch((error) => {
        if (error instanceof SessionOperationError && error.code === "SESSION_NOT_FOUND") return null;
        throw error;
      });
      const active = activeAuthenticationFor(command.payload.sessionId);
      if (active !== undefined) await closeAuthentication(active, false);
      if (current !== null && current.secretRef !== null) {
        const store = getOrCreateSecretStore(secretStores, secretStoreFactory, project.projectPath, project.projectId, now);
        try {
          await store.deleteSecret({ projectId: project.projectId, ref: current.secretRef });
        } catch (error) {
          if (!(error instanceof SecretStoreError && error.code === "SECRET_NOT_FOUND")) throw error;
        }
      }
      await storage.deleteSession({ projectId: project.projectId, sessionId: command.payload.sessionId });
      return { resultType: "session.delete", sessionId: command.payload.sessionId };
    });
  };
  const prepareEnqueue = async (
    project: NonNullable<ReturnType<typeof storage.getCurrent>>,
    profile: Awaited<ReturnType<ProfileStoragePort["getProfile"]>>,
    item: {
      url: string;
      sourceUrl?: string | undefined;
      parentJobId?: string | null | undefined;
      sourceDepth?: number | null | undefined;
      discoveryType: QueueEnqueueInput["sourceContext"]["discoveryType"];
      requestedPriority?: number | undefined;
      maxAttempts: number;
    },
    idempotencyKey: string,
    operationId: string,
    correlationId: string,
  ): Promise<QueueEnqueueInput> => {
    const baseInput = {
      rawUrl: item.url,
      ...(item.sourceUrl === undefined ? {} : { sourceUrl: item.sourceUrl }),
      ...(item.sourceDepth === undefined || item.sourceDepth === null ? {} : { sourceDepth: item.sourceDepth }),
      discoveryType: item.discoveryType,
      profileRevision: profile.revisionId,
    };
    const initial = evaluateScope(profile, { ...baseInput, currentEligibleCount: 0, knownIdentityHashes: [] });
    const existing = initial.identityHash === null ? false : await storage.hasIdentity({ projectId: project.projectId, runId: project.runId, profileRevisionId: profile.revisionId, engineVersion: profile.engineVersion, identityHash: initial.identityHash });
    const count = await storage.countIdentities({ projectId: project.projectId, runId: project.runId, profileRevisionId: profile.revisionId, engineVersion: profile.engineVersion });
    const decision = evaluateScope(profile, { ...baseInput, currentEligibleCount: count, knownIdentityHashes: existing && initial.identityHash !== null ? [initial.identityHash] : [] });
    const sourceDecision = item.sourceUrl === undefined ? null : evaluateScope(profile, { rawUrl: item.sourceUrl, discoveryType: "manual", profileRevision: profile.revisionId, currentEligibleCount: 0 });
    return {
      projectId: project.projectId,
      runId: project.runId,
      projectRevisionId: project.revisionId,
      scopeDecision: decision,
      sourceContext: {
        ...(item.parentJobId === undefined ? {} : { parentJobId: item.parentJobId }),
        safeSourceUrl: sourceDecision?.displayUrl ?? null,
        discoveryType: item.discoveryType,
        ...(item.sourceDepth === undefined ? {} : { sourceDepth: item.sourceDepth }),
      },
      ...(item.requestedPriority === undefined ? {} : { requestedPriority: item.requestedPriority }),
      maxAttempts: item.maxAttempts,
      maxPages: profile.limits.maxPages,
      idempotencyKey,
      operationId,
      correlationId,
    };
  };
  switch (command.commandType) {
    case "browser.getRuntimeInfo":
      return { resultType: "browser.runtimeInfo", action: "info", info: await runtime.getRuntimeInfo() };
    case "browser.validateInstallation":
      return { resultType: "browser.runtimeInfo", action: "validate", info: await runtime.validateInstallation() };
    case "browser.getHealth":
      return { resultType: "browser.health", action: "health", health: await runtime.getHealth() };
    case "browser.restart":
      return { resultType: "browser.health", action: "restart", health: await runtime.restart() };
    case "render.start":
      return withOpenProject(command.payload.projectPath, () => executeRenderStart(command, storage, runtime, engine, activeRenders, now, renderTestMode, fixtureOrigins, heartbeatIntervalMs));
    case "render.getStatus":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "render.status", action: "status", status: await storage.getRenderStatus({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId }) }));
    case "render.getResult":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "render.result", action: "get", result: await storage.getRenderResult({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId }) }));
    case "render.getEvents":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "render.events", events: await storage.listRenderEvents({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId, limit: command.payload.limit }) }));
    case "render.cancel":
      return withOpenProject(command.payload.projectPath, async () => {
        const active = activeRenders.get(command.payload.jobId);
        if (active !== undefined) active.controller.abort();
        return { resultType: "render.status", action: "cancel", status: await storage.getRenderStatus({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId }) };
      });
    case "interaction.profile.get":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "interaction.profile", profile: await storage.getInteractionProfile({ projectId: storage.getCurrent()!.projectId }) }));
    case "interaction.profile.validate":
      return withOpenProject(command.payload.projectPath, async () => {
        const candidate = command.payload.profile ?? await storage.getInteractionProfile({ projectId: storage.getCurrent()!.projectId });
        const validation = validateInteractionProfile(candidate);
        return { resultType: "interaction.validation", target: "profile", valid: validation.valid, errors: validation.errors };
      });
    case "interaction.plan.validate":
      return withOpenProject(command.payload.projectPath, async () => {
        const profileValidation = validateInteractionProfile(command.payload.profile);
        if (!profileValidation.valid || profileValidation.value === null) return { resultType: "interaction.validation", target: "plan", valid: false, errors: profileValidation.errors };
        const validation = validateTransportInteractionPlan(command.payload.plan, profileValidation.value);
        return { resultType: "interaction.validation", target: "plan", valid: validation.valid, errors: validation.errors };
      });
    case "interaction.run":
      return withOpenProject(command.payload.projectPath, () => executeInteractionRun(command, storage, runtime, activeInteractions, interactionPlanProvider, now, renderTestMode, fixtureOrigins, heartbeatIntervalMs));
    case "interaction.trace.list":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "interaction.traces", traces: await storage.listInteractionTraces({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId, limit: command.payload.limit }) }));
    case "interaction.trace.inspect":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "interaction.trace", trace: await storage.getInteractionTrace({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId, traceId: command.payload.traceId }) }));
    case "project.create":
      return {
        resultType: "project.summary",
        project: await storage.create({
          destinationPath: command.payload.destinationPath,
          name: command.payload.name,
          slug: command.payload.slug,
          ...(command.payload.baseUrl === undefined ? {} : { baseUrl: command.payload.baseUrl }),
        }),
      };
    case "project.open":
      return { resultType: "project.summary", project: await storage.open(command.payload.projectPath) };
    case "project.close":
      for (const active of activeAuthentications.values()) {
        await closeAuthentication(active, active.previousMetadata !== null);
      }
      await lockAllSecretStores();
      return { resultType: "project.summary", project: await storage.close() };
    case "project.validate":
      return { resultType: "project.validation", report: await storage.validate(command.payload.projectPath) };
    case "project.export":
      return { resultType: "project.export", export: await storage.exportProject(command.payload) };
    case "project.import":
      return { resultType: "project.import", import: await storage.importProject(command.payload) };
    case "project.info":
      return {
        resultType: "project.info",
        currentProject: storage.getCurrent(),
        compatibility: command.payload.projectPath === undefined
          ? null
          : await storage.getCompatibility(command.payload.projectPath),
      };
    case "secret.backend.status":
      return withOpenProject(command.payload.projectPath, async () => {
        const project = storage.getCurrent()!;
        const store = getOrCreateSecretStore(secretStores, secretStoreFactory, project.projectPath, project.projectId, now);
        return { resultType: "secret.backend.status", status: await store.getBackendStatus(), capability: await store.getCapability() };
      });
    case "secret.list":
      return withOpenProject(command.payload.projectPath, async () => {
        const project = storage.getCurrent()!;
        const store = getOrCreateSecretStore(secretStores, secretStoreFactory, project.projectPath, project.projectId, now);
        return { resultType: "secret.list", metadata: await store.listSecretMetadata({ projectId: project.projectId }) };
      });
    case "secret.vault.lock":
      return withOpenProject(command.payload.projectPath, async () => {
        const project = storage.getCurrent()!;
        const store = getOrCreateSecretStore(secretStores, secretStoreFactory, project.projectPath, project.projectId, now);
        await store.lock();
        return { resultType: "secret.vault.lock", status: await store.getBackendStatus() };
      });
    case "secret.delete":
      return withOpenProject(command.payload.projectPath, async () => {
        const project = storage.getCurrent()!;
        const store = getOrCreateSecretStore(secretStores, secretStoreFactory, project.projectPath, project.projectId, now);
        const ref = parseSecretRef(command.payload.ref);
        await store.deleteSecret({ projectId: project.projectId, ref: ref.serialized as SecretRef });
        return { resultType: "secret.delete", ref: ref.serialized };
      });
    case "session.open":
    case "session.reauthenticate":
    case "session.save":
    case "session.get":
    case "session.list":
    case "session.validate":
    case "session.restore":
    case "session.delete":
      return executeSessionCommand(command);
    case "profile.create":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "profile.value", profile: await storage.createProfile({ projectPath: command.payload.projectPath, draft: createDefaultSiteProfileDraft({ name: command.payload.name, seedUrl: command.payload.seedUrl }) }) }));
    case "profile.get":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "profile.value", profile: await storage.getProfile(command.payload.projectPath) }));
    case "profile.update":
      return withOpenProject(command.payload.projectPath, async () => {
        const update = await storage.updateProfile(command.payload);
        return { resultType: "profile.value", profile: update.profile, changedPaths: update.changedPaths };
      });
    case "profile.validate":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "profile.validation", validation: await storage.validateStoredProfile(command.payload.projectPath) }));
    case "profile.compare":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "profile.comparison", comparison: await storage.compareProfiles(command.payload) }));
    case "scope.evaluate":
    case "scope.explain":
    case "scope.previewNormalization":
      return withOpenProject(command.payload.projectPath, async () => ({
        resultType: "scope.decision",
        mode: command.commandType === "scope.evaluate" ? "evaluate" : command.commandType === "scope.explain" ? "explain" : "normalize",
        decision: evaluateScope(await storage.getProfile(command.payload.projectPath), command.payload.input),
      }));
    case "scope.evaluateBatch":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "scope.batch", decisions: evaluateScopeBatch(await storage.getProfile(command.payload.projectPath), command.payload.inputs) }));
    case "scope.getEngineInfo":
      return { resultType: "scope.engineInfo", info: getScopeEngineInfo() };
    case "queue.enqueue":
      return withOpenProject(command.payload.projectPath, async () => {
        const project = storage.getCurrent()!;
        const profile = await storage.getProfile(command.payload.projectPath);
        if (command.payload.runId !== project.runId) throw new QueueOperationError("QUEUE_RUN_NOT_FOUND", "The selected Run is not the current Project Run");
        if (command.payload.profileRevision !== profile.revisionId) throw new QueueOperationError("QUEUE_PROFILE_REVISION_MISMATCH", "The selected Profile revision is not current");
        const input = await prepareEnqueue(project, profile, command.payload, command.payload.idempotencyKey, command.payload.operationId, command.correlationId);
        return { resultType: "queue.enqueue", enqueue: await storage.enqueue(input) };
      });
    case "queue.enqueueBatch":
      return withOpenProject(command.payload.projectPath, async () => {
        const project = storage.getCurrent()!;
        const profile = await storage.getProfile(command.payload.projectPath);
        if (command.payload.runId !== project.runId) throw new QueueOperationError("QUEUE_RUN_NOT_FOUND", "The selected Run is not the current Project Run");
        if (command.payload.profileRevision !== profile.revisionId) throw new QueueOperationError("QUEUE_PROFILE_REVISION_MISMATCH", "The selected Profile revision is not current");
        const inputs: QueueEnqueueInput[] = [];
        for (const [index, item] of command.payload.items.entries()) {
          inputs.push(await prepareEnqueue(project, profile, item, deriveBatchItemIdempotencyKey(command.payload.idempotencyKey, index), command.payload.operationId, command.correlationId));
        }
        const batch = await storage.enqueueBatch(inputs);
        return { resultType: "queue.batch", ...batch };
      });
    case "queue.claimNext":
      return withOpenProject(command.payload.projectPath, async () => {
        const claim = await storage.claimNextWithLease({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, ownerId: command.payload.claimedBy, leaseDurationMs: command.payload.leaseDurationMs, idempotencyKey: command.payload.idempotencyKey, operationId: command.payload.operationId, correlationId: command.correlationId });
        return claim === null ? { resultType: "queue.job", action: "claimNext", job: null } : { resultType: "queue.job", action: "claimNext", job: claim.job, lease: claim.lease };
      });
    case "queue.complete":
      return withOpenProject(command.payload.projectPath, async () => {
        const projectId = storage.getCurrent()!.projectId;
        const currentJob = await storage.get({ projectId, runId: command.payload.runId, jobId: command.payload.jobId });
        if (currentJob.state === "processing") {
          await storage.heartbeatLease({ projectId, runId: command.payload.runId, jobId: command.payload.jobId, leaseToken: command.payload.claimToken, fencingGeneration: command.payload.fencingGeneration, ownerId: command.payload.ownerId, operationId: command.payload.operationId });
          if (command.payload.outputs !== undefined) await storage.saveCompletedOutputs({ projectId, runId: command.payload.runId, jobId: command.payload.jobId, leaseToken: command.payload.claimToken, fencingGeneration: command.payload.fencingGeneration, ownerId: command.payload.ownerId, outputs: command.payload.outputs, operationId: command.payload.operationId });
        }
        return {
          resultType: "queue.job", action: "complete", job: await storage.complete({
            projectId, runId: command.payload.runId, jobId: command.payload.jobId, claimToken: command.payload.claimToken, completionKey: command.payload.completionKey,
            resultSummary: command.payload.resultSummary.metadata === undefined
              ? { resultType: "queue-test", statusCode: command.payload.resultSummary.statusCode, contentStored: false }
              : { resultType: "queue-test", statusCode: command.payload.resultSummary.statusCode, contentStored: false, metadata: command.payload.resultSummary.metadata },
            completedAt: command.payload.completedAt, idempotencyKey: command.payload.idempotencyKey, operationId: command.payload.operationId, correlationId: command.correlationId,
          }),
        };
      });
    case "queue.fail":
      return withOpenProject(command.payload.projectPath, async () => {
        const projectId = storage.getCurrent()!.projectId;
        const currentJob = await storage.get({ projectId, runId: command.payload.runId, jobId: command.payload.jobId });
        if (currentJob.state === "processing") await storage.heartbeatLease({ projectId, runId: command.payload.runId, jobId: command.payload.jobId, leaseToken: command.payload.claimToken, fencingGeneration: command.payload.fencingGeneration, ownerId: command.payload.ownerId, operationId: command.payload.operationId });
        return { resultType: "queue.job", action: "fail", job: await storage.fail({
          projectId, runId: command.payload.runId, jobId: command.payload.jobId, claimToken: command.payload.claimToken, failureKey: command.payload.failureKey, failureCode: command.payload.failureCode,
          failureCategory: command.payload.failureCategory, retryable: command.payload.retryable, safeMessage: command.payload.safeMessage, failedAt: command.payload.failedAt,
          ...(command.payload.nextEligibleAt === undefined ? {} : { nextEligibleAt: command.payload.nextEligibleAt }), idempotencyKey: command.payload.idempotencyKey,
          operationId: command.payload.operationId, correlationId: command.correlationId,
        }) };
      });
    case "queue.scheduleRetry":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "queue.job", action: "scheduleRetry", job: await storage.scheduleRetry({ ...command.payload, projectId: storage.getCurrent()!.projectId, correlationId: command.correlationId }) }));
    case "queue.releaseDueRetries":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "queue.released", jobs: await storage.releaseDueRetries({ ...command.payload, projectId: storage.getCurrent()!.projectId, correlationId: command.correlationId }) }));
    case "queue.skip":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "queue.job", action: "skip", job: await storage.skip({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId, reasonCode: command.payload.reasonCode, safeMessage: command.payload.safeMessage, ...(command.payload.claimToken === undefined ? {} : { claimToken: command.payload.claimToken }), idempotencyKey: command.payload.idempotencyKey, operationId: command.payload.operationId, correlationId: command.correlationId }) }));
    case "queue.block":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "queue.job", action: "block", job: await storage.block({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId, reasonCode: command.payload.reasonCode, safeMessage: command.payload.safeMessage, ...(command.payload.claimToken === undefined ? {} : { claimToken: command.payload.claimToken }), idempotencyKey: command.payload.idempotencyKey, operationId: command.payload.operationId, correlationId: command.correlationId }) }));
    case "queue.get":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "queue.job", action: "get", job: await storage.get({ ...command.payload, projectId: storage.getCurrent()!.projectId }) }));
    case "queue.list":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "queue.list", ...(await storage.list({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, limit: command.payload.limit, ...(command.payload.state === undefined ? {} : { state: command.payload.state }), ...(command.payload.afterSequence === undefined ? {} : { afterSequence: command.payload.afterSequence }) })) }));
    case "queue.getStatistics":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "queue.statistics", statistics: await storage.getStatistics({ ...command.payload, projectId: storage.getCurrent()!.projectId, asOf: now() }) }));
    case "queue.getHistory":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "queue.history", history: await storage.getHistory({ ...command.payload, projectId: storage.getCurrent()!.projectId }) }));
    case "queue.clearPending":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "queue.clear", ...(await storage.clearPending({ ...command.payload, projectId: storage.getCurrent()!.projectId, correlationId: command.correlationId })) }));
    case "recovery.inspect":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "recovery.report", report: await storage.inspectRecovery({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, evaluationTime: command.payload.evaluationTime, limit: command.payload.limit, ...(command.payload.afterSequence === undefined ? {} : { afterSequence: command.payload.afterSequence }) }) }));
    case "recovery.recover":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "recovery.report", report: await storage.recover({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, evaluationTime: command.payload.evaluationTime, limit: command.payload.limit, confirmation: command.payload.confirmation, idempotencyKey: command.payload.idempotencyKey, operationId: command.payload.operationId, correlationId: command.correlationId }) }));
    case "recovery.getReport":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "recovery.report", report: await storage.getRecoveryReport({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, recoveryOperationId: command.payload.recoveryOperationId }) }));
    case "recovery.heartbeat":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "lease.value", lease: await storage.heartbeatLease({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId, leaseToken: command.payload.leaseToken, fencingGeneration: command.payload.fencingGeneration, ownerId: command.payload.ownerId, operationId: command.payload.operationId }) }));
    case "recovery.renewLease":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "lease.value", lease: await storage.renewLease({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId, leaseToken: command.payload.leaseToken, fencingGeneration: command.payload.fencingGeneration, ownerId: command.payload.ownerId, extensionMs: command.payload.extensionMs, operationId: command.payload.operationId }) }));
    case "recovery.releaseLease":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "lease.value", lease: await storage.releaseLease({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId, leaseToken: command.payload.leaseToken, fencingGeneration: command.payload.fencingGeneration, ownerId: command.payload.ownerId, reasonCode: command.payload.reasonCode, operationId: command.payload.operationId }) }));
    case "checkpoint.save":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "checkpoint.value", action: "save", checkpoint: await storage.saveJobCheckpoint({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId, leaseToken: command.payload.leaseToken, fencingGeneration: command.payload.fencingGeneration, ownerId: command.payload.ownerId, phase: command.payload.phase, progress: command.payload.progress, ...(command.payload.relativePath === undefined ? {} : { relativePath: command.payload.relativePath }), payload: command.payload.payload, operationId: command.payload.operationId }) }));
    case "checkpoint.getLatest":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "checkpoint.value", action: "latest", checkpoint: await storage.getLatestJobCheckpoint({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId }) }));
    case "checkpoint.list":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "checkpoint.list", checkpoints: await storage.listJobCheckpoints({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId, limit: command.payload.limit }) }));
    case "artifactCheckpoint.save":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "artifactCheckpoint.value", checkpoint: await storage.saveArtifactCheckpoint({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId, leaseToken: command.payload.leaseToken, fencingGeneration: command.payload.fencingGeneration, ownerId: command.payload.ownerId, artifactKey: command.payload.artifactKey, artifactKind: command.payload.artifactKind, relativePath: command.payload.relativePath, bytesWritten: command.payload.bytesWritten, ...(command.payload.expectedBytes === undefined ? {} : { expectedBytes: command.payload.expectedBytes }), ...(command.payload.sha256 === undefined ? {} : { sha256: command.payload.sha256 }), ...(command.payload.validator === undefined ? {} : { validator: command.payload.validator }), resumeOffset: command.payload.resumeOffset, committed: command.payload.committed, operationId: command.payload.operationId }) }));
    case "artifactCheckpoint.validate":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "artifactCheckpoint.validation", ...(await storage.validateArtifactCheckpoint({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId, artifactKey: command.payload.artifactKey })) }));
    case "run.requestPause":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "run.control", run: await storage.requestPause({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, operationId: command.payload.operationId }) }));
    case "run.getPauseStatus":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "run.control", run: await storage.getPauseStatus({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId }) }));
    case "run.acknowledgePause":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "queue.job", action: "pause", job: await storage.acknowledgePause({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId, leaseToken: command.payload.leaseToken, fencingGeneration: command.payload.fencingGeneration, ownerId: command.payload.ownerId, operationId: command.payload.operationId, correlationId: command.correlationId }) }));
    case "run.resume":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "run.control", run: await storage.resumeRun({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, operationId: command.payload.operationId, correlationId: command.correlationId }) }));
    case "run.getControlState":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "run.control", run: await storage.getRunControlState({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId }) }));
    case "lease.list":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "lease.list", leases: await storage.listLeases({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, ...(command.payload.status === undefined ? {} : { status: command.payload.status }), limit: command.payload.limit }) }));
    case "lease.show":
      return withOpenProject(command.payload.projectPath, async () => ({ resultType: "lease.value", lease: await storage.getLease({ projectId: storage.getCurrent()!.projectId, runId: command.payload.runId, jobId: command.payload.jobId }) }));
  }
}

export function createApplicationService(dependencies: ApplicationServiceDependencies): ApplicationService {
  const core = dependencies.core ?? createArchiveCore();
  const logger = dependencies.logger ?? createSilentLogger();
  const now = dependencies.now ?? (() => new Date().toISOString());
  const secretStores = new Map<string, SecretStorePort>();
  const secretStoreFactory: SecretStoreFactory = dependencies.secretStoreFactory ?? ((input) => createProductionSecretStore({ backend: "portable_vault", projectRoot: input.projectRoot, projectId: input.projectId, now: input.now }));
  const storage = dependencies.projectStorage ?? createSqliteProjectStorage({
    applicationVersion: dependencies.configuration.applicationVersion,
    logger,
    now,
  });
  const browserRuntime = dependencies.browserRuntime ?? createPlaywrightBrowserRuntime({ browserRoot: dependencies.browserRoot ?? path.resolve(process.cwd(), ".runtime", "browsers"), now });
  const renderEngine = dependencies.renderEngine ?? createRenderEngine();
  const renderTestMode = dependencies.renderTestMode ?? false;
  const fixtureOrigins = dependencies.fixtureOrigins ?? [];
  const heartbeatIntervalMs = dependencies.renderHeartbeatIntervalMs ?? 15_000;
  if (!Number.isInteger(heartbeatIntervalMs) || heartbeatIntervalMs < 10 || heartbeatIntervalMs > 15_000 || (!renderTestMode && heartbeatIntervalMs !== 15_000)) {
    throw new RenderOperationError("RENDER_INPUT_INVALID", "The Render Heartbeat interval override is available only to bounded deterministic tests");
  }
  if (fixtureOrigins.some((origin) => {
    try {
      const hostname = new URL(origin).hostname;
      return !renderTestMode || (hostname !== "127.0.0.1" && hostname !== "[::1]" && hostname !== "::1");
    } catch { return true; }
  })) throw new RenderOperationError("RENDER_INPUT_INVALID", "Fixture origins must be explicit Loopback origins and require Render test mode");
  const activeRenders = new Map<string, ActiveRender>();
  const activeInteractions = new Map<string, ActiveInteraction>();
  const activeAuthentications = new Map<string, ActiveAuthentication>();
  const interactionPlanProvider = dependencies.interactionPlanProvider;

  const response = (raw: unknown, result: unknown, error: ErrorContract | null): ResponseEnvelope => {
    const identifiers = safeIdentifiers(raw);
    return parseResponseEnvelope({
      contractVersion: CONTRACT_VERSION,
      commandId: identifiers.commandId,
      correlationId: identifiers.correlationId,
      status: error === null ? "success" : "error",
      result: error === null ? result : null,
      error,
      timestamp: now(),
    });
  };

  return Object.freeze({
    async execute(rawCommand: unknown, context: TransportContext): Promise<ResponseEnvelope> {
      if (!context.authorized) return response(rawCommand, null, unauthorizedError());
      let command: CommandEnvelope;
      try {
        command = parseCommandEnvelope(rawCommand);
      } catch (error) {
        return response(rawCommand, null, error instanceof ContractValidationError ? contractError(error) : internalError());
      }
      logger.log({
        timestamp: now(),
        level: "info",
        component: "application-service",
        correlationId: command.correlationId,
        commandId: command.commandId,
        eventName: "command.started",
        metadata: { commandType: command.commandType, transport: context.transport },
      });
      try {
        const result = command.commandType === "system.describe"
          ? {
              resultType: "system.description",
              applicationName: dependencies.configuration.applicationName,
              applicationVersion: dependencies.configuration.applicationVersion,
              contractVersion: CONTRACT_VERSION,
              ...core.describeSystem(),
              implementedCapabilities: [...core.describeSystem().implementedCapabilities],
              plannedCapabilities: [...core.describeSystem().plannedCapabilities],
              runtime: dependencies.runtime,
              platform: dependencies.platform,
            }
          : await executeProjectCommand(command, storage, secretStores, secretStoreFactory, browserRuntime, renderEngine, activeRenders, activeInteractions, activeAuthentications, interactionPlanProvider, renderTestMode, fixtureOrigins, heartbeatIntervalMs, now);
        const completed = response(rawCommand, result, null);
        const completionMetadata = completed.status === "success" ? resultLogMetadata(completed.result) : {};
        logger.log({
          timestamp: now(),
          level: "info",
          component: "application-service",
          correlationId: command.correlationId,
          commandId: command.commandId,
          eventName: "command.completed",
          metadata: { commandType: command.commandType, status: completed.status, ...completionMetadata },
        });
        return completed;
      } catch (error) {
        const translated = error instanceof InteractionOperationError
          ? interactionError(error)
          : error instanceof ProjectOperationError
          ? projectError(error)
          : error instanceof ScopeEngineError
            ? scopeError(error)
            : error instanceof QueueOperationError
              ? queueError(error)
              : error instanceof RecoveryOperationError
                ? recoveryError(error)
              : error instanceof RenderOperationError
                  ? renderError(error)
              : error instanceof SessionOperationError
                ? sessionError(error)
              : error instanceof SecretStoreError
                ? secretStoreError(error)
              : internalError();
        const operationId = typeof command.payload === "object" && command.payload !== null && "operationId" in command.payload && typeof command.payload.operationId === "string"
          ? command.payload.operationId
          : undefined;
        const translatedWithOperation = operationId === undefined ? translated : { ...translated, details: { ...(translated.details ?? {}), operationId } };
        logger.log({
          timestamp: now(),
          level: "error",
          component: "application-service",
          correlationId: command.correlationId,
          commandId: command.commandId,
          eventName: "command.failed",
          errorCode: translatedWithOperation.code,
          metadata: { commandType: command.commandType },
        });
        return response(rawCommand, null, translatedWithOperation);
      }
    },
    async close(): Promise<void> {
      for (const active of activeRenders.values()) active.controller.abort();
      for (const active of activeInteractions.values()) active.controller.abort();
      for (const active of activeAuthentications.values()) {
        await active.browserSession.close().catch(() => undefined);
        if (active.previousMetadata !== null && storage.getCurrent()?.projectId === active.projectId) {
          await storage.getSession({ projectId: active.projectId, sessionId: active.sessionId }).then(async (current) => {
            const restored: SessionMetadata = { ...active.previousMetadata!, updatedAt: now(), revision: current.revision + 1 };
            await storage.updateSession({ projectId: active.projectId, sessionId: active.sessionId, expectedRevision: current.revision, metadata: restored });
          }).catch(() => undefined);
        }
      }
      activeAuthentications.clear();
      for (const store of secretStores.values()) {
        await store.lock();
        await store.dispose();
      }
      secretStores.clear();
      await browserRuntime.close();
      if (storage.getCurrent() !== null) await storage.close();
    },
  });
}
