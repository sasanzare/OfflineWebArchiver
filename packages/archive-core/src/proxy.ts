import { parseSecretRef, type SecretRef } from "./secrets.js";

export const PROXY_CONTRACT_VERSION = 1 as const;

export const PROXY_PROTOCOLS = Object.freeze(["http", "https", "socks5"] as const);
export type ProxyProtocol = (typeof PROXY_PROTOCOLS)[number];

export const PROXY_HEALTH_STATES = Object.freeze(["healthy", "degraded", "cooldown", "disabled"] as const);
export type ProxyHealthState = (typeof PROXY_HEALTH_STATES)[number];

export const PROXY_CONNECTION_MODES = Object.freeze(["direct", "single-proxy", "proxy-pool"] as const);
export type ProxyConnectionMode = (typeof PROXY_CONNECTION_MODES)[number];

export type ProxyTestStatus = "success" | "failure";
export type ProxyIpCheckStatus = "verified" | "unavailable" | "invalid";

export interface ProxyCredential {
  readonly username: string;
  readonly password: string;
}

export interface ProxyDraft {
  readonly id?: string;
  readonly label?: string | null;
  readonly protocol: ProxyProtocol | string;
  readonly host: string;
  readonly port: number;
  readonly bypass?: readonly string[] | null;
  readonly credentialRef?: SecretRef | string | null;
  readonly weight?: number;
  readonly priority?: number;
  readonly maxConcurrency?: number;
  readonly enabled?: boolean;
}

export interface ProxyMetadata {
  readonly id: string;
  readonly label: string | null;
  readonly protocol: ProxyProtocol;
  readonly host: string;
  readonly port: number;
  readonly bypass: readonly string[];
  readonly credentialRef: SecretRef | null;
  readonly weight: number;
  readonly priority: number;
  readonly maxConcurrency: number;
  readonly enabled: boolean;
  readonly healthState: ProxyHealthState;
  readonly lastHealthCheckAt: string | null;
  readonly lastSuccessAt: string | null;
  readonly lastFailureAt: string | null;
  readonly latencyMs: number | null;
  readonly successCount: number;
  readonly failureCount: number;
  readonly consecutiveFailureCount: number;
  readonly successRate: number;
  readonly cooldownUntil: string | null;
  readonly lastErrorCode: string | null;
  readonly lastErrorSummary: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
}

export interface ProxyHealthPolicy {
  readonly failureThreshold: number;
  readonly cooldownMs: number;
  readonly degradedLatencyMs: number;
}

export const DEFAULT_PROXY_HEALTH_POLICY: ProxyHealthPolicy = Object.freeze({
  failureThreshold: 3,
  cooldownMs: 30_000,
  degradedLatencyMs: 1_500,
});

export interface ProxyHealthCheckOutcome {
  readonly status: ProxyTestStatus;
  readonly checkedAt?: string;
  readonly latencyMs?: number | null;
  readonly errorCode?: string | null;
  readonly errorSummary?: string | null;
}

export interface ProxyConnectivityRequest {
  readonly proxy: ProxyMetadata;
  readonly credential?: ProxyCredential | null;
  readonly targetUrl: string;
  readonly ipCheckUrl?: string | null;
  readonly timeoutMs: number;
}

export interface ProxyConnectivityResult {
  readonly proxyId: string;
  readonly protocol: ProxyProtocol;
  readonly status: ProxyTestStatus;
  readonly checkedAt: string;
  readonly latencyMs: number | null;
  readonly targetUrlSafe: string;
  readonly targetEndpointId: string;
  readonly ipCheckStatus: ProxyIpCheckStatus;
  readonly observedIp: string | null;
  readonly errorCode: string | null;
  readonly errorSummary: string | null;
}

export interface ProxyConnectivityPort {
  testProxy(input: ProxyConnectivityRequest): Promise<ProxyConnectivityResult>;
}

