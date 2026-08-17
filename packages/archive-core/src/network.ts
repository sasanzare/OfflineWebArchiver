import type { ExternalDependencyMap } from "./rewrite.js";

export const NETWORK_REPLAY_CONTRACT_VERSION = 1 as const;
export const STRICT_OFFLINE_POLICY_VERSION = 1 as const;

export type ReplayRequestMethod = "GET" | "HEAD";
export type NetworkReplayDecision = "fulfill" | "abort" | "allow-local" | "allow-network";

export interface ReplayRequest {
  method: ReplayRequestMethod;
  url: string;
  headers?: Readonly<Record<string, string>>;
}

export interface ReplayResponse {
  status: number;
  headers: Readonly<Record<string, string>>;
  bodyDigest: string;
  bodyBytes: number;
}

export interface NetworkReplayLookup {
  version: typeof NETWORK_REPLAY_CONTRACT_VERSION;
  key: string;
  response: ReplayResponse | null;
}

export interface StrictOfflinePolicy {
  version: typeof STRICT_OFFLINE_POLICY_VERSION;
  enabled: boolean;
  localOrigins: readonly string[];
}

export interface NetworkReplayOutcome {
  decision: NetworkReplayDecision;
  reasonCode: "REPLAY_MATCH" | "STRICT_OFFLINE_UNKNOWN_DEPENDENCY" | "LOCAL_RUNTIME_ALLOWED" | "NETWORK_ALLOWED";
  key: string;
  safeUrl: string;
}

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "proxy-authorization",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "x-csrf-token",
  "x-forwarded-for",
]);

function safeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.hash = "";
    if (url.search !== "") url.search = "?[redacted]";
    return url.toString().slice(0, 2_048);
  } catch {
    return "invalid-url";
  }
}

export function canonicalReplayRequestKey(request: Pick<ReplayRequest, "method" | "url">): string {
  if (request.method !== "GET" && request.method !== "HEAD") throw new Error("Replay only supports GET and HEAD requests");
  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Replay requests must use HTTP or HTTPS");
  url.username = "";
  url.password = "";
  url.hash = "";
  return `${request.method} ${url.toString()}`;
}

export function filterReplayHeaders(headers: Readonly<Record<string, string>>): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.entries(headers)
    .map(([name, value]) => [name.toLowerCase(), value.slice(0, 2_048)] as const)
    .filter(([name]) => !SENSITIVE_HEADERS.has(name))
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0));
}

export function decideNetworkReplay(input: {
  request: ReplayRequest;
  matchedResponse: ReplayResponse | null;
  strictOffline: StrictOfflinePolicy;
}): NetworkReplayOutcome {
  const key = canonicalReplayRequestKey(input.request);
  const parsed = new URL(input.request.url);
  const local = input.strictOffline.localOrigins.includes(parsed.origin);
  if (input.matchedResponse !== null) return { decision: "fulfill", reasonCode: "REPLAY_MATCH", key, safeUrl: safeUrl(input.request.url) };
  if (local) return { decision: "allow-local", reasonCode: "LOCAL_RUNTIME_ALLOWED", key, safeUrl: safeUrl(input.request.url) };
  if (input.strictOffline.enabled) return { decision: "abort", reasonCode: "STRICT_OFFLINE_UNKNOWN_DEPENDENCY", key, safeUrl: safeUrl(input.request.url) };
  return { decision: "allow-network", reasonCode: "NETWORK_ALLOWED", key, safeUrl: safeUrl(input.request.url) };
}

export function validateStrictOfflinePolicy(policy: StrictOfflinePolicy): StrictOfflinePolicy {
  if (policy.version !== STRICT_OFFLINE_POLICY_VERSION || !Array.isArray(policy.localOrigins) || policy.localOrigins.some((origin) => {
    try { return new URL(origin).origin !== origin; } catch { return true; }
  })) throw new Error("Strict Offline policy is invalid");
  return Object.freeze({ version: policy.version, enabled: policy.enabled, localOrigins: [...new Set(policy.localOrigins)].sort() });
}

