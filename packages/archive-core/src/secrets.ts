export const SECRET_REFERENCE_VERSION = 1 as const;
export const VAULT_FORMAT_VERSION = 1 as const;
export const ENCRYPTION_ENVELOPE_VERSION = 1 as const;
export const SECURE_EXPORT_FORMAT_VERSION = 1 as const;
export const DIAGNOSTIC_BUNDLE_SANITIZATION_VERSION = 1 as const;

export const SECRET_KINDS = Object.freeze([
  "proxy_credential",
  "authentication_credential",
  "session_storage",
  "api_credential",
  "portable_export_key",
  "generic_project_secret",
] as const);
export type SecretKind = (typeof SECRET_KINDS)[number];

export const SECRET_SCOPE_TYPES = Object.freeze([
  "application",
  "project",
  "proxy",
  "profile",
  "session",
  "login_flow",
] as const);
export type SecretScopeType = (typeof SECRET_SCOPE_TYPES)[number];

export const SECRET_BACKENDS = Object.freeze([
  "portable_vault",
  "os_protected",
  "memory_test",
] as const);
export type SecretBackend = (typeof SECRET_BACKENDS)[number];

export const SECRET_ACCESS_PURPOSES = Object.freeze([
  "proxy_connection",
  "future_manual_login",
  "future_session_restore",
  "secure_export",
  "secret_rotation",
  "migration",
  "test_fixture",
] as const);
export type SecretAccessPurpose = (typeof SECRET_ACCESS_PURPOSES)[number];

export const SECRET_LIFECYCLE_STATES = Object.freeze([
  "active",
  "rotation_required",
  "disabled",
  "deleted",
  "migration_required",
] as const);
export type SecretLifecycleState = (typeof SECRET_LIFECYCLE_STATES)[number];

export const VAULT_STATES = Object.freeze([
  "uninitialized",
  "locked",
  "unlocking",
  "unlocked",
  "rotating",
  "error",
] as const);
export type VaultState = (typeof VAULT_STATES)[number];

export const SECRET_BACKEND_STATES = Object.freeze([
  "available",
  "unavailable",
  "degraded",
  "insecure_backend_rejected",
  "unsupported",
] as const);
export type SecretBackendState = (typeof SECRET_BACKEND_STATES)[number];

export type SecretId = string & { readonly __secretId: unique symbol };
export type SecretRef = string & { readonly __secretRef: unique symbol };

export interface ParsedSecretRef {
  readonly serialized: SecretRef;
  readonly version: typeof SECRET_REFERENCE_VERSION;
  readonly projectId: string;
  readonly secretId: SecretId;
}

export interface SecretScope {
  readonly scopeType: SecretScopeType;
  readonly projectId: string;
  readonly scopeId: string;
}

export type SecretExportPolicy = "allowed" | "forbidden";

export interface SecretMetadata {
  readonly ref: SecretRef;
  readonly secretId: SecretId;
  readonly projectId: string;
  readonly scope: SecretScope;
  readonly kind: SecretKind;
  readonly backend: SecretBackend;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastRotatedAt: string | null;
  readonly version: number;
  readonly lifecycleState: SecretLifecycleState;
  readonly displayLabel: string | null;
  readonly secureExportPolicy: SecretExportPolicy;
  readonly encryptionEnvelopeVersion: typeof ENCRYPTION_ENVELOPE_VERSION;
  readonly keySlotId: string;
  readonly migrationState: "current" | "migration_required";
}

export interface SecretBackendStatus {
  readonly backend: SecretBackend;
  readonly state: SecretBackendState;
  readonly vaultState: VaultState;
  readonly initialized: boolean;
  readonly locked: boolean;
  readonly selectedProvider: string | null;
  readonly referenceVersion: typeof SECRET_REFERENCE_VERSION;
  readonly vaultFormatVersion: typeof VAULT_FORMAT_VERSION;
  readonly encryptionEnvelopeVersion: typeof ENCRYPTION_ENVELOPE_VERSION;
  readonly reasonCode: string | null;
}

export interface SecretStoreCapability {
  readonly capabilityVersion: 1;
  readonly backend: SecretBackend;
  readonly state: SecretBackendState;
  readonly canCreate: boolean;
  readonly canResolve: boolean;
  readonly canSecureExport: boolean;
  readonly supportsLock: boolean;
  readonly supportsRotation: boolean;
}