export interface ProxyRepositoryPort {
  createProxy(input: { readonly projectId: string; readonly metadata: ProxyMetadata }): Promise<ProxyMetadata>;
  getProxy(input: { readonly projectId: string; readonly proxyId: string }): Promise<ProxyMetadata>;
  listProxies(input: { readonly projectId: string }): Promise<readonly ProxyMetadata[]>;
  updateProxy(input: { readonly projectId: string; readonly proxyId: string; readonly expectedRevision: number; readonly metadata: ProxyMetadata }): Promise<ProxyMetadata>;
  deleteProxy(input: { readonly projectId: string; readonly proxyId: string }): Promise<void>;
  importProxies(input: { readonly projectId: string; readonly items: readonly { readonly record: number; readonly metadata: ProxyMetadata }[] }): Promise<ProxyImportPersistenceResult>;
}

export interface ProxyImportPersistenceError {
  readonly record: number;
  readonly code: "PROXY_ALREADY_EXISTS" | "PROXY_REVISION_CONFLICT" | "PROXY_CONFIG_INVALID";
  readonly message: string;
}

export interface ProxyImportPersistenceResult {
  readonly imported: number;
  readonly updated: number;
  readonly skipped: number;
  readonly failed: number;
  readonly errors: readonly ProxyImportPersistenceError[];
}

export interface ProxyRuntimeConfiguration {
  readonly server: string;
  readonly bypass: readonly string[];
  readonly username?: string;
  readonly password?: string;
}

export type ProxyOperationErrorCode =
  | "PROXY_CONFIG_INVALID"
  | "PROXY_PROTOCOL_UNSUPPORTED"
  | "PROXY_AUTH_FAILED"
  | "PROXY_CONNECT_TIMEOUT"
  | "PROXY_DNS_FAILED"
  | "PROXY_TLS_FAILED"
  | "PROXY_UNREACHABLE"
  | "PROXY_HEALTHCHECK_FAILED"
  | "PROXY_COOLDOWN"
  | "PROXY_DISABLED"
  | "PROXY_SECRET_MISSING"
  | "PROXY_SECRET_INVALID"
  | "PROXY_AFFINITY_MISMATCH"
  | "PROXY_AFFINITY_UNAVAILABLE"
  | "PROXY_DIRECT_FALLBACK_BLOCKED"
  | "PROXY_IMPORT_INVALID"
  | "PROXY_NOT_FOUND"
  | "PROXY_ALREADY_EXISTS"
  | "PROXY_REVISION_CONFLICT"
  | "PROXY_UNAVAILABLE";

export class ProxyOperationError extends Error {
  public constructor(
    public readonly code: ProxyOperationErrorCode,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "ProxyOperationError";
  }
}

export interface ProxyImportError {
  readonly record: number;
  readonly field: string | null;
  readonly code: ProxyOperationErrorCode;
  readonly message: string;
}

export interface ParsedProxyImportRecord {
  readonly record: number;
  readonly draft: ProxyDraft;
  readonly credential: ProxyCredential | null;
}

export interface ProxyImportParseResult {
  readonly formatVersion: typeof PROXY_CONTRACT_VERSION;
  readonly records: readonly ParsedProxyImportRecord[];
  readonly errors: readonly ProxyImportError[];
}

