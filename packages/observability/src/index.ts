export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEvent {
  timestamp: string;
  level: LogLevel;
  component: string;
  correlationId: string;
  commandId?: string;
  eventName: string;
  metadata?: Readonly<Record<string, unknown>>;
  errorCode?: string;
}

export interface Logger {
  log(event: LogEvent): void;
}

const SENSITIVE_KEY = /^(?:authorization|cookie|credential|otp|oneTimePassword|pass(?:word|wd)?|passphrase|proxy(?:Authorization|Username|Password)?|secret|session|sessionId|storageState|token|accessToken|refreshToken|idToken|apiKey|clientSecret|username|phone|phoneNumber|setCookie)$/i;
const SENSITIVE_HEADER = /^(?:authorization|proxy-authorization|cookie|set-cookie|x-api-key)$/i;
const SENSITIVE_QUERY = /^(?:access[_-]?token|api[_-]?key|authorization|client[_-]?secret|code|cookie|id[_-]?token|otp|pass(?:word|phrase)?|proxy[_-]?(?:password|username)|refresh[_-]?token|secret|session|state|token|username)$/i;
const SENSITIVE_VALUE = /((?:password|passwd|passphrase|secret|token|accessToken|refreshToken|idToken|apiKey|clientSecret|authorization|proxyAuthorization|cookie|setCookie|otp|oneTimePassword|phoneNumber|credential|username)\s*[:=]\s*)([^\s,;]+)/gi;
const BEARER_VALUE = /(\bBearer\s+)[^\s,;]+/gi;
const URL_VALUE = /([?&](?:access[_-]?token|api[_-]?key|authorization|client[_-]?secret|cookie|id[_-]?token|otp|pass(?:word|phrase)?|refresh[_-]?token|secret|session|state|token)=[^&#\s]*)/gi;
const URL_FRAGMENT_VALUE = /([#&](?:access[_-]?token|api[_-]?key|authorization|code|id[_-]?token|otp|refresh[_-]?token|secret|session|state|token)=[^&#\s]*)/gi;

interface SafeUrl {
  username: string;
  password: string;
  hash: string;
  searchParams: { keys(): IterableIterator<string>; delete(name: string): void };
  toString(): string;
}

const UrlConstructor = (globalThis as unknown as { URL?: new (value: string) => SafeUrl }).URL;

function sanitizeString(value: string): string {
  let safe = value.replace(/\u0000/g, "�");
  safe = safe.replace(SENSITIVE_VALUE, "$1[redacted]");
  safe = safe.replace(BEARER_VALUE, "$1[redacted]");
  safe = safe.replace(URL_VALUE, (match) => `${match.slice(0, match.indexOf("=") + 1)}[redacted]`);
  safe = safe.replace(URL_FRAGMENT_VALUE, (match) => `${match.slice(0, match.indexOf("=") + 1)}[redacted]`);
  return safe.length > 8_192 ? `${safe.slice(0, 8_192)}…[truncated]` : safe;
}

export function sanitizeUrl(value: string): string {
  try {
    if (UrlConstructor === undefined) return sanitizeString(value);
    const url = new UrlConstructor(value);
    url.username = "";
    url.password = "";
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY.test(key)) url.searchParams.delete(key);
    }
    url.hash = "";
    return sanitizeString(url.toString());
  } catch {
    return sanitizeString(value).replace(/\/\/[^/?#\s]*@/g, "//");
  }
}

interface HeadersLike {
  forEach(callback: (value: string, key: string) => void): void;
}

export function sanitizeHeaders(value: unknown): Readonly<Record<string, string>> {
  const safe: Record<string, string> = {};
  if (typeof value === "object" && value !== null && "forEach" in value && typeof (value as HeadersLike).forEach === "function") {
    (value as HeadersLike).forEach((entry, key) => {
      safe[key] = SENSITIVE_HEADER.test(key) ? "[redacted]" : sanitizeString(entry);
    });
    return safe;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return safe;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_HEADER.test(key)) safe[key] = "[redacted]";
    else if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") safe[key] = sanitizeString(String(entry));
    else safe[key] = "[redacted]";
  }
  return safe;
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") return sanitizeString(value);
  if (typeof value === "bigint") return "[bigint]";
  if (value instanceof Uint8Array) return "[binary redacted]";
  if (value instanceof Error) return sanitizeError(value, seen);
  if (Array.isArray(value)) return value.map((entry) => redactValue(entry, seen));
  if (typeof value !== "object" || value === null) return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (UrlConstructor !== undefined && value instanceof UrlConstructor) return sanitizeUrl(value.toString());
  const redacted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    redacted[key] = SENSITIVE_KEY.test(key)
      ? "[redacted]"
      : /^(?:headers|requestHeaders|responseHeaders)$/i.test(key)
        ? sanitizeHeaders(entry)
        : redactValue(entry, seen);
  }
  return redacted;
}

export function sanitizeError(value: unknown, seen = new WeakSet<object>()): Readonly<Record<string, unknown>> {
  if (!(value instanceof Error)) return { name: "Error", message: "An unknown error occurred", details: redactValue(value, seen) as unknown };
  const projection: Record<string, unknown> = {
    name: sanitizeString(value.name),
    message: sanitizeString(value.message),
  };
  const extras = value as unknown as Record<string, unknown>;
  const code = extras["code"];
  const cause = extras["cause"];
  const stack = extras["stack"];
  if (typeof code === "string" && /^[A-Za-z0-9._:-]{1,120}$/.test(code)) projection["code"] = code;
  if (cause !== undefined) projection["cause"] = redactValue(cause, seen);
  if (typeof stack === "string") projection["stack"] = sanitizeString(stack);
  return projection;
}

export function sanitizeValue(value: unknown): unknown {
  return redactValue(value, new WeakSet<object>());
}

export function sanitizeFilePath(value: string): string {
  return sanitizeString(value).replace(/([^\\/]*)(?:password|passphrase|secret|token|cookie|credential)([^\\/]*)/gi, "$1[redacted]$2");
}

export function redactMetadata(
  metadata: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return sanitizeValue(metadata) as Readonly<Record<string, unknown>>;
}

export function createDevelopmentLogger(
  sink: (line: string) => void,
): Logger {
  return {
    log(event): void {
      const safe = {
        ...event,
        ...(event.metadata === undefined
          ? {}
          : { metadata: redactMetadata(event.metadata) }),
      };
      sink(JSON.stringify(safe));
    },
  };
}

export function createSilentLogger(): Logger {
  return { log(): void {} };
}
