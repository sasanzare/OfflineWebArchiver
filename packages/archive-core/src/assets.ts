import { canonicalRelativePath } from "./path-safety.js";

export const ASSET_PIPELINE_CONTRACT_VERSION = 1 as const;

export const ASSET_TYPES = Object.freeze([
  "css",
  "javascript",
  "image",
  "svg",
  "font",
  "audio",
  "video",
  "json",
  "manifest",
  "favicon",
  "binary",
] as const);
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_SOURCE_STATES = Object.freeze([
  "pending",
  "downloading",
  "interrupted",
  "completed",
  "failed",
] as const);
export type AssetSourceState = (typeof ASSET_SOURCE_STATES)[number];

export type AssetOperationErrorCode =
  | "ASSET_INPUT_INVALID"
  | "ASSET_SCOPE_BLOCKED"
  | "ASSET_REDIRECT_BLOCKED"
  | "ASSET_REDIRECT_LIMIT"
  | "ASSET_RESPONSE_INVALID"
  | "ASSET_RANGE_INVALID"
  | "ASSET_VALIDATOR_CHANGED"
  | "ASSET_SIZE_MISMATCH"
  | "ASSET_HASH_MISMATCH"
  | "ASSET_PATH_UNSAFE"
  | "ASSET_SYMLINK_BLOCKED"
  | "ASSET_CONTENT_LOCKED"
  | "ASSET_CONTENT_CONFLICT"
  | "ASSET_ALREADY_IN_PROGRESS"
  | "ASSET_NOT_FOUND"
  | "ASSET_STATE_CONFLICT"
  | "ASSET_LEASE_INVALID"
  | "ASSET_STALE_GENERATION"
  | "ASSET_PERSISTENCE_FAILED"
  | "ASSET_NETWORK_FAILED"
  | "ASSET_CANCELLED"
  | "ASSET_MAXIMUM_SIZE_EXCEEDED";

export class AssetOperationError extends Error {
  public constructor(
    public readonly code: AssetOperationErrorCode,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "AssetOperationError";
  }
}

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SENSITIVE_QUERY_KEY = /^(?:access[_-]?token|api[_-]?key|authorization|auth|code|cookie|credential|csrf|jwt|otp|pass(?:word)?|secret|session|token)$/i;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const MAX_ASSET_URL_LENGTH = 8_192;
const MAX_REDIRECTS = 20;

function invalid(message: string): never {
  throw new AssetOperationError("ASSET_INPUT_INVALID", message);
}

function assertHash(value: string, label: string): string {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) invalid(`${label} must be a lowercase SHA-256 value`);
  return value;
}

function assertIdentifier(value: string, label: string): string {
  if (typeof value !== "string" || !SAFE_IDENTIFIER.test(value)) invalid(`${label} is invalid`);
  return value;
}

function safeUrl(value: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_ASSET_URL_LENGTH || CONTROL_CHARACTER.test(value) || value.includes("\\")) {
    invalid("The asset URL is invalid");
  }
  let parsed: URL;
  try { parsed = new URL(value); }
  catch { invalid("The asset URL is invalid"); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") invalid("Asset URLs must use HTTP or HTTPS");
  if (parsed.username !== "" || parsed.password !== "") invalid("Asset URLs cannot contain credentials");
  parsed.hash = "";
  const safeParameters = [...parsed.searchParams.entries()].map(([key, parameterValue]) => [
    key,
    SENSITIVE_QUERY_KEY.test(key) ? "[redacted]" : parameterValue,
  ] as const);
  parsed.search = "";
  for (const [key, parameterValue] of safeParameters) parsed.searchParams.append(key, parameterValue);
  const result = parsed.toString();
  if (result.length > MAX_ASSET_URL_LENGTH) invalid("The asset URL is too long");
  return result;
}