/** Phase 19 persisted replay contracts. The original Phase 13 key remains above for compatibility. */
export const REPLAY_MATCH_CONTRACT_VERSION = 1 as const;
export const API_CAPTURE_CONTRACT_VERSION = 1 as const;

export type ReplayCaptureMethod = "GET";
export type ReplaySnapshotState = "complete" | "rejected" | "incomplete";

export interface ReplayQueryIdentityPolicy {
  readonly ignoredKeys?: readonly string[];
}

export interface ReplayRequestIdentityInput {
  readonly projectId: string;
  readonly runId: string;
  readonly projectRevisionId: string;
  readonly method: ReplayRequestMethod;
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly queryPolicy?: ReplayQueryIdentityPolicy;
}

export interface ReplayRequestIdentity {
  readonly contractVersion: typeof REPLAY_MATCH_CONTRACT_VERSION;
  readonly projectId: string;
  readonly runId: string;
  readonly projectRevisionId: string;
  readonly method: ReplayRequestMethod;
  readonly normalizedUrl: string;
  readonly selectedHeaders: Readonly<Record<string, string>>;
  readonly key: string;
}

export interface ReplaySnapshotDescriptor {
  readonly snapshotId: string;
  readonly captureVersion: typeof API_CAPTURE_CONTRACT_VERSION;
  readonly identity: ReplayRequestIdentity;
  readonly originalUrl: string;
  readonly status: number;
  readonly contentType: string;
  readonly responseHeaders: Readonly<Record<string, string>>;
  readonly bodySha256: string;
  readonly bodyBytes: number;
  readonly bodyRelativePath: string;
  readonly capturedAt: string;
  readonly pageId: string | null;
  readonly workerId: string | null;
  readonly state: ReplaySnapshotState;
}

export type ReplayMissReason =
  | "no-capture"
  | "ambiguous-match"
  | "revision-mismatch"
  | "method-not-supported"
  | "blocked-by-policy"
  | "sensitive-request"
  | "unsupported-scheme"
  | "unsupported-protocol"
  | "external-dependency"
  | "missing-response-body"
  | "integrity-failure";

export type ReplayLookupResult =
  | { readonly state: "match"; readonly snapshot: ReplaySnapshotDescriptor }
  | { readonly state: "miss"; readonly reason: ReplayMissReason }
  | { readonly state: "ambiguous"; readonly candidates: readonly ReplaySnapshotDescriptor[] }
  | { readonly state: "integrity-failure"; readonly snapshot: ReplaySnapshotDescriptor; readonly reason: string };

export interface ReplayLookupPort {
  lookup(input: ReplayRequestIdentityInput): Promise<ReplayLookupResult>;
  readBody(snapshot: ReplaySnapshotDescriptor): Promise<Uint8Array>;
}

export interface ReplayRuntimeEvent {
  readonly eventType: "replay-match" | "replay-miss" | "external-network-leakage" | "runtime-local-allow" | "mutation-blocked" | "service-worker-policy";
  readonly projectId: string;
  readonly runId: string;
  readonly projectRevisionId: string;
  readonly method: string;
  readonly safeUrl: string;
  readonly normalizedIdentity: string | null;
  readonly resourceType: string | null;
  readonly initiatingPage: string | null;
  readonly reason: string;
  readonly matchState: string;
  readonly strictOffline: boolean;
  readonly occurredAt: string;
}

export interface ReplayCapturePolicy {
  readonly version: typeof API_CAPTURE_CONTRACT_VERSION;
  readonly enabled: boolean;
  readonly allowedMethods: readonly ReplayCaptureMethod[];
  readonly allowedResourceTypes: readonly string[];
  readonly allowedContentTypePrefixes: readonly string[];
  readonly maximumResponseBytes: number;
  readonly rejectSensitiveResponseBodies: boolean;
}