export type SecretStoreErrorCode =
  | "SECRET_REFERENCE_INVALID"
  | "SECRET_REFERENCE_VERSION_UNSUPPORTED"
  | "SECRET_REFERENCE_PROJECT_MISMATCH"
  | "SECRET_KIND_INVALID"
  | "SECRET_SCOPE_INVALID"
  | "SECRET_PURPOSE_INVALID"
  | "SECRET_PURPOSE_NOT_ALLOWED"
  | "SECRET_METADATA_INVALID"
  | "SECRET_VALUE_INVALID"
  | "SECRET_VALUE_TOO_LARGE"
  | "SECRET_NOT_FOUND"
  | "SECRET_ALREADY_EXISTS"
  | "SECRET_STORE_LOCKED"
  | "SECRET_STORE_UNINITIALIZED"
  | "SECRET_STORE_BUSY"
  | "SECRET_UNLOCK_FAILED"
  | "SECRET_UNLOCK_RATE_LIMITED"
  | "SECRET_TAMPER_DETECTED"
  | "SECRET_FORMAT_UNSUPPORTED"
  | "SECRET_ALGORITHM_UNSUPPORTED"
  | "SECRET_KDF_INVALID"
  | "SECRET_EXPORT_FORBIDDEN"
  | "SECRET_EXPORT_CONFIRMATION_REQUIRED"
  | "SECRET_EXPORT_FAILED"
  | "SECRET_IMPORT_FAILED"
  | "SECRET_BACKEND_UNAVAILABLE"
  | "SECRET_INSECURE_BACKEND"
  | "SECRET_BACKEND_UNSUPPORTED"
  | "SECRET_PRODUCTION_TEST_BACKEND"
  | "SECRET_PROJECT_CONTEXT_REQUIRED"
  | "SECRET_OPERATION_FAILED";

export class SecretStoreError extends Error {
  public constructor(
    public readonly code: SecretStoreErrorCode,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "SecretStoreError";
  }
}

export const SECRET_AUDIT_EVENT_TYPES = Object.freeze([
  "secret_created",
  "secret_replaced",
  "secret_deleted",
  "secret_accessed",
  "secret_access_denied",
  "vault_initialized",
  "vault_unlocked",
  "vault_unlock_failed",
  "vault_locked",
  "vault_rotated",
  "backend_selected",
  "insecure_backend_rejected",
  "secure_export_created",
  "secure_export_imported",
  "secure_export_failed",
  "diagnostic_bundle_created",
  "temporary_data_cleaned",
] as const);
export type SecretAuditEventType = (typeof SECRET_AUDIT_EVENT_TYPES)[number];

export interface SecretAuditEvent {
  readonly timestamp: string;
  readonly eventType: SecretAuditEventType;
  readonly projectId: string | null;
  readonly secretId: SecretId | null;
  readonly kind: SecretKind | null;
  readonly purpose: SecretAccessPurpose | null;
  readonly backend: SecretBackend;
  readonly result: "success" | "denied" | "failed";
  readonly errorCategory: string | null;
}

export type SecretAuditSink = (event: SecretAuditEvent) => void | Promise<void>;

export interface SecretAccessContext {
  readonly projectId: string;
  readonly scopeId?: string | null;
  readonly purpose: SecretAccessPurpose;
}

export interface SecretCreateInput {
  readonly projectId: string;
  readonly scope: SecretScope;
  readonly kind: SecretKind;
  readonly value: Uint8Array;
  readonly displayLabel?: string | null;
  readonly secureExportPolicy?: SecretExportPolicy;
}

export interface SecretReplaceInput {
  readonly ref: SecretRef;
  readonly projectId: string;
  readonly value: Uint8Array;
  readonly displayLabel?: string | null;
}

