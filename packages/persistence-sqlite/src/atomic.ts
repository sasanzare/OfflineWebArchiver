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
    let current = resolved;
    while (true) {
      if (await pathExists(current)) await assertNotSymlink(current);
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
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

/** Create a directory tree while checking every existing ancestor for symlinks. */
export async function ensureDirectoryPath(directory: string, trustedRoot?: string): Promise<void> {
  const resolved = path.resolve(directory);
  const root = trustedRoot === undefined ? null : path.resolve(trustedRoot);
  if (root !== null && resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new ProjectOperationError("PROJECT_VALIDATION_FAILED", "The directory is outside the trusted Project root");
  }
  await assertNoSymlinkInPath(resolved, root ?? undefined);
  const missing: string[] = [];
  let current = resolved;
  while (true) {
    try {
      const stat = await lstat(current);
      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new ProjectOperationError("PROJECT_VALIDATION_FAILED", "The directory path contains a non-directory or symbolic-link entry");
      }
      break;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
      missing.push(current);
      const parent = path.dirname(current);
      if (parent === current || (root !== null && current === root)) break;
      current = parent;
    }
  }
  for (const entry of missing.reverse()) {
    try {
      await mkdir(entry);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
    }
    const stat = await lstat(entry);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new ProjectOperationError("PROJECT_VALIDATION_FAILED", "A directory ancestor changed to an unsafe entry");
    }
  }
}

export async function ensureProjectRelativeDirectory(projectRoot: string, relativePath: string): Promise<string> {
  let normalized: string;
  try { normalized = canonicalRelativePath(relativePath); }
  catch { throw new ProjectOperationError("PROJECT_VALIDATION_FAILED", "The Project-relative directory is not canonical and safe"); }
  const root = path.resolve(projectRoot);
  const target = path.resolve(root, ...normalized.split("/"));
  if (target === root || !target.startsWith(`${root}${path.sep}`)) throw new ProjectOperationError("PROJECT_VALIDATION_FAILED", "The Project-relative directory escapes the Project root");
  await ensureDirectoryPath(target, root);
  return target;
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
  await ensureDirectoryPath(directory);
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

export async function atomicPromoteFile(projectRoot: string, sourceRelativePath: string, destinationRelativePath: string): Promise<void> {
  let source: string;
  let destination: string;
  try {
    source = await resolveProjectRelativePath(projectRoot, sourceRelativePath);
    destination = await resolveProjectRelativePath(projectRoot, destinationRelativePath);
  } catch (error) {
    if (error instanceof ProjectOperationError) throw error;
    throw new ProjectOperationError("PROJECT_VALIDATION_FAILED", "The Asset promotion path is unsafe");
  }
  const sourceStat = await lstat(source).catch(() => null);
  if (sourceStat === null || !sourceStat.isFile() || sourceStat.isSymbolicLink()) {
    throw new ProjectOperationError("PROJECT_VALIDATION_FAILED", "The Asset promotion source is not a regular file");
  }
  if (await pathExists(destination)) {
    throw new ProjectOperationError("PROJECT_ALREADY_EXISTS", "The Asset destination already exists");
  }
  await ensureDirectoryPath(path.dirname(destination), path.resolve(projectRoot));
  try {
    await rename(source, destination);
    await assertNotSymlink(destination);
    await syncDirectory(path.dirname(destination));
  } catch (error) {
    if (error instanceof ProjectOperationError) throw error;
    throw new ProjectOperationError("PROJECT_ATOMIC_WRITE_FAILED", error instanceof Error ? error.message : "The Asset promotion failed", true);
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
