import { constants } from "node:fs";
import { lstat, mkdir, open, readFile, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  ENCRYPTION_ENVELOPE_VERSION,
  SecretStoreError,
  assertSecretAccessAllowed,
  assertValidSecretPurpose,
  assertValidProjectId,
  assertValidSecretKind,
  assertValidSecretLabel,
  assertValidSecretScope,
  createSecretId,
  parseSecretRef,
  serializeSecretRef,
  type SecretAccessContext,
  type SecretBackend,
  type SecretBackendStatus,
  type SecretCreateInput,
  type SecretAuditEvent,
  type SecretAuditSink,
  type SecretMetadata,
  type SecretRef,
  type SecretReplaceInput,
  type SecretScope,
  type SecretStoreCapability,
  type SecretStorePort,
  type VaultState,
} from "@offline-web-archive/archive-core";
import {
  AES_GCM_ALGORITHM,
  MAX_SECURE_EXPORT_BYTES,
  MAX_SECRET_BYTES,
  MAX_VAULT_BYTES,
  MAX_VAULT_RECORDS,
  PRODUCTION_KDF_PROFILE,
  TEST_KDF_PROFILE,
  AuthenticationFailure,
  canonicalJson,
  clearBytes,
  copyBytes,
  createKdfParameters,
  decryptAead,
  deriveKey,
  deserializeEnvelope,
  encryptAead,
  envelopeAad,
  generateKey,
  serializeEnvelope,
  validateKdfParameters,
  validatePassphrase,
  validateSecretBytes,
  type AeadEnvelope,
  type KdfParameters,
  type SerializedAeadEnvelope,
} from "./crypto.js";

const VAULT_MAGIC = "OWA-PORTABLE-VAULT" as const;
const SECURE_EXPORT_MAGIC = "OWA-SECURE-SECRET-EXPORT" as const;
const VAULT_DIRECTORY = "secrets";
const PORTABLE_VAULT_FILE = "portable-vault.json";
const OS_VAULT_FILE = "os-vault.json";
const VAULT_LOCK_FILE = ".vault.lock";
const VAULT_STAGE_PREFIX = ".portable-vault";
const VAULT_LOCK_STALE_AFTER_MS = 5 * 60 * 1000;

type MutableBuffer = Buffer & { readonly __mutableBuffer?: true };

interface MetadataDisk {
  readonly ref: string;
  readonly secretId: string;
  readonly projectId: string;
  readonly scope: SecretScope;
  readonly kind: SecretMetadata["kind"];
  readonly backend: SecretBackend;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastRotatedAt: string | null;
  readonly version: number;
  readonly lifecycleState: SecretMetadata["lifecycleState"];
  readonly displayLabel: string | null;
  readonly secureExportPolicy: SecretMetadata["secureExportPolicy"];
  readonly encryptionEnvelopeVersion: typeof ENCRYPTION_ENVELOPE_VERSION;
  readonly keySlotId: string;
  readonly migrationState: SecretMetadata["migrationState"];
}

interface VaultRecordDisk {
  readonly metadata: MetadataDisk;
  readonly wrappedDek: SerializedAeadEnvelope;
  readonly envelope: SerializedAeadEnvelope;
}

interface VaultDisk {
  readonly magic: typeof VAULT_MAGIC;
  readonly formatVersion: 1;
  readonly vaultId: string;
  readonly projectId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly generation: number;
  readonly kdf: {
    readonly name: "scrypt";
    readonly version: 1;
    readonly salt: string;
    readonly N: number;
    readonly r: number;
    readonly p: number;
    readonly maxmem: number;
  };
  readonly keyWrap: SerializedAeadEnvelope;
  readonly records: readonly VaultRecordDisk[];
}

interface SecureExportRecord {
  readonly metadata: MetadataDisk;
  readonly value: string;
}

interface SecureExportDisk {
  readonly magic: typeof SECURE_EXPORT_MAGIC;
  readonly formatVersion: 1;
  readonly exportId: string;
  readonly projectId: string;
  readonly createdAt: string;
  readonly kdf: VaultDisk["kdf"];
  readonly envelope: SerializedAeadEnvelope;
}

interface SecureExportPayload {
  readonly payloadVersion: 1;
  readonly projectId: string;
  readonly records: readonly SecureExportRecord[];
}

export interface PortableVaultOptions {
  readonly projectRoot: string;
  readonly projectId: string;
  readonly now?: () => string;
  readonly id?: () => string;
  readonly testMode?: boolean;
  readonly inactivityTimeoutMs?: number;
  readonly backend?: "portable_vault" | "os_protected";
  readonly audit?: SecretAuditSink;
}

export interface VaultFaultInjection {
  readonly beforePromote?: () => void | Promise<void>;
}

const inProcessLocks = new Set<string>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNoPrototypeKeys(value: Record<string, unknown>): void {
  if (Object.keys(value).some((key) => key === "__proto__" || key === "constructor" || key === "prototype")) {
    throw new SecretStoreError("SECRET_FORMAT_UNSUPPORTED", "The encrypted store contains an unsafe object key");
  }
}

function assertExactKeys(value: Record<string, unknown>, expected: readonly string[]): void {
  assertNoPrototypeKeys(value);
  const expectedSet = new Set(expected);
  const actual = Object.keys(value);
  if (actual.length !== expected.length || actual.some((key) => !expectedSet.has(key))) {
    throw new SecretStoreError("SECRET_FORMAT_UNSUPPORTED", "The encrypted store contains unsupported fields");
  }
}

function decodeBase64(value: unknown, expectedBytes: number, field: string): Buffer {
  if (typeof value !== "string" || value.length === 0 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new SecretStoreError("SECRET_FORMAT_UNSUPPORTED", `The encrypted store ${field} encoding is invalid`);
  }
  const decoded = Buffer.from(value, "base64url");
  if (decoded.byteLength !== expectedBytes) throw new SecretStoreError("SECRET_FORMAT_UNSUPPORTED", `The encrypted store ${field} size is invalid`);
  return decoded;
}

function encodeKdf(kdf: KdfParameters): VaultDisk["kdf"] {
  return { name: kdf.name, version: kdf.version, salt: kdf.salt.toString("base64url"), N: kdf.N, r: kdf.r, p: kdf.p, maxmem: kdf.maxmem };
}

function decodeKdf(value: unknown): KdfParameters {
  if (!isRecord(value)) throw new SecretStoreError("SECRET_KDF_INVALID", "The Vault key-derivation configuration is invalid");
  assertExactKeys(value, ["name", "version", "salt", "N", "r", "p", "maxmem"]);
  const salt = decodeBase64(value["salt"], 16, "KDF salt");
  return validateKdfParameters({ name: value["name"], version: value["version"], salt, N: value["N"], r: value["r"], p: value["p"], maxmem: value["maxmem"] });
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && !Number.isNaN(Date.parse(value));
}

