import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { resolveArchiveRequest } from "../../src/spike/servers.js";

const root = path.resolve("archive-root");

test("runtime resolves the archive root and explicit assets", () => {
  assert.deepEqual(resolveArchiveRequest(root, "/"), {
    status: "file",
    filePath: path.join(root, "index.html"),
  });
  assert.deepEqual(resolveArchiveRequest(root, "/styles.css?cache=off"), {
    status: "file",
    filePath: path.join(root, "styles.css"),
  });
});

test("runtime maps extensionless SPA routes to the archive entry", () => {
  assert.deepEqual(resolveArchiveRequest(root, "/products/example-item"), {
    status: "route-fallback",
    filePath: path.join(root, "index.html"),
  });
});

for (const target of [
  "/../secret.txt",
  "/%2e%2e/%2e%2e/secret.txt",
  "/..%2f..%2fsecret.txt",
  "/..\\secret.txt",
  "/%E0%A4%A",
]) {
  test(`runtime rejects unsafe path ${target}`, () => {
    assert.deepEqual(resolveArchiveRequest(root, target), {
      status: "rejected",
      filePath: null,
    });
  });
}