export interface ProxyEligibility {
  readonly eligible: boolean;
  readonly reasonCode: "ELIGIBLE" | "PROXY_DISABLED" | "PROXY_COOLDOWN" | "PROXY_HEALTHCHECK_FAILED" | "PROXY_SECRET_MISSING" | "PROXY_CONFIG_INVALID";
}

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_LABEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._:-]{0,119}$/;
const SAFE_HOST_PATTERN = /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/i;
const IPV6_PATTERN = /^[0-9a-f:]{2,45}$/i;
const SAFE_BYPASS_PATTERN = /^(?:\*\.)?[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/i;
const SAFE_CREDENTIAL_USERNAME_PATTERN = /^[^\u0000-\u001f\u007f]{1,256}$/;
const SAFE_CREDENTIAL_PASSWORD_PATTERN = /^[^\u0000-\u001f\u007f]{1,4096}$/;
const SAFE_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const SAFE_IMPORT_FIELDS = new Set([
  "id", "label", "protocol", "host", "port", "bypass", "credentialRef", "username", "password", "weight", "priority", "maxConcurrency", "enabled",
]);

function invalid(message: string, code: ProxyOperationErrorCode = "PROXY_CONFIG_INVALID"): never {
  throw new ProxyOperationError(code, message);
}

function assertTimestamp(value: string, label: string): void {
  if (!SAFE_TIMESTAMP_PATTERN.test(value) || Number.isNaN(Date.parse(value))) invalid(`${label} is invalid`);
}

function assertSafeString(value: unknown, label: string, maximum: number): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum || /[\u0000-\u001f\u007f]/.test(value)) invalid(`${label} is invalid`);
}

export function normalizeProxyHost(value: unknown): string {
  assertSafeString(value, "The Proxy host", 253);
  let host = value.trim().toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  if (host.endsWith(".")) host = host.slice(0, -1);
  if (host.length === 0 || host.includes("/") || host.includes("@") || host.includes("#") || host.includes("?")) invalid("The Proxy host is invalid");
  if (host.includes(":")) {
    if (!IPV6_PATTERN.test(host) || host.includes(":::") || !host.includes("::")) invalid("The Proxy host is not a valid IPv6 literal");
    return host;
  }
  if (!SAFE_HOST_PATTERN.test(host) || host.includes("..") || host.split(".").some((part) => part.length > 63)) invalid("The Proxy host is invalid");
  return host;
}

export function normalizeProxyProtocol(value: unknown): ProxyProtocol {
  if (typeof value !== "string") invalid("The Proxy protocol is invalid");
  const protocol = value.trim().toLowerCase();
  if (!(PROXY_PROTOCOLS as readonly string[]).includes(protocol)) invalid("The Proxy protocol is unsupported", "PROXY_PROTOCOL_UNSUPPORTED");
  return protocol as ProxyProtocol;
}

export function normalizeProxyPort(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 65_535) invalid("The Proxy port is invalid");
  return value;
}

function normalizeProxyId(value: unknown): string {
  assertSafeString(value, "The Proxy identifier", 128);
  const id = value.trim();
  if (!IDENTIFIER_PATTERN.test(id)) invalid("The Proxy identifier is invalid");
  return id;
}

function normalizeLabel(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  assertSafeString(value, "The Proxy label", 120);
  const label = value.trim();
  if (!SAFE_LABEL_PATTERN.test(label) || /(?:password|passphrase|token|secret|cookie|authorization|credential|username)/i.test(label)) invalid("The Proxy label must be non-sensitive");
  return label;
}

function normalizeBypass(value: unknown): readonly string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 100) invalid("The Proxy bypass list is invalid");
  const normalized = value.map((entry) => {
    assertSafeString(entry, "The Proxy bypass host", 253);
    const item = entry.trim().toLowerCase();
    if (!SAFE_BYPASS_PATTERN.test(item) || item.includes("..")) invalid("The Proxy bypass list contains an invalid host");
    return item;
  });
  return [...new Set(normalized)].sort();
}

function normalizeBoundedInteger(value: unknown, label: string, minimum: number, maximum: number, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) invalid(`${label} is invalid`);
  return value;
}

export function normalizeProxyCredential(value: unknown): ProxyCredential | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) invalid("The Proxy credential is invalid", "PROXY_SECRET_INVALID");
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => key !== "username" && key !== "password")) invalid("The Proxy credential contains unsupported fields", "PROXY_SECRET_INVALID");
  if (!SAFE_CREDENTIAL_USERNAME_PATTERN.test(String(candidate["username"] ?? "")) || !SAFE_CREDENTIAL_PASSWORD_PATTERN.test(String(candidate["password"] ?? ""))) invalid("The Proxy credential is invalid", "PROXY_SECRET_INVALID");
  return { username: String(candidate["username"]), password: String(candidate["password"]) };
}

