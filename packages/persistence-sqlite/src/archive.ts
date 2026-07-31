import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { ProjectOperationError } from "@offline-web-archive/archive-core";
import {
  EXPORT_EXCLUDED_PREFIXES,
  EXPORT_METADATA_FILE,
  normalizeArchiveEntry,
  portablePathCollisionKey,
} from "@offline-web-archive/project-format";

export interface ArchiveLimits {
  maximumArchiveBytes: number;
  maximumEntries: number;
  maximumExpandedBytes: number;
  maximumSingleEntryBytes: number;
  maximumCompressionRatio: number;
}

export const DEFAULT_ARCHIVE_LIMITS: ArchiveLimits = Object.freeze({
  maximumArchiveBytes: 256 * 1024 * 1024,
  maximumEntries: 5_000,
  maximumExpandedBytes: 512 * 1024 * 1024,
  maximumSingleEntryBytes: 128 * 1024 * 1024,
  maximumCompressionRatio: 100,
});

export interface InspectedArchiveEntry {
  name: string;
  compressedSize: number;
  expandedSize: number;
  crc32: number;
}

export interface InspectedArchive {
  entries: readonly InspectedArchiveEntry[];
  expandedBytes: number;
}

interface ExportMetadata {
  container: "offline-web-archive-export";
  version: "1.0.0";
  projectId: string;
  exportedAt: string;
  files: readonly { path: string; bytes: number; sha256: string }[];
}

function readUInt16(data: Uint8Array, offset: number): number {
  return data[offset]! | (data[offset + 1]! << 8);
}

function readUInt32(data: Uint8Array, offset: number): number {
  return (data[offset]! | (data[offset + 1]! << 8) | (data[offset + 2]! << 16) | (data[offset + 3]! << 24)) >>> 0;
}

function findEndOfCentralDirectory(data: Uint8Array): number {
  const minimum = Math.max(0, data.length - 65_557);
  for (let index = data.length - 22; index >= minimum; index -= 1) {
    if (readUInt32(data, index) === 0x06054b50) return index;
  }
  throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "ZIP end-of-directory record is missing");
}

function decodeEntryName(bytes: Uint8Array, utf8: boolean): string {
  if (!utf8 && bytes.some((value) => value > 0x7f)) {
    throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "Non-UTF-8 archive names are not accepted");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "An archive entry name has invalid UTF-8");
  }
}

function safeArchiveName(value: string): string {
  try {
    return normalizeArchiveEntry(value);
  } catch (error) {
    throw new ProjectOperationError(
      "PROJECT_IMPORT_UNSAFE_ARCHIVE",
      error instanceof Error ? error.message : "The archive entry path is unsafe",
    );
  }
}

