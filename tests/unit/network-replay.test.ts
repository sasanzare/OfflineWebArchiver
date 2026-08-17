import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyCaptureEligibility,
  classifyReplayExternalDependency,
  classifyReplayMiss,
  containsSensitiveReplayBody,
  defaultReplayCapturePolicy,
  isRuntimeLocalRequest,
  normalizeServiceWorkerPolicy,
  resolveRuntimeRequest,
  runtimeResourcePaths,
  resolveServiceWorkerPolicy,
  sanitizeReplayResponseHeaders,
  canonicalReplayRequestIdentity,
  validateRuntimeOrigin,
  type OriginalResourceMap,
  type RouteMap,
} from "@offline-web-archive/archive-core";

const routeMap: RouteMap = {
  version: 1,
  rewriteContractVersion: 1,
  projectId: "project-1",
  runId: "run-1",
  projectRevisionId: "revision-1",
  trailingSlashPolicy: "preserve",
  collisions: [],
  routes: [{
    routeId: "route-1",
    originalUrl: "https://example.test/",
    normalizedUrl: "https://example.test/",
    pageId: "page-1",
    pageIdentity: "page-identity-1",
    projectId: "project-1",
    runId: "run-1",
    projectRevisionId: "revision-1",
    localRoute: "/",
    localResource: "pages/page-1/rewritten-v1.html",
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
    entityId: "page-1",
    projectId: "project-1",
    runId: "run-1",
    projectRevisionId: "revision-1",
    originalUrl: "https://example.test/",
    normalizedUrl: "https://example.test/",
    localResource: "pages/page-1/rewritten-v1.html",
    localRoute: "/",
    identityHash: "resource-identity-1",
    resolutionState: "local-match",
  }],
};

test("Phase 19 replay identity is scoped, normalized, and secret-safe", () => {
  const first = canonicalReplayRequestIdentity({
    projectId: "project-1",
    runId: "run-1",
    projectRevisionId: "revision-1",
    method: "GET",
    url: "https://api.example.test/items?b=2&utm_source=campaign&a=1#fragment",
    headers: { Accept: "application/json", Authorization: "Bearer secret", "X-Request-Id": "ignored" },
  });
  const second = canonicalReplayRequestIdentity({
    projectId: "project-1",
    runId: "run-1",
    projectRevisionId: "revision-1",
    method: "GET",
    url: "https://api.example.test/items?a=1&b=2",
    headers: { accept: "application/json" },
  });
  assert.equal(first.normalizedUrl, second.normalizedUrl);
  assert.equal(first.key, second.key);
  assert.notEqual(first.key, canonicalReplayRequestIdentity({ projectId: "project-1", runId: "run-1", projectRevisionId: "revision-2", method: "GET", url: second.normalizedUrl, headers: second.selectedHeaders }).key);
  assert.deepEqual(first.selectedHeaders, { accept: "application/json" });
  assert.throws(() => canonicalReplayRequestIdentity({ ...second, url: "https://api.example.test/items?access_token=secret" }), /sensitive query/);
  assert.equal(isRuntimeLocalRequest("http://127.0.0.1:4321/assets/app.js?x=1", "http://127.0.0.1:4321"), true);
  assert.equal(isRuntimeLocalRequest("http://127.0.0.1:4322/assets/app.js", "http://127.0.0.1:4321"), false);
  assert.equal(classifyReplayExternalDependency("https://api.example.test/items?id=1", {
    version: 1,
    rewriteContractVersion: 1,
    dependencies: [{
      dependencyId: "dependency-1",
      sourcePageId: "page-1",
      sourcePageIdentity: "page-identity-1",
      projectId: "project-1",
      runId: "run-1",
      projectRevisionId: "revision-1",
      rawReference: "https://api.example.test/items?id=1",
      resolvedUrl: "https://api.example.test/items?id=1",
      normalizedUrl: "https://api.example.test/items?id=1",
      element: "script",
      attribute: "src",
      resourceKind: "api",
      classification: "external-not-archived",
      policyReason: "not-captured",
    }],
  }), "external-not-archived");
});

