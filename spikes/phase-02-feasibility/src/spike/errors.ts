import type {
  SpikeErrorCategory,
  StructuredFailure,
} from "../shared/contracts.js";

const SECRET_VALUE_PATTERN =
  /(password|passwd|otp|token|cookie|authorization|proxy[_-]?password)\s*[:=]\s*[^\s,;]+/gi;
const WINDOWS_PATH_PATTERN = /\b[A-Za-z]:[\\/][^\s"'<>|]+/g;
const FILE_URL_PATTERN = /file:\/{2,3}[^\s"'<>]+/gi;

export class SpikeError extends Error {
  public readonly category: SpikeErrorCategory;
  public readonly recoverable: boolean;

  public constructor(
    category: SpikeErrorCategory,
    message: string,
    options?: { cause?: unknown; recoverable?: boolean },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = "SpikeError";
    this.category = category;
    this.recoverable = options?.recoverable ?? true;
  }
}

export function sanitizeErrorMessage(value: unknown): string {
  const raw = value instanceof Error ? value.message : String(value);
  return raw
    .replace(FILE_URL_PATTERN, "[file-url]")
    .replace(WINDOWS_PATH_PATTERN, "[path]")
    .replace(SECRET_VALUE_PATTERN, "$1=[redacted]")
    .slice(0, 800);
}

export function toStructuredFailure(error: unknown): StructuredFailure {
  if (error instanceof SpikeError) {
    return {
      category: error.category,
      message: sanitizeErrorMessage(error),
      recoverable: error.recoverable,
    };
  }

  return {
    category: "SPIKE_INTERNAL_ERROR",
    message: sanitizeErrorMessage(error),
    recoverable: true,
  };
}

