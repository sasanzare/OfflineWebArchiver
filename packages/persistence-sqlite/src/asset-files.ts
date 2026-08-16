import { createReadStream } from "node:fs";
import { constants } from "node:fs";
import { copyFile, lstat, mkdir, open, unlink } from "node:fs/promises";
import {
  AssetOperationError,
  canonicalAssetContentLockPath,
  type AssetContentLockPort,
  type AssetFileHandlePort,
  type AssetFileStorePort,
} from "@offline-web-archive/archive-core";
import { atomicPromoteFile, ensureProjectRelativeDirectory, resolveProjectRelativePath } from "./atomic.js";

const MAX_LOCK_ATTEMPTS = 100;

function errorCode(error: unknown): string | null {
  return error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : null;
}

async function statRegularFile(projectRoot: string, relativePath: string): Promise<{ readonly byteLength: number } | null> {
  const target = await resolveProjectRelativePath(projectRoot, relativePath);
  try {
    const stat = await lstat(target);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new AssetOperationError("ASSET_SYMLINK_BLOCKED", "The Asset file is not a regular file");
    return { byteLength: stat.size };
  } catch (error) {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  }
}

function handlePort(handle: Awaited<ReturnType<typeof open>>): AssetFileHandlePort {
  return {
    async write(bytes, bufferOffset, length, position) {
      const result = await handle.write(bytes, bufferOffset, length, position);
      return result.bytesWritten;
    },
    async truncate(length) {
      await handle.truncate(length);
    },
    async sync() {
      await handle.sync();
    },
    async close() {
      await handle.close();
    },
  };
}

async function waitForLock(signal: AbortSignal | undefined): Promise<void> {
  if (signal?.aborted) throw new AssetOperationError("ASSET_CANCELLED", "The Asset operation was cancelled");
  await new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = setTimeout(done, 10);
    const onAbort = (): void => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      signal?.removeEventListener("abort", onAbort);
      reject(new AssetOperationError("ASSET_CANCELLED", "The Asset operation was cancelled"));
    };
    function done(): void {
      timer = null;
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function acquireContentLock(projectRoot: string, sha256: string, operationId: string, signal?: AbortSignal): Promise<AssetContentLockPort> {
  const relativePath = canonicalAssetContentLockPath(sha256);
  await ensureProjectRelativeDirectory(projectRoot, "temp/assets/locks");
  const lockPath = await resolveProjectRelativePath(projectRoot, relativePath);
  let lockHandle: Awaited<ReturnType<typeof open>> | null = null;
  for (let attempt = 0; attempt < MAX_LOCK_ATTEMPTS; attempt += 1) {
    if (signal?.aborted) throw new AssetOperationError("ASSET_CANCELLED", "The Asset operation was cancelled");
    try {
      lockHandle = await open(lockPath, "wx", 0o600);
      await lockHandle.writeFile(`asset-lock-v1\n${operationId}\n`);
      await lockHandle.sync();
      break;
    } catch (error) {
      await lockHandle?.close().catch(() => undefined);
      lockHandle = null;
      if (errorCode(error) !== "EEXIST") throw new AssetOperationError("ASSET_CONTENT_LOCKED", "The Asset content lock could not be acquired", true);
      await waitForLock(signal);
    }
  }
  if (lockHandle === null) throw new AssetOperationError("ASSET_CONTENT_LOCKED", "The Asset content lock remained held", true);
  let released = false;
  return {
    async release() {
      if (released) return;
      released = true;
      await lockHandle!.close().catch(() => undefined);
      try {
        const stat = await lstat(lockPath);
        if (!stat.isSymbolicLink()) await unlink(lockPath);
      } catch (error) {
        if (errorCode(error) !== "ENOENT") throw error;
      }
    },
  };
}

export function createSqliteAssetFileStore(): AssetFileStorePort {
  return {
    async preparePartial(input) {
      await ensureProjectRelativeDirectory(input.projectRoot, "temp/assets");
      const target = await resolveProjectRelativePath(input.projectRoot, input.relativePath);
      let current = await statRegularFile(input.projectRoot, input.relativePath);
      if (current === null && input.previousRelativePath !== null && input.previousResumeOffset > 0 && input.previousRelativePath !== input.relativePath) {
        const previous = await statRegularFile(input.projectRoot, input.previousRelativePath);
        if (previous !== null) {
          const previousTarget = await resolveProjectRelativePath(input.projectRoot, input.previousRelativePath);
          try {
            await copyFile(previousTarget, target, constants.COPYFILE_EXCL);
          } catch (error) {
            if (errorCode(error) !== "EEXIST") throw error;
          }
        }
        current = await statRegularFile(input.projectRoot, input.relativePath);
      }
      if (current === null) {
        try {
          const parent = target.slice(0, Math.max(target.lastIndexOf("\\"), target.lastIndexOf("/")));
          await mkdir(parent, { recursive: false });
        } catch (error) {
          if (errorCode(error) !== "EEXIST") throw error;
        }
        let handle: Awaited<ReturnType<typeof open>> | null = null;
        try {
          handle = await open(target, "wx", 0o600);
        } catch (error) {
          if (errorCode(error) !== "EEXIST") throw error;
        } finally {
          await handle?.close();
        }
        current = await statRegularFile(input.projectRoot, input.relativePath);
      }
      if (current === null) throw new AssetOperationError("ASSET_NOT_FOUND", "The Asset partial file could not be prepared", true);
      return current;
    },
    async stat(projectRoot, relativePath) {
      return statRegularFile(projectRoot, relativePath);
    },
    async openFile(projectRoot, relativePath) {
      const target = await resolveProjectRelativePath(projectRoot, relativePath);
      const current = await statRegularFile(projectRoot, relativePath);
      if (current === null) throw new AssetOperationError("ASSET_NOT_FOUND", "The Asset file was not found", true);
      return handlePort(await open(target, "r+"));
    },
    async *read(projectRoot, relativePath) {
      const target = await resolveProjectRelativePath(projectRoot, relativePath);
      const current = await statRegularFile(projectRoot, relativePath);
      if (current === null) throw new AssetOperationError("ASSET_NOT_FOUND", "The Asset file was not found", true);
      for await (const chunk of createReadStream(target)) yield chunk;
    },
    async remove(projectRoot, relativePath) {
      const target = await resolveProjectRelativePath(projectRoot, relativePath);
      try {
        const stat = await lstat(target);
        if (stat.isSymbolicLink()) throw new AssetOperationError("ASSET_SYMLINK_BLOCKED", "The Asset cleanup target is a symbolic link");
        await unlink(target);
      } catch (error) {
        if (errorCode(error) !== "ENOENT") throw error;
      }
    },
    acquireContentLock,
    async promote(projectRoot, sourceRelativePath, destinationRelativePath) {
      await atomicPromoteFile(projectRoot, sourceRelativePath, destinationRelativePath);
    },
  };
}