function metadataToDisk(metadata: SecretMetadata): MetadataDisk {
  return {
    ref: metadata.ref,
    secretId: metadata.secretId,
    projectId: metadata.projectId,
    scope: metadata.scope,
    kind: metadata.kind,
    backend: metadata.backend,
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
    lastRotatedAt: metadata.lastRotatedAt,
    version: metadata.version,
    lifecycleState: metadata.lifecycleState,
    displayLabel: metadata.displayLabel,
    secureExportPolicy: metadata.secureExportPolicy,
    encryptionEnvelopeVersion: metadata.encryptionEnvelopeVersion,
    keySlotId: metadata.keySlotId,
    migrationState: metadata.migrationState,
  };
}

function metadataFromDisk(value: unknown, projectId: string, backend: SecretBackend, expectedSourceBackend: SecretBackend | null = backend): SecretMetadata {
  if (!isRecord(value)) throw new SecretStoreError("SECRET_METADATA_INVALID", "Secret metadata is invalid");
  assertExactKeys(value, ["ref", "secretId", "projectId", "scope", "kind", "backend", "createdAt", "updatedAt", "lastRotatedAt", "version", "lifecycleState", "displayLabel", "secureExportPolicy", "encryptionEnvelopeVersion", "keySlotId", "migrationState"]);
  if (typeof value["ref"] !== "string" || typeof value["secretId"] !== "string" || typeof value["projectId"] !== "string" || typeof value["createdAt"] !== "string" || typeof value["updatedAt"] !== "string" || (value["lastRotatedAt"] !== null && typeof value["lastRotatedAt"] !== "string") || typeof value["version"] !== "number" || (value["displayLabel"] !== null && typeof value["displayLabel"] !== "string") || (value["secureExportPolicy"] !== "allowed" && value["secureExportPolicy"] !== "forbidden") || (value["lifecycleState"] !== "active" && value["lifecycleState"] !== "rotation_required" && value["lifecycleState"] !== "disabled" && value["lifecycleState"] !== "deleted" && value["lifecycleState"] !== "migration_required") || value["encryptionEnvelopeVersion"] !== ENCRYPTION_ENVELOPE_VERSION || typeof value["keySlotId"] !== "string" || (value["migrationState"] !== "current" && value["migrationState"] !== "migration_required")) {
    throw new SecretStoreError("SECRET_METADATA_INVALID", "Secret metadata contains an invalid field");
  }
  const parsed = parseSecretRef(value["ref"]);
  if (parsed.projectId !== projectId || parsed.secretId !== value["secretId"].toLowerCase() || value["projectId"].toLowerCase() !== projectId || !isTimestamp(value["createdAt"]) || !isTimestamp(value["updatedAt"]) || (value["lastRotatedAt"] !== null && !isTimestamp(value["lastRotatedAt"])) || !Number.isInteger(value["version"]) || value["version"] < 1 || value["version"] > 1_000_000) {
    throw new SecretStoreError("SECRET_METADATA_INVALID", "Secret metadata identity or timestamp is invalid");
  }
  assertValidSecretKind(value["kind"]);
  if (!("portable_vault" === value["backend"] || "os_protected" === value["backend"] || "memory_test" === value["backend"])) throw new SecretStoreError("SECRET_METADATA_INVALID", "Secret metadata backend is invalid");
  if (expectedSourceBackend !== null && value["backend"] !== expectedSourceBackend) throw new SecretStoreError("SECRET_METADATA_INVALID", "Secret metadata backend does not match the store");
  if (!isRecord(value["scope"])) throw new SecretStoreError("SECRET_SCOPE_INVALID", "Secret scope is invalid");
  const scope = value["scope"] as unknown as SecretScope;
  assertValidSecretScope(scope);
  if (scope.projectId.toLowerCase() !== projectId) throw new SecretStoreError("SECRET_SCOPE_INVALID", "Secret scope crosses Project isolation");
  assertValidSecretLabel(value["displayLabel"]);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value["keySlotId"])) throw new SecretStoreError("SECRET_METADATA_INVALID", "Secret key slot is invalid");
  return {
    ref: parsed.serialized,
    secretId: createSecretId(value["secretId"]),
    projectId,
    scope,
    kind: value["kind"],
    backend,
    createdAt: value["createdAt"],
    updatedAt: value["updatedAt"],
    lastRotatedAt: value["lastRotatedAt"],
    version: value["version"],
    lifecycleState: value["lifecycleState"],
    displayLabel: value["displayLabel"],
    secureExportPolicy: value["secureExportPolicy"],
    encryptionEnvelopeVersion: ENCRYPTION_ENVELOPE_VERSION,
    keySlotId: value["keySlotId"],
    migrationState: value["migrationState"],
  };
}

function wrapKey(masterKey: Uint8Array, kek: Uint8Array, metadata: { readonly vaultId: string; readonly projectId: string; readonly kdf: VaultDisk["kdf"] }): SerializedAeadEnvelope {
  return serializeEnvelope(encryptAead(masterKey, kek, envelopeAad("owa-vault-key-wrap-v1", metadata)));
}

function unwrapKey(envelope: SerializedAeadEnvelope, kek: Uint8Array, metadata: { readonly vaultId: string; readonly projectId: string; readonly kdf: VaultDisk["kdf"] }): Buffer {
  try {
    const masterKey = decryptAead(deserializeEnvelope(envelope, AES_GCM_ALGORITHM.length * 1024), kek, envelopeAad("owa-vault-key-wrap-v1", metadata));
    if (masterKey.byteLength !== 32) throw new AuthenticationFailure();
    return masterKey;
  } catch (error) {
    if (error instanceof AuthenticationFailure) throw error;
    throw new AuthenticationFailure();
  }
}

function recordWrapAad(metadata: SecretMetadata): Buffer {
  return envelopeAad("owa-secret-dek-v1", { ref: metadata.ref, projectId: metadata.projectId, keySlotId: metadata.keySlotId, version: metadata.version });
}

function recordPayloadAad(metadata: SecretMetadata): Buffer {
  return envelopeAad("owa-secret-payload-v1", metadataToDisk(metadata));
}

function encryptRecord(metadata: SecretMetadata, value: Uint8Array, masterKey: Uint8Array): VaultRecordDisk {
  validateSecretBytes(value);
  const dek = generateKey();
  try {
    const wrappedDek = serializeEnvelope(encryptAead(dek, masterKey, recordWrapAad(metadata)));
    const envelope = serializeEnvelope(encryptAead(value, dek, recordPayloadAad(metadata)));
    return { metadata: metadataToDisk(metadata), wrappedDek, envelope };
  } finally {
    clearBytes(dek);
  }
}

function decryptRecord(record: VaultRecordDisk, metadata: SecretMetadata, masterKey: Uint8Array): Buffer {
  let dek: Buffer | null = null;
  try {
    dek = decryptAead(deserializeEnvelope(record.wrappedDek, 256), masterKey, recordWrapAad(metadata));
    if (dek.byteLength !== 32) throw new AuthenticationFailure();
    const value = decryptAead(deserializeEnvelope(record.envelope, MAX_SECRET_BYTES), dek, recordPayloadAad(metadata));
    if (value.byteLength === 0 || value.byteLength > MAX_SECRET_BYTES) throw new AuthenticationFailure();
    return value;
  } finally {
    clearBytes(dek);
  }
}