export interface ReplayCaptureInput {
  readonly projectId: string;
  readonly runId: string;
  readonly projectRevisionId: string;
  readonly originalUrl: string;
  readonly request: { readonly method: string; readonly url: string; readonly headers?: Readonly<Record<string, string>> };
  readonly response: { readonly status: number; readonly headers: Readonly<Record<string, string>>; readonly contentType: string };
  readonly body: Uint8Array;
  readonly capturedAt: string;
  readonly pageId?: string | null;
  readonly workerId?: string | null;
  readonly queryPolicy?: ReplayQueryIdentityPolicy;
}

export interface ReplayCaptureSink {
  capture(input: ReplayCaptureInput): Promise<ReplaySnapshotDescriptor>;
}

export interface NetworkReplayPolicy {
  readonly version: typeof NETWORK_REPLAY_CONTRACT_VERSION;
  readonly projectId: string;
  readonly runId: string;
  readonly projectRevisionId: string;
  readonly runtimeOrigin: string;
  readonly strictOffline: boolean;
  readonly externalDependencyMap?: ExternalDependencyMap;
  readonly lookup: ReplayLookupPort;
  readonly onEvent?: (event: ReplayRuntimeEvent) => void | Promise<void>;
  readonly capture?: {
    readonly policy: ReplayCapturePolicy;
    readonly sink: ReplayCaptureSink;
    readonly capturedAt?: () => string;
    readonly pageId?: string | null;
    readonly workerId?: string | null;
    readonly queryPolicy?: ReplayQueryIdentityPolicy;
  };
}

const SELECTED_REPLAY_HEADERS = new Set(["accept", "accept-language", "content-type"]);
const DEFAULT_REPLAY_TRACKING_KEYS = new Set(["fbclid", "gclid", "mc_cid", "mc_eid", "utm_campaign", "utm_content", "utm_medium", "utm_source", "utm_term"]);
const REPLAY_SENSITIVE_QUERY_KEYS = /^(?:access[_-]?token|api[_-]?key|apikey|authorization|auth|code|cookie|credential|csrf|jwt|otp|pass(?:word)?|secret|session|token)$/i;
const REPLAY_SENSITIVE_BODY_MARKERS = /(?:"(?:authorization|cookie|set-cookie|password|otp|phone|session[_-]?token|access[_-]?token|api[_-]?key)"\s*:|bearer\s+[a-z0-9._-]{8,})/i;
const SAFE_REPLAY_RESPONSE_HEADERS = new Set([
  "cache-control", "content-language", "content-type", "etag", "expires", "last-modified", "vary",
  "access-control-allow-origin", "access-control-allow-credentials", "access-control-expose-headers", "location",
]);
const UNSAFE_REPLAY_RESPONSE_HEADERS = new Set([
  "connection", "content-encoding", "content-length", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "set-cookie", "transfer-encoding",
]);

function replayStableCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function replayStableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(replayStableJson).join(",")}]`;
  if (typeof value !== "object" || value === null) return JSON.stringify(value);
  return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => replayStableCompare(left, right)).map(([key, item]) => `${JSON.stringify(key)}:${replayStableJson(item)}`).join(",")}}`;
}

function replayScopeValue(value: string, label: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 256 || /[\u0000-\u001f\u007f]/.test(value)) throw new Error(`${label} is invalid`);
  return value;
}

function normalizeReplayUrlInternal(value: string, ignoredKeys: readonly string[] = []): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Replay requests must use HTTP or HTTPS");
  if (url.username !== "" || url.password !== "") throw new Error("Replay requests cannot contain credentials");
  url.hash = "";
  const ignored = new Set([...DEFAULT_REPLAY_TRACKING_KEYS, ...ignoredKeys.map((key) => key.toLowerCase())]);
  const query = [...url.searchParams.entries()]
    .filter(([key]) => {
      if (REPLAY_SENSITIVE_QUERY_KEYS.test(key)) throw new Error("Replay requests cannot contain sensitive query parameters");
      return !ignored.has(key.toLowerCase());
    })
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => replayStableCompare(leftKey, rightKey) || replayStableCompare(leftValue, rightValue));
  url.search = "";
  for (const [key, parameterValue] of query) url.searchParams.append(key, parameterValue);
  return url.toString();
}