export function normalizeProxyDraft(value: unknown, options: { readonly requireId?: boolean } = {}): ProxyDraft {
  if (typeof value !== "object" || value === null || Array.isArray(value)) invalid("The Proxy configuration is invalid");
  const candidate = value as Record<string, unknown>;
  for (const key of Object.keys(candidate)) if (!SAFE_IMPORT_FIELDS.has(key)) invalid("The Proxy configuration contains an unsupported field", "PROXY_IMPORT_INVALID");
  const protocol = normalizeProxyProtocol(candidate["protocol"]);
  const host = normalizeProxyHost(candidate["host"]);
  const port = normalizeProxyPort(candidate["port"]);
  const credentialRef = candidate["credentialRef"] === undefined || candidate["credentialRef"] === null
    ? null
    : (() => {
        try {
          return parseSecretRef(candidate["credentialRef"]).serialized;
        } catch {
          invalid("The Proxy credential reference is invalid", "PROXY_SECRET_INVALID");
        }
      })();
  const draft: ProxyDraft = {
    ...(candidate["id"] === undefined ? {} : { id: normalizeProxyId(candidate["id"]) }),
    label: normalizeLabel(candidate["label"]),
    protocol,
    host,
    port,
    bypass: normalizeBypass(candidate["bypass"]),
    credentialRef,
    weight: normalizeBoundedInteger(candidate["weight"], "The Proxy weight", 1, 1_000, 1),
    priority: normalizeBoundedInteger(candidate["priority"], "The Proxy priority", 0, 1_000, 0),
    maxConcurrency: normalizeBoundedInteger(candidate["maxConcurrency"], "The Proxy maximum concurrency", 1, 1_000, 1),
    enabled: candidate["enabled"] === undefined ? true : candidate["enabled"] === true,
  };
  if (candidate["enabled"] !== undefined && typeof candidate["enabled"] !== "boolean") invalid("The Proxy enabled flag is invalid");
  if (options.requireId === true && draft.id === undefined) invalid("The Proxy identifier is required");
  return draft;
}

export function canonicalProxyIdentity(input: Pick<ProxyDraft, "protocol" | "host" | "port"> | Pick<ProxyMetadata, "protocol" | "host" | "port">): string {
  const protocol = normalizeProxyProtocol(input.protocol);
  const host = normalizeProxyHost(input.host);
  const port = normalizeProxyPort(input.port);
  return `${protocol}://${host.includes(":") ? `[${host}]` : host}:${port}`;
}

export function proxyServerUrl(proxy: Pick<ProxyMetadata, "protocol" | "host" | "port">): string {
  return canonicalProxyIdentity(proxy);
}

