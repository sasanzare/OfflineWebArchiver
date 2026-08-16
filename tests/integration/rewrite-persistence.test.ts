import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { writeRewrittenHtmlArtifact } from "@offline-web-archive/persistence-sqlite";

test("rewritten HTML is written to a separate canonical artifact atomically", async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "owa-phase18-rewrite-"));
  const originalPath = path.join(projectRoot, "pages", "job-1", "rendered.html");
  try {
    await writeFile(originalPath, "<html>original</html>", "utf8").catch(async (error: unknown) => {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
      await writeRewrittenHtmlArtifact({ projectRoot, jobId: "job-1", html: "<html>seed</html>" });
      await writeFile(originalPath, "<html>original</html>", "utf8");
    });
    const first = await writeRewrittenHtmlArtifact({ projectRoot, jobId: "job-1", html: "<html>rewritten-v1</html>" });
    const second = await writeRewrittenHtmlArtifact({ projectRoot, jobId: "job-1", html: "<html>rewritten-v2</html>" });
    assert.equal(first.relativePath, "pages/job-1/rewritten-v1.html");
    assert.equal(second.sha256.length, 64);
    assert.equal(await readFile(originalPath, "utf8"), "<html>original</html>");
    assert.equal(await readFile(path.join(projectRoot, second.relativePath), "utf8"), "<html>rewritten-v2</html>");
    await assert.rejects(() => writeRewrittenHtmlArtifact({ projectRoot, jobId: "..\\escape", html: "unsafe" }));
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});
