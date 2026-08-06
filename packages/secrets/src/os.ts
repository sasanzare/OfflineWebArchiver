import { constants } from "node:fs";
import { lstat, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  ENCRYPTION_ENVELOPE_VERSION,
  SecretStoreError,
  type SecretAccessContext,
  type SecretBackendStatus,
  type SecretCreateInput,
  type SecretMetadata,
  type SecretRef,
  type SecretReplaceInput,
  type SecretStoreCapability,
  type SecretStorePort,
} from "@offline-web-archive/archive-core";
import { clearBytes, copyBytes, generateKey } from "./crypto.js";
import { PortableVaultSecretStore, type PortableVaultOptions } from "./vault.js";

const OS_KEY_MAGIC = "OWA-OS-PROTECTED-KEY" as const;
const OS_KEY_VERSION = 1 as const;

export interface SafeStoragePort {
  readonly isEncryptionAvailable: () => boolean | Promise<boolean>;
  readonly getSelectedStorageBackend?: () => string;
  readonly encryptStringAsync: (plaintext: string) => Promise<Uint8Array>;
  readonly decryptStringAsync: (encrypted: Uint8Array) => Promise<{ readonly result: string; readonly shouldReEncrypt: boolean }>;
}

interface ProtectedKeyFile {
  readonly magic: typeof OS_KEY_MAGIC;
  readonly version: typeof OS_KEY_VERSION;
  readonly backend: string;
  readonly protectedKey: string;
}

