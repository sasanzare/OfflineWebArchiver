import { constants } from "node:fs";
import { lstat, mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { strToU8, unzipSync, zipSync } from "fflate";
import { DIAGNOSTIC_BUNDLE_SANITIZATION_VERSION, SecretStoreError } from "@offline-web-archive/archive-core";
import { sanitizeFilePath, sanitizeValue } from "@offline-web-archive/observability";

const DIAGNOSTIC_MAGIC = "OWA-SANITIZED-DIAGNOSTIC" as const;
const DIAGNOSTIC_MANIFEST = "diagnostic-manifest.json" as const;
const MAX_DIAGNOSTIC_BYTES = 32 * 1024 * 1024;
const MAX_DIAGNOSTIC_ENTRIES = 32;

export interface DiagnosticBundleInput {
  readonly destinationPath: string;
  readonly createdAt: string;
  readonly application: Readonly<Record<string, unknown>>;
  readonly platform: Readonly<Record<string, unknown>>;
  readonly configuration?: Readonly<Record<string, unknown>>;
  readonly logs?: readonly unknown[];
  readonly errors?: readonly unknown[];
  readonly runtimeStatus?: Readonly<Record<string, unknown>>;
  readonly migrationStatus?: Readonly<Record<string, unknown>>;
  readonly project?: Readonly<Record<string, unknown>>;
  readonly interactionTraces?: readonly unknown[];
  readonly validation?: Readonly<Record<string, unknown>>;
}

export interface DiagnosticBundleResult {
  readonly archivePath: string;
  readonly entryCount: number;
  readonly byteLength: number;
  readonly sanitizationVersion: typeof DIAGNOSTIC_BUNDLE_SANITIZATION_VERSION;
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function json(value: unknown): Uint8Array {
  return strToU8(`${JSON.stringify(sanitizeValue(value))}\n`);
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

async function syncDirectory(directory: string): Promise<void> {
  let handle;
  try {
    handle = await open(directory, constants.O_RDONLY);
    await handle.sync();
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "";
    if (!["EISDIR", "EINVAL", "ENOTSUP", "EPERM", "EACCES"].includes(code)) throw error;
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function atomicWrite(target: string, bytes: Uint8Array): Promise<void> {
  const absolute = path.resolve(target);
  if (await pathExists(absolute)) throw new SecretStoreError("SECRET_ALREADY_EXISTS", "The Diagnostic Bundle destination already exists");
  const directory = path.dirname(absolute);
  await mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(absolute)}.${cryptoRandomId()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporary, absolute);
    await syncDirectory(directory);
  } catch {
    await handle?.close().catch(() => undefined);
    await rm(temporary, { force: true }).catch(() => undefined);
    throw new SecretStoreError("SECRET_OPERATION_FAILED", "The Diagnostic Bundle could not be committed", true);
  }
}

function cryptoRandomId(): string {
  return randomUUID();
}

export async function createSanitizedDiagnosticBundle(input: DiagnosticBundleInput): Promise<DiagnosticBundleResult> {
  const entries: Record<string, Uint8Array> = {
    "application.json": json(input.application),
    "platform.json": json(input.platform),
    "configuration.json": json(input.configuration ?? {}),
    "logs.json": json(input.logs ?? []),
    "errors.json": json(input.errors ?? []),
    "runtime-status.json": json(input.runtimeStatus ?? {}),
    "migration-status.json": json(input.migrationStatus ?? {}),
    "project.json": json(input.project ?? {}),
    "interaction-traces.json": json(input.interactionTraces ?? []),
    "validation.json": json(input.validation ?? {}),
  };
  const ordered = Object.entries(entries).sort(([left], [right]) => left.localeCompare(right, "en"));
  const expandedBytes = ordered.reduce((total, [, value]) => total + value.byteLength, 0);
  if (ordered.length > MAX_DIAGNOSTIC_ENTRIES || expandedBytes > MAX_DIAGNOSTIC_BYTES) throw new SecretStoreError("SECRET_VALUE_TOO_LARGE", "The Diagnostic Bundle exceeds the safe size limit");
  const manifest = {
    magic: DIAGNOSTIC_MAGIC,
    sanitizationVersion: DIAGNOSTIC_BUNDLE_SANITIZATION_VERSION,
    createdAt: sanitizeFilePath(input.createdAt),
    files: ordered.map(([filePath, value]) => ({ path: filePath, bytes: value.byteLength, sha256: sha256(value) })),
    excludedCategories: ["vault", "secret-store", "os-protected-blobs", "authentication", "cookies", "tokens", "proxy-credentials", "secure-exports", "browser-profiles", "raw-sqlite", "raw-project-archives", "crash-dumps", "sensitive-temporary-data"],
  };
  const archiveEntries: Record<string, Uint8Array> = { [DIAGNOSTIC_MANIFEST]: strToU8(`${JSON.stringify(manifest)}\n`) };
  for (const [filePath, value] of ordered) archiveEntries[`diagnostic/${filePath}`] = value;
  const archive = zipSync(archiveEntries, { level: 6, mtime: new Date("1980-01-01T00:00:00.000Z") });
  if (archive.byteLength > MAX_DIAGNOSTIC_BYTES) throw new SecretStoreError("SECRET_VALUE_TOO_LARGE", "The Diagnostic Bundle exceeds the compressed-size limit");
  const archivePath = path.resolve(input.destinationPath);
  await atomicWrite(archivePath, archive);
  return { archivePath, entryCount: Object.keys(archiveEntries).length, byteLength: archive.byteLength, sanitizationVersion: DIAGNOSTIC_BUNDLE_SANITIZATION_VERSION };
}

export function inspectSanitizedDiagnosticBundle(data: Uint8Array): readonly string[] {
  if (data.byteLength > MAX_DIAGNOSTIC_BYTES) throw new SecretStoreError("SECRET_VALUE_TOO_LARGE", "The Diagnostic Bundle exceeds the safe size limit");
  let entries: Record<string, Uint8Array>;
  try { entries = unzipSync(data); }
  catch { throw new SecretStoreError("SECRET_IMPORT_FAILED", "The Diagnostic Bundle is not a valid archive"); }
  const names = Object.keys(entries).sort((left, right) => left.localeCompare(right, "en"));
  if (names.length > MAX_DIAGNOSTIC_ENTRIES + 1) throw new SecretStoreError("SECRET_VALUE_TOO_LARGE", "The Diagnostic Bundle contains too many entries");
  if (!names.includes(DIAGNOSTIC_MANIFEST) || names.some((name) => name !== DIAGNOSTIC_MANIFEST && !/^diagnostic\/[a-z0-9-]+\.json$/.test(name))) throw new SecretStoreError("SECRET_IMPORT_FAILED", "The Diagnostic Bundle contains an unsafe entry");
  return names;
}

export const DIAGNOSTIC_BUNDLE_MAGIC = DIAGNOSTIC_MAGIC;
export const DIAGNOSTIC_BUNDLE_LIMITS = Object.freeze({ maximumBytes: MAX_DIAGNOSTIC_BYTES, maximumEntries: MAX_DIAGNOSTIC_ENTRIES });