export interface SecretStorePort {
  readonly backend: SecretBackend;
  initialize(input: { readonly passphrase: Uint8Array }): Promise<void>;
  unlock(input: { readonly passphrase: Uint8Array }): Promise<void>;
  lock(): Promise<void>;
  getBackendStatus(): Promise<SecretBackendStatus>;
  getCapability(): Promise<SecretStoreCapability>;
  createSecret(input: SecretCreateInput): Promise<SecretMetadata>;
  replaceSecret(input: SecretReplaceInput): Promise<SecretMetadata>;
  withSecret<T>(context: SecretAccessContext, ref: SecretRef, consumer: (secretBytes: Uint8Array) => Promise<T>): Promise<T>;
  deleteSecret(input: { readonly projectId: string; readonly ref: SecretRef }): Promise<void>;
  hasSecret(input: { readonly projectId: string; readonly ref: SecretRef }): Promise<boolean>;
  getSecretMetadata(input: { readonly projectId: string; readonly ref: SecretRef }): Promise<SecretMetadata>;
  listSecretMetadata(input: { readonly projectId: string }): Promise<readonly SecretMetadata[]>;
  rotateSecret(input: { readonly projectId: string; readonly ref: SecretRef }): Promise<SecretMetadata>;
  rotateVaultProtection(input: { readonly newPassphrase: Uint8Array }): Promise<void>;
  exportSecretsEncrypted(input: {
    readonly projectId: string;
    readonly destinationPath: string;
    readonly passphrase: Uint8Array;
    readonly confirm: boolean;
    readonly refs?: readonly SecretRef[];
  }): Promise<{ readonly destinationPath: string; readonly secretCount: number; readonly formatVersion: typeof SECURE_EXPORT_FORMAT_VERSION }>;
  importSecretsEncrypted(input: {
    readonly projectId: string;
    readonly sourcePath: string;
    readonly passphrase: Uint8Array;
  }): Promise<{ readonly importedCount: number; readonly formatVersion: typeof SECURE_EXPORT_FORMAT_VERSION }>;
  dispose(): Promise<void>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SECRET_ID_PATTERN = UUID_PATTERN;
const SAFE_SCOPE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_LABEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._:-]{0,119}$/;

function invalid(code: SecretStoreErrorCode, message: string): never {
  throw new SecretStoreError(code, message);
}

function assertSafeIdentifier(value: string, label: string): void {
  if (typeof value !== "string" || value.length === 0 || value.length > 128 || !SAFE_SCOPE_ID_PATTERN.test(value) || /[\u0000-\u001f\u007f/\\]/.test(value)) {
    invalid("SECRET_SCOPE_INVALID", `${label} is invalid`);
  }
}

export function assertValidProjectId(projectId: string): void {
  if (typeof projectId !== "string" || !UUID_PATTERN.test(projectId)) invalid("SECRET_SCOPE_INVALID", "The Project identifier is invalid");
}

export function assertValidSecretKind(kind: unknown): asserts kind is SecretKind {
  if (typeof kind !== "string" || !(SECRET_KINDS as readonly string[]).includes(kind)) invalid("SECRET_KIND_INVALID", "The Secret kind is not supported");
}

export function assertValidSecretPurpose(purpose: unknown): asserts purpose is SecretAccessPurpose {
  if (typeof purpose !== "string" || !(SECRET_ACCESS_PURPOSES as readonly string[]).includes(purpose)) invalid("SECRET_PURPOSE_INVALID", "The Secret access purpose is not supported");
}

export function assertValidSecretScope(scope: SecretScope): void {
  if (typeof scope !== "object" || scope === null || !(SECRET_SCOPE_TYPES as readonly string[]).includes(scope.scopeType)) {
    invalid("SECRET_SCOPE_INVALID", "The Secret scope is invalid");
  }
  const keys = Object.keys(scope as object);
  if (keys.length !== 3 || keys.some((key) => !["scopeType", "projectId", "scopeId"].includes(key))) {
    invalid("SECRET_SCOPE_INVALID", "The Secret scope contains unsupported fields");
  }
  if (typeof scope.scopeType !== "string" || typeof scope.projectId !== "string" || typeof scope.scopeId !== "string") {
    invalid("SECRET_SCOPE_INVALID", "The Secret scope fields are invalid");
  }
  assertValidProjectId(scope.projectId);
  assertSafeIdentifier(scope.scopeId, "The Secret scope identifier");
  if (scope.scopeType === "project" && scope.scopeId !== scope.projectId) {
    invalid("SECRET_SCOPE_INVALID", "A Project-scoped Secret must use the Project identifier as its scope");
  }
}

export function assertValidSecretLabel(label: string | null | undefined): void {
  if (label === undefined || label === null) return;
  if (typeof label !== "string" || label.length === 0 || !SAFE_LABEL_PATTERN.test(label) || /(?:password|passphrase|token|secret|cookie|authorization|api[-_ ]?key)/i.test(label)) {
    invalid("SECRET_METADATA_INVALID", "The display label must be explicitly non-sensitive");
  }
}

export function serializeSecretRef(input: { readonly projectId: string; readonly secretId: string }): SecretRef {
  assertValidProjectId(input.projectId);
  if (!SECRET_ID_PATTERN.test(input.secretId)) invalid("SECRET_REFERENCE_INVALID", "The Secret identifier is invalid");
  return `secret://v${SECRET_REFERENCE_VERSION}/project/${input.projectId.toLowerCase()}/${input.secretId.toLowerCase()}` as SecretRef;
}

