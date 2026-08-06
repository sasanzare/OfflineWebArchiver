import { randomUUID } from "node:crypto";
import {
  ENCRYPTION_ENVELOPE_VERSION,
  SecretStoreError,
  assertSecretAccessAllowed,
  assertValidProjectId,
  assertValidSecretKind,
  assertValidSecretLabel,
  assertValidSecretPurpose,
  assertValidSecretScope,
  createSecretId,
  parseSecretRef,
  serializeSecretRef,
  type SecretAccessContext,
  type SecretBackendStatus,
  type SecretCreateInput,
  type SecretMetadata,
  type SecretRef,
  type SecretReplaceInput,
  type SecretStoreCapability,
  type SecretStorePort,
} from "@offline-web-archive/archive-core";
import { clearBytes, copyBytes, validateSecretBytes } from "./crypto.js";

interface MemoryRecord {
  metadata: SecretMetadata;
  value: Buffer;
}

export interface InMemorySecretStoreOptions {
  readonly projectId: string;
  readonly now?: () => string;
  readonly id?: () => string;
}

export class InMemorySecretStore implements SecretStorePort {
  public readonly backend = "memory_test" as const;
  private readonly projectId: string;
  private readonly now: () => string;
  private readonly id: () => string;
  private readonly records = new Map<string, MemoryRecord>();
  private initialized = true;
  private unlocked = true;

  public constructor(options: InMemorySecretStoreOptions) {
    assertValidProjectId(options.projectId);
    this.projectId = options.projectId.toLowerCase();
    this.now = options.now ?? (() => new Date().toISOString());
    this.id = options.id ?? randomUUID;
  }

  private ensureProject(projectId: string): void {
    if (projectId.toLowerCase() !== this.projectId) throw new SecretStoreError("SECRET_REFERENCE_PROJECT_MISMATCH", "The Secret Reference belongs to another Project");
  }

  private ensureUnlocked(): void {
    if (!this.initialized) throw new SecretStoreError("SECRET_STORE_UNINITIALIZED", "The test Secret Store is not initialized");
    if (!this.unlocked) throw new SecretStoreError("SECRET_STORE_LOCKED", "The test Secret Store is locked");
  }

  public async initialize(_input: { readonly passphrase: Uint8Array }): Promise<void> {
    this.initialized = true;
    this.unlocked = true;
  }

  public async unlock(_input: { readonly passphrase: Uint8Array }): Promise<void> {
    if (!this.initialized) throw new SecretStoreError("SECRET_STORE_UNINITIALIZED", "The test Secret Store is not initialized");
    this.unlocked = true;
  }

  public async lock(): Promise<void> {
    this.unlocked = false;
  }

  public async getBackendStatus(): Promise<SecretBackendStatus> {
    return { backend: "memory_test", state: "available", vaultState: this.unlocked ? "unlocked" : "locked", initialized: this.initialized, locked: !this.unlocked, selectedProvider: "test-only", referenceVersion: 1, vaultFormatVersion: 1, encryptionEnvelopeVersion: ENCRYPTION_ENVELOPE_VERSION, reasonCode: null };
  }

  public async getCapability(): Promise<SecretStoreCapability> {
    return { capabilityVersion: 1, backend: "memory_test", state: "available", canCreate: this.unlocked, canResolve: this.unlocked, canSecureExport: false, supportsLock: true, supportsRotation: true };
  }

  public async createSecret(input: SecretCreateInput): Promise<SecretMetadata> {
    this.ensureUnlocked();
    this.ensureProject(input.projectId);
    assertValidSecretKind(input.kind);
    assertValidSecretScope(input.scope);
    if (input.scope.projectId.toLowerCase() !== this.projectId) throw new SecretStoreError("SECRET_SCOPE_INVALID", "The Secret scope belongs to another Project");
    validateSecretBytes(input.value);
    assertValidSecretLabel(input.displayLabel);
    const secretId = createSecretId(this.id());
    const timestamp = this.now();
    const metadata: SecretMetadata = { ref: serializeSecretRef({ projectId: this.projectId, secretId }), secretId, projectId: this.projectId, scope: input.scope, kind: input.kind, backend: "memory_test", createdAt: timestamp, updatedAt: timestamp, lastRotatedAt: null, version: 1, lifecycleState: "active", displayLabel: input.displayLabel ?? null, secureExportPolicy: input.secureExportPolicy ?? (input.kind === "session_storage" ? "forbidden" : "allowed"), encryptionEnvelopeVersion: ENCRYPTION_ENVELOPE_VERSION, keySlotId: `slot-${this.id()}`, migrationState: "current" };
    if (this.records.has(secretId)) throw new SecretStoreError("SECRET_ALREADY_EXISTS", "The test Secret identifier already exists");
    this.records.set(secretId, { metadata, value: copyBytes(input.value) });
    return metadata;
  }

