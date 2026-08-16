import assert from "node:assert/strict";
import { mkdir, rm, symlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ProjectOperationError } from "@offline-web-archive/archive-core";
import { ensureProjectRelativeDirectory, resolveProjectRelativePath } from "@offline-web-archive/persistence-sqlite";

test("Asset Project-relative paths reject root escape and symlink ancestors", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "owa-asset-path-"));
  const outside = await mkdtemp(path.join(tmpdir(), "owa-asset-outside-"));
  try {
    await assert.rejects(() => resolveProjectRelativePath(root, "../outside.txt"), ProjectOperationError);
    const link = path.join(root, "assets");
    await mkdir(path.join(root, "assets-real"));
    try {
      await symlink(path.join(root, "assets-real"), link, "junction");
    } catch (error) {
      if (error instanceof Error && "code" in error && ["EPERM", "EACCES", "UNKNOWN"].includes(String(error.code))) {
        t.skip("The current Windows test identity cannot create a directory junction");
        return;
      }
      throw error;
    }
    await assert.rejects(() => ensureProjectRelativeDirectory(root, "assets/objects"), ProjectOperationError);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
