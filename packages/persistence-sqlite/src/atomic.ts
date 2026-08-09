import { constants } from "node:fs";
import { lstat, mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { canonicalRelativePath, ProjectOperationError } from "@offline-web-archive/archive-core";

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

export async function assertNoSymlinkInPath(target: string, trustedRoot?: string): Promise<void> {
  const resolved = path.resolve(target);
  const root = trustedRoot === undefined ? null : path.resolve(trustedRoot);
  if (root === null) {
    if (await pathExists(resolved)) await assertNotSymlink(resolved);
    const directory = path.dirname(resolved);
    if (await pathExists(directory)) await assertNotSymlink(directory);
    return;
  }
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new ProjectOperationError("PROJECT_VALIDATION_FAILED", "The trusted path boundary is invalid");
  const existing: string[] = [];
  let current = resolved;
  while (true) {
    try {
      await lstat(current);
      existing.push(current);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    if (current === root) break;
    current = path.dirname(current);
  }
  for (const entry of existing.reverse()) await assertNotSymlink(entry);
}

export async function resolveProjectRelativePath(projectRoot: string, relativePath: string): Promise<string> {
  let normalized: string;
  try { normalized = canonicalRelativePath(relativePath); }
  catch { throw new ProjectOperationError("PROJECT_VALIDATION_FAILED", "The Project-relative path is not canonical and safe"); }
  const root = path.resolve(projectRoot);
  const target = path.resolve(root, ...normalized.split("/"));
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new ProjectOperationError("PROJECT_VALIDATION_FAILED", "The Project-relative path escapes the Project root");
  await assertNoSymlinkInPath(target, root);
  return target;
}

export async function atomicWriteFile(
  target: string,
  data: string | Uint8Array,
  options: { overwrite?: boolean } = {},
): Promise<void> {
  const directory = path.dirname(target);
  await assertNoSymlinkInPath(target);
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
