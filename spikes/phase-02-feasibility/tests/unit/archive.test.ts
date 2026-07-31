import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  serializeMetadata,
  writeTextAtomic,
  type ArchiveMetadata,
} from "../../src/spike/archive.js";

const metadata: ArchiveMetadata = {
  schemaVersion: "phase-02-spike-v1",
  experimental: true,
  runId: "p02-20260731123045-001122334455",
  originalUrl: "http://127.0.0.1:31001/",
  finalUrl: "http://127.0.0.1:31001/products/example-item",
  title: "Example Item — Phase 2 Fixture",
  renderStartedAt: "2026-07-31T12:30:45.000Z",
  renderCompletedAt: "2026-07-31T12:30:46.000Z",
  renderDurationMs: 1000,
  consoleErrorCount: 0,
  failedRequestCount: 0,
  chromiumVersion: "150.0.0.0",
  browserExecutable: ".playwright-browsers/chromium/chrome.exe",
  archiveEntry: "archive/index.html",
};

test("metadata serialization is parseable and contains no developer path", () => {
  const serialized = serializeMetadata(metadata);
  assert.deepEqual(JSON.parse(serialized), metadata);
  assert.doesNotMatch(serialized, /(?:^|["\s])[A-Za-z]:[\\/]/m);
  assert.equal(serialized.endsWith("\n"), true);
});

test("atomic write promotes final content and leaves no temporary file", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "p02-atomic-test-"));
  try {
    const target = path.join(root, "archive", "index.html");
    await writeTextAtomic(target, "first final value");
    assert.equal(await readFile(target, "utf8"), "first final value");
    assert.deepEqual(await readdir(path.dirname(target)), ["index.html"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