export function createProxyMetadata(input: ProxyDraft & { readonly now: string }): ProxyMetadata {
  const { now, ...draftInput } = input;
  const draft = normalizeProxyDraft(draftInput, { requireId: true });
  assertTimestamp(now, "The Proxy timestamp");
  return {
    id: draft.id!,
    label: draft.label ?? null,
    protocol: draft.protocol as ProxyProtocol,
    host: draft.host,
    port: draft.port,
    bypass: draft.bypass ?? [],
    credentialRef: (draft.credentialRef ?? null) as SecretRef | null,
    weight: draft.weight ?? 1,
    priority: draft.priority ?? 0,
    maxConcurrency: draft.maxConcurrency ?? 1,
    enabled: draft.enabled ?? true,
    healthState: draft.enabled === false ? "disabled" : "degraded",
    lastHealthCheckAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    latencyMs: null,
    successCount: 0,
    failureCount: 0,
    consecutiveFailureCount: 0,
    successRate: 0,
    cooldownUntil: null,
    lastErrorCode: null,
    lastErrorSummary: null,
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
}

export function assertProxyMetadata(proxy: ProxyMetadata): void {
  normalizeProxyId(proxy.id);
  normalizeProxyProtocol(proxy.protocol);
  normalizeProxyHost(proxy.host);
  normalizeProxyPort(proxy.port);
  normalizeLabel(proxy.label);
  normalizeBypass(proxy.bypass);
  normalizeBoundedInteger(proxy.weight, "The Proxy weight", 1, 1_000, 1);
  normalizeBoundedInteger(proxy.priority, "The Proxy priority", 0, 1_000, 0);
  normalizeBoundedInteger(proxy.maxConcurrency, "The Proxy maximum concurrency", 1, 1_000, 1);
  if (proxy.credentialRef !== null) parseSecretRef(proxy.credentialRef);
  if (typeof proxy.enabled !== "boolean" || !(PROXY_HEALTH_STATES as readonly string[]).includes(proxy.healthState)) invalid("The Proxy state is invalid");
  if (!proxy.enabled && proxy.healthState !== "disabled") invalid("A disabled Proxy must use the disabled health state");
  if (proxy.enabled && proxy.healthState === "disabled") invalid("An enabled Proxy cannot use the disabled health state");
  for (const [value, label] of [[proxy.lastHealthCheckAt, "last health check"], [proxy.lastSuccessAt, "last success"], [proxy.lastFailureAt, "last failure"], [proxy.cooldownUntil, "cooldown"]] as const) if (value !== null) assertTimestamp(value, `The Proxy ${label} timestamp`);
  if (proxy.latencyMs !== null && (!Number.isInteger(proxy.latencyMs) || proxy.latencyMs < 0 || proxy.latencyMs > 86_400_000)) invalid("The Proxy latency is invalid");
  for (const [value, label] of [[proxy.successCount, "success count"], [proxy.failureCount, "failure count"], [proxy.consecutiveFailureCount, "consecutive failure count"], [proxy.revision, "revision"]] as const) if (!Number.isInteger(value) || value < 0 || (label === "revision" && value < 1)) invalid(`The Proxy ${label} is invalid`);
  if (!Number.isFinite(proxy.successRate) || proxy.successRate < 0 || proxy.successRate > 1) invalid("The Proxy success rate is invalid");
  assertTimestamp(proxy.createdAt, "The Proxy creation time");
  assertTimestamp(proxy.updatedAt, "The Proxy update time");
}

export function validateProxyHealthPolicy(policy: ProxyHealthPolicy): ProxyHealthPolicy {
  normalizeBoundedInteger(policy.failureThreshold, "The Proxy failure threshold", 1, 100, 3);
  normalizeBoundedInteger(policy.cooldownMs, "The Proxy cooldown", 1_000, 86_400_000, 30_000);
  normalizeBoundedInteger(policy.degradedLatencyMs, "The Proxy degraded latency threshold", 1, 86_400_000, 1_500);
  return { ...policy };
}

function addMilliseconds(timestamp: string, milliseconds: number): string {
  const value = Date.parse(timestamp);
  if (!Number.isFinite(value)) invalid("The Proxy timestamp is invalid");
  return new Date(value + milliseconds).toISOString();
}

export function sanitizeProxyErrorSummary(value: unknown): string {
  if (typeof value !== "string") return "Proxy health check failed";
  return value
    .replace(/\/\/[^\s/@]+:[^\s/@]+@/g, "//")
    .replace(/(?:password|passwd|passphrase|secret|token|authorization|proxy-authorization|username)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 240) || "Proxy health check failed";
}

export function sanitizeProxyErrorCode(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Z0-9][A-Z0-9._:-]{0,119}$/.test(value)) return "PROXY_HEALTHCHECK_FAILED";
  return value;
}