function vaultAad(disk: Pick<VaultDisk, "vaultId" | "projectId" | "kdf">): Buffer {
  return envelopeAad("owa-vault-key-wrap-v1", { vaultId: disk.vaultId, projectId: disk.projectId, kdf: disk.kdf });
}

function decodeVault(value: unknown, projectId: string, backend: SecretBackend): VaultDisk {
  if (!isRecord(value)) throw new SecretStoreError("SECRET_FORMAT_UNSUPPORTED", "The Vault file is not an object");
  assertExactKeys(value, ["magic", "formatVersion", "vaultId", "projectId", "createdAt", "updatedAt", "generation", "kdf", "keyWrap", "records"]);
  if (value["magic"] !== VAULT_MAGIC || value["formatVersion"] !== 1 || typeof value["vaultId"] !== "string" || typeof value["projectId"] !== "string" || typeof value["createdAt"] !== "string" || typeof value["updatedAt"] !== "string" || typeof value["generation"] !== "number" || !Array.isArray(value["records"])) {
    throw new SecretStoreError("SECRET_FORMAT_UNSUPPORTED", "The Vault header is invalid");
  }
  assertValidProjectId(projectId);
  if (value["projectId"].toLowerCase() !== projectId || !/^[0-9a-f-]{36}$/i.test(value["vaultId"]) || !isTimestamp(value["createdAt"]) || !isTimestamp(value["updatedAt"]) || !Number.isInteger(value["generation"]) || value["generation"] < 0 || value["generation"] > Number.MAX_SAFE_INTEGER) {
    throw new SecretStoreError("SECRET_FORMAT_UNSUPPORTED", "The Vault identity or generation is invalid");
  }
  const kdf = decodeKdf(value["kdf"]);
  const keyWrap = deserializeEnvelope(value["keyWrap"], 256);
  const rawRecords = value["records"];
  if (rawRecords.length > MAX_VAULT_RECORDS) throw new SecretStoreError("SECRET_VALUE_TOO_LARGE", "The Vault has too many records");
  const records: VaultRecordDisk[] = [];
  const ids = new Set<string>();
  const nonces = new Set<string>();
  const addNonce = (envelope: SerializedAeadEnvelope): void => {
    if (nonces.has(envelope.nonce)) throw new SecretStoreError("SECRET_TAMPER_DETECTED", "The Vault contains a duplicate encryption nonce");
    nonces.add(envelope.nonce);
  };
  addNonce(serializeEnvelope(keyWrap));
  for (const rawRecord of rawRecords) {
    if (!isRecord(rawRecord)) throw new SecretStoreError("SECRET_FORMAT_UNSUPPORTED", "The Vault record is invalid");
    assertExactKeys(rawRecord, ["metadata", "wrappedDek", "envelope"]);
    const metadata = metadataFromDisk(rawRecord["metadata"], projectId, backend);
    if (ids.has(metadata.secretId)) throw new SecretStoreError("SECRET_FORMAT_UNSUPPORTED", "The Vault contains duplicate Secret identifiers");
    ids.add(metadata.secretId);
    const wrappedDek = rawRecord["wrappedDek"] as SerializedAeadEnvelope;
    const envelope = rawRecord["envelope"] as SerializedAeadEnvelope;
    const parsedWrapped = deserializeEnvelope(wrappedDek, 256);
    const parsedEnvelope = deserializeEnvelope(envelope, MAX_SECRET_BYTES);
    addNonce(serializeEnvelope(parsedWrapped));
    addNonce(serializeEnvelope(parsedEnvelope));
    records.push({ metadata: metadataToDisk(metadata), wrappedDek: serializeEnvelope(parsedWrapped), envelope: serializeEnvelope(parsedEnvelope) });
  }
  return {
    magic: VAULT_MAGIC,
    formatVersion: 1,
    vaultId: value["vaultId"].toLowerCase(),
    projectId,
    createdAt: value["createdAt"],
    updatedAt: value["updatedAt"],
    generation: value["generation"],
    kdf: encodeKdf(kdf),
    keyWrap: serializeEnvelope(keyWrap),
    records,
  };
}

