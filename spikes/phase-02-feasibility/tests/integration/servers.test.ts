import assert from "node:assert/strict";
import { request } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { startArchiveServer, startFixtureServer } from "../../src/spike/servers.js";

const spikeRoot = path.resolve(__dirname, "..", "..", "..");

function rawStatus(port: number, requestPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = request(
      { host: "127.0.0.1", port, path: requestPath, method: "GET" },
      (response) => {
        response.resume();
        response.once("end", () => resolve(response.statusCode ?? 0));
      },
    );
    req.once("error", reject);
    req.end();
  });
}

test("fixture server binds to loopback, serves delayed JSON, and handles SPA routes", async () => {
  const server = await startFixtureServer(path.join(spikeRoot, "fixtures", "spa"));
  try {
    assert.equal(server.host, "127.0.0.1");
    assert.ok(server.port > 0);
    const catalog = await fetch(`${server.origin}/api/catalog`).then((response) => response.json()) as { items: unknown[] };
    assert.equal(catalog.items.length, 2);
    const route = await fetch(`${server.origin}/products/example-item`).then((response) => response.text());
    assert.match(route, /Phase 2 SPA fixture/);
  } finally {
    await server.stop();
  }
});

test("archive server serves routes and rejects encoded traversal over HTTP", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "p02-server-test-"));
  await writeFile(path.join(root, "index.html"), "<h1>Offline archive</h1>", "utf8");
  const server = await startArchiveServer(root);
  try {
    assert.equal(server.host, "127.0.0.1");
    const route = await fetch(`${server.origin}/products/example-item`);
    assert.equal(route.status, 200);
    assert.match(await route.text(), /Offline archive/);
    assert.equal(await rawStatus(server.port, "/%2e%2e/%2e%2e/secret.txt"), 403);
  } finally {
    await server.stop();
    await rm(root, { recursive: true, force: true });
  }
});