export function inspectZipArchive(
  data: Uint8Array,
  limits: ArchiveLimits = DEFAULT_ARCHIVE_LIMITS,
): InspectedArchive {
  if (data.byteLength > limits.maximumArchiveBytes) {
    throw new ProjectOperationError("PROJECT_IMPORT_LIMIT_EXCEEDED", "The archive exceeds the compressed-size limit");
  }
  const end = findEndOfCentralDirectory(data);
  const disk = readUInt16(data, end + 4);
  const centralDisk = readUInt16(data, end + 6);
  const entryCount = readUInt16(data, end + 10);
  const centralSize = readUInt32(data, end + 12);
  const centralOffset = readUInt32(data, end + 16);
  if (disk !== 0 || centralDisk !== 0) {
    throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "Multi-disk ZIP archives are not supported");
  }
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new ProjectOperationError("PROJECT_IMPORT_LIMIT_EXCEEDED", "ZIP64 archives exceed the Phase 4 container policy");
  }
  if (entryCount === 0 || entryCount > limits.maximumEntries) {
    throw new ProjectOperationError("PROJECT_IMPORT_LIMIT_EXCEEDED", "The archive entry count is outside the allowed range");
  }
  if (centralOffset + centralSize > end || centralOffset + centralSize > data.length) {
    throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "The ZIP central directory is inconsistent");
  }
  const entries: InspectedArchiveEntry[] = [];
  const names = new Set<string>();
  const collisionKeys = new Set<string>();
  let cursor = centralOffset;
  let expandedBytes = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > data.length || readUInt32(data, cursor) !== 0x02014b50) {
      throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "The ZIP central directory entry is invalid");
    }
    const versionMadeBy = readUInt16(data, cursor + 4);
    const flags = readUInt16(data, cursor + 8);
    const method = readUInt16(data, cursor + 10);
    const crc32 = readUInt32(data, cursor + 16);
    const compressedSize = readUInt32(data, cursor + 20);
    const expandedSize = readUInt32(data, cursor + 24);
    const nameLength = readUInt16(data, cursor + 28);
    const extraLength = readUInt16(data, cursor + 30);
    const commentLength = readUInt16(data, cursor + 32);
    const diskStart = readUInt16(data, cursor + 34);
    const externalAttributes = readUInt32(data, cursor + 38);
    const endOfEntry = cursor + 46 + nameLength + extraLength + commentLength;
    if (endOfEntry > data.length || nameLength === 0) {
      throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "The ZIP entry bounds are invalid");
    }
    if ((flags & 1) !== 0) throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "Encrypted ZIP entries are not supported");
    if (![0, 8].includes(method)) throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "The ZIP compression method is unsupported");
    if (diskStart !== 0) throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "A ZIP entry references another disk");
    const name = safeArchiveName(
      decodeEntryName(data.subarray(cursor + 46, cursor + 46 + nameLength), (flags & 0x0800) !== 0),
    );
    if (name.endsWith("/")) throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "Directory entries are not accepted");
    const host = versionMadeBy >>> 8;
    const unixType = (externalAttributes >>> 16) & 0xf000;
    if (host === 3 && unixType !== 0 && unixType !== 0x8000) {
      throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "Symbolic links and special archive entries are forbidden");
    }
    const collisionKey = portablePathCollisionKey(name);
    if (names.has(name) || collisionKeys.has(collisionKey)) {
      throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "Duplicate or cross-platform-colliding archive paths are forbidden");
    }
    if (expandedSize > limits.maximumSingleEntryBytes) {
      throw new ProjectOperationError("PROJECT_IMPORT_LIMIT_EXCEEDED", `Archive entry ${name} exceeds the per-file limit`);
    }
    const ratio = expandedSize === 0 ? 0 : expandedSize / Math.max(1, compressedSize);
    if (ratio > limits.maximumCompressionRatio) {
      throw new ProjectOperationError("PROJECT_IMPORT_LIMIT_EXCEEDED", `Archive entry ${name} exceeds the compression-ratio limit`);
    }
    expandedBytes += expandedSize;
    if (expandedBytes > limits.maximumExpandedBytes) {
      throw new ProjectOperationError("PROJECT_IMPORT_LIMIT_EXCEEDED", "The archive exceeds the expanded-size limit");
    }
    names.add(name);
    collisionKeys.add(collisionKey);
    entries.push({ name, compressedSize, expandedSize, crc32 });
    cursor = endOfEntry;
  }
  if (cursor !== centralOffset + centralSize) {
    throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "The ZIP central directory size does not match its entries");
  }
  return { entries, expandedBytes };
}

export function sha256(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export function exportPathIsAllowed(relativePath: string): boolean {
  if (relativePath === "project.json" || relativePath === "database/crawl.db") return true;
  if (EXPORT_EXCLUDED_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) return false;
  return ["profile/", "pages/", "assets/", "api/", "runtime/", "reports/"].some((prefix) => relativePath.startsWith(prefix));
}

async function collectFiles(root: string, current = ""): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();
  const directory = path.join(root, ...current.split("/").filter(Boolean));
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = current.length === 0 ? entry.name : `${current}/${entry.name}`;
    let portable: string;
    try {
      portable = normalizeArchiveEntry(relativePath);
    } catch (error) {
      throw new ProjectOperationError("PROJECT_EXPORT_FAILED", error instanceof Error ? error.message : "A Project path is not portable");
    }
    const target = path.join(root, ...portable.split("/"));
    const stat = await lstat(target);
    if (stat.isSymbolicLink()) {
      throw new ProjectOperationError("PROJECT_EXPORT_FAILED", "Symbolic links cannot be exported");
    }
    if (entry.isDirectory()) {
      const nested = await collectFiles(root, portable);
      for (const [name, data] of nested) files.set(name, data);
    } else if (entry.isFile() && exportPathIsAllowed(portable)) {
      files.set(portable, new Uint8Array(await readFile(target)));
    }
  }
  return files;
}

