import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import path from "node:path";
import test from "node:test";
import {
  canonicalReplayRequestIdentity,
  defaultReplayCapturePolicy,
  safeReplayUrl,
  sanitizeReplayResponseHeaders,
  type ReplayCaptureInput,
  type ReplayLookupResult,
  type ReplayRequestIdentityInput,
  type ReplaySnapshotDescriptor,
  type RouteMap,
  type OriginalResourceMap,
} from "@offline-web-archive/archive-core";
import { createLocalRuntimeServer, createPlaywrightBrowserRuntime } from "@offline-web-archive/browser-runtime";

interface ReplayFixture {
  readonly origin: string;
  readonly requestCount: () => number;
  readonly disableNetwork: () => void;
  readonly close: () => Promise<void>;
}

async function startReplayFixture(): Promise<ReplayFixture> {
  let server: Server | null = null;
  let origin = "";
  let acceptNetwork = true;
  let count = 0;
  server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", origin || "http://127.0.0.1");
    if (requestUrl.pathname === "/" && request.method === "GET") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(`<!doctype html><body><div id="capture"></div><script>fetch(${JSON.stringify(`${origin}/api/product?id=1`)}).then((r) => r.json()).then((value) => { document.querySelector('#capture').dataset.captured = value.name; });</script>`);
      return;
    }
    if (requestUrl.pathname === "/api/product" && request.method === "GET") {
      count += 1;
      response.writeHead(acceptNetwork ? 200 : 503, {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
      });
      response.end(acceptNetwork ? JSON.stringify({ id: 1, name: "captured" }) : JSON.stringify({ error: "network-used" }));
      return;
    }
    if (requestUrl.pathname === "/api/missing") {
      count += 1;
      response.writeHead(404, { "content-type": "application/json", "access-control-allow-origin": "*" });
      response.end(JSON.stringify({ error: "missing" }));
      return;
    }
    if (requestUrl.pathname === "/api/mutate") {
      count += 1;
      response.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
      response.end(JSON.stringify({ mutated: true }));
      return;
    }
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("not found");
  });
  await new Promise<void>((resolve, reject) => {
    server!.once("error", reject);
    server!.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Fixture did not bind");
  origin = `http://127.0.0.1:${address.port}`;
  return {
    origin,
    requestCount: () => count,
    disableNetwork: () => { acceptNetwork = false; },
    async close() { await new Promise<void>((resolve, reject) => server?.close((error) => error === undefined ? resolve() : reject(error))); },
  };
}

async function waitForHtml(page: { extractHtml(): Promise<string> }, marker: string, timeoutMs = 5_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let html = "";
  while (Date.now() < deadline) {
    html = await page.extractHtml();
    if (html.includes(marker)) return html;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return html;
}

class MemoryReplayStore {
  private readonly snapshots = new Map<string, { snapshot: ReplaySnapshotDescriptor; body: Uint8Array }>();

  public size(): number { return this.snapshots.size; }

  public async capture(input: ReplayCaptureInput): Promise<ReplaySnapshotDescriptor> {
    const identityInput: ReplayRequestIdentityInput = {
      projectId: input.projectId,
      runId: input.runId,
      projectRevisionId: input.projectRevisionId,
      method: "GET",
      url: input.request.url,
      ...(input.request.headers === undefined ? {} : { headers: input.request.headers }),
      ...(input.queryPolicy === undefined ? {} : { queryPolicy: input.queryPolicy }),
    };
    const identity = canonicalReplayRequestIdentity(identityInput);
    const body = new Uint8Array(input.body);
    const snapshot: ReplaySnapshotDescriptor = {
      snapshotId: `memory-${this.snapshots.size + 1}`,
      captureVersion: 1,
      identity,
      originalUrl: safeReplayUrl(input.originalUrl),
      status: input.response.status,
      contentType: input.response.contentType,
      responseHeaders: sanitizeReplayResponseHeaders(input.response.headers),
      bodySha256: createHash("sha256").update(body).digest("hex"),
      bodyBytes: body.byteLength,
      bodyRelativePath: `memory/${this.snapshots.size + 1}.bin`,
      capturedAt: input.capturedAt,
      pageId: input.pageId ?? null,
      workerId: input.workerId ?? null,
      state: "complete",
    };
    this.snapshots.set(identity.key, { snapshot, body });
    return snapshot;
  }

  public async lookup(input: ReplayRequestIdentityInput): Promise<ReplayLookupResult> {
    try {
      const identity = canonicalReplayRequestIdentity(input);
      const value = this.snapshots.get(identity.key);
      return value === undefined ? { state: "miss", reason: "no-capture" } : { state: "match", snapshot: value.snapshot };
    } catch {
      return { state: "miss", reason: "sensitive-request" };
    }
  }

  public async readBody(snapshot: ReplaySnapshotDescriptor): Promise<Uint8Array> {
    const value = this.snapshots.get(snapshot.identity.key);
    if (value === undefined || value.snapshot.snapshotId !== snapshot.snapshotId) throw new Error("memory body missing");
    return new Uint8Array(value.body);
  }
}

function maps(pageResource: string): { routeMap: RouteMap; originalResourceMap: OriginalResourceMap } {
  return {
    routeMap: {
      version: 1,
      rewriteContractVersion: 1,
      projectId: "project-replay",
      runId: "run-replay",
      projectRevisionId: "revision-replay",
      trailingSlashPolicy: "preserve",
      collisions: [],
      routes: [{
        routeId: "route-replay",
        originalUrl: "https://archive.example.test/",
        normalizedUrl: "https://archive.example.test/",
        pageId: "page-replay",
        pageIdentity: "page-replay-identity",
        projectId: "project-replay",
        runId: "run-replay",
        projectRevisionId: "revision-replay",
        localRoute: "/",
        localResource: pageResource,
        routeType: "document",
        resolutionState: "local-match",
        fallback: null,
      }],
    },
    originalResourceMap: {
      version: 1,
      rewriteContractVersion: 1,
      resources: [{
        kind: "page",
        entityId: "page-replay",
        projectId: "project-replay",
        runId: "run-replay",
        projectRevisionId: "revision-replay",
        originalUrl: "https://archive.example.test/",
        normalizedUrl: "https://archive.example.test/",
        localResource: pageResource,
        localRoute: "/",
        identityHash: "resource-replay-identity",
        resolutionState: "local-match",
      }],
    },
  };
}

test("Phase 19 captures a JSON GET and replays it in strict offline mode", async () => {
  const fixture = await startReplayFixture();
  const store = new MemoryReplayStore();
  const runtime = createPlaywrightBrowserRuntime({ browserRoot: path.resolve(".runtime", "browsers") });
  const capturePolicy = {
    testMode: true,
    allowedFixtureOrigins: [fixture.origin],
    maxEvidenceEntries: 100,
    async authorizeUrl(url: string) { return { allowed: new URL(url).origin === fixture.origin, reasonCode: "TEST_FIXTURE", safeUrl: url, resolvedAddresses: ["127.0.0.1"] }; },
    networkReplay: {
      version: 1 as const,
      projectId: "project-replay",
      runId: "run-replay",
      projectRevisionId: "revision-replay",
      runtimeOrigin: "http://127.0.0.1:1",
      strictOffline: false,
      lookup: store,
      capture: { policy: defaultReplayCapturePolicy(), sink: store },
    },
  };
  try {
    const capturePage = await runtime.createPageSession("phase19-capture", capturePolicy);
    try {
      // The capture page is intentionally a live fixture page; it verifies the response listener without making the runtime origin trusted.
      await capturePage.navigate(fixture.origin, 5_000);
      await new Promise((resolve) => setTimeout(resolve, 500));
      assert.ok(fixture.requestCount() >= 1, "capture stage should reach the live API");
      assert.equal(store.size(), 1);
    } finally {
      await capturePage.close();
    }

    const archiveHtml = `<!doctype html><body><div id="state"></div><script>
      const api = ${JSON.stringify(`${fixture.origin}/api/product?id=1`)};
      const state = document.querySelector('#state');
      fetch(api).then((r) => r.json()).then((value) => { state.dataset.replay = value.name; }).catch(() => { state.dataset.replay = 'failed'; });
      fetch(${JSON.stringify(`${fixture.origin}/api/missing`)}).then(() => { state.dataset.miss = 'network'; }).catch(() => { state.dataset.miss = 'blocked'; });
      fetch(${JSON.stringify(`${fixture.origin}/api/mutate`)}, { method: 'POST', body: 'mutation' }).then(() => { state.dataset.post = 'network'; }).catch(() => { state.dataset.post = 'blocked'; });
    </script>`;
    const archiveRuntime = await createLocalRuntimeServer({
      projectId: "project-replay",
      ...maps("pages/archive.html"),
      additionalResourcePaths: ["pages/archive.html"],
      readResource: async () => new TextEncoder().encode(archiveHtml),
    });
    try {
      fixture.disableNetwork();
      const strictPage = await runtime.createPageSession("phase19-strict", {
        testMode: true,
        allowedFixtureOrigins: [archiveRuntime.origin],
        maxEvidenceEntries: 100,
        async authorizeUrl(url: string) { return { allowed: new URL(url).origin === archiveRuntime.origin, reasonCode: "LOCAL_RUNTIME", safeUrl: url, resolvedAddresses: ["127.0.0.1"] }; },
        networkReplay: {
          version: 1,
          projectId: "project-replay",
          runId: "run-replay",
          projectRevisionId: "revision-replay",
          runtimeOrigin: archiveRuntime.origin,
          strictOffline: true,
          lookup: store,
        },
      });
      try {
        await strictPage.navigate(archiveRuntime.urlForRoute("/"), 5_000);
        const html = await waitForHtml(strictPage, 'data-replay="captured"');
        assert.match(html, /data-replay="captured"/);
        assert.match(html, /data-miss="blocked"/);
        assert.match(html, /data-post="blocked"/);
        assert.equal(fixture.requestCount(), 1, "strict replay must not dispatch external API requests");
        assert.ok(strictPage.getEvidence().replayEvents?.some((event) => event.eventType === "replay-match"));
        assert.ok(strictPage.getEvidence().replayEvents?.some((event) => event.eventType === "external-network-leakage"));
        assert.ok(strictPage.getEvidence().replayEvents?.some((event) => event.eventType === "mutation-blocked" && event.normalizedIdentity === null));
      } finally {
        await strictPage.close();
      }
    } finally {
      await archiveRuntime.close();
    }
  } finally {
    await runtime.close();
    await fixture.close();
  }
});