test("Phase 19 capture policy accepts JSON GET and rejects mutations or sensitive material", () => {
  const policy = defaultReplayCapturePolicy();
  assert.equal(classifyCaptureEligibility({ policy, method: "GET", url: "https://api.example.test/data", resourceType: "fetch", contentType: "application/json; charset=utf-8", responseHeaders: { "content-type": "application/json" } }).eligibility, "capturable");
  assert.equal(classifyCaptureEligibility({ policy, method: "POST", url: "https://api.example.test/data", resourceType: "fetch", contentType: "application/json" }).eligibility, "side-effect-risk");
  assert.equal(classifyCaptureEligibility({ policy, method: "GET", url: "https://api.example.test/data", resourceType: "fetch", contentType: "application/json", responseHeaders: { "set-cookie": "secret" } }).eligibility, "sensitive");
  assert.equal(containsSensitiveReplayBody(new TextEncoder().encode('{"password":"secret"}'), "application/json"), true);
  assert.equal(containsSensitiveReplayBody(new TextEncoder().encode('{"items":[1,2]}'), "application/json"), false);
  assert.deepEqual(sanitizeReplayResponseHeaders({ "content-type": "application/json", "content-length": "99", "set-cookie": "secret", location: "/external" }), { "content-type": "application/json" });
});

test("Phase 19 Local Runtime resolution is map-bounded and Service Worker profile decisions are explicit", () => {
  assert.equal(validateRuntimeOrigin("http://127.0.0.1:4321"), "http://127.0.0.1:4321");
  assert.throws(() => validateRuntimeOrigin("http://localhost:4321"), /127.0.0.1/);
  assert.equal(resolveRuntimeRequest({ requestPath: "/", method: "GET", routeMap, originalResourceMap }).kind, "page");
  assert.equal(resolveRuntimeRequest({ requestPath: "/assets/app.js", method: "GET", routeMap, originalResourceMap, additionalResourcePaths: ["assets/app.js"] }).kind, "resource");
  const spaRouteMap: RouteMap = {
    ...routeMap,
    routes: [{
      ...routeMap.routes[0]!,
      routeId: "route-spa",
      localRoute: "/dashboard",
      routeType: "spa",
      fallback: {
        mode: "entry-document",
        entryPageId: "page-1",
        entryRoute: "/",
        entryResource: "pages/page-1/rewritten-v1.html",
      },
    }],
  };
  const spaResolution = resolveRuntimeRequest({ requestPath: "/dashboard", method: "GET", routeMap: spaRouteMap, originalResourceMap });
  assert.equal(spaResolution.kind, "page");
  assert.equal(spaResolution.relativeResource, "pages/page-1/rewritten-v1.html");
  assert.ok(runtimeResourcePaths({ routeMap: spaRouteMap, originalResourceMap }).includes("pages/page-1/rewritten-v1.html"));
  const collisionRouteMap: RouteMap = {
    ...routeMap,
    collisions: [{ collisionKey: "/", kind: "route", routeIds: ["route-1", "route-2"], reason: "case-or-unicode" }],
    routes: [{ ...routeMap.routes[0]!, resolutionState: "collision" }],
  };
  assert.equal(resolveRuntimeRequest({ requestPath: "/", method: "GET", routeMap: collisionRouteMap, originalResourceMap }).kind, "collision");
  assert.equal(runtimeResourcePaths({ routeMap: collisionRouteMap, originalResourceMap }).includes("pages/page-1/rewritten-v1.html"), false);
  const mismatchedResourceMap: OriginalResourceMap = { ...originalResourceMap, resources: [{ ...originalResourceMap.resources[0]!, runId: "run-other" }] };
  assert.equal(resolveRuntimeRequest({ requestPath: "/", method: "GET", routeMap, originalResourceMap: mismatchedResourceMap }).reasonCode, "RUNTIME_MAP_SCOPE_MISMATCH");
  assert.equal(resolveRuntimeRequest({ requestPath: "/%2e%2e/secret", method: "GET", routeMap, originalResourceMap }).reasonCode, "RUNTIME_PATH_UNSAFE");
  assert.equal(resolveRuntimeRequest({ requestPath: "/unknown", method: "GET", routeMap, originalResourceMap }).status, 404);
  const profileSpecific = normalizeServiceWorkerPolicy({ version: 1, mode: "profile-specific", profileMode: "allow" });
  assert.equal(resolveServiceWorkerPolicy(profileSpecific), "allow");
  assert.throws(() => normalizeServiceWorkerPolicy({ version: 1, mode: "profile-specific" }), /profileMode/);
  assert.throws(() => resolveServiceWorkerPolicy({ version: 1, mode: "profile-specific" }), /explicit profile decision/);
});
