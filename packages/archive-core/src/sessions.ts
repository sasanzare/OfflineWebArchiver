import { parseSecretRef } from "./secrets.js";

export const SESSION_FORMAT_VERSION = 1 as const;
export const SESSION_STORAGE_STATE_FORMAT_VERSION = 1 as const;
export const SESSION_AFFINITY_VERSION = 1 as const;

export const SESSION_STATES = Object.freeze([
  "ready",
  "login_browser_open",
  "authentication_in_progress",
  "authenticated_unpersisted",
  "saving",
  "valid",
  "validation_required",
  "invalid",
  "expired",
  "reauth_required",
  "corrupt",
  "deleted",
] as const);
export type SessionState = (typeof SESSION_STATES)[number];

export const SESSION_VALIDATION_RESULTS = Object.freeze([
  "not_validated",
  "valid",
  "expired",
  "invalid",
  "unavailable",
  "configuration_missing",
  "corrupt",
  "incompatible_profile",
] as const);
export type SessionValidationResult = (typeof SESSION_VALIDATION_RESULTS)[number];

export const SESSION_FAILURE_REASONS = Object.freeze([
  "none",
  "validation_required",
  "authentication_expired",
  "authentication_rejected",
  "network_unavailable",
  "validation_configuration_missing",
  "storage_state_corrupt",
  "secret_missing",
  "secret_integrity_failed",
  "browser_profile_incompatible",
  "browser_crashed",
  "manual_login_cancelled",
] as const);
export type SessionFailureReason = (typeof SESSION_FAILURE_REASONS)[number];

export const SESSION_STORAGE_CAPABILITIES = Object.freeze({
  cookies: true,
  localStorage: true,
  indexedDB: true,
  sessionStorage: false,
} as const);

export interface SessionValidationPolicy {
  readonly validationUrl: string;
  readonly expectedOrigin: string;
  readonly expectedPath: string;
  readonly markerSelector: string | null;
  readonly markerText: string | null;
}

export interface SessionAffinityMetadata {
  readonly version: typeof SESSION_AFFINITY_VERSION;
  readonly browserProfileId: string;
  readonly browserProfileVersion: number;
  readonly proxyId: string | null;
}

export interface SessionStorageCapabilities {
  readonly cookies: boolean;
  readonly localStorage: boolean;
  readonly indexedDB: boolean;
  readonly sessionStorage: boolean;
}

export interface SessionMetadata {
  readonly sessionId: string;
  readonly projectId: string;
  readonly profileId: string;
  readonly browserProfileVersion: number;
  readonly sessionFormatVersion: typeof SESSION_FORMAT_VERSION;
  readonly storageStateFormatVersion: typeof SESSION_STORAGE_STATE_FORMAT_VERSION;
  readonly secretRef: import("./secrets.js").SecretRef | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastValidatedAt: string | null;
  readonly validationResult: SessionValidationResult;
  readonly failureReason: SessionFailureReason;
  readonly state: SessionState;
  readonly validationPolicy: SessionValidationPolicy;
  readonly affinity: SessionAffinityMetadata;
  readonly capabilities: SessionStorageCapabilities;
  readonly revision: number;
}

export type SessionMetadataInput = Omit<SessionMetadata, "revision">;

export type SessionOperationErrorCode =
  | "SESSION_NOT_FOUND"
  | "SESSION_ALREADY_EXISTS"
  | "SESSION_PROJECT_MISMATCH"
  | "SESSION_METADATA_INVALID"
  | "SESSION_STATE_CONFLICT"
  | "SESSION_PROFILE_INCOMPATIBLE"
  | "SESSION_STORAGE_STATE_INVALID"
  | "SESSION_VALIDATION_FAILED"
  | "SESSION_VALIDATION_UNAVAILABLE"
  | "SESSION_SECRET_INCONSISTENT"
  | "SESSION_DELETION_FAILED";

export class SessionOperationError extends Error {
  public constructor(
    public readonly code: SessionOperationErrorCode,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "SessionOperationError";
  }
}

