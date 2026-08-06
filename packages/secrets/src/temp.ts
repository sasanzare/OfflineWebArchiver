import { lstat, mkdir, open, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { SecretStoreError } from "@offline-web-archive/archive-core";
import { clearBytes, copyBytes } from "./crypto.js";

export const SENSITIVE_TEMP_DIRECTORY = "temp/secret-work" as const;
const SENSITIVE_TEMP_PREFIX = ".owa-sensitive-";
const SENSITIVE_TEMP_SUFFIX = ".tmp";

export interface SensitiveTempCleanupResult {
  readonly removed: number;
  readonly retained: number;
  readonly directoryPresent: boolean;
}

interface OwnedDirectories {
  readonly root: string;
  readonly temp: string;
  readonly directory: string;
}

function ownedDirectories(projectRoot: string): OwnedDirectories {
  const root = path.resolve(projectRoot);
  const temp = path.join(root, "temp");
  return { root, temp, directory: path.join(temp, "secret-work") };
}

function assertOwnedFile(directory: string, filename: string): string {
  if (!/^[.]owa-sensitive-[0-9a-f-]{36}[.]tmp$/.test(filename)) throw new SecretStoreError("SECRET_OPERATION_FAILED", "The sensitive temporary filename is invalid");
  const target = path.resolve(directory, filename);
  const relative = path.relative(directory, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new SecretStoreError("SECRET_OPERATION_FAILED", "The sensitive temporary path escapes its owned directory");
  return target;
}

async function assertOwnedDirectory(directory: string): Promise<boolean> {
  try {
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new SecretStoreError("SECRET_OPERATION_FAILED", "The sensitive temporary directory is unsafe");
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

async function requireOwnedDirectory(directory: string, message: string): Promise<void> {
  if (!(await assertOwnedDirectory(directory))) throw new SecretStoreError("SECRET_OPERATION_FAILED", message);
}

async function ensureOwnedChildDirectory(parent: string, directory: string): Promise<void> {
  await requireOwnedDirectory(parent, "The sensitive temporary parent directory is unavailable");
  try {
    await mkdir(directory, { recursive: false, mode: 0o700 });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) {
      throw new SecretStoreError("SECRET_OPERATION_FAILED", "The sensitive temporary directory could not be created", true);
    }
  }
  await requireOwnedDirectory(directory, "The sensitive temporary directory is unsafe");
}

async function bestEffortOverwriteAndRemove(target: string): Promise<boolean> {
  try {
    const stat = await lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink()) return false;
    let handle;
    try {
      handle = await open(target, "r+");
      const chunk = Buffer.alloc(Math.min(64 * 1024, Math.max(1, stat.size)), 0);
      let written = 0;
      while (written < stat.size) {
        const length = Math.min(chunk.byteLength, stat.size - written);
        await handle.write(chunk.subarray(0, length), 0, length, written);
        written += length;
      }
      await handle.sync();
    } finally {
      await handle?.close().catch(() => undefined);
    }
    await rm(target, { force: true });
    return true;
  } catch {
    return false;
  }
}

export async function createSensitiveTemporaryDirectory(projectRoot: string): Promise<string> {
  const paths = ownedDirectories(projectRoot);
  await requireOwnedDirectory(paths.root, "The project root is unavailable or unsafe");
  await ensureOwnedChildDirectory(paths.root, paths.temp);
  await ensureOwnedChildDirectory(paths.temp, paths.directory);
  return paths.directory;
}

export async function writeSensitiveTemporaryFile(projectRoot: string, value: Uint8Array): Promise<string> {
  const directory = await createSensitiveTemporaryDirectory(projectRoot);
  const filename = `${SENSITIVE_TEMP_PREFIX}${randomUUID()}${SENSITIVE_TEMP_SUFFIX}`;
  const target = assertOwnedFile(directory, filename);
  const copy = copyBytes(value);
  let handle;
  try {
    handle = await open(target, "wx", 0o600);
    await handle.write(copy);
    await handle.sync();
    return target;
  } catch {
    await rm(target, { force: true }).catch(() => undefined);
    throw new SecretStoreError("SECRET_OPERATION_FAILED", "The sensitive temporary file could not be created", true);
  } finally {
    await handle?.close().catch(() => undefined);
    clearBytes(copy);
  }
}

export async function cleanupSensitiveTemporaryData(projectRoot: string): Promise<SensitiveTempCleanupResult> {
  const paths = ownedDirectories(projectRoot);
  if (!(await assertOwnedDirectory(paths.root))) return { removed: 0, retained: 0, directoryPresent: false };
  if (!(await assertOwnedDirectory(paths.temp))) return { removed: 0, retained: 0, directoryPresent: false };
  if (!(await assertOwnedDirectory(paths.directory))) return { removed: 0, retained: 0, directoryPresent: false };
  let removed = 0;
  let retained = 0;
  for (const entry of await readdir(paths.directory, { withFileTypes: true })) {
    if (!entry.name.startsWith(SENSITIVE_TEMP_PREFIX) || !entry.name.endsWith(SENSITIVE_TEMP_SUFFIX)) continue;
    const target = assertOwnedFile(paths.directory, entry.name);
    if (entry.isSymbolicLink()) { retained += 1; continue; }
    if (await bestEffortOverwriteAndRemove(target)) removed += 1;
    else retained += 1;
  }
  return { removed, retained, directoryPresent: true };
}

export async function withSensitiveTemporaryFile<T>(projectRoot: string, value: Uint8Array, consumer: (filePath: string) => Promise<T>): Promise<T> {
  const filePath = await writeSensitiveTemporaryFile(projectRoot, value);
  try { return await consumer(filePath); }
  finally { await bestEffortOverwriteAndRemove(filePath); }
}
