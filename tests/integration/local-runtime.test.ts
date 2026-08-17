import assert from "node:assert/strict";
import test from "node:test";
import { createLocalRuntimeServer } from "@offline-web-archive/browser-runtime";
import type { OriginalResourceMap, RouteMap } from "@offline-web-archive/archive-core";

const routeMap: RouteMap = {
  version: 1,
  rewriteContractVersion: 1,
  projectId: "project-runtime",
  runId: "run-runtime",
  projectRevisionId: "revision-runtime",
  trailingSlashPolicy: "preserve",
  collisions: [],
  routes: [{
    routeId: "route-runtime",
    originalUrl: "https://archive.example.test/",
    normalizedUrl: "https://archive.example.test/",
    pageId: "page-runtime",
    pageIdentity: "page-runtime-identity",
    projectId: "project-runtime",
    runId: "run-runtime",
    projectRevisionId: "revision-runtime",
    localRoute: "/",
    localResource: "pages/page-runtime/rewritten-v1.html",
    routeType: "document",
    resolutionState: "local-match",
    fallback: null,
  }],
};

const originalResourceMap: OriginalResourceMap = {
  version: 1,
  rewriteContractVersion: 1,
  resources: [{
    kind: "page",
    entityId: "page-runtime",
    projectId: "project-runtime",
    runId: "run-runtime",
    projectRevisionId: "revision-runtime",
    originalUrl: "https://archive.example.test/",
    normalizedUrl: "https://archive.example.test/",
    localResource: "pages/page-runtime/rewritten-v1.html",
    localRoute: "/",
    identityHash: "resource-runtime-identity",
    resolutionState: "local-match",
  }],
};

test("Phase 19 Local Runtime serves only mapped resources on its exact loopback origin", async () => {
  const events: string[] = [];
  const resources = new Map<string, Uint8Array>([
    ["pages/page-runtime/rewritten-v1.html", new TextEncoder().encode("<html><body>runtime</body></html>")],
    ["assets/app.js", new TextEncoder().encode("console.log('mapped')")],
  ]);
  const runtime = await createLocalRuntimeServer({
    projectId: "project-runtime",
    routeMap,
    originalResourceMap,
    additionalResourcePaths: ["assets/app.js"],
    readResource: async (relativePath) => {
      const bytes = resources.get(relativePath);
      if (bytes === undefined) throw new Error("missing resource");
      return bytes;
    },
    onEvent: (event) => { events.push(`${event.eventType}:${event.reasonCode}`); },
  });
  try {
    const page = await fetch(runtime.urlForRoute("/"));
    assert.equal(page.status, 200);
    assert.match(await page.text(), /runtime/);
    const asset = await fetch(`${runtime.origin}/assets/app.js`);
    assert.equal(asset.status, 200);
    assert.match(await asset.text(), /mapped/);
    const unknown = await fetch(`${runtime.origin}/not-archived.js`);
    assert.equal(unknown.status, 404);
    const traversal = await fetch(`${runtime.origin}/%252e%252e/secret`);
    assert.equal(traversal.status, 400);
    const mutation = await fetch(runtime.origin, { method: "POST" });
    assert.equal(mutation.status, 405);
    const wrongHost = await fetch(`http://localhost:${runtime.port}/`);
    assert.equal(wrongHost.status, 421);
    assert.ok(events.some((event) => event.startsWith("unknown-route:")));
    assert.ok(events.some((event) => event.startsWith("path-rejected:")));
    assert.ok(events.some((event) => event.startsWith("host-rejected:")));
  } finally {
    await runtime.close();
  }
});