function canonicalPath(value: string): string {
  try {
    return canonicalRelativePath(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The Asset path is not safe";
    throw new AssetOperationError("ASSET_PATH_UNSAFE", message);
  }
}

export interface AssetIdentityInput {
  readonly originalUrl: string;
  readonly normalizedUrl: string;
  /** The existing Scope Engine identity hash for the normalized URL. */
  readonly identityHash: string;
}

export interface AssetIdentity {
  readonly version: typeof ASSET_PIPELINE_CONTRACT_VERSION;
  readonly originalUrl: string;
  readonly normalizedUrl: string;
  readonly identityHash: string;
  readonly origin: string;
}

export function canonicalAssetIdentity(input: AssetIdentityInput): AssetIdentity {
  const originalUrl = safeUrl(input.originalUrl);
  const normalizedUrl = safeUrl(input.normalizedUrl);
  const normalized = new URL(normalizedUrl);
  assertHash(input.identityHash, "The Asset identity hash");
  return Object.freeze({
    version: ASSET_PIPELINE_CONTRACT_VERSION,
    originalUrl,
    normalizedUrl,
    identityHash: input.identityHash,
    origin: normalized.origin,
  });
}

export function assetIdentityBasis(normalizedUrl: string): string {
  return `asset-identity-v${ASSET_PIPELINE_CONTRACT_VERSION}\n${safeUrl(normalizedUrl)}`;
}

export function canonicalAssetSourcePath(input: { readonly assetType: AssetType; readonly identityHash: string }): string {
  if (!(ASSET_TYPES as readonly string[]).includes(input.assetType)) invalid("The Asset type is unsupported");
  const identityHash = assertHash(input.identityHash, "The Asset identity hash");
  return canonicalPath(`assets/sources/${input.assetType}/${identityHash.slice(0, 2)}/${identityHash}.json`);
}

export function canonicalAssetContentPath(sha256: string): string {
  const hash = assertHash(sha256, "The Asset content hash");
  return canonicalPath(`assets/objects/sha256/${hash.slice(0, 2)}/${hash}`);
}

export function canonicalAssetPartialPath(assetSourceId: string, fencingGeneration: number): string {
  assertIdentifier(assetSourceId, "The Asset source identifier");
  if (!Number.isSafeInteger(fencingGeneration) || fencingGeneration < 1) invalid("The Asset fencing generation is invalid");
  return canonicalPath(`temp/assets/${assetSourceId}.${fencingGeneration}.part`);
}

export function canonicalAssetContentLockPath(sha256: string): string {
  const hash = assertHash(sha256, "The Asset content hash");
  return canonicalPath(`temp/assets/locks/${hash}.lock`);
}

export function normalizeAssetContentType(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") return null;
  if (CONTROL_CHARACTER.test(value) || value.length > 240) invalid("The Asset Content-Type is invalid");
  return value.trim().split(";", 1)[0]!.toLowerCase().slice(0, 240) || null;
}

export function normalizeAssetValidator(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (CONTROL_CHARACTER.test(value) || value.length > 512) invalid("The Asset validator is invalid");
  return value.slice(0, 512);
}

export function canonicalAssetRedirectUrl(value: string): string {
  return safeUrl(value);
}

export function safeAssetUrl(value: string): string {
  return safeUrl(value);
}

export function isAssetRedirectStatus(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}

export function validateAssetRedirectLimit(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_REDIRECTS) throw new AssetOperationError("ASSET_REDIRECT_LIMIT", "The Asset redirect chain exceeds its bounded limit");
  return value;
}

export interface AssetContentRange {
  readonly start: number;
  readonly end: number;
  readonly total: number | null;
}

export function parseAssetContentRange(value: string | null | undefined): AssetContentRange | null {
  if (value === undefined || value === null) return null;
  const match = /^bytes (\d+)-(\d+)\/(\d+|\*)$/i.exec(value.trim());
  if (match === null) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  const total = match[3] === "*" ? null : Number(match[3]);
  if (![start, end].every((item) => Number.isSafeInteger(item) && item >= 0) || end < start || (total !== null && (!Number.isSafeInteger(total) || total <= end))) return null;
  return { start, end, total };
}

export type AssetResumeDecision = "resume" | "restart" | "discard" | "complete";

export function decideAssetResume(input: {
  readonly localBytes: number;
  readonly durableBytes: number;
  readonly expectedBytes: number | null;
  readonly rangeSupported: boolean;
  readonly storedValidator: string | null;
  readonly remoteValidator: string | null;
  readonly storedSha256: string | null;
  readonly actualSha256: string | null;
}): { readonly decision: AssetResumeDecision; readonly reasonCode: string; readonly resumeOffset: number } {
  const values = [input.localBytes, input.durableBytes, input.expectedBytes].filter((value): value is number => value !== null);
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0) || input.durableBytes > input.localBytes) throw new AssetOperationError("ASSET_INPUT_INVALID", "Asset resume byte counters are invalid");
  if (input.expectedBytes !== null && input.localBytes > input.expectedBytes) return { decision: "discard", reasonCode: "PARTIAL_SIZE_EXCEEDED", resumeOffset: 0 };
  if (input.expectedBytes !== null && input.durableBytes === input.expectedBytes && input.storedSha256 !== null && input.actualSha256 === input.storedSha256) return { decision: "complete", reasonCode: "PARTIAL_ALREADY_COMPLETE", resumeOffset: input.durableBytes };
  if (input.durableBytes === 0) return { decision: "restart", reasonCode: "PARTIAL_EMPTY", resumeOffset: 0 };
  if (!input.rangeSupported) return { decision: "restart", reasonCode: "RANGE_NOT_SUPPORTED", resumeOffset: 0 };
  if (input.storedValidator === null || input.remoteValidator === null || input.storedValidator !== input.remoteValidator) return { decision: "restart", reasonCode: "REMOTE_VALIDATOR_CHANGED", resumeOffset: 0 };
  return { decision: "resume", reasonCode: "RANGE_RESUME_SAFE", resumeOffset: input.durableBytes };
}

export interface AssetContent {
  readonly contentId: string;
  readonly projectId: string;
  readonly sha256: string;
  readonly byteLength: number;
  readonly storageRelativePath: string;
  readonly contentType: string | null;
  readonly createdAt: string;
  readonly verifiedAt: string | null;
}

