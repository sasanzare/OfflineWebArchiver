import path from "node:path";
import { lookup } from "node:dns/promises";
import {
  BROWSER_CONTEXT_PROFILE_VERSION,
  createArchiveCore,
  ProjectOperationError,
  QueueOperationError,
  RecoveryOperationError,
  RenderOperationError,
  RENDER_ENGINE_VERSION,
  type ArchiveCore,
  type ProjectStoragePort,
  type QueueEnqueueInput,
  type QueueRepositoryPort,
  type RecoveryRepositoryPort,
  type BrowserRuntimePort,
  type RenderEnginePort,
  type RenderPolicy,
  type RenderRepositoryPort,
  type RuntimeNetworkDecision,
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
  projectStorage?: ProjectStoragePort & ProfileStoragePort & QueueRepositoryPort & RecoveryRepositoryPort & RenderRepositoryPort;
  browserRuntime?: BrowserRuntimePort;
  renderEngine?: RenderEnginePort;
  browserRoot?: string;
  renderTestMode?: boolean;
  fixtureOrigins?: readonly string[];
  renderHeartbeatIntervalMs?: number;
  logger?: Logger;
  now?: () => string;
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
  if (result.resultType === "run.control") return { resultType: result.resultType, runId: result.run.runId, controlState: result.run.controlState, activeLeaseCount: result.run.activeLeaseCount };
  if (result.resultType === "browser.runtimeInfo") return { resultType: result.resultType, action: result.action, valid: result.info.valid, playwrightVersion: result.info.playwrightVersion, chromiumVersion: result.info.chromiumVersion, sandboxEnabled: result.info.sandboxEnabled };
  if (result.resultType === "browser.health") return { resultType: result.resultType, action: result.action, state: result.health.state, connected: result.health.connected, activeJobId: result.health.activeJobId };
  if (result.resultType === "render.result") return { resultType: result.resultType, action: result.action, renderResultId: result.result.renderResultId, jobId: result.result.jobId, status: result.result.resultStatus, quality: result.result.qualityClassification, totalDurationMs: result.result.totalDurationMs, htmlSha256: result.result.htmlArtifact.sha256 };
  if (result.resultType === "render.status") return { resultType: result.resultType, action: result.action, jobId: result.status.jobId, jobState: result.status.jobState, stage: result.status.stage, resultStatus: result.status.resultStatus };
  if (result.resultType === "render.events") return { resultType: result.resultType, eventCount: result.events.length };
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

async function executeProjectCommand(
  command: Exclude<CommandEnvelope, { commandType: "system.describe" }>,
  storage: ProjectStoragePort & ProfileStoragePort & QueueRepositoryPort & RecoveryRepositoryPort & RenderRepositoryPort,
  runtime: BrowserRuntimePort,
  engine: RenderEnginePort,
  activeRenders: Map<string, ActiveRender>,
  renderTestMode: boolean,
  fixtureOrigins: readonly string[],
  heartbeatIntervalMs: number,
  now: () => string,
): Promise<unknown> {
  const withOpenProject = async <T>(projectPath: string, operation: () => Promise<T>): Promise<T> => {
    const openedHere = storage.getCurrent() === null;
    if (openedHere) await storage.open(projectPath);
    try {
      return await operation();
    } finally {
      if (openedHere) await storage.close();
    }
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
          : await executeProjectCommand(command, storage, browserRuntime, renderEngine, activeRenders, renderTestMode, fixtureOrigins, heartbeatIntervalMs, now);
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
        const translated = error instanceof ProjectOperationError
          ? projectError(error)
          : error instanceof ScopeEngineError
            ? scopeError(error)
            : error instanceof QueueOperationError
              ? queueError(error)
              : error instanceof RecoveryOperationError
                ? recoveryError(error)
                : error instanceof RenderOperationError
                  ? renderError(error)
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
      await browserRuntime.close();
      if (storage.getCurrent() !== null) await storage.close();
    },
  });
}
