import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SERVICE_WORKER_POLICY,
  DEFAULT_WORKER_NETWORK_CONCURRENCY_POLICY,
  canonicalReplayRequestKey,
  createArchiveCore,
  decideNetworkReplay,
  filterReplayHeaders,
  validateCanonicalRelativePath,
  validateStrictOfflinePolicy,
} from "@offline-web-archive/archive-core";

test("core exposes Phase 8 Browser and Render capability without future discovery behavior", () => {
  const description = createArchiveCore().describeSystem();
  assert.equal(description.coreStatus, "rendering-engine-ready");
  assert.ok(description.implementedCapabilities.includes("project.create"));
  assert.ok(description.implementedCapabilities.includes("project.import"));
  assert.ok(description.implementedCapabilities.includes("scope.evaluate"));
  assert.ok(description.implementedCapabilities.includes("queue.enqueue"));
  assert.ok(description.implementedCapabilities.includes("queue.claimNext"));
  assert.ok(description.implementedCapabilities.includes("recovery.recover"));
  assert.ok(description.implementedCapabilities.includes("checkpoint.save"));
  assert.ok(description.implementedCapabilities.includes("browser.getHealth"));
  assert.ok(description.implementedCapabilities.includes("render.start"));
  assert.ok(description.implementedCapabilities.includes("secret.backend.status"));
  assert.ok(description.implementedCapabilities.includes("secret.list"));
  assert.ok(description.plannedCapabilities.includes("crawl.execution"));
  assert.ok(description.plannedCapabilities.includes("link.discovery"));
});

test("Phase 13 pure contracts are deterministic, strict-offline safe, and secret-free", () => {
  assert.equal(DEFAULT_SERVICE_WORKER_POLICY.mode, "block");
  assert.equal(canonicalReplayRequestKey({ method: "GET", url: "https://example.test/page?b=2&a=1#fragment" }), "GET https://example.test/page?b=2&a=1");
  assert.deepEqual(filterReplayHeaders({ Cookie: "secret-cookie", Accept: "text/html", Authorization: "Bearer secret" }), { accept: "text/html" });
  const policy = validateStrictOfflinePolicy({ version: 1, enabled: true, localOrigins: ["http://127.0.0.1:3000"] });
  assert.equal(decideNetworkReplay({ request: { method: "GET", url: "https://example.test/page" }, matchedResponse: null, strictOffline: policy }).decision, "abort");
  assert.equal(decideNetworkReplay({ request: { method: "GET", url: "http://127.0.0.1:3000/page" }, matchedResponse: null, strictOffline: policy }).decision, "allow-local");
  assert.equal(decideNetworkReplay({ request: { method: "GET", url: "https://example.test/page" }, matchedResponse: { status: 200, headers: {}, bodyDigest: "a".repeat(64), bodyBytes: 1 }, strictOffline: policy }).decision, "fulfill");
  assert.equal(DEFAULT_WORKER_NETWORK_CONCURRENCY_POLICY.requestRatePerOrigin, 1);
  assert.equal(validateCanonicalRelativePath("%2e%2e/escape").valid, false);
  assert.equal(validateCanonicalRelativePath("%252e%252e/escape").valid, false);
});