export interface AssetSource {
  readonly assetSourceId: string;
  readonly projectId: string;
  readonly runId: string;
  readonly projectRevisionId: string;
  readonly pageJobId: string;
  readonly originalUrl: string;
  readonly normalizedUrl: string;
  readonly identityHash: string;
  readonly assetType: AssetType;
  readonly sourceRelativePath: string;
  readonly state: AssetSourceState;
  readonly statusCode: number | null;
  readonly contentType: string | null;
  readonly byteLength: number | null;
  readonly sha256: string | null;
  readonly storageRelativePath: string | null;
  readonly etag: string | null;
  readonly lastModified: string | null;
  readonly validator: string | null;
  readonly expectedBytes: number | null;
  readonly resumeOffset: number;
  readonly partialRelativePath: string | null;
  readonly redirectChain: readonly string[];
  readonly claimJobId: string | null;
  readonly claimedBy: string | null;
  readonly fencingGeneration: number;
  readonly errorCode: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
  readonly content: AssetContent | null;
}

export interface AssetSourceInput {
  readonly identity: AssetIdentity;
  readonly assetType: AssetType;
  readonly pageJobId: string;
  readonly projectId: string;
  readonly runId: string;
  readonly projectRevisionId: string;
  readonly relationKind: string;
}

/**
 * Filesystem operations required by the Asset pipeline. Implementations own
 * canonical Project-root resolution, symlink checks, streaming, locks, and
 * atomic promotion; orchestration receives only this capability port.
 */
export interface AssetFileHandlePort {
  write(bytes: Uint8Array, bufferOffset: number, length: number, position: number): Promise<number>;
  truncate(length: number): Promise<void>;
  sync(): Promise<void>;
  close(): Promise<void>;
}

export interface AssetContentLockPort {
  release(): Promise<void>;
}

export interface AssetFileStorePort {
  preparePartial(input: { readonly projectRoot: string; readonly relativePath: string; readonly previousRelativePath: string | null; readonly previousResumeOffset: number }): Promise<{ readonly byteLength: number }>;
  stat(projectRoot: string, relativePath: string): Promise<{ readonly byteLength: number } | null>;
  openFile(projectRoot: string, relativePath: string): Promise<AssetFileHandlePort>;
  read(projectRoot: string, relativePath: string): AsyncIterable<Uint8Array>;
  remove(projectRoot: string, relativePath: string): Promise<void>;
  acquireContentLock(projectRoot: string, sha256: string, operationId: string, signal?: AbortSignal): Promise<AssetContentLockPort>;
  promote(projectRoot: string, sourceRelativePath: string, destinationRelativePath: string): Promise<void>;
}

export interface AssetLeaseInput {
  readonly projectId: string;
  readonly runId: string;
  readonly jobId: string;
  readonly leaseToken: string;
  readonly fencingGeneration: number;
  readonly ownerId: string;
}

export interface AssetRepositoryPort {
  ensureAssetSource(input: AssetSourceInput): Promise<AssetSource>;
  getAssetSource(input: { readonly projectId: string; readonly runId: string; readonly assetSourceId: string }): Promise<AssetSource>;
  beginAssetDownload(input: AssetLeaseInput & { readonly assetSourceId: string }): Promise<AssetSource>;
  assertAssetFinalizationOwnership(input: AssetLeaseInput & { readonly assetSourceId: string }): Promise<AssetSource>;
  saveAssetProgress(input: AssetLeaseInput & { readonly assetSourceId: string; readonly partialRelativePath: string; readonly bytesWritten: number; readonly expectedBytes: number | null; readonly validator: string | null; readonly etag?: string | null; readonly lastModified?: string | null; readonly resumeOffset: number; readonly operationId: string }): Promise<AssetSource>;
  finalizeAssetDownload(input: AssetLeaseInput & { readonly assetSourceId: string; readonly statusCode: number; readonly finalUrl: string; readonly redirectChain: readonly string[]; readonly contentType: string | null; readonly byteLength: number; readonly sha256: string; readonly storageRelativePath: string; readonly operationId: string; readonly completedAt: string }): Promise<{ readonly source: AssetSource; readonly content: AssetContent; readonly deduplicated: boolean }>;
  markAssetInterrupted(input: AssetLeaseInput & { readonly assetSourceId: string; readonly errorCode: string; readonly operationId: string }): Promise<AssetSource>;
  getAssetContent(input: { readonly projectId: string; readonly sha256: string }): Promise<AssetContent | null>;
  listPageAssets(input: { readonly projectId: string; readonly runId: string; readonly pageJobId: string }): Promise<readonly AssetSource[]>;
  listAssetPages(input: { readonly projectId: string; readonly runId: string; readonly assetSourceId: string }): Promise<readonly string[]>;
}

export interface AssetNetworkRequest {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly signal: AbortSignal;
  readonly proxyId: string | null;
  readonly sessionId: string | null;
}

export interface AssetNetworkResponse {
  readonly status: number;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: AsyncIterable<Uint8Array>;
}

export interface AssetNetworkPort {
  request(input: AssetNetworkRequest): Promise<AssetNetworkResponse>;
}
