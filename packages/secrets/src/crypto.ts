import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { SecretStoreError, type SecretStoreErrorCode } from "@offline-web-archive/archive-core";

export const AES_GCM_ALGORITHM = "aes-256-gcm" as const;
export const AES_KEY_BYTES = 32;
export const AES_NONCE_BYTES = 12;
export const AES_TAG_BYTES = 16;
export const MAX_PASSPHRASE_BYTES = 4_096;
export const MAX_SECRET_BYTES = 1 * 1024 * 1024;
export const MAX_VAULT_BYTES = 64 * 1024 * 1024;
export const MAX_VAULT_RECORDS = 1_000;
export const MAX_SECURE_EXPORT_BYTES = 64 * 1024 * 1024;

export interface KdfParameters {
  readonly name: "scrypt";
  readonly version: 1;
  readonly salt: Buffer;
  readonly N: number;
  readonly r: number;
  readonly p: number;
  readonly maxmem: number;
}

export const PRODUCTION_KDF_PROFILE = Object.freeze({
  name: "scrypt",
  version: 1,
  N: 32_768,
  r: 8,
  p: 1,
  maxmem: 128 * 1024 * 1024,
} as const);

export const TEST_KDF_PROFILE = Object.freeze({
  name: "scrypt",
  version: 1,
  N: 1_024,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
} as const);

export interface AeadEnvelope {
  readonly version: 1;
  readonly algorithm: typeof AES_GCM_ALGORITHM;
  readonly nonce: Buffer;
  readonly ciphertext: Buffer;
  readonly tag: Buffer;
}

export interface SerializedAeadEnvelope {
  readonly version: 1;
  readonly algorithm: typeof AES_GCM_ALGORITHM;
  readonly nonce: string;
  readonly ciphertext: string;
  readonly tag: string;
}

export class AuthenticationFailure extends Error {
  public constructor() {
    super("Authentication failed");
    this.name = "AuthenticationFailure";
  }
}

function cryptoError(code: SecretStoreErrorCode, message: string): never {
  throw new SecretStoreError(code, message);
}

export function clearBytes(value: Uint8Array | null | undefined): void {
  if (value !== null && value !== undefined) value.fill(0);
}

export function copyBytes(value: Uint8Array): Buffer {
  if (!(value instanceof Uint8Array)) cryptoError("SECRET_VALUE_INVALID", "Secret bytes are invalid");
  return Buffer.from(value);
}

export function validateSecretBytes(value: Uint8Array): void {
  if (!(value instanceof Uint8Array) || value.byteLength === 0) cryptoError("SECRET_VALUE_INVALID", "Secret bytes must not be empty");
  if (value.byteLength > MAX_SECRET_BYTES) cryptoError("SECRET_VALUE_TOO_LARGE", "The Secret exceeds the maximum size");
}

export function validatePassphrase(value: Uint8Array): void {
  if (!(value instanceof Uint8Array) || value.byteLength < 12) cryptoError("SECRET_VALUE_INVALID", "The Vault passphrase does not meet the minimum length");
  if (value.byteLength > MAX_PASSPHRASE_BYTES) cryptoError("SECRET_VALUE_TOO_LARGE", "The Vault passphrase exceeds the maximum size");
}

export function validateKdfParameters(input: {
  readonly name: unknown;
  readonly version: unknown;
  readonly salt: Uint8Array;
  readonly N: unknown;
  readonly r: unknown;
  readonly p: unknown;
  readonly maxmem: unknown;
}): KdfParameters {
  if (input.name !== "scrypt" || input.version !== 1 || !(input.salt instanceof Uint8Array) || input.salt.byteLength !== 16) {
    cryptoError("SECRET_KDF_INVALID", "The Vault key-derivation configuration is unsupported");
  }
  const N = input.N;
  const r = input.r;
  const p = input.p;
  const maxmem = input.maxmem;
  if (typeof N !== "number" || !Number.isSafeInteger(N) || N < 1_024 || N > 131_072 || (N & (N - 1)) !== 0) {
    cryptoError("SECRET_KDF_INVALID", "The Vault key-derivation cost is outside the allowed range");
  }
  if (typeof r !== "number" || typeof p !== "number" || !Number.isSafeInteger(r) || r < 1 || r > 32 || !Number.isSafeInteger(p) || p < 1 || p > 16) {
    cryptoError("SECRET_KDF_INVALID", "The Vault key-derivation parameters are outside the allowed range");
  }
  if (typeof maxmem !== "number" || !Number.isSafeInteger(maxmem) || maxmem < 16 * 1024 * 1024 || maxmem > 512 * 1024 * 1024) {
    cryptoError("SECRET_KDF_INVALID", "The Vault key-derivation memory limit is outside the allowed range");
  }
  const estimatedMemory = 128 * N * r;
  if (estimatedMemory > maxmem || estimatedMemory > 512 * 1024 * 1024) {
    cryptoError("SECRET_KDF_INVALID", "The Vault key-derivation memory cost is inconsistent");
  }
  return {
    name: "scrypt",
    version: 1,
    salt: Buffer.from(input.salt),
    N,
    r,
    p,
    maxmem,
  };
}