  public async replaceSecret(input: SecretReplaceInput): Promise<SecretMetadata> {
    this.ensureUnlocked();
    this.ensureProject(input.projectId);
    validateSecretBytes(input.value);
    assertValidSecretLabel(input.displayLabel);
    const parsed = parseSecretRef(input.ref);
    this.ensureProject(parsed.projectId);
    const record = this.records.get(parsed.secretId);
    if (record === undefined) throw new SecretStoreError("SECRET_NOT_FOUND", "The Secret Reference was not found");
    clearBytes(record.value);
    record.value = copyBytes(input.value);
    record.metadata = { ...record.metadata, updatedAt: this.now(), version: record.metadata.version + 1, displayLabel: input.displayLabel === undefined ? record.metadata.displayLabel : input.displayLabel };
    return record.metadata;
  }

  public async withSecret<T>(context: SecretAccessContext, ref: SecretRef, consumer: (secretBytes: Uint8Array) => Promise<T>): Promise<T> {
    this.ensureUnlocked();
    this.ensureProject(context.projectId);
    assertValidSecretPurpose(context.purpose);
    const parsed = parseSecretRef(ref);
    this.ensureProject(parsed.projectId);
    const record = this.records.get(parsed.secretId);
    if (record === undefined) throw new SecretStoreError("SECRET_NOT_FOUND", "The Secret Reference was not found");
    assertSecretAccessAllowed(record.metadata.kind, context.purpose);
    if (context.scopeId !== undefined && context.scopeId !== null && context.scopeId !== record.metadata.scope.scopeId) throw new SecretStoreError("SECRET_SCOPE_INVALID", "The Secret scope does not authorize this operation");
    const copy = copyBytes(record.value);
    try { return await consumer(copy); }
    finally { clearBytes(copy); }
  }

  public async deleteSecret(input: { readonly projectId: string; readonly ref: SecretRef }): Promise<void> {
    this.ensureUnlocked();
    this.ensureProject(input.projectId);
    const parsed = parseSecretRef(input.ref);
    this.ensureProject(parsed.projectId);
    const record = this.records.get(parsed.secretId);
    if (record === undefined) throw new SecretStoreError("SECRET_NOT_FOUND", "The Secret Reference was not found");
    clearBytes(record.value);
    this.records.delete(parsed.secretId);
  }

  public async hasSecret(input: { readonly projectId: string; readonly ref: SecretRef }): Promise<boolean> {
    this.ensureProject(input.projectId);
    const parsed = parseSecretRef(input.ref);
    this.ensureProject(parsed.projectId);
    return this.records.has(parsed.secretId);
  }

  public async getSecretMetadata(input: { readonly projectId: string; readonly ref: SecretRef }): Promise<SecretMetadata> {
    this.ensureProject(input.projectId);
    const parsed = parseSecretRef(input.ref);
    this.ensureProject(parsed.projectId);
    const record = this.records.get(parsed.secretId);
    if (record === undefined) throw new SecretStoreError("SECRET_NOT_FOUND", "The Secret Reference was not found");
    return record.metadata;
  }

  public async listSecretMetadata(input: { readonly projectId: string }): Promise<readonly SecretMetadata[]> {
    this.ensureProject(input.projectId);
    return [...this.records.values()].map((record) => record.metadata).sort((left, right) => left.ref.localeCompare(right.ref, "en"));
  }

  public async rotateSecret(input: { readonly projectId: string; readonly ref: SecretRef }): Promise<SecretMetadata> {
    this.ensureUnlocked();
    const metadata = await this.getSecretMetadata(input);
    const record = this.records.get(metadata.secretId);
    if (record === undefined) throw new SecretStoreError("SECRET_NOT_FOUND", "The Secret Reference was not found");
    record.metadata = { ...record.metadata, updatedAt: this.now(), lastRotatedAt: this.now(), version: record.metadata.version + 1 };
    return record.metadata;
  }

  public async rotateVaultProtection(_input: { readonly newPassphrase: Uint8Array }): Promise<void> {
    this.ensureUnlocked();
  }

  public async exportSecretsEncrypted(_input: { readonly projectId: string; readonly destinationPath: string; readonly passphrase: Uint8Array; readonly confirm: boolean; readonly refs?: readonly SecretRef[] }): Promise<never> {
    throw new SecretStoreError("SECRET_BACKEND_UNSUPPORTED", "Secure Export is unavailable for the test-only Secret Store");
  }

  public async importSecretsEncrypted(_input: { readonly projectId: string; readonly sourcePath: string; readonly passphrase: Uint8Array }): Promise<never> {
    throw new SecretStoreError("SECRET_BACKEND_UNSUPPORTED", "Secure Import is unavailable for the test-only Secret Store");
  }

  public async dispose(): Promise<void> {
    for (const record of this.records.values()) clearBytes(record.value);
    this.records.clear();
    this.unlocked = false;
    this.initialized = false;
  }
}

export function createInMemorySecretStore(options: InMemorySecretStoreOptions): SecretStorePort {
  return new InMemorySecretStore(options);
}
