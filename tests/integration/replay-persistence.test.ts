import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createSqliteProjectStorage } from "@offline-web-archive/persistence-sqlite";

test("Phase 19 SQLite replay snapshots are atomic, deduplicated, scoped, and integrity-checked", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "owa-phase19-replay-"));
  const projectPath = path.join(root, "project");
  const storage = createSqliteProjectStorage({ applicationVersion: "0.8.0" });
  try {
    const created = await storage.create({ destinationPath: projectPath, name: "Replay", slug: "replay" });
    await storage.open(projectPath);
    const request = {
      method: "GET" as const,
      url: "https://api.example.test/items?b=2&utm_source=ignored&a=1",
      headers: { accept: "application/json", authorization: "opaque-credential-canary" },
    };
    const response = {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8", "set-cookie": "session=secret", "content-length": "19" },
      contentType: "application/json; charset=utf-8",
    };
    const body = new TextEncoder().encode('{"items":[1,2]}');
    const first = await storage.capture({
      projectId: created.projectId,
      runId: created.runId,
      projectRevisionId: created.revisionId,
      originalUrl: request.url,
      request,
      response,
      body,
      capturedAt: "2026-08-17T00:00:00.000Z",
      pageId: "page-1",
      workerId: null,
    });
    const duplicate = await storage.capture({
      projectId: created.projectId,
      runId: created.runId,
      projectRevisionId: created.revisionId,
      originalUrl: "https://api.example.test/items?a=1&b=2",
      request: { ...request, url: "https://api.example.test/items?a=1&b=2" },
      response,
      body,
      capturedAt: "2026-08-17T00:00:01.000Z",
      pageId: "page-1",
      workerId: null,
    });
    assert.equal(duplicate.snapshotId, first.snapshotId);
    assert.deepEqual(first.responseHeaders, { "content-type": "application/json; charset=utf-8" });
    assert.equal(first.bodySha256.length, 64);
    assert.equal(first.bodyRelativePath.startsWith("api/responses/"), true);
    assert.deepEqual(await storage.readBody(first), body);

    const match = await storage.lookup({ ...request, projectId: created.projectId, runId: created.runId, projectRevisionId: created.revisionId });
    assert.equal(match.state, "match");
    if (match.state === "match") assert.equal(match.snapshot.snapshotId, first.snapshotId);
    const wrongRevision = await storage.lookup({ ...request, projectId: created.projectId, runId: created.runId, projectRevisionId: "revision-not-current" });
    assert.equal(wrongRevision.state, "miss");
    const wrongProject = await storage.lookup({ ...request, projectId: "project-not-current", runId: created.runId, projectRevisionId: created.revisionId });
    assert.equal(wrongProject.state, "miss");

    const secondBody = new TextEncoder().encode('{"items":[3]}');
    await storage.capture({
      projectId: created.projectId,
      runId: created.runId,
      projectRevisionId: created.revisionId,
      originalUrl: request.url,
      request,
      response,
      body: secondBody,
      capturedAt: "2026-08-17T00:00:02.000Z",
      pageId: "page-2",
      workerId: null,
    });
    const ambiguous = await storage.lookup({ ...request, projectId: created.projectId, runId: created.runId, projectRevisionId: created.revisionId });
    assert.equal(ambiguous.state, "ambiguous");

    await writeFile(path.join(projectPath, ...first.bodyRelativePath.split("/")), new TextEncoder().encode("tampered"));
    await assert.rejects(() => storage.readBody(first), /integrity verification failed/);
    assert.equal((await readFile(path.join(projectPath, "api", "responses", path.basename(first.bodyRelativePath)), "utf8")), "tampered");
  } finally {
    await storage.close().catch(() => undefined);
    await rm(root, { recursive: true, force: true });
  }
});