function decodeSecureExport(value: unknown, projectId: string): SecureExportDisk {
  if (!isRecord(value)) throw new SecretStoreError("SECRET_IMPORT_FAILED", "The Secure Export format is invalid");
  assertExactKeys(value, ["magic", "formatVersion", "exportId", "projectId", "createdAt", "kdf", "envelope"]);
  if (value["magic"] !== SECURE_EXPORT_MAGIC || value["formatVersion"] !== 1 || typeof value["exportId"] !== "string" || typeof value["projectId"] !== "string" || typeof value["createdAt"] !== "string") throw new SecretStoreError("SECRET_IMPORT_FAILED", "The Secure Export header is invalid");
  if (value["projectId"].toLowerCase() !== projectId || !isTimestamp(value["createdAt"])) throw new SecretStoreError("SECRET_IMPORT_FAILED", "The Secure Export Project identity is invalid");
  const kdf = decodeKdf(value["kdf"]);
  if (kdf.N !== PRODUCTION_KDF_PROFILE.N || kdf.r !== PRODUCTION_KDF_PROFILE.r || kdf.p !== PRODUCTION_KDF_PROFILE.p || kdf.maxmem !== PRODUCTION_KDF_PROFILE.maxmem) throw new SecretStoreError("SECRET_KDF_INVALID", "The Secure Export KDF profile is not production-strength");
  const envelope = deserializeEnvelope(value["envelope"], MAX_SECURE_EXPORT_BYTES);
  return { magic: SECURE_EXPORT_MAGIC, formatVersion: 1, exportId: value["exportId"], projectId, createdAt: value["createdAt"], kdf: encodeKdf(kdf), envelope: serializeEnvelope(envelope) };
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

async function assertRegularFile(target: string): Promise<void> {
  const stat = await lstat(target);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new SecretStoreError("SECRET_TAMPER_DETECTED", "The Secret Store file is not a regular file");
}

async function assertVaultDirectory(target: string): Promise<boolean> {
  try {
    const stat = await lstat(target);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new SecretStoreError("SECRET_TAMPER_DETECTED", "The Secret Store directory is not a safe directory");
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

async function ensureVaultDirectory(directory: string): Promise<void> {
  const parent = path.dirname(directory);
  if (!(await assertVaultDirectory(parent))) throw new SecretStoreError("SECRET_OPERATION_FAILED", "The Secret Store project directory is unavailable");
  try {
    await mkdir(directory, { recursive: false, mode: 0o700 });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) {
      throw new SecretStoreError("SECRET_OPERATION_FAILED", "The Secret Store directory could not be created", true);
    }
  }
  if (!(await assertVaultDirectory(directory))) throw new SecretStoreError("SECRET_OPERATION_FAILED", "The Secret Store directory could not be created", true);
}

async function ensureSafeDirectoryTree(directory: string): Promise<void> {
  const missing: string[] = [];
  let current = path.resolve(directory);
  while (!(await assertVaultDirectory(current))) {
    missing.push(current);
    const parent = path.dirname(current);
    if (parent === current) throw new SecretStoreError("SECRET_OPERATION_FAILED", "The destination directory is unavailable");
    current = parent;
  }
  for (const child of missing.reverse()) {
    try {
      await mkdir(child, { recursive: false, mode: 0o700 });
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) {
        throw new SecretStoreError("SECRET_OPERATION_FAILED", "The destination directory could not be created", true);
      }
    }
    if (!(await assertVaultDirectory(child))) throw new SecretStoreError("SECRET_OPERATION_FAILED", "The destination directory could not be created", true);
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

async function atomicWriteJson(target: string, value: unknown, fault?: VaultFaultInjection): Promise<void> {
  const directory = path.dirname(target);
  await ensureSafeDirectoryTree(directory);
  if (await pathExists(target)) await assertRegularFile(target);
  const temporary = path.join(directory, `.${path.basename(target)}.${randomUUID()}.tmp`);
  let handle;
  try {
    const bytes = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
    if (bytes.byteLength > MAX_SECURE_EXPORT_BYTES) throw new SecretStoreError("SECRET_VALUE_TOO_LARGE", "The encrypted Secret Store file is too large");
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await fault?.beforePromote?.();
    await rename(temporary, target);
    await syncDirectory(directory);
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await rm(temporary, { force: true }).catch(() => undefined);
    if (error instanceof SecretStoreError) throw error;
    throw new SecretStoreError("SECRET_OPERATION_FAILED", "The encrypted Secret Store update could not be committed", true);
  }
}

async function acquireVaultLock(lockPath: string): Promise<() => Promise<void>> {
  await ensureVaultDirectory(path.dirname(lockPath));
  if (inProcessLocks.has(lockPath)) throw new SecretStoreError("SECRET_STORE_BUSY", "The encrypted Secret Store is busy", true);
  inProcessLocks.add(lockPath);
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const handle = await open(lockPath, "wx", 0o600);
        await handle.writeFile(`${process.pid}:${Date.now()}\n`, "utf8");
        await handle.sync();
        await handle.close();
        return async () => {
          inProcessLocks.delete(lockPath);
          await rm(lockPath, { force: true }).catch(() => undefined);
        };
      } catch (error) {
        const code = error instanceof Error && "code" in error ? String(error.code) : "";
        if (code !== "EEXIST" || attempt !== 0) throw error;
        try {
          const stat = await lstat(lockPath);
          if (stat.isFile() && !stat.isSymbolicLink() && Date.now() - stat.mtimeMs > VAULT_LOCK_STALE_AFTER_MS) {
            await rm(lockPath, { force: true });
            continue;
          }
        } catch (staleCheckError) {
          const staleCode = staleCheckError instanceof Error && "code" in staleCheckError ? String(staleCheckError.code) : "";
          if (staleCode === "ENOENT") continue;
        }
        throw new SecretStoreError("SECRET_STORE_BUSY", "The encrypted Secret Store is busy", true);
      }
    }
  } catch (error) {
    inProcessLocks.delete(lockPath);
    if (error instanceof SecretStoreError) throw error;
    throw new SecretStoreError("SECRET_STORE_BUSY", "The encrypted Secret Store is busy", true);
  }
  inProcessLocks.delete(lockPath);
  throw new SecretStoreError("SECRET_STORE_BUSY", "The encrypted Secret Store is busy", true);
}

async function cleanupStaging(directory: string): Promise<void> {
  if (!(await pathExists(directory))) return;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.name.startsWith(VAULT_STAGE_PREFIX) || !entry.name.endsWith(".tmp")) continue;
    const target = path.join(directory, entry.name);
    const stat = await lstat(target);
    if (stat.isFile() && !stat.isSymbolicLink()) await rm(target, { force: true });
  }
}

export class PortableVaultSecretStore implements SecretStorePort {
  public readonly backend: "portable_vault" | "os_protected";
  private readonly projectRoot: string;
  private readonly projectId: string;
  private readonly now: () => string;
  private readonly id: () => string;
  private readonly testMode: boolean;
  private readonly inactivityTimeoutMs: number;
  private readonly audit: SecretAuditSink | undefined;
  private readonly vaultPath: string;
  private readonly lockPath: string;
  private masterKey: Buffer | null = null;
  private state: VaultState = "uninitialized";
  private generation = 0;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private failedUnlockAttempts: readonly number[] = [];

  public constructor(options: PortableVaultOptions) {
    assertValidProjectId(options.projectId);
    this.projectRoot = path.resolve(options.projectRoot);
    this.projectId = options.projectId.toLowerCase();
    this.now = options.now ?? (() => new Date().toISOString());
    this.id = options.id ?? randomUUID;
    this.testMode = options.testMode ?? false;
    this.inactivityTimeoutMs = options.inactivityTimeoutMs ?? 15 * 60 * 1000;
    if (!Number.isInteger(this.inactivityTimeoutMs) || this.inactivityTimeoutMs < 60_000 || this.inactivityTimeoutMs > 24 * 60 * 60 * 1000) throw new SecretStoreError("SECRET_OPERATION_FAILED", "The Vault inactivity timeout is outside the allowed range");
    this.backend = options.backend ?? "portable_vault";
    this.audit = options.audit;
    this.vaultPath = path.join(this.projectRoot, VAULT_DIRECTORY, this.backend === "portable_vault" ? PORTABLE_VAULT_FILE : OS_VAULT_FILE);
    this.lockPath = path.join(path.dirname(this.vaultPath), VAULT_LOCK_FILE);
  }

  private capability(state: SecretBackendStatus["state"]): SecretStoreCapability {
    const active = state === "available";
    return {
      capabilityVersion: 1,
      backend: this.backend,
      state,
      canCreate: active && this.state === "unlocked",
      canResolve: active && this.state === "unlocked",
      canSecureExport: active && this.state === "unlocked",
      supportsLock: true,
      supportsRotation: active && this.state === "unlocked",
    };
  }

  private async readDisk(): Promise<VaultDisk | null> {
    const directory = path.dirname(this.vaultPath);
    if (!(await assertVaultDirectory(path.dirname(directory))) || !(await assertVaultDirectory(directory))) return null;
    await cleanupStaging(directory);
    if (!(await pathExists(this.vaultPath))) return null;
    await assertRegularFile(this.vaultPath);
    const stat = await lstat(this.vaultPath);
    if (stat.size > MAX_VAULT_BYTES) throw new SecretStoreError("SECRET_VALUE_TOO_LARGE", "The Vault file exceeds the safe size limit");
    const bytes = await readFile(this.vaultPath);
    if (bytes.byteLength > MAX_VAULT_BYTES) throw new SecretStoreError("SECRET_VALUE_TOO_LARGE", "The Vault file exceeds the safe size limit");
    let value: unknown;
    try {
      value = JSON.parse(bytes.toString("utf8"));
    } catch {
      throw new SecretStoreError("SECRET_TAMPER_DETECTED", "The Vault file is not valid encrypted data");
    }
    return decodeVault(value, this.projectId, this.backend);
  }

