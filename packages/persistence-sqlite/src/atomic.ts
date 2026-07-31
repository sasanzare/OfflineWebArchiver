import { constants } from "node:fs";
import { lstat, mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ProjectOperationError } from "@offline-web-archive/archive-core";

async function syncDirectory(directory: string): Promise<void> {
  let handle;
  try {
    handle = await open(directory, constants.O_RDONLY);
    await handle.sync();
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "";
    if (!["EISDIR", "EINVAL", "ENOTSUP", "EPERM", "EACCES"].includes(code)) throw error;
  } finally {
    await handle?.close();
  }
}

export async function pathExists(target: string): Promise<boolean> {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

export async function assertNotSymlink(target: string): Promise<void> {
  const stat = await lstat(target);
  if (stat.isSymbolicLink()) {
    throw new ProjectOperationError(
      "PROJECT_VALIDATION_FAILED",
      "Symbolic links are not accepted at Project trust boundaries",
    );
  }
}

export async function atomicWriteFile(
  target: string,
  data: string | Uint8Array,
  options: { overwrite?: boolean } = {},
): Promise<void> {
  const directory = path.dirname(target);
  await mkdir(directory, { recursive: true });
  if (!options.overwrite && (await pathExists(target))) {
    throw new ProjectOperationError("PROJECT_ALREADY_EXISTS", "The destination already exists");
  }
  if (await pathExists(target)) await assertNotSymlink(target);
  const temporary = path.join(directory, `.${path.basename(target)}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(data);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporary, target);
    await syncDirectory(directory);
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await rm(temporary, { force: true }).catch(() => undefined);
    if (error instanceof ProjectOperationError) throw error;
    throw new ProjectOperationError(
      "PROJECT_ATOMIC_WRITE_FAILED",
      error instanceof Error ? error.message : "Atomic file replacement failed",
      true,
    );
  }
}

export async function atomicPromoteDirectory(staging: string, destination: string): Promise<void> {
  if (await pathExists(destination)) {
    throw new ProjectOperationError("PROJECT_ALREADY_EXISTS", "The destination already exists");
  }
  if (path.dirname(staging) !== path.dirname(destination)) {
    throw new ProjectOperationError(
      "PROJECT_ATOMIC_WRITE_FAILED",
      "Directory promotion must remain on the destination filesystem",
    );
  }
  try {
    await rename(staging, destination);
    await syncDirectory(path.dirname(destination));
  } catch (error) {
    if (error instanceof ProjectOperationError) throw error;
    throw new ProjectOperationError(
      "PROJECT_ATOMIC_WRITE_FAILED",
      error instanceof Error ? error.message : "Project directory promotion failed",
      true,
    );
  }
}