export function recordProxyHealthCheck(proxy: ProxyMetadata, outcome: ProxyHealthCheckOutcome, now: string, policy: ProxyHealthPolicy = DEFAULT_PROXY_HEALTH_POLICY): ProxyMetadata {
  assertProxyMetadata(proxy);
  const boundedPolicy = validateProxyHealthPolicy(policy);
  assertTimestamp(now, "The Proxy health timestamp");
  const checkedAt = outcome.checkedAt ?? now;
  assertTimestamp(checkedAt, "The Proxy health check time");
  const latencyMs = outcome.latencyMs === undefined || outcome.latencyMs === null ? null : normalizeBoundedInteger(outcome.latencyMs, "The Proxy latency", 0, 86_400_000, 0);
  const total = proxy.successCount + proxy.failureCount + 1;
  if (!proxy.enabled) return { ...proxy, healthState: "disabled", lastHealthCheckAt: checkedAt, updatedAt: now, revision: proxy.revision + 1 };
  if (outcome.status === "success") {
    const successCount = proxy.successCount + 1;
    return {
      ...proxy,
      healthState: latencyMs !== null && latencyMs >= boundedPolicy.degradedLatencyMs ? "degraded" : "healthy",
      lastHealthCheckAt: checkedAt,
      lastSuccessAt: checkedAt,
      latencyMs,
      successCount,
      consecutiveFailureCount: 0,
      successRate: successCount / total,
      cooldownUntil: null,
      lastErrorCode: null,
      lastErrorSummary: null,
      updatedAt: now,
      revision: proxy.revision + 1,
    };
  }
  const failureCount = proxy.failureCount + 1;
  const consecutiveFailureCount = proxy.consecutiveFailureCount + 1;
  const cooling = consecutiveFailureCount >= boundedPolicy.failureThreshold;
  return {
    ...proxy,
    healthState: cooling ? "cooldown" : "degraded",
    lastHealthCheckAt: checkedAt,
    lastFailureAt: checkedAt,
    latencyMs,
    failureCount,
    consecutiveFailureCount,
    successRate: proxy.successCount / total,
    cooldownUntil: cooling ? addMilliseconds(now, boundedPolicy.cooldownMs) : null,
    lastErrorCode: sanitizeProxyErrorCode(outcome.errorCode),
    lastErrorSummary: sanitizeProxyErrorSummary(outcome.errorSummary),
    updatedAt: now,
    revision: proxy.revision + 1,
  };
}

export function expireProxyCooldown(proxy: ProxyMetadata, now: string): ProxyMetadata {
  assertProxyMetadata(proxy);
  assertTimestamp(now, "The Proxy timestamp");
  if (proxy.healthState !== "cooldown" || proxy.cooldownUntil === null || Date.parse(proxy.cooldownUntil) > Date.parse(now)) return proxy;
  return { ...proxy, healthState: proxy.enabled ? "degraded" : "disabled", cooldownUntil: null, updatedAt: now, revision: proxy.revision + 1 };
}

export function getProxyEligibility(proxy: ProxyMetadata, now: string, credentialAvailable = false): ProxyEligibility {
  try { assertProxyMetadata(proxy); } catch { return { eligible: false, reasonCode: "PROXY_CONFIG_INVALID" }; }
  if (!proxy.enabled || proxy.healthState === "disabled") return { eligible: false, reasonCode: "PROXY_DISABLED" };
  if (proxy.healthState === "cooldown" || (proxy.cooldownUntil !== null && Date.parse(proxy.cooldownUntil) > Date.parse(now))) return { eligible: false, reasonCode: "PROXY_COOLDOWN" };
  if (proxy.healthState !== "healthy") return { eligible: false, reasonCode: "PROXY_HEALTHCHECK_FAILED" };
  if (proxy.credentialRef !== null && !credentialAvailable) return { eligible: false, reasonCode: "PROXY_SECRET_MISSING" };
  return { eligible: true, reasonCode: "ELIGIBLE" };
}

export function isProxyEligible(proxy: ProxyMetadata, now: string, credentialAvailable = false): boolean {
  return getProxyEligibility(proxy, now, credentialAvailable).eligible;
}