export function normalizeReplayUrl(url: string, queryPolicy?: ReplayQueryIdentityPolicy): string {
  return normalizeReplayUrlInternal(url, queryPolicy?.ignoredKeys ?? []);
}

export function safeReplayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = "";
    parsed.password = "";
    parsed.hash = "";
    const parameters = [...parsed.searchParams.entries()].map(([key, value]) => [key, REPLAY_SENSITIVE_QUERY_KEYS.test(key) ? "[redacted]" : value] as const);
    parsed.search = "";
    for (const [key, value] of parameters) parsed.searchParams.append(key, value);
    return parsed.toString().slice(0, 2_048);
  } catch {
    return "invalid-url";
  }
}

export function selectReplayMatchHeaders(headers: Readonly<Record<string, string>> = {}): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.entries(headers)
    .map(([name, value]) => [name.toLowerCase(), value.trim().slice(0, 512)] as const)
    .filter(([name, value]) => SELECTED_REPLAY_HEADERS.has(name) && !SENSITIVE_HEADERS.has(name) && value.length > 0)
    .sort(([left], [right]) => replayStableCompare(left, right)));
}

export function canonicalReplayRequestIdentity(input: ReplayRequestIdentityInput): ReplayRequestIdentity {
  if (input.method !== "GET" && input.method !== "HEAD") throw new Error("Replay only supports GET and HEAD requests");
  const projectId = replayScopeValue(input.projectId, "Project ID");
  const runId = replayScopeValue(input.runId, "Run ID");
  const projectRevisionId = replayScopeValue(input.projectRevisionId, "Project revision ID");
  const normalizedUrl = normalizeReplayUrlInternal(input.url, input.queryPolicy?.ignoredKeys ?? []);
  const selectedHeaders = selectReplayMatchHeaders(input.headers);
  const basis = { contractVersion: REPLAY_MATCH_CONTRACT_VERSION, projectId, runId, projectRevisionId, method: input.method, normalizedUrl, selectedHeaders };
  return Object.freeze({ ...basis, key: replayStableJson(basis) });
}

export function defaultReplayCapturePolicy(): ReplayCapturePolicy {
  return Object.freeze({
    version: API_CAPTURE_CONTRACT_VERSION,
    enabled: true,
    allowedMethods: ["GET"] as const,
    allowedResourceTypes: ["fetch", "xhr"],
    allowedContentTypePrefixes: ["application/json", "application/problem+json", "application/ld+json", "text/json"],
    maximumResponseBytes: 8 * 1024 * 1024,
    rejectSensitiveResponseBodies: true,
  });
}

export type CaptureEligibility = "capturable" | "ignored" | "blocked" | "sensitive" | "unsupported" | "side-effect-risk";

export interface CaptureEligibilityResult {
  readonly eligibility: CaptureEligibility;
  readonly reasonCode: string;
  readonly safeUrl: string;
}

