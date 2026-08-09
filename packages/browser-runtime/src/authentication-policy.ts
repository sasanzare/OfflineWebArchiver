import type { RuntimeNetworkDecision } from "@offline-web-archive/archive-core";

export interface AuthenticationRequestDecision {
  allowed: boolean;
  reasonCode: string;
  safeUrl: string;
  resourceType: string;
}

export interface AuthenticationRequestMetadata {
  method: string;
  resourceType: string;
  urlSafe: string;
}

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

export function authenticationRequestMetadata(input: { url: string; method: string; resourceType: string }): AuthenticationRequestMetadata {
  return {
    method: input.method.toUpperCase().slice(0, 16),
    resourceType: input.resourceType.slice(0, 80),
    urlSafe: safeUrl(input.url),
  };
}

export async function decideAuthenticationRequest(input: {
  url: string;
  method?: string;
  resourceType: string;
  allowedOrigins: readonly string[];
  authorizeUrl: (url: string) => Promise<RuntimeNetworkDecision>;
}): Promise<AuthenticationRequestDecision> {
  const metadata = authenticationRequestMetadata({ url: input.url, method: input.method ?? "GET", resourceType: input.resourceType });
  let origin: string;
  try { origin = new URL(input.url).origin; }
  catch { return { allowed: false, reasonCode: "AUTH_REQUEST_URL_INVALID", safeUrl: metadata.urlSafe, resourceType: metadata.resourceType }; }
  if (!input.allowedOrigins.includes(origin)) {
    return { allowed: false, reasonCode: "AUTH_REQUEST_ORIGIN_NOT_APPROVED", safeUrl: metadata.urlSafe, resourceType: metadata.resourceType };
  }
  const decision = await input.authorizeUrl(input.url).catch(() => ({ allowed: false, reasonCode: "AUTH_REQUEST_AUTHORIZER_FAILED", safeUrl: metadata.urlSafe, resolvedAddresses: [] }));
  return {
    allowed: decision.allowed,
    reasonCode: decision.reasonCode,
    safeUrl: decision.safeUrl,
    resourceType: metadata.resourceType,
  };
}