export async function createProjectArchive(input: {
  projectRoot: string;
  projectId: string;
  exportedAt: string;
  databaseSnapshot: Uint8Array;
  limits?: ArchiveLimits;
}): Promise<{ data: Uint8Array; entryCount: number; expandedBytes: number }> {
  const limits = input.limits ?? DEFAULT_ARCHIVE_LIMITS;
  const files = await collectFiles(input.projectRoot);
  files.set("database/crawl.db", input.databaseSnapshot);
  const ordered = [...files.entries()].sort(([left], [right]) => left.localeCompare(right, "en"));
  const metadata: ExportMetadata = {
    container: "offline-web-archive-export",
    version: "1.0.0",
    projectId: input.projectId,
    exportedAt: input.exportedAt,
    files: ordered.map(([name, data]) => ({ path: name, bytes: data.byteLength, sha256: sha256(data) })),
  };
  const archiveEntries: Record<string, Uint8Array> = {
    [EXPORT_METADATA_FILE]: strToU8(`${JSON.stringify(metadata, null, 2)}\n`),
  };
  for (const [name, data] of ordered) archiveEntries[name] = data;
  const expandedBytes = Object.values(archiveEntries).reduce((total, data) => total + data.byteLength, 0);
  if (Object.keys(archiveEntries).length > limits.maximumEntries || expandedBytes > limits.maximumExpandedBytes) {
    throw new ProjectOperationError("PROJECT_EXPORT_FAILED", "The Project exceeds the Phase 4 ZIP export limits");
  }
  for (const [name, data] of Object.entries(archiveEntries)) {
    if (data.byteLength > limits.maximumSingleEntryBytes) {
      throw new ProjectOperationError("PROJECT_EXPORT_FAILED", `Export entry ${name} exceeds the per-file limit`);
    }
  }
  const data = zipSync(archiveEntries, { level: 6, mtime: new Date("1980-01-01T00:00:00.000Z") });
  if (data.byteLength > limits.maximumArchiveBytes) {
    throw new ProjectOperationError("PROJECT_EXPORT_FAILED", "The compressed Project exceeds the Phase 4 ZIP limit");
  }
  return { data, entryCount: Object.keys(archiveEntries).length, expandedBytes };
}

function parseExportMetadata(data: Uint8Array): ExportMetadata {
  let value: unknown;
  try {
    value = JSON.parse(strFromU8(data));
  } catch {
    throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "The export metadata is invalid JSON");
  }
  const record = value as Partial<ExportMetadata>;
  if (
    typeof value !== "object" || value === null ||
    record.container !== "offline-web-archive-export" ||
    record.version !== "1.0.0" ||
    typeof record.projectId !== "string" ||
    typeof record.exportedAt !== "string" ||
    !Array.isArray(record.files)
  ) {
    throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "The export metadata contract is invalid");
  }
  return record as ExportMetadata;
}

export function extractAndVerifyProjectArchive(
  data: Uint8Array,
  limits: ArchiveLimits = DEFAULT_ARCHIVE_LIMITS,
): { files: ReadonlyMap<string, Uint8Array>; projectId: string; entryCount: number } {
  const inspected = inspectZipArchive(data, limits);
  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(data);
  } catch {
    throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "The ZIP payload is corrupt");
  }
  if (Object.keys(unzipped).length !== inspected.entries.length) {
    throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "The ZIP parser views disagree on the entry set");
  }
  const metadataData = unzipped[EXPORT_METADATA_FILE];
  if (metadataData === undefined) {
    throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "The export metadata entry is missing");
  }
  const metadata = parseExportMetadata(metadataData);
  const files = new Map<string, Uint8Array>();
  const declared = new Set<string>();
  for (const item of metadata.files) {
    if (
      typeof item !== "object" || item === null ||
      typeof item.path !== "string" || typeof item.bytes !== "number" || typeof item.sha256 !== "string"
    ) {
      throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "The export file inventory is invalid");
    }
    const name = safeArchiveName(item.path);
    if (!exportPathIsAllowed(name)) {
      throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", `The export contains a non-portable Project entry: ${name}`);
    }
    if (name === EXPORT_METADATA_FILE || declared.has(name)) {
      throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "The export file inventory contains a duplicate");
    }
    const payload = unzipped[name];
    if (payload === undefined || payload.byteLength !== item.bytes || sha256(payload) !== item.sha256) {
      throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", `Export checksum validation failed for ${name}`);
    }
    declared.add(name);
    files.set(name, payload);
  }
  const actualPayloadNames = Object.keys(unzipped).filter((name) => name !== EXPORT_METADATA_FILE);
  if (actualPayloadNames.length !== declared.size || actualPayloadNames.some((name) => !declared.has(name))) {
    throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "The ZIP contains undeclared payload entries");
  }
  if (!files.has("project.json") || !files.has("database/crawl.db")) {
    throw new ProjectOperationError("PROJECT_IMPORT_UNSAFE_ARCHIVE", "The archive is missing the Project manifest or database");
  }
  return { files, projectId: metadata.projectId, entryCount: inspected.entries.length };
}