export interface OsProtectedSecretStoreOptions extends Omit<PortableVaultOptions, "backend"> {
  readonly safeStorage: SafeStoragePort;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeProtectedKey(value: unknown): ProtectedKeyFile {
  if (!isRecord(value) || Object.keys(value).length !== 4 || value["magic"] !== OS_KEY_MAGIC || value["version"] !== OS_KEY_VERSION || typeof value["backend"] !== "string" || typeof value["protectedKey"] !== "string" || !/^[A-Za-z0-9_-]+$/.test(value["protectedKey"])) {
    throw new SecretStoreError("SECRET_TAMPER_DETECTED", "The OS-protected Secret Store key file is invalid");
  }
  return { magic: OS_KEY_MAGIC, version: OS_KEY_VERSION, backend: value["backend"], protectedKey: value["protectedKey"] };
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

async function syncDirectory(directory: string): Promise<void> {
  let handle;
  try {
    handle = await open(directory, constants.O_RDONLY);
    await handle.sync();
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "";
    if (!["EISDIR", "EINVAL", "ENOTSUP", "EPERM", "EACCES"].includes(code)) throw error;
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function atomicWrite(target: string, value: string): Promise<void> {
  const directory = path.dirname(target);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = path.join(directory, `.${path.basename(target)}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(value, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporary, target);
    await syncDirectory(directory);
  } catch {
    await handle?.close().catch(() => undefined);
    await rm(temporary, { force: true }).catch(() => undefined);
    throw new SecretStoreError("SECRET_OPERATION_FAILED", "The OS-protected Secret Store update could not be committed", true);
  }
}

async function backendStatus(safeStorage: SafeStoragePort): Promise<{ readonly state: SecretBackendStatus["state"]; readonly provider: string | null; readonly reasonCode: string | null }> {
  let available = false;
  try { available = await safeStorage.isEncryptionAvailable(); }
  catch { return { state: "unavailable", provider: null, reasonCode: "SECRET_BACKEND_UNAVAILABLE" }; }
  const provider = safeStorage.getSelectedStorageBackend?.() ?? "os-native";
  if (provider === "basic_text") return { state: "insecure_backend_rejected", provider, reasonCode: "SECRET_INSECURE_BACKEND" };
  if (!available) return { state: "unavailable", provider, reasonCode: "SECRET_BACKEND_UNAVAILABLE" };
  if (provider === "unknown") return { state: "degraded", provider, reasonCode: "SECRET_BACKEND_UNSUPPORTED" };
  return { state: "available", provider, reasonCode: null };
}

export async function getOsProtectedBackendStatus(safeStorage: SafeStoragePort): Promise<SecretBackendStatus> {
  const status = await backendStatus(safeStorage);
  return { backend: "os_protected", state: status.state, vaultState: status.state === "available" ? "locked" : "error", initialized: false, locked: true, selectedProvider: status.provider, referenceVersion: 1, vaultFormatVersion: 1, encryptionEnvelopeVersion: ENCRYPTION_ENVELOPE_VERSION, reasonCode: status.reasonCode };
}

export class OsProtectedSecretStore implements SecretStorePort {
  public readonly backend = "os_protected" as const;
  private readonly safeStorage: SafeStoragePort;
  private readonly keyPath: string;
  private readonly delegate: PortableVaultSecretStore;
  private readonly projectId: string;

  public constructor(options: OsProtectedSecretStoreOptions) {
    this.safeStorage = options.safeStorage;
    this.projectId = options.projectId.toLowerCase();
    this.keyPath = path.join(path.resolve(options.projectRoot), "secrets", "os-protected-key.json");
    this.delegate = new PortableVaultSecretStore({ ...options, backend: "os_protected" });
  }

  private async requireAvailable(): Promise<{ readonly provider: string }> {
    const status = await backendStatus(this.safeStorage);
    if (status.state === "insecure_backend_rejected") throw new SecretStoreError("SECRET_INSECURE_BACKEND", "The selected OS Secret Store backend is not secure");
    if (status.state !== "available") throw new SecretStoreError("SECRET_BACKEND_UNAVAILABLE", "The OS Secret Store is unavailable");
    return { provider: status.provider ?? "os-native" };
  }

  private async readProtectedKey(): Promise<Buffer> {
    await this.requireAvailable();
    if (!(await pathExists(this.keyPath))) throw new SecretStoreError("SECRET_STORE_UNINITIALIZED", "The OS-protected Secret Store has not been initialized");
    const stat = await lstat(this.keyPath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new SecretStoreError("SECRET_TAMPER_DETECTED", "The OS-protected Secret Store key file is unsafe");
    let raw: unknown;
    try { raw = JSON.parse((await readFile(this.keyPath)).toString("utf8")); }
    catch { throw new SecretStoreError("SECRET_TAMPER_DETECTED", "The OS-protected Secret Store key file is invalid"); }
    const file = decodeProtectedKey(raw);
    let decrypted: { readonly result: string; readonly shouldReEncrypt: boolean };
    try { decrypted = await this.safeStorage.decryptStringAsync(Buffer.from(file.protectedKey, "base64url")); }
    catch { throw new SecretStoreError("SECRET_BACKEND_UNAVAILABLE", "The OS Secret Store could not decrypt its protected key"); }
    if (decrypted.shouldReEncrypt) {
      const refreshed = await this.safeStorage.encryptStringAsync(decrypted.result);
      await atomicWrite(this.keyPath, `${JSON.stringify({ ...file, protectedKey: Buffer.from(refreshed).toString("base64url") })}\n`);
    }
    const key = Buffer.from(decrypted.result, "base64url");
    if (key.byteLength !== 32) { clearBytes(key); throw new SecretStoreError("SECRET_TAMPER_DETECTED", "The OS-protected key has an invalid size"); }
    return key;
  }

  public async initialize(_input: { readonly passphrase: Uint8Array }): Promise<void> {
    const status = await this.requireAvailable();
    if (await pathExists(this.keyPath)) throw new SecretStoreError("SECRET_ALREADY_EXISTS", "The OS-protected Secret Store is already initialized");
    const key = generateKey();
    try {
      const protectedKey = await this.safeStorage.encryptStringAsync(key.toString("base64url"));
      await atomicWrite(this.keyPath, `${JSON.stringify({ magic: OS_KEY_MAGIC, version: OS_KEY_VERSION, backend: status.provider, protectedKey: Buffer.from(protectedKey).toString("base64url") })}\n`);
      try {
        await this.delegate.initialize({ passphrase: key });
      } catch (error) {
        await rm(this.keyPath, { force: true }).catch(() => undefined);
        throw error;
      }
    } finally {
      clearBytes(key);
    }
  }

  public async unlock(_input: { readonly passphrase: Uint8Array }): Promise<void> {
    const key = await this.readProtectedKey();
    try { await this.delegate.unlock({ passphrase: key }); }
    finally { clearBytes(key); }
  }

  public async lock(): Promise<void> { await this.delegate.lock(); }

  public async getBackendStatus(): Promise<SecretBackendStatus> {
    const status = await backendStatus(this.safeStorage);
    if (status.state !== "available") return { backend: "os_protected", state: status.state, vaultState: "error", initialized: false, locked: true, selectedProvider: status.provider, referenceVersion: 1, vaultFormatVersion: 1, encryptionEnvelopeVersion: ENCRYPTION_ENVELOPE_VERSION, reasonCode: status.reasonCode };
    const delegate = await this.delegate.getBackendStatus();
    return { ...delegate, backend: "os_protected", selectedProvider: status.provider };
  }

  public async getCapability(): Promise<SecretStoreCapability> {
    const status = await this.getBackendStatus();
    const available = status.state === "available";
    return { capabilityVersion: 1, backend: "os_protected", state: status.state, canCreate: available && !status.locked, canResolve: available && !status.locked, canSecureExport: available && !status.locked, supportsLock: true, supportsRotation: false };
  }

  public async createSecret(input: SecretCreateInput): Promise<SecretMetadata> { this.ensureProject(input.projectId); return this.delegate.createSecret(input); }
  public async replaceSecret(input: SecretReplaceInput): Promise<SecretMetadata> { this.ensureProject(input.projectId); return this.delegate.replaceSecret(input); }
  public async withSecret<T>(context: SecretAccessContext, ref: SecretRef, consumer: (secretBytes: Uint8Array) => Promise<T>): Promise<T> { this.ensureProject(context.projectId); return this.delegate.withSecret(context, ref, consumer); }
  public async deleteSecret(input: { readonly projectId: string; readonly ref: SecretRef }): Promise<void> { this.ensureProject(input.projectId); return this.delegate.deleteSecret(input); }
  public async hasSecret(input: { readonly projectId: string; readonly ref: SecretRef }): Promise<boolean> { this.ensureProject(input.projectId); return this.delegate.hasSecret(input); }
  public async getSecretMetadata(input: { readonly projectId: string; readonly ref: SecretRef }): Promise<SecretMetadata> { this.ensureProject(input.projectId); return this.delegate.getSecretMetadata(input); }
  public async listSecretMetadata(input: { readonly projectId: string }): Promise<readonly SecretMetadata[]> { this.ensureProject(input.projectId); return this.delegate.listSecretMetadata(input); }
  public async rotateSecret(input: { readonly projectId: string; readonly ref: SecretRef }): Promise<SecretMetadata> { this.ensureProject(input.projectId); return this.delegate.rotateSecret(input); }
  public async rotateVaultProtection(_input: { readonly newPassphrase: Uint8Array }): Promise<void> { throw new SecretStoreError("SECRET_BACKEND_UNSUPPORTED", "OS wrapping-key refresh is managed by the operating-system provider"); }
  public async exportSecretsEncrypted(input: { readonly projectId: string; readonly destinationPath: string; readonly passphrase: Uint8Array; readonly confirm: boolean; readonly refs?: readonly SecretRef[] }): Promise<{ readonly destinationPath: string; readonly secretCount: number; readonly formatVersion: 1 }> { this.ensureProject(input.projectId); return this.delegate.exportSecretsEncrypted(input); }
  public async importSecretsEncrypted(input: { readonly projectId: string; readonly sourcePath: string; readonly passphrase: Uint8Array }): Promise<{ readonly importedCount: number; readonly formatVersion: 1 }> { this.ensureProject(input.projectId); return this.delegate.importSecretsEncrypted(input); }
  public async dispose(): Promise<void> { await this.delegate.dispose(); }

  private ensureProject(projectId: string): void {
    if (projectId.toLowerCase() !== this.projectId) throw new SecretStoreError("SECRET_REFERENCE_PROJECT_MISMATCH", "The Secret Reference belongs to another Project");
  }
}

export function createOsProtectedSecretStore(options: OsProtectedSecretStoreOptions): SecretStorePort {
  return new OsProtectedSecretStore(options);
}
