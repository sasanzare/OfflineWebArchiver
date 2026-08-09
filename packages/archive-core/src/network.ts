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