export function createKdfParameters(profile: typeof PRODUCTION_KDF_PROFILE | typeof TEST_KDF_PROFILE = PRODUCTION_KDF_PROFILE): KdfParameters {
  return validateKdfParameters({ ...profile, salt: randomBytes(16) });
}

export function deriveKey(passphrase: Uint8Array, kdf: KdfParameters): Buffer {
  validatePassphrase(passphrase);
  const passphraseCopy = copyBytes(passphrase);
  try {
    return scryptSync(passphraseCopy, kdf.salt, AES_KEY_BYTES, {
      N: kdf.N,
      r: kdf.r,
      p: kdf.p,
      maxmem: kdf.maxmem,
    });
  } catch {
    cryptoError("SECRET_OPERATION_FAILED", "The Vault key could not be derived safely");
  } finally {
    clearBytes(passphraseCopy);
  }
}

export function generateKey(): Buffer {
  return randomBytes(AES_KEY_BYTES);
}

export function generateNonce(): Buffer {
  return randomBytes(AES_NONCE_BYTES);
}

export function encryptAead(plaintext: Uint8Array, key: Uint8Array, aad: Uint8Array): AeadEnvelope {
  if (key.byteLength !== AES_KEY_BYTES || aad.byteLength > 8 * 1024) cryptoError("SECRET_OPERATION_FAILED", "The encryption inputs are invalid");
  const nonce = generateNonce();
  const cipher = createCipheriv(AES_GCM_ALGORITHM, Buffer.from(key), nonce, { authTagLength: AES_TAG_BYTES });
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
  const tag = cipher.getAuthTag();
  if (tag.byteLength !== AES_TAG_BYTES) cryptoError("SECRET_OPERATION_FAILED", "The encryption tag has an invalid size");
  return { version: 1, algorithm: AES_GCM_ALGORITHM, nonce, ciphertext, tag };
}

export function decryptAead(envelope: AeadEnvelope, key: Uint8Array, aad: Uint8Array): Buffer {
  if (envelope.version !== 1 || envelope.algorithm !== AES_GCM_ALGORITHM || key.byteLength !== AES_KEY_BYTES || envelope.nonce.byteLength !== AES_NONCE_BYTES || envelope.tag.byteLength !== AES_TAG_BYTES || aad.byteLength > 8 * 1024) {
    cryptoError("SECRET_FORMAT_UNSUPPORTED", "The encrypted envelope is unsupported");
  }
  try {
    const decipher = createDecipheriv(AES_GCM_ALGORITHM, Buffer.from(key), envelope.nonce, { authTagLength: AES_TAG_BYTES });
    decipher.setAAD(Buffer.from(aad));
    decipher.setAuthTag(envelope.tag);
    return Buffer.concat([decipher.update(envelope.ciphertext), decipher.final()]);
  } catch {
    throw new AuthenticationFailure();
  }
}

export function serializeEnvelope(envelope: AeadEnvelope): SerializedAeadEnvelope {
  return {
    version: envelope.version,
    algorithm: envelope.algorithm,
    nonce: envelope.nonce.toString("base64url"),
    ciphertext: envelope.ciphertext.toString("base64url"),
    tag: envelope.tag.toString("base64url"),
  };
}

export function deserializeEnvelope(value: unknown, maxCiphertextBytes = MAX_SECRET_BYTES): AeadEnvelope {
  if (typeof value !== "object" || value === null) cryptoError("SECRET_FORMAT_UNSUPPORTED", "The encrypted envelope is invalid");
  const record = value as Record<string, unknown>;
  if (record["version"] !== 1 || record["algorithm"] !== AES_GCM_ALGORITHM || typeof record["nonce"] !== "string" || typeof record["ciphertext"] !== "string" || typeof record["tag"] !== "string") {
    cryptoError("SECRET_FORMAT_UNSUPPORTED", "The encrypted envelope is invalid");
  }
  let nonce: Buffer;
  let ciphertext: Buffer;
  let tag: Buffer;
  try {
    nonce = Buffer.from(record["nonce"], "base64url");
    ciphertext = Buffer.from(record["ciphertext"], "base64url");
    tag = Buffer.from(record["tag"], "base64url");
  } catch {
    cryptoError("SECRET_FORMAT_UNSUPPORTED", "The encrypted envelope encoding is invalid");
  }
  if (nonce.byteLength !== AES_NONCE_BYTES || tag.byteLength !== AES_TAG_BYTES || ciphertext.byteLength > maxCiphertextBytes) {
    cryptoError("SECRET_FORMAT_UNSUPPORTED", "The encrypted envelope size is invalid");
  }
  return { version: 1, algorithm: AES_GCM_ALGORITHM, nonce, ciphertext, tag };
}

export function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  if (typeof value !== "object") cryptoError("SECRET_FORMAT_UNSUPPORTED", "The authenticated metadata is invalid");
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right, "en"));
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
}

export function envelopeAad(prefix: string, metadata: unknown): Buffer {
  return Buffer.from(`${prefix}|${canonicalJson(metadata)}`, "utf8");
}