export function assertProxyAffinity(boundProxyId: string | null, requestedProxyId: string | null): void {
  if (boundProxyId !== requestedProxyId) throw new ProxyOperationError("PROXY_AFFINITY_MISMATCH", "The authenticated Session is bound to another Proxy");
}

export function selectEligibleProxy(input: {
  readonly mode: ProxyConnectionMode;
  readonly proxies: readonly ProxyMetadata[];
  readonly now: string;
  readonly selectedProxyId?: string | null;
  readonly sessionProxyId?: string | null;
  readonly credentialAvailable?: (proxy: ProxyMetadata) => boolean;
}): ProxyMetadata | null {
  if (input.mode === "direct") {
    if (input.sessionProxyId !== undefined && input.sessionProxyId !== null) throw new ProxyOperationError("PROXY_DIRECT_FALLBACK_BLOCKED", "Direct access is not permitted for a Proxy-affined Session");
    return null;
  }
  const requested = input.selectedProxyId ?? input.sessionProxyId ?? null;
  if (input.sessionProxyId !== undefined && input.sessionProxyId !== null) assertProxyAffinity(input.sessionProxyId, requested);
  const candidates = input.proxies.filter((proxy) => {
    if (requested !== null && proxy.id !== requested) return false;
    return isProxyEligible(proxy, input.now, input.credentialAvailable?.(proxy) ?? false);
  });
  if (requested !== null && candidates.length === 0) {
    const selected = input.proxies.find((proxy) => proxy.id === requested);
    if (selected?.healthState === "disabled" || selected?.enabled === false) throw new ProxyOperationError("PROXY_DISABLED", "The selected Proxy is disabled");
    if (selected?.healthState === "cooldown") throw new ProxyOperationError("PROXY_COOLDOWN", "The selected Proxy is in cooldown");
    if (selected?.credentialRef !== null && selected?.credentialRef !== undefined && !(input.credentialAvailable?.(selected) ?? false)) throw new ProxyOperationError("PROXY_SECRET_MISSING", "The selected Proxy credential is unavailable");
    throw new ProxyOperationError("PROXY_AFFINITY_UNAVAILABLE", "The selected Proxy is not eligible");
  }
  if (candidates.length === 0) throw new ProxyOperationError("PROXY_UNAVAILABLE", "No eligible Proxy is available; Direct fallback is blocked");
  return [...candidates].sort((left, right) => left.priority - right.priority || right.weight - left.weight || left.id.localeCompare(right.id, "en"))[0] ?? null;
}

export function createProxyRuntimeConfiguration(proxy: ProxyMetadata, credential: ProxyCredential | null = null): ProxyRuntimeConfiguration {
  assertProxyMetadata(proxy);
  if (proxy.credentialRef !== null && credential === null) throw new ProxyOperationError("PROXY_SECRET_MISSING", "The Proxy credential is required at connection creation");
  return {
    server: proxyServerUrl(proxy),
    bypass: [...proxy.bypass],
    ...(credential === null ? {} : { username: credential.username, password: credential.password }),
  };
}

function normalizeImportBypass(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return [];
  if (trimmed.startsWith("[")) {
    try { return JSON.parse(trimmed) as unknown; } catch { return trimmed.split(";").map((entry) => entry.trim()); }
  }
  return trimmed.split(/[;,]/).map((entry) => entry.trim()).filter(Boolean);
}

