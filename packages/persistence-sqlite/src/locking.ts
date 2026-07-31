import { hostname } from "node:os";
import { open, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ProjectOperationError } from "@offline-web-archive/archive-core";
import { PROJECT_LOCK_FILE } from "@offline-web-archive/project-format";

interface LockRecord {
  version: 1;
  instanceId: string;
  pid: number;
  hostname: string;
  operation: string;
  createdAt: string;
}

export interface ProjectLock {
  path: string;
  record: LockRecord;
  release(): Promise<void>;
}

function parseLock(value: string): LockRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new ProjectOperationError("PROJECT_LOCK_INVALID", "The Project lock file is malformed");
  }
  if (
    typeof parsed !== "object" || parsed === null ||
    (parsed as Record<string, unknown>)["version"] !== 1 ||
    typeof (parsed as Record<string, unknown>)["instanceId"] !== "string" ||
    !Number.isInteger((parsed as Record<string, unknown>)["pid"]) ||
    typeof (parsed as Record<string, unknown>)["hostname"] !== "string" ||
    typeof (parsed as Record<string, unknown>)["operation"] !== "string" ||
    typeof (parsed as Record<string, unknown>)["createdAt"] !== "string"
  ) {
    throw new ProjectOperationError("PROJECT_LOCK_INVALID", "The Project lock file is malformed");
  }
  return parsed as LockRecord;
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !(error instanceof Error && "code" in error && error.code === "ESRCH");
  }
}

async function createLock(lockPath: string, operation: string, now: () => string): Promise<ProjectLock> {
  const record: LockRecord = {
    version: 1,
    instanceId: randomUUID(),
    pid: process.pid,
    hostname: hostname(),
    operation,
    createdAt: now(),
  };
  const handle = await open(lockPath, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(record, null, 2)}\n`);
    await handle.sync();
  } finally {
    await handle.close();
  }
  return {
    path: lockPath,
    record,
    async release(): Promise<void> {
      let active: LockRecord;
      try {
        active = parseLock(await readFile(lockPath, "utf8"));
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
        throw error;
      }
      if (active.instanceId !== record.instanceId) {
        throw new ProjectOperationError("PROJECT_LOCK_INVALID", "The Project lock ownership changed");
      }
      await unlink(lockPath);
    },
  };
}

export async function acquireProjectLock(
  projectPath: string,
  operation: string,
  now: () => string,
): Promise<ProjectLock> {
  const lockPath = path.join(projectPath, PROJECT_LOCK_FILE);
  try {
    return await createLock(lockPath, operation, now);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
  }
  const existing = parseLock(await readFile(lockPath, "utf8"));
  if (existing.hostname !== hostname() || processIsAlive(existing.pid)) {
    throw new ProjectOperationError("PROJECT_LOCKED", "The Project is already open by another writer", true);
  }
  await unlink(lockPath);
  try {
    return await createLock(lockPath, operation, now);
  } catch {
    throw new ProjectOperationError("PROJECT_LOCKED", "The Project lock was claimed concurrently", true);
  }
}
