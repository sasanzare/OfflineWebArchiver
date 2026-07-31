import assert from "node:assert/strict";
import test from "node:test";
import {
  createProjectManifest,
  isSupportedProjectFormatVersion,
  parseProjectManifest,
  portablePathCollisionKey,
  serializeProjectManifest,
  validatePortableRelativePath,
} from "@offline-web-archive/project-format";

const manifest = createProjectManifest({
  applicationVersion: "0.4.0",
  projectId: "00000000-0000-4000-8000-000000000001",
  name: "Portable Project",
  slug: "portable-project",
  createdAt: "2026-07-31T12:00:00.000Z",
  revisionId: "00000000-0000-4000-8000-000000000002",
  runId: "00000000-0000-4000-8000-000000000003",
});

test("manifest serialization is deterministic, strict, versioned, and secret-free", () => {
  const serialized = serializeProjectManifest(manifest);
  assert.equal(serialized, serializeProjectManifest(parseProjectManifest(JSON.parse(serialized))));
  assert.ok(serialized.endsWith("\n"));
  assert.equal(serialized.includes("C:\\"), false);
  assert.equal(serialized.includes("password"), false);
  assert.throws(() => parseProjectManifest({ ...manifest, unknown: true }));
  assert.throws(() => parseProjectManifest({ ...manifest, format: { ...manifest.format, version: "2.0.0" } }));
  assert.throws(() => createProjectManifest({
    applicationVersion: "0.4.0",
    projectId: "00000000-0000-4000-8000-000000000001",
    name: "Unsafe",
    slug: "unsafe",
    createdAt: "2026-07-31T12:00:00.000Z",
    revisionId: "00000000-0000-4000-8000-000000000002",
    runId: "00000000-0000-4000-8000-000000000003",
    baseUrl: "https://user:secret@example.test/",
  }));
});

test("format compatibility policy accepts the supported 1.0 and 1.1 lines", () => {
  assert.equal(isSupportedProjectFormatVersion("1.0.0"), true);
  assert.equal(isSupportedProjectFormatVersion("1.1.0"), true);
  assert.equal(isSupportedProjectFormatVersion("1.2.0"), false);
  assert.equal(isSupportedProjectFormatVersion("2.0.0"), false);
  assert.equal(isSupportedProjectFormatVersion("1.0"), false);
});

test("portable path corpus rejects traversal, host paths, aliases, and collisions", () => {
  for (const value of ["../x", "a/../b", "/root", "C:/drive", "\\\\server\\share", "a\\b", "a//b", "CON", "aux.txt", "tail.", "tail ", "a:b", "e\u0301.txt"]) {
    assert.equal(validatePortableRelativePath(value).valid, false, value);
  }
  for (const value of ["project.json", "database/crawl.db", "assets/images/photo.webp", "é.txt"]) {
    assert.equal(validatePortableRelativePath(value).valid, true, value);
  }
  assert.equal(portablePathCollisionKey("Assets/File.txt"), portablePathCollisionKey("assets/file.txt"));
});