export interface SessionRepositoryPort {
  createSession(input: SessionMetadataInput): Promise<SessionMetadata>;
  getSession(input: { readonly projectId: string; readonly sessionId: string }): Promise<SessionMetadata>;
  listSessions(input: { readonly projectId: string }): Promise<readonly SessionMetadata[]>;
  updateSession(input: { readonly projectId: string; readonly sessionId: string; readonly expectedRevision: number; readonly metadata: SessionMetadata }): Promise<SessionMetadata>;
  deleteSession(input: { readonly projectId: string; readonly sessionId: string }): Promise<void>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROFILE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_SELECTOR_PATTERN = /^[^\u0000-\u001f\u007f]{1,512}$/;

function fail(message: string): never {
  throw new SessionOperationError("SESSION_METADATA_INVALID", message);
}

function assertUuid(value: string, label: string): void {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) fail(`${label} is invalid`);
}

function assertProfileId(value: string): void {
  if (typeof value !== "string" || !PROFILE_ID_PATTERN.test(value)) fail("The Browser Profile identifier is invalid");
}

function assertSafeTimestamp(value: string, label: string): void {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) fail(`${label} is invalid`);
}

function assertSafeUrl(value: string, label: string): void {
  try {
    const url = new URL(value);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username !== "" || url.password !== "" || url.hash !== "" || url.search !== "") fail(`${label} is not a safe validation URL`);
  } catch {
    fail(`${label} is invalid`);
  }
}

export function assertSessionProjectOwnership(projectId: string, session: Pick<SessionMetadata, "projectId">): void {
  assertUuid(projectId, "The Project identifier");
  assertUuid(session.projectId, "The Session Project identifier");
  if (projectId.toLowerCase() !== session.projectId.toLowerCase()) throw new SessionOperationError("SESSION_PROJECT_MISMATCH", "The Session belongs to another Project");
}

export function assertSessionMetadata(metadata: SessionMetadata): void {
  assertUuid(metadata.sessionId, "The Session identifier");
  assertUuid(metadata.projectId, "The Session Project identifier");
  assertProfileId(metadata.profileId);
  if (metadata.browserProfileVersion < 1 || !Number.isInteger(metadata.browserProfileVersion)) fail("The Browser Profile version is invalid");
  if (metadata.sessionFormatVersion !== SESSION_FORMAT_VERSION || metadata.storageStateFormatVersion !== SESSION_STORAGE_STATE_FORMAT_VERSION) {
    throw new SessionOperationError("SESSION_METADATA_INVALID", "The Session format version is unsupported");
  }
  if (metadata.secretRef !== null) {
    const parsed = parseSecretRef(metadata.secretRef);
    if (parsed.projectId !== metadata.projectId.toLowerCase()) throw new SessionOperationError("SESSION_SECRET_INCONSISTENT", "The Session Secret Reference belongs to another Project");
  }
  assertSafeTimestamp(metadata.createdAt, "The Session creation time");
  assertSafeTimestamp(metadata.updatedAt, "The Session update time");
  if (metadata.lastValidatedAt !== null) assertSafeTimestamp(metadata.lastValidatedAt, "The Session validation time");
  if (!(SESSION_STATES as readonly string[]).includes(metadata.state)) fail("The Session state is invalid");
  if (!(SESSION_VALIDATION_RESULTS as readonly string[]).includes(metadata.validationResult)) fail("The Session validation result is invalid");
  if (!(SESSION_FAILURE_REASONS as readonly string[]).includes(metadata.failureReason)) fail("The Session failure reason is invalid");
  assertSafeUrl(metadata.validationPolicy.validationUrl, "The Session validation URL");
  if (metadata.validationPolicy.expectedOrigin !== new URL(metadata.validationPolicy.validationUrl).origin) fail("The Session validation origin does not match its validation URL");
  if (!metadata.validationPolicy.expectedPath.startsWith("/") || metadata.validationPolicy.expectedPath.length > 2_048) fail("The Session validation path is invalid");
  if (metadata.validationPolicy.markerSelector !== null && !SAFE_SELECTOR_PATTERN.test(metadata.validationPolicy.markerSelector)) fail("The Session validation selector is invalid");
  if (metadata.validationPolicy.markerText !== null && (metadata.validationPolicy.markerText.length === 0 || metadata.validationPolicy.markerText.length > 512 || /[\u0000-\u001f\u007f]/.test(metadata.validationPolicy.markerText))) fail("The Session validation marker is invalid");
  if (metadata.affinity.version !== SESSION_AFFINITY_VERSION) fail("The Session Affinity version is unsupported");
  if (metadata.affinity.browserProfileId !== metadata.profileId || metadata.affinity.browserProfileVersion !== metadata.browserProfileVersion) fail("The Session Affinity does not match the Browser Profile");
  if (metadata.affinity.proxyId !== null && !PROFILE_ID_PATTERN.test(metadata.affinity.proxyId)) fail("The Session Proxy Affinity identifier is invalid");
  for (const [name, enabled] of Object.entries(metadata.capabilities)) if (typeof enabled !== "boolean") fail(`The Session ${name} capability is invalid`);
  if (!Number.isInteger(metadata.revision) || metadata.revision < 1) fail("The Session revision is invalid");
}