  private requireMasterKey(): Buffer {
    if (this.state === "uninitialized") throw new SecretStoreError("SECRET_STORE_UNINITIALIZED", "The Secret Store has not been initialized");
    if (this.state !== "unlocked" || this.masterKey === null) throw new SecretStoreError("SECRET_STORE_LOCKED", "Unlock the Secret Store before using Secret data");
    return this.masterKey;
  }

  private ensureProject(projectId: string): void {
    if (projectId.toLowerCase() !== this.projectId) throw new SecretStoreError("SECRET_REFERENCE_PROJECT_MISMATCH", "The Secret Reference belongs to another Project");
  }

  private touch(): void {
    if (this.inactivityTimer !== null) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => {
      void this.lock();
    }, this.inactivityTimeoutMs);
    if (typeof this.inactivityTimer === "object" && "unref" in this.inactivityTimer) this.inactivityTimer.unref();
  }

  private clearMaster(): void {
    clearBytes(this.masterKey);
    this.masterKey = null;
    this.generation = 0;
    if (this.inactivityTimer !== null) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = null;
  }

  private emitAudit(eventType: SecretAuditEvent["eventType"], input: Partial<Omit<SecretAuditEvent, "timestamp" | "eventType" | "backend">> = {}): void {
    const event: SecretAuditEvent = {
      timestamp: this.now(),
      eventType,
      projectId: input.projectId === undefined ? this.projectId : input.projectId,
      secretId: input.secretId ?? null,
      kind: input.kind ?? null,
      purpose: input.purpose ?? null,
      backend: this.backend,
      result: input.result ?? "success",
      errorCategory: input.errorCategory ?? null,
    };
    try {
      const pending = this.audit?.(event);
      void Promise.resolve(pending).catch(() => undefined);
    } catch {
      // Audit sinks are observational and must never change Secret Store behavior.
    }
  }

  private recordFromDisk(disk: VaultDisk, ref: SecretRef): { readonly record: VaultRecordDisk; readonly metadata: SecretMetadata } {
    const parsed = parseSecretRef(ref);
    this.ensureProject(parsed.projectId);
    const record = disk.records.find((candidate) => candidate.metadata.secretId === parsed.secretId);
    if (record === undefined) throw new SecretStoreError("SECRET_NOT_FOUND", "The Secret Reference was not found");
    const metadata = metadataFromDisk(record.metadata, this.projectId, this.backend);
    return { record, metadata };
  }

  private async mutateRecords(mutator: (disk: VaultDisk, masterKey: Buffer) => VaultDisk): Promise<void> {
    const masterKey = this.requireMasterKey();
    const release = await acquireVaultLock(this.lockPath);
    try {
      const disk = await this.readDisk();
      if (disk === null) throw new SecretStoreError("SECRET_STORE_UNINITIALIZED", "The Secret Store has not been initialized");
      if (disk.generation !== this.generation) throw new SecretStoreError("SECRET_STORE_BUSY", "The encrypted Secret Store changed while it was unlocked", true);
      const next = mutator(disk, masterKey);
      if (next.generation <= disk.generation) throw new SecretStoreError("SECRET_OPERATION_FAILED", "The encrypted Secret Store generation did not advance");
      await atomicWriteJson(this.vaultPath, next);
      const verified = await this.readDisk();
      if (verified === null || verified.generation !== next.generation) throw new SecretStoreError("SECRET_TAMPER_DETECTED", "The updated Vault could not be verified");
      this.generation = verified.generation;
      this.touch();
    } finally {
      await release();
    }
  }

  public async initialize(input: { readonly passphrase: Uint8Array }): Promise<void> {
    validatePassphrase(input.passphrase);
    const release = await acquireVaultLock(this.lockPath);
    try {
      const existing = await this.readDisk();
      if (existing !== null) throw new SecretStoreError("SECRET_ALREADY_EXISTS", "The Secret Store is already initialized");
      const passphrase = copyBytes(input.passphrase);
      const masterKey = generateKey();
      try {
        const kdf = createKdfParameters(this.testMode ? TEST_KDF_PROFILE : PRODUCTION_KDF_PROFILE);
        const kek = deriveKey(passphrase, kdf);
        try {
          const vaultId = this.id();
          const kdfDisk = encodeKdf(kdf);
          const disk: VaultDisk = {
            magic: VAULT_MAGIC,
            formatVersion: 1,
            vaultId,
            projectId: this.projectId,
            createdAt: this.now(),
            updatedAt: this.now(),
            generation: 0,
            kdf: kdfDisk,
            keyWrap: serializeEnvelope(encryptAead(masterKey, kek, vaultAad({ vaultId, projectId: this.projectId, kdf: kdfDisk }))),
            records: [],
          };
          await atomicWriteJson(this.vaultPath, disk);
          const verified = await this.readDisk();
          if (verified === null) throw new SecretStoreError("SECRET_OPERATION_FAILED", "The initialized Vault could not be verified");
          this.state = "locked";
          this.generation = verified.generation;
          this.emitAudit("vault_initialized");
        } finally {
          clearBytes(kek);
        }
      } finally {
        clearBytes(masterKey);
        clearBytes(passphrase);
      }
    } finally {
      await release();
    }
  }

  public async unlock(input: { readonly passphrase: Uint8Array }): Promise<void> {
    const disk = await this.readDisk();
    if (disk === null) {
      this.state = "uninitialized";
      throw new SecretStoreError("SECRET_STORE_UNINITIALIZED", "The Secret Store has not been initialized");
    }
    const nowMs = Date.now();
    const recent = this.failedUnlockAttempts.filter((value) => nowMs - value < 60_000);
    this.failedUnlockAttempts = recent;
    if (recent.length >= 5) throw new SecretStoreError("SECRET_UNLOCK_RATE_LIMITED", "Unlock attempts are temporarily rate-limited", true);
    this.state = "unlocking";
    const passphrase = copyBytes(input.passphrase);
    let kek: Buffer | null = null;
    try {
      validatePassphrase(passphrase);
      const kdf = decodeKdf(disk.kdf);
      kek = deriveKey(passphrase, kdf);
      const masterKey = unwrapKey(disk.keyWrap, kek, { vaultId: disk.vaultId, projectId: disk.projectId, kdf: disk.kdf });
      if (masterKey.byteLength !== 32) throw new AuthenticationFailure();
      this.clearMaster();
      this.masterKey = masterKey;
      this.generation = disk.generation;
      this.state = "unlocked";
      this.touch();
      this.emitAudit("vault_unlocked");
    } catch {
      this.failedUnlockAttempts = [...recent, nowMs];
      this.clearMaster();
      this.state = "locked";
      this.emitAudit("vault_unlock_failed", { result: "failed", errorCategory: "SECRET_UNLOCK_FAILED" });
      throw new SecretStoreError("SECRET_UNLOCK_FAILED", "The Secret Store could not be unlocked");
    } finally {
      clearBytes(kek);
      clearBytes(passphrase);
    }
  }

  public async lock(): Promise<void> {
    const wasUnlocked = this.state === "unlocked";
    this.clearMaster();
    if (this.state !== "uninitialized") this.state = "locked";
    if (wasUnlocked) this.emitAudit("vault_locked");
  }

  public async getBackendStatus(): Promise<SecretBackendStatus> {
    try {
      const disk = await this.readDisk();
      if (disk === null) {
        this.clearMaster();
        this.state = "uninitialized";
        return { backend: this.backend, state: "unavailable", vaultState: this.state, initialized: false, locked: true, selectedProvider: null, referenceVersion: 1, vaultFormatVersion: 1, encryptionEnvelopeVersion: ENCRYPTION_ENVELOPE_VERSION, reasonCode: "SECRET_STORE_UNINITIALIZED" };
      }
      if (this.state === "uninitialized") this.state = "locked";
      return { backend: this.backend, state: "available", vaultState: this.state, initialized: true, locked: this.state !== "unlocked", selectedProvider: null, referenceVersion: 1, vaultFormatVersion: 1, encryptionEnvelopeVersion: ENCRYPTION_ENVELOPE_VERSION, reasonCode: null };
    } catch (error) {
      this.clearMaster();
      this.state = "error";
      return { backend: this.backend, state: "degraded", vaultState: "error", initialized: true, locked: true, selectedProvider: null, referenceVersion: 1, vaultFormatVersion: 1, encryptionEnvelopeVersion: ENCRYPTION_ENVELOPE_VERSION, reasonCode: error instanceof SecretStoreError ? error.code : "SECRET_OPERATION_FAILED" };
    }
  }

  public async getCapability(): Promise<SecretStoreCapability> {
    const status = await this.getBackendStatus();
    return this.capability(status.state);
  }

  public async createSecret(input: SecretCreateInput): Promise<SecretMetadata> {
    this.ensureProject(input.projectId);
    assertValidSecretKind(input.kind);
    assertValidSecretScope(input.scope);
    if (input.scope.projectId.toLowerCase() !== this.projectId) throw new SecretStoreError("SECRET_SCOPE_INVALID", "The Secret scope belongs to another Project");
    validateSecretBytes(input.value);
    assertValidSecretLabel(input.displayLabel);
    const id = createSecretId(this.id());
    const ref = serializeSecretRef({ projectId: this.projectId, secretId: id });
    const timestamp = this.now();
    const metadata: SecretMetadata = {
      ref,
      secretId: id,
      projectId: this.projectId,
      scope: input.scope,
      kind: input.kind,
      backend: this.backend,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastRotatedAt: null,
      version: 1,
      lifecycleState: "active",
      displayLabel: input.displayLabel ?? null,
      secureExportPolicy: input.secureExportPolicy ?? (input.kind === "session_storage" ? "forbidden" : "allowed"),
      encryptionEnvelopeVersion: ENCRYPTION_ENVELOPE_VERSION,
      keySlotId: `slot-${this.id()}`,
      migrationState: "current",
    };
    const recordValue = copyBytes(input.value);
    try {
      let result: SecretMetadata = metadata;
      await this.mutateRecords((disk, masterKey) => {
        if (disk.records.some((record) => record.metadata.secretId === id)) throw new SecretStoreError("SECRET_ALREADY_EXISTS", "The Secret identifier already exists");
        const record = encryptRecord(metadata, recordValue, masterKey);
        result = metadata;
        return { ...disk, updatedAt: this.now(), generation: disk.generation + 1, records: [...disk.records, record] };
      });
      this.emitAudit("secret_created", { secretId: metadata.secretId, kind: metadata.kind });
      return result;
    } finally {
      clearBytes(recordValue);
    }
  }

  public async replaceSecret(input: SecretReplaceInput): Promise<SecretMetadata> {
    this.ensureProject(input.projectId);
    validateSecretBytes(input.value);
    assertValidSecretLabel(input.displayLabel);
    const value = copyBytes(input.value);
    try {
      let result: SecretMetadata | null = null;
      await this.mutateRecords((disk, masterKey) => {
        const existing = this.recordFromDisk(disk, input.ref);
        if (existing.metadata.lifecycleState === "deleted") throw new SecretStoreError("SECRET_NOT_FOUND", "The Secret Reference was deleted");
        const metadata: SecretMetadata = { ...existing.metadata, updatedAt: this.now(), version: existing.metadata.version + 1, displayLabel: input.displayLabel === undefined ? existing.metadata.displayLabel : input.displayLabel };
        const record = encryptRecord(metadata, value, masterKey);
        result = metadata;
        return { ...disk, updatedAt: this.now(), generation: disk.generation + 1, records: disk.records.map((candidate) => candidate.metadata.secretId === existing.metadata.secretId ? record : candidate) };
      });
      const replaced = result as SecretMetadata | null;
      if (replaced === null) throw new SecretStoreError("SECRET_OPERATION_FAILED", "The Secret replacement did not complete");
      this.emitAudit("secret_replaced", { secretId: replaced.secretId, kind: replaced.kind });
      return replaced;
    } finally {
      clearBytes(value);
    }
  }

  public async withSecret<T>(context: SecretAccessContext, ref: SecretRef, consumer: (secretBytes: Uint8Array) => Promise<T>): Promise<T> {
    this.ensureProject(context.projectId);
    assertValidSecretPurpose(context.purpose);
    const masterKey = this.requireMasterKey();
    const disk = await this.readDisk();
    if (disk === null) throw new SecretStoreError("SECRET_STORE_UNINITIALIZED", "The Secret Store has not been initialized");
    const found = this.recordFromDisk(disk, ref);
    assertSecretAccessAllowed(found.metadata.kind, context.purpose);
    if (context.scopeId !== undefined && context.scopeId !== null && context.scopeId !== found.metadata.scope.scopeId) throw new SecretStoreError("SECRET_SCOPE_INVALID", "The Secret scope does not authorize this operation");
    if (found.metadata.lifecycleState !== "active" && found.metadata.lifecycleState !== "rotation_required") throw new SecretStoreError("SECRET_NOT_FOUND", "The Secret is not active");
    let secret: Buffer | null = null;
    try {
      secret = decryptRecord(found.record, found.metadata, masterKey);
      this.touch();
      const result = await consumer(secret as MutableBuffer);
      this.emitAudit("secret_accessed", { secretId: found.metadata.secretId, kind: found.metadata.kind, purpose: context.purpose });
      return result;
    } catch (error) {
      this.emitAudit("secret_access_denied", { secretId: found.metadata.secretId, kind: found.metadata.kind, purpose: context.purpose, result: "denied", errorCategory: error instanceof SecretStoreError ? error.code : "SECRET_OPERATION_FAILED" });
      if (error instanceof AuthenticationFailure) throw new SecretStoreError("SECRET_TAMPER_DETECTED", "The Secret could not be authenticated");
      throw error;
    } finally {
      clearBytes(secret);
    }
  }

  public async deleteSecret(input: { readonly projectId: string; readonly ref: SecretRef }): Promise<void> {
    this.ensureProject(input.projectId);
    let deleted: SecretMetadata | null = null;
    await this.mutateRecords((disk) => {
      const existing = this.recordFromDisk(disk, input.ref);
      if (existing.metadata.lifecycleState === "deleted") throw new SecretStoreError("SECRET_NOT_FOUND", "The Secret Reference was deleted");
      deleted = existing.metadata;
      return { ...disk, updatedAt: this.now(), generation: disk.generation + 1, records: disk.records.filter((candidate) => candidate.metadata.secretId !== existing.metadata.secretId) };
    });
    const deletedMetadata = deleted as SecretMetadata | null;
    if (deletedMetadata !== null) this.emitAudit("secret_deleted", { secretId: deletedMetadata.secretId, kind: deletedMetadata.kind });
  }

  public async hasSecret(input: { readonly projectId: string; readonly ref: SecretRef }): Promise<boolean> {
    this.ensureProject(input.projectId);
    const disk = await this.readDisk();
    if (disk === null) return false;
    const parsed = parseSecretRef(input.ref);
    this.ensureProject(parsed.projectId);
    return disk.records.some((record) => record.metadata.secretId === parsed.secretId);
  }

  public async getSecretMetadata(input: { readonly projectId: string; readonly ref: SecretRef }): Promise<SecretMetadata> {
    this.ensureProject(input.projectId);
    const disk = await this.readDisk();
    if (disk === null) throw new SecretStoreError("SECRET_STORE_UNINITIALIZED", "The Secret Store has not been initialized");
    return this.recordFromDisk(disk, input.ref).metadata;
  }

  public async listSecretMetadata(input: { readonly projectId: string }): Promise<readonly SecretMetadata[]> {
    this.ensureProject(input.projectId);
    const disk = await this.readDisk();
    if (disk === null) return [];
    return disk.records.map((record) => metadataFromDisk(record.metadata, this.projectId, this.backend)).sort((left, right) => left.ref.localeCompare(right.ref, "en"));
  }

  public async rotateSecret(input: { readonly projectId: string; readonly ref: SecretRef }): Promise<SecretMetadata> {
    this.ensureProject(input.projectId);
    const masterKey = this.requireMasterKey();
    let result: SecretMetadata | null = null;
    await this.mutateRecords((disk) => {
      const existing = this.recordFromDisk(disk, input.ref);
      let value: Buffer | null = null;
      try {
        value = decryptRecord(existing.record, existing.metadata, masterKey);
        const metadata: SecretMetadata = { ...existing.metadata, updatedAt: this.now(), lastRotatedAt: this.now(), version: existing.metadata.version + 1 };
        const record = encryptRecord(metadata, value, masterKey);
        result = metadata;
        return { ...disk, updatedAt: this.now(), generation: disk.generation + 1, records: disk.records.map((candidate) => candidate.metadata.secretId === existing.metadata.secretId ? record : candidate) };
      } finally {
        clearBytes(value);
      }
    });
    const rotated = result as SecretMetadata | null;
    if (rotated === null) throw new SecretStoreError("SECRET_OPERATION_FAILED", "The Secret rotation did not complete");
    this.emitAudit("secret_replaced", { secretId: rotated.secretId, kind: rotated.kind });
    return rotated;
  }

  public async rotateVaultProtection(input: { readonly newPassphrase: Uint8Array }): Promise<void> {
    validatePassphrase(input.newPassphrase);
    const oldMaster = this.requireMasterKey();
    const disk = await this.readDisk();
    if (disk === null) throw new SecretStoreError("SECRET_STORE_UNINITIALIZED", "The Secret Store has not been initialized");
    const passphrase = copyBytes(input.newPassphrase);
    const plaintextRecords: Array<{ readonly metadata: SecretMetadata; readonly value: Buffer }> = [];
    this.state = "rotating";
    try {
      for (const rawRecord of disk.records) {
        const metadata = metadataFromDisk(rawRecord.metadata, this.projectId, this.backend);
        plaintextRecords.push({ metadata, value: decryptRecord(rawRecord, metadata, oldMaster) });
      }
      const kdf = createKdfParameters(this.testMode ? TEST_KDF_PROFILE : PRODUCTION_KDF_PROFILE);
      let newKek: Buffer | null = null;
      let newMaster: Buffer | null = null;
      try {
        newKek = deriveKey(passphrase, kdf);
        newMaster = generateKey();
        const nextKdf = encodeKdf(kdf);
        const nextVaultId = this.id();
        const records = plaintextRecords.map(({ metadata, value }) => encryptRecord(metadata, value, newMaster as Buffer));
        const next: VaultDisk = {
          magic: VAULT_MAGIC,
          formatVersion: 1,
          vaultId: nextVaultId,
          projectId: this.projectId,
          createdAt: disk.createdAt,
          updatedAt: this.now(),
          generation: disk.generation + 1,
          kdf: nextKdf,
          keyWrap: serializeEnvelope(encryptAead(newMaster as Buffer, newKek, vaultAad({ vaultId: nextVaultId, projectId: this.projectId, kdf: nextKdf }))),
          records,
        };
        const release = await acquireVaultLock(this.lockPath);
        try {
          const current = await this.readDisk();
          if (current === null || current.generation !== disk.generation || current.vaultId !== disk.vaultId) throw new SecretStoreError("SECRET_STORE_BUSY", "The encrypted Secret Store changed while it was being rotated", true);
          await atomicWriteJson(this.vaultPath, next);
          const verified = await this.readDisk();
          if (verified === null || verified.generation !== next.generation) throw new SecretStoreError("SECRET_TAMPER_DETECTED", "The rotated Vault could not be verified");
          clearBytes(this.masterKey);
          this.masterKey = newMaster;
          newMaster = null;
          this.generation = verified.generation;
        } finally {
          await release();
        }
      } finally {
        clearBytes(newKek);
        clearBytes(newMaster);
      }
    } finally {
      for (const record of plaintextRecords) clearBytes(record.value);
      clearBytes(passphrase);
      this.state = this.masterKey === null ? "locked" : "unlocked";
      this.touch();
    }
    this.emitAudit("vault_rotated");
  }

  public async exportSecretsEncrypted(input: { readonly projectId: string; readonly destinationPath: string; readonly passphrase: Uint8Array; readonly confirm: boolean; readonly refs?: readonly SecretRef[] }): Promise<{ readonly destinationPath: string; readonly secretCount: number; readonly formatVersion: 1 }> {
    this.ensureProject(input.projectId);
    if (!input.confirm) throw new SecretStoreError("SECRET_EXPORT_CONFIRMATION_REQUIRED", "Secure Export requires explicit confirmation");
    validatePassphrase(input.passphrase);
    const masterKey = this.requireMasterKey();
    const disk = await this.readDisk();
    if (disk === null) throw new SecretStoreError("SECRET_STORE_UNINITIALIZED", "The Secret Store has not been initialized");
    const selected = input.refs === undefined ? disk.records : input.refs.map((ref) => this.recordFromDisk(disk, ref).record);
    const records: Array<{ readonly metadata: MetadataDisk; readonly value: string }> = [];
    const values: Buffer[] = [];
    try {
      for (const record of selected) {
        const metadata = metadataFromDisk(record.metadata, this.projectId, this.backend);
        if (metadata.secureExportPolicy !== "allowed") throw new SecretStoreError("SECRET_EXPORT_FORBIDDEN", "One or more selected Secrets are not eligible for Secure Export");
        const value = decryptRecord(record, metadata, masterKey);
        values.push(value);
        records.push({ metadata: metadataToDisk(metadata), value: value.toString("base64url") });
      }
      const kdf = createKdfParameters(PRODUCTION_KDF_PROFILE);
      const passphrase = copyBytes(input.passphrase);
      const kek = deriveKey(passphrase, kdf);
      try {
        const header: Omit<SecureExportDisk, "envelope"> = { magic: SECURE_EXPORT_MAGIC, formatVersion: 1, exportId: this.id(), projectId: this.projectId, createdAt: this.now(), kdf: encodeKdf(kdf) };
        const payload: SecureExportPayload = { payloadVersion: 1, projectId: this.projectId, records };
        const envelope = serializeEnvelope(encryptAead(Buffer.from(JSON.stringify(payload), "utf8"), kek, envelopeAad("owa-secure-export-v1", header)));
        await atomicWriteJson(path.resolve(input.destinationPath), { ...header, envelope });
        this.emitAudit("secure_export_created");
        return { destinationPath: path.resolve(input.destinationPath), secretCount: records.length, formatVersion: 1 };
      } finally {
        clearBytes(kek);
        clearBytes(passphrase);
      }
    } catch (error) {
      if (error instanceof SecretStoreError) throw error;
      throw new SecretStoreError("SECRET_EXPORT_FAILED", "The Secure Export could not be created");
    } finally {
      for (const value of values) clearBytes(value);
    }
  }

  public async importSecretsEncrypted(input: { readonly projectId: string; readonly sourcePath: string; readonly passphrase: Uint8Array }): Promise<{ readonly importedCount: number; readonly formatVersion: 1 }> {
    this.ensureProject(input.projectId);
    const masterKey = this.requireMasterKey();
    const source = path.resolve(input.sourcePath);
    await assertRegularFile(source);
    const sourceStat = await lstat(source);
    if (sourceStat.size > MAX_SECURE_EXPORT_BYTES) throw new SecretStoreError("SECRET_IMPORT_FAILED", "The Secure Export exceeds the safe size limit");
    const bytes = await readFile(source);
    if (bytes.byteLength > MAX_SECURE_EXPORT_BYTES) throw new SecretStoreError("SECRET_IMPORT_FAILED", "The Secure Export exceeds the safe size limit");
    let raw: unknown;
    try { raw = JSON.parse(bytes.toString("utf8")); }
    catch { throw new SecretStoreError("SECRET_IMPORT_FAILED", "The Secure Export is not valid encrypted data"); }
    const exportDisk = decodeSecureExport(raw, this.projectId);
    const passphrase = copyBytes(input.passphrase);
    let kek: Buffer | null = null;
    let decrypted: Buffer | null = null;
    try {
      kek = deriveKey(passphrase, decodeKdf(exportDisk.kdf));
      try { decrypted = decryptAead(deserializeEnvelope(exportDisk.envelope, MAX_SECURE_EXPORT_BYTES), kek, envelopeAad("owa-secure-export-v1", { magic: exportDisk.magic, formatVersion: exportDisk.formatVersion, exportId: exportDisk.exportId, projectId: exportDisk.projectId, createdAt: exportDisk.createdAt, kdf: exportDisk.kdf })); }
      catch (error) { if (error instanceof AuthenticationFailure) throw new SecretStoreError("SECRET_UNLOCK_FAILED", "The Secure Export could not be authenticated"); throw error; }
      if (decrypted.byteLength > MAX_SECURE_EXPORT_BYTES) throw new SecretStoreError("SECRET_IMPORT_FAILED", "The Secure Export payload is too large");
      let payloadValue: unknown;
      try { payloadValue = JSON.parse(decrypted.toString("utf8")); }
      catch { throw new SecretStoreError("SECRET_IMPORT_FAILED", "The Secure Export payload is invalid"); }
      if (!isRecord(payloadValue)) throw new SecretStoreError("SECRET_IMPORT_FAILED", "The Secure Export payload is invalid");
      assertExactKeys(payloadValue, ["payloadVersion", "projectId", "records"]);
      if (payloadValue["payloadVersion"] !== 1 || payloadValue["projectId"] !== this.projectId || !Array.isArray(payloadValue["records"]) || payloadValue["records"].length > MAX_VAULT_RECORDS) throw new SecretStoreError("SECRET_IMPORT_FAILED", "The Secure Export payload identity is invalid");
      const imported: Array<{ readonly metadata: SecretMetadata; readonly value: Buffer }> = [];
      const ids = new Set<string>();
      try {
        for (const rawRecord of payloadValue["records"]) {
          if (!isRecord(rawRecord)) throw new SecretStoreError("SECRET_IMPORT_FAILED", "The Secure Export record is invalid");
          assertExactKeys(rawRecord, ["metadata", "value"]);
          const metadata = metadataFromDisk(rawRecord["metadata"], this.projectId, this.backend, null);
          if (ids.has(metadata.secretId)) throw new SecretStoreError("SECRET_IMPORT_FAILED", "The Secure Export contains duplicate Secret identifiers");
          ids.add(metadata.secretId);
          if (typeof rawRecord["value"] !== "string") throw new SecretStoreError("SECRET_IMPORT_FAILED", "The Secure Export Secret payload is invalid");
          const value = Buffer.from(rawRecord["value"], "base64url");
          validateSecretBytes(value);
          imported.push({ metadata: { ...metadata, backend: this.backend, keySlotId: `slot-${this.id()}`, version: metadata.version, updatedAt: this.now() }, value });
        }
        const disk = await this.readDisk();
        if (disk === null) throw new SecretStoreError("SECRET_STORE_UNINITIALIZED", "The Secret Store has not been initialized");
        const existingIds = new Set(disk.records.map((record) => record.metadata.secretId));
        if (imported.some(({ metadata }) => existingIds.has(metadata.secretId))) throw new SecretStoreError("SECRET_IMPORT_FAILED", "The Secure Import contains a conflicting Secret identifier");
        await this.mutateRecords((current) => ({ ...current, updatedAt: this.now(), generation: current.generation + 1, records: [...current.records, ...imported.map(({ metadata, value }) => encryptRecord(metadata, value, masterKey))] }));
        this.emitAudit("secure_export_imported");
        return { importedCount: imported.length, formatVersion: 1 };
      } finally {
        for (const item of imported) clearBytes(item.value);
      }
    } finally {
      clearBytes(decrypted);
      clearBytes(kek);
      clearBytes(passphrase);
    }
  }

  public async dispose(): Promise<void> {
    await this.lock();
  }
}

export function createPortableSecretStore(options: PortableVaultOptions): SecretStorePort {
  return new PortableVaultSecretStore({ ...options, backend: "portable_vault" });
}