export function classifyCaptureEligibility(input: {
  readonly policy: ReplayCapturePolicy;
  readonly method: string;
  readonly url: string;
  readonly resourceType: string;
  readonly contentType: string | null;
  readonly requestHeaders?: Readonly<Record<string, string>>;
  readonly responseHeaders?: Readonly<Record<string, string>>;
}): CaptureEligibilityResult {
  const safe = safeReplayUrl(input.url);
  if (!input.policy.enabled) return { eligibility: "ignored", reasonCode: "CAPTURE_DISABLED", safeUrl: safe };
  if (input.method !== "GET") return { eligibility: ["POST", "PUT", "PATCH", "DELETE"].includes(input.method) ? "side-effect-risk" : "unsupported", reasonCode: "METHOD_NOT_ELIGIBLE", safeUrl: safe };
  if (!input.policy.allowedMethods.includes("GET")) return { eligibility: "ignored", reasonCode: "METHOD_NOT_ENABLED", safeUrl: safe };
  const allHeaders = { ...(input.requestHeaders ?? {}), ...(input.responseHeaders ?? {}) };
  if (Object.keys(allHeaders).some((name) => SENSITIVE_HEADERS.has(name.toLowerCase()))) return { eligibility: "sensitive", reasonCode: "SENSITIVE_HEADER_PRESENT", safeUrl: safe };
  if (!input.policy.allowedResourceTypes.includes(input.resourceType)) return { eligibility: "unsupported", reasonCode: "RESOURCE_TYPE_NOT_ELIGIBLE", safeUrl: safe };
  const contentType = (input.contentType ?? "").split(";", 1)[0]!.trim().toLowerCase();
  if (contentType.length === 0 || !input.policy.allowedContentTypePrefixes.some((prefix) => contentType.startsWith(prefix.toLowerCase()))) return { eligibility: "ignored", reasonCode: "CONTENT_TYPE_NOT_ELIGIBLE", safeUrl: safe };
  return { eligibility: "capturable", reasonCode: "ELIGIBLE_GET_RESPONSE", safeUrl: safe };
}

export function containsSensitiveReplayBody(body: Uint8Array, contentType: string): boolean {
  if (!/^(?:application\/(?:json|problem\+json|ld\+json)|text\/json)/i.test(contentType)) return false;
  try { return REPLAY_SENSITIVE_BODY_MARKERS.test(new TextDecoder().decode(body.subarray(0, 1_048_576))); }
  catch { return true; }
}

export function sanitizeReplayResponseHeaders(headers: Readonly<Record<string, string>>, options: { readonly allowLocalRedirect?: (value: string) => boolean } = {}): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [rawName, rawValue] of Object.entries(headers)) {
    const name = rawName.toLowerCase();
    if (!SAFE_REPLAY_RESPONSE_HEADERS.has(name) || UNSAFE_REPLAY_RESPONSE_HEADERS.has(name)) continue;
    const value = rawValue.replace(/[\r\n\u0000]/g, " ").slice(0, 4_096).trim();
    if (value.length === 0) continue;
    if (name === "location" && options.allowLocalRedirect?.(value) !== true) continue;
    result[name] = value;
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => replayStableCompare(left, right)));
}

export function isReplayableResponseStatus(status: number): boolean {
  return Number.isInteger(status) && status >= 200 && status <= 599;
}

export function isRuntimeLocalRequest(url: string, runtimeOrigin: string): boolean {
  try {
    const requested = new URL(url);
    const expected = new URL(runtimeOrigin);
    return expected.origin === runtimeOrigin && requested.origin === expected.origin && (requested.protocol === "http:" || requested.protocol === "https:");
  } catch {
    return false;
  }
}

export function classifyReplayMiss(value: ReplayLookupResult | null): ReplayMissReason {
  if (value === null) return "no-capture";
  if (value.state === "miss") return value.reason;
  if (value.state === "ambiguous") return "ambiguous-match";
  if (value.state === "integrity-failure") return "integrity-failure";
  return "no-capture";
}

export function classifyReplayExternalDependency(url: string, map?: ExternalDependencyMap): string | null {
  if (map === undefined) return null;
  let normalizedUrl: string;
  try { normalizedUrl = normalizeReplayUrlInternal(url); }
  catch { return null; }
  const dependency = map.dependencies.find((candidate) => {
    const value = candidate.normalizedUrl ?? candidate.resolvedUrl;
    if (value === null) return false;
    try { return normalizeReplayUrlInternal(value) === normalizedUrl; }
    catch { return false; }
  });
  return dependency?.classification ?? null;
}
