export const CANONICAL_PATH_SAFETY_VERSION = 1 as const;

export const CANONICAL_PATH_LIMITS = Object.freeze({
  maximumPathCharacters: 240,
  maximumPathBytes: 1_024,
  maximumSegmentCharacters: 120,
  maximumDecodePasses: 3,
});

export type CanonicalPathRejectionReason =
  | "empty"
  | "too-long"
  | "not-nfc"
  | "absolute"
  | "drive-qualified"
  | "separator-confusion"
  | "invalid-percent-encoding"
  | "encoded-traversal"
  | "empty-segment"
  | "dot-segment"
  | "control-character"
  | "non-portable-character"
  | "trailing-dot-or-space"
  | "reserved-device-name"
  | "segment-too-long";

export interface CanonicalPathValidation {
  valid: boolean;
  normalized: string | null;
  collisionKey: string | null;
  reason: CanonicalPathRejectionReason | null;
  message: string;
}

const WINDOWS_DEVICE_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const INVALID_PORTABLE_CHARACTER = /[<>:"|?*\u0000-\u001f\u007f]/;
const INVALID_PERCENT_ENCODING = /%(?![0-9a-f]{2})/i;

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function invalid(reason: CanonicalPathRejectionReason, message: string): CanonicalPathValidation {
  return { valid: false, normalized: null, collisionKey: null, reason, message };
}

export function validateCanonicalRelativePath(value: string): CanonicalPathValidation {
  if (typeof value !== "string" || value.length === 0) return invalid("empty", "Path is empty");
  if (value.length > CANONICAL_PATH_LIMITS.maximumPathCharacters || utf8Bytes(value) > CANONICAL_PATH_LIMITS.maximumPathBytes) return invalid("too-long", "Path exceeds the canonical length limit");
  if (value !== value.normalize("NFC")) return invalid("not-nfc", "Path is not Unicode NFC normalized");
  if (value.startsWith("/") || value.startsWith("\\")) return invalid("absolute", "Absolute and UNC paths are forbidden");
  if (/^[A-Za-z]:/.test(value)) return invalid("drive-qualified", "Drive-qualified paths are forbidden");
  if (value.includes("\\")) return invalid("separator-confusion", "Portable paths must use forward slashes");
  if (INVALID_PERCENT_ENCODING.test(value)) return invalid("invalid-percent-encoding", "Path contains invalid percent encoding");

  let decoded = value;
  for (let pass = 0; pass < CANONICAL_PATH_LIMITS.maximumDecodePasses; pass += 1) {
    let next: string;
    try { next = decodeURIComponent(decoded); }
    catch { return invalid("invalid-percent-encoding", "Path contains invalid percent encoding"); }
    if (next === decoded) break;
    if (next.includes("\\") || next.includes("/") || next.split("/").some((segment) => segment === "." || segment === "..")) {
      return invalid("encoded-traversal", "Encoded separators and traversal segments are forbidden");
    }
    decoded = next;
  }

  const segments = value.split("/");
  for (const segment of segments) {
    if (segment.length === 0) return invalid("empty-segment", "Empty path segments are forbidden");
    if (segment === "." || segment === "..") return invalid("dot-segment", "Dot and parent path segments are forbidden");
    if (segment.length > CANONICAL_PATH_LIMITS.maximumSegmentCharacters) return invalid("segment-too-long", "A path segment exceeds the canonical length limit");
    if (INVALID_PORTABLE_CHARACTER.test(segment)) return invalid("non-portable-character", "Path contains a non-portable character");
    if (/[. ]$/.test(segment)) return invalid("trailing-dot-or-space", "Path segments cannot end with a dot or space");
    if (WINDOWS_DEVICE_NAME.test(segment)) return invalid("reserved-device-name", "Path contains a reserved Windows device name");
  }
  const normalized = value.normalize("NFC");
  return { valid: true, normalized, collisionKey: normalized.toLocaleLowerCase("en-US"), reason: null, message: "" };
}

export function canonicalRelativePath(value: string): string {
  const result = validateCanonicalRelativePath(value);
  if (!result.valid || result.normalized === null) throw new Error(result.message);
  return result.normalized;
}

export function canonicalPathCollisionKey(value: string): string {
  const result = validateCanonicalRelativePath(value);
  if (!result.valid || result.collisionKey === null) throw new Error(result.message);
  return result.collisionKey;
}

export function assertCanonicalPathSet(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  return values.map((value) => {
    const normalized = canonicalRelativePath(value);
    const key = canonicalPathCollisionKey(normalized);
    if (seen.has(key)) throw new Error("Canonical path collision detected");
    seen.add(key);
    return normalized;
  });
}