function parseCsv(text: string): readonly Record<string, unknown>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
      continue;
    }
    if (character === '"' && field.length === 0) quoted = true;
    else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); field = "";
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
    } else field += character;
  }
  if (quoted) invalid("The CSV import contains an unterminated quoted field", "PROXY_IMPORT_INVALID");
  if (field.length > 0 || row.length > 0) { row.push(field); if (row.some((value) => value.length > 0)) rows.push(row); }
  if (rows.length === 0) return [];
  const headers = rows[0]!.map((value) => value.trim());
  if (headers.length === 0 || headers.some((header) => !SAFE_IMPORT_FIELDS.has(header) || header.length === 0) || new Set(headers).size !== headers.length) invalid("The CSV header is invalid", "PROXY_IMPORT_INVALID");
  return rows.slice(1).map((values) => {
    if (values.length !== headers.length) invalid("The CSV row has an unexpected number of fields", "PROXY_IMPORT_INVALID");
    const result: Record<string, unknown> = {};
    headers.forEach((header, index) => { result[header] = values[index] ?? ""; });
    if (result["bypass"] !== undefined) result["bypass"] = normalizeImportBypass(result["bypass"]);
    for (const key of ["port", "weight", "priority", "maxConcurrency"] as const) if (typeof result[key] === "string" && result[key] !== "") result[key] = Number(result[key]);
    if (typeof result["enabled"] === "string" && result["enabled"] !== "") result["enabled"] = result["enabled"]!.toLowerCase() === "true";
    return result;
  });
}

function parseJson(text: string): readonly Record<string, unknown>[] {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { invalid("The JSON import is malformed", "PROXY_IMPORT_INVALID"); }
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    const wrapper = parsed as Record<string, unknown>;
    if (wrapper["version"] !== 1 || !Array.isArray(wrapper["proxies"]) || Object.keys(wrapper).some((key) => key !== "version" && key !== "proxies")) invalid("The JSON import envelope is invalid", "PROXY_IMPORT_INVALID");
    return wrapper["proxies"] as Record<string, unknown>[];
  }
  invalid("The JSON import must contain a Proxy array", "PROXY_IMPORT_INVALID");
}

export function parseProxyImport(input: { readonly format: "csv" | "json"; readonly text: string }): ProxyImportParseResult {
  if (typeof input.text !== "string" || input.text.length > 2_000_000) return { formatVersion: PROXY_CONTRACT_VERSION, records: [], errors: [{ record: 0, field: null, code: "PROXY_IMPORT_INVALID", message: "The Proxy import is empty or exceeds the safe size limit" }] };
  if (input.text.trim() === "") return { formatVersion: PROXY_CONTRACT_VERSION, records: [], errors: [] };
  let candidates: readonly Record<string, unknown>[];
  try { candidates = input.format === "csv" ? parseCsv(input.text) : parseJson(input.text); }
  catch (error) {
    const proxyError = error instanceof ProxyOperationError ? error : new ProxyOperationError("PROXY_IMPORT_INVALID", "The Proxy import is invalid");
    return { formatVersion: PROXY_CONTRACT_VERSION, records: [], errors: [{ record: 0, field: null, code: proxyError.code, message: proxyError.message }] };
  }
  const records: ParsedProxyImportRecord[] = [];
  const errors: ProxyImportError[] = [];
  candidates.forEach((candidate, index) => {
    try {
      const draft = normalizeProxyDraft(candidate);
      const hasEphemeralCredential = [candidate["username"], candidate["password"]].some((value) => value !== undefined && String(value).trim() !== "");
      const credential = hasEphemeralCredential
        ? normalizeProxyCredential({ username: candidate["username"], password: candidate["password"] })
        : null;
      if (credential !== null && draft.credentialRef !== undefined && draft.credentialRef !== null) invalid("A Proxy import record cannot contain both a credential and credentialRef", "PROXY_SECRET_INVALID");
      records.push({ record: index + 1, draft, credential });
    } catch (error) {
      const proxyError = error instanceof ProxyOperationError ? error : new ProxyOperationError("PROXY_IMPORT_INVALID", "The Proxy import record is invalid");
      errors.push({ record: index + 1, field: null, code: proxyError.code, message: proxyError.message });
    }
  });
  return { formatVersion: PROXY_CONTRACT_VERSION, records, errors };
}

export function deriveImportedProxyId(draft: ProxyDraft): string {
  const identity = canonicalProxyIdentity(draft);
  const derived = `proxy-${identity.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 112)}`;
  return normalizeProxyId(derived);
}