export function createSessionMetadata(input: SessionMetadataInput): SessionMetadata {
  const metadata: SessionMetadata = { ...input, revision: 1 };
  assertSessionMetadata(metadata);
  return metadata;
}

const SESSION_TRANSITIONS: Readonly<Record<SessionState, readonly SessionState[]>> = Object.freeze({
  ready: ["login_browser_open", "deleted"],
  login_browser_open: ["authentication_in_progress", "authenticated_unpersisted", "saving", "valid", "validation_required", "invalid", "expired", "reauth_required", "corrupt", "deleted"],
  authentication_in_progress: ["authenticated_unpersisted", "saving", "validation_required", "invalid", "expired", "reauth_required", "corrupt", "deleted"],
  authenticated_unpersisted: ["saving", "valid", "validation_required", "invalid", "expired", "reauth_required", "corrupt", "deleted"],
  saving: ["authenticated_unpersisted", "valid", "validation_required", "invalid", "expired", "reauth_required", "corrupt", "deleted"],
  valid: ["login_browser_open", "authentication_in_progress", "validation_required", "invalid", "expired", "reauth_required", "corrupt", "deleted"],
  validation_required: ["login_browser_open", "authentication_in_progress", "valid", "invalid", "expired", "reauth_required", "corrupt", "deleted"],
  invalid: ["login_browser_open", "authentication_in_progress", "saving", "valid", "reauth_required", "corrupt", "deleted"],
  expired: ["login_browser_open", "authentication_in_progress", "saving", "valid", "reauth_required", "corrupt", "deleted"],
  reauth_required: ["login_browser_open", "authentication_in_progress", "saving", "valid", "validation_required", "invalid", "expired", "corrupt", "deleted"],
  corrupt: ["login_browser_open", "authentication_in_progress", "saving", "valid", "reauth_required", "deleted"],
  deleted: [],
});

export function assertSessionTransition(from: SessionState, to: SessionState): void {
  if (!(SESSION_TRANSITIONS[from] ?? []).includes(to)) throw new SessionOperationError("SESSION_STATE_CONFLICT", `The Session cannot transition from ${from} to ${to}`);
}

export function sessionRequiresReauthentication(metadata: Pick<SessionMetadata, "state" | "validationResult">): boolean {
  return metadata.state === "reauth_required" || metadata.state === "invalid" || metadata.state === "expired" || metadata.state === "corrupt" || metadata.validationResult === "expired" || metadata.validationResult === "invalid" || metadata.validationResult === "corrupt" || metadata.validationResult === "incompatible_profile";
}
