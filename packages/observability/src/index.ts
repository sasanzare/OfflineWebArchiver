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

const SENSITIVE_KEY = /(?:authorization|cookie|credential|otp|pass(?:word)?|proxy.*pass|secret|session|token)/i;

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) return value.map((entry) => redactValue(entry, seen));
  if (typeof value !== "object" || value === null) return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  const redacted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    redacted[key] = SENSITIVE_KEY.test(key)
      ? "[redacted]"
      : redactValue(entry, seen);
  }
  return redacted;
}

export function redactMetadata(
  metadata: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return redactValue(metadata, new WeakSet()) as Readonly<Record<string, unknown>>;
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