export function parseSecretRef(value: unknown): ParsedSecretRef {
  if (typeof value !== "string" || value.length > 256 || /[\u0000-\u001f\u007f]/.test(value)) {
    invalid("SECRET_REFERENCE_INVALID", "The Credential Reference is invalid");
  }
  const match = /^secret:\/\/v(\d+)\/project\/([^/]+)\/([^/]+)$/.exec(value);
  if (match === null) invalid("SECRET_REFERENCE_INVALID", "The Credential Reference has an invalid format");
  const versionText = match[1];
  const projectId = match[2];
  const secretId = match[3];
  if (versionText !== String(SECRET_REFERENCE_VERSION)) invalid("SECRET_REFERENCE_VERSION_UNSUPPORTED", "The Credential Reference version is unsupported");
  if (projectId === undefined || secretId === undefined || projectId.includes("..") || secretId.includes("..")) {
    invalid("SECRET_REFERENCE_INVALID", "The Credential Reference contains an unsafe path segment");
  }
  assertValidProjectId(projectId);
  if (!SECRET_ID_PATTERN.test(secretId)) invalid("SECRET_REFERENCE_INVALID", "The Secret identifier is invalid");
  const serialized = serializeSecretRef({ projectId, secretId });
  if (serialized !== value.toLowerCase()) invalid("SECRET_REFERENCE_INVALID", "The Credential Reference is not canonical");
  return { serialized, version: SECRET_REFERENCE_VERSION, projectId: projectId.toLowerCase(), secretId: secretId.toLowerCase() as SecretId };
}

export function isPurposeAllowedForKind(kind: SecretKind, purpose: SecretAccessPurpose): boolean {
  assertValidSecretKind(kind);
  assertValidSecretPurpose(purpose);
  if (purpose === "test_fixture") return true;
  if (purpose === "secret_rotation" || purpose === "secure_export" || purpose === "migration") return true;
  if (kind === "proxy_credential") return purpose === "proxy_connection";
  if (kind === "authentication_credential") return purpose === "future_manual_login";
  if (kind === "session_storage") return purpose === "future_session_restore";
  if (kind === "api_credential") return purpose === "future_manual_login";
  return false;
}

export function assertSecretAccessAllowed(kind: SecretKind, purpose: SecretAccessPurpose): void {
  if (!isPurposeAllowedForKind(kind, purpose)) invalid("SECRET_PURPOSE_NOT_ALLOWED", "The Secret kind cannot be used for this purpose");
}

export function assertSecretMetadata(metadata: SecretMetadata): void {
  const parsed = parseSecretRef(metadata.ref);
  if (parsed.secretId !== metadata.secretId || parsed.projectId !== metadata.projectId.toLowerCase()) invalid("SECRET_METADATA_INVALID", "Secret metadata and reference identity differ");
  assertValidSecretKind(metadata.kind);
  assertValidSecretScope(metadata.scope);
  if (metadata.scope.projectId.toLowerCase() !== metadata.projectId.toLowerCase()) invalid("SECRET_METADATA_INVALID", "Secret metadata crosses Project scope");
  if (!["portable_vault", "os_protected", "memory_test"].includes(metadata.backend)) invalid("SECRET_METADATA_INVALID", "Secret backend is invalid");
  if (!Number.isInteger(metadata.version) || metadata.version < 1 || metadata.version > 1_000_000) invalid("SECRET_METADATA_INVALID", "Secret version is invalid");
  assertValidSecretLabel(metadata.displayLabel);
  if (metadata.encryptionEnvelopeVersion !== ENCRYPTION_ENVELOPE_VERSION) invalid("SECRET_FORMAT_UNSUPPORTED", "The Secret encryption envelope version is unsupported");
  assertSafeIdentifier(metadata.keySlotId, "The Secret key slot identifier");
}

export function createSecretId(secretId: string): SecretId {
  if (!SECRET_ID_PATTERN.test(secretId)) invalid("SECRET_REFERENCE_INVALID", "The Secret identifier is invalid");
  return secretId.toLowerCase() as SecretId;
}

export function canCaptureScreenshot(input: { readonly requested: boolean; readonly sensitivity: "safe" | "sensitive" | "unknown" }): boolean {
  return input.requested && input.sensitivity === "safe";
}
