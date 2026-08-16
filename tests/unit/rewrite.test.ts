import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  RewriteOperationError,
  archivedAssetMappingFromPhase17,
  canonicalRewriteLocalReference,
  canonicalRewriteResourcePath,
  canonicalRouteCollisionKey,
  createOriginalResourceMap,
  createRewriteMappingIndex,
  generateRouteMap,
  normalizeRewriteUrl,
  parseSrcset,
  resolveRewriteReference,
  rewriteCss,
  rewriteHtml,
  serializeExternalDependencyMap,
  serializeRouteMap,
  type AssetResourceMappingInput,
  type PageRouteMappingInput,
} from "@offline-web-archive/archive-core";

const PROJECT = "project-phase18";
const RUN = "run-phase18";
const REVISION = "revision-phase18";

function page(pageId: string, url: string, localRoute: string, extra: Partial<PageRouteMappingInput> = {}): PageRouteMappingInput {
  return {
    projectId: PROJECT,
    runId: RUN,
    projectRevisionId: REVISION,
    pageId,
    originalUrl: url,
    normalizedUrl: url,
    identityHash: `${pageId}-identity`,
    localRoute,
    localResource: `pages/${pageId}/rendered.html`,
    ...extra,
  };
}

function asset(assetSourceId: string, url: string, localResource: string, extra: Partial<AssetResourceMappingInput> = {}): AssetResourceMappingInput {
  return {
    projectId: PROJECT,
    runId: RUN,
    projectRevisionId: REVISION,
    assetSourceId,
    originalUrl: url,
    normalizedUrl: url,
    identityHash: `${assetSourceId}-identity`,
    assetType: "binary",
    localResource,
    finalized: true,
    ...extra,
  };
}

function sourcePage(): { pageId: string; projectId: string; runId: string; projectRevisionId: string; pageIdentity: string; originalUrl: string; normalizedUrl: string; localResource: string } {
  return {
    pageId: "page-home",
    projectId: PROJECT,
    runId: RUN,
    projectRevisionId: REVISION,
    pageIdentity: "page-home-identity",
    originalUrl: "https://example.test/products/1",
    normalizedUrl: "https://example.test/products/1",
    localResource: "pages/page-home/rendered.html",
  };
}

test("URL resolution preserves queries/fragments and handles protocol-relative references", () => {
  const relative = resolveRewriteReference("../asset.js?v=1#module", "https://example.test/app/page");
  assert.equal(relative.resolvedUrl, "https://example.test/asset.js?v=1#module");
  assert.equal(relative.normalizedUrl, "https://example.test/asset.js?v=1");
  assert.equal(relative.fragment, "#module");
  const protocolRelative = resolveRewriteReference("//cdn.example.test/app.css", "https://example.test/app/page");
  assert.equal(protocolRelative.resolvedUrl, "https://cdn.example.test/app.css");
  assert.equal(resolveRewriteReference("#section", "https://example.test/page").isFragmentOnly, true);
  assert.equal(resolveRewriteReference("file:///etc/passwd", "https://example.test/page").scheme, "file");
  assert.equal(resolveRewriteReference("C:\\outside.txt", "https://example.test/page").resolvedUrl, null);
});

test("HTML rewriter resolves base-relative references, maps Pages/CDN Assets, and preserves provenance", async () => {
  const fixture = await readFile(path.join(process.cwd(), "tests", "fixtures", "rewriting", "static.html"), "utf8");
  const mappings = createRewriteMappingIndex({
    pages: [page("page-about", "https://example.test/about", "/about")],
    assets: [
      asset("css-main", "https://example.test/css/main.css", "assets/css/main.css", { assetType: "css" }),
      asset("script-v1", "https://example.test/js/app.js?v=1", "assets/js/app-v1.js", { assetType: "javascript" }),
      asset("small-image", "https://example.test/images/small.png", "assets/images/small.png", { assetType: "image" }),
      asset("cdn-large", "https://cdn.example.test/large.png", "assets/images/cdn-large.png", { assetType: "image" }),
    ],
  });
  const result = rewriteHtml({ html: fixture, documentUrl: "https://example.test/products/1", page: sourcePage(), mappings });
  assert.equal(result.effectiveBaseUrl, "https://example.test/app/");
  assert.equal(result.removedBaseElement, true);
  assert.equal(result.html.includes("<base"), false);
  assert.match(result.html, /href="\/assets\/css\/main\.css"/);
  assert.match(result.html, /src="\/assets\/js\/app-v1\.js"/);
  assert.match(result.html, /href="\/about#features"/);
  assert.match(result.html, /srcset="\/assets\/images\/small\.png 1x, \/assets\/images\/cdn-large\.png 2x"/);
  assert.match(result.html, /href="https:\/\/example\.test\/about"/);
  assert.equal(result.canonicalReferences.length, 1);
  assert.equal(result.canonicalReferences[0]?.originalPreserved, true);
  assert.equal(result.dependencies.dependencies.some((item) => item.classification === "missing-local-resource"), true);
  assert.equal(result.dependencies.dependencies.some((item) => item.classification === "blocked-by-policy"), true);
  assert.equal(result.dependencies.dependencies.some((item) => item.rawReference.includes("/etc/passwd")), true);
  assert.equal(result.rewrittenReferenceCount, 6);
  assert.equal(rewriteHtml({ html: result.html, documentUrl: "https://example.test/products/1", page: sourcePage(), mappings }).html, result.html);
});

test("Asset query identity is not collapsed and finalized Phase 17 content is required", () => {
  const mappings = createRewriteMappingIndex({
    pages: [],
    assets: [
      asset("version-1", "https://example.test/app.js?v=1", "assets/js/app-v1.js", { assetType: "javascript" }),
      asset("version-2", "https://example.test/app.js?v=2", "assets/js/app-v2.js", { assetType: "javascript" }),
      asset("partial", "https://example.test/partial.js", "assets/js/partial.js", { finalized: false, assetType: "javascript" }),
    ],
  });
  const html = `<script src="/app.js?v=1"></script><script src="/app.js?v=2"></script><script src="/partial.js"></script>`;
  const result = rewriteHtml({ html, documentUrl: "https://example.test/page", page: sourcePage(), mappings });
  assert.match(result.html, /\/assets\/js\/app-v1\.js/);
  assert.match(result.html, /\/assets\/js\/app-v2\.js/);
  assert.match(result.html, /https:\/\/example\.test\/partial\.js/);
  assert.equal(result.dependencies.dependencies.some((item) => item.rawReference === "/partial.js"), true);
  assert.equal(normalizeRewriteUrl("https://example.test/app.js?v=1#ignored"), "https://example.test/app.js?v=1");
});

test("special schemes are preserved or blocked without filesystem access or JavaScript execution", () => {
  const mappings = createRewriteMappingIndex({ pages: [], assets: [] });
  const result = rewriteHtml({
    html: `<a href="mailto:owner@example.test">mail</a><a href="tel:+441234">call</a><a href="javascript:globalThis.__phase18 = true">script</a><img src="data:image/png;base64,AA=="><img src="blob:https://example.test/id"><a href="file:///etc/passwd">file</a><img src="\\\\server\\share\\x.png">`,
    documentUrl: "https://example.test/page",
    page: sourcePage(),
    mappings,
  });
  assert.match(result.html, /javascript:globalThis\.__phase18 = true/);
  assert.equal(result.dependencies.dependencies.some((item) => item.classification === "preserved-scheme"), true);
  assert.equal(result.dependencies.dependencies.some((item) => item.classification === "blocked-by-policy"), true);
  assert.equal(result.dependencies.dependencies.some((item) => item.classification === "future-network-replay-candidate"), true);
  assert.equal(result.html.includes("assets/"), false);
});

test("CSS references resolve against the original CSS URL, not the Page URL", async () => {
  const css = await readFile(path.join(process.cwd(), "tests", "fixtures", "rewriting", "styles.css"), "utf8");
  const mappings = createRewriteMappingIndex({
    pages: [],
    assets: [
      asset("base", "https://cdn.example.test/theme/base.css", "assets/css/base.css", { assetType: "css" }),
      asset("font", "https://cdn.example.test/fonts/site.woff2", "assets/fonts/site.woff2", { assetType: "font" }),
      asset("background", "https://example.test/images/background.png", "assets/images/background.png", { assetType: "image" }),
    ],
  });
  const result = rewriteCss({ css, cssUrl: "https://cdn.example.test/css/main.css", sourcePage: sourcePage(), mappings });
  assert.match(result.css, /@import "\/assets\/css\/base\.css"/);
  assert.match(result.css, /url\("\/assets\/fonts\/site\.woff2"\)/);
  assert.match(result.css, /url\(\/assets\/images\/background\.png#hero\)/);
  assert.equal(result.dependencies.dependencies.length, 0);
});

test("Route Map supports extensionless, trailing-slash, SPA routes and deterministic collision states", () => {
  const routes = generateRouteMap({
    projectId: PROJECT,
    runId: RUN,
    projectRevisionId: REVISION,
    pages: [
      page("root", "https://example.test/", "/"),
      page("about", "https://example.test/about", "/about"),
      page("about-slash", "https://example.test/about/", "/about/"),
      page("spa-dashboard", "https://example.test/dashboard", "/dashboard", { routeType: "spa", spaFallback: { mode: "entry-document", entryPageId: "spa-entry", entryRoute: "/", entryResource: "pages/spa-entry/rendered.html" } }),
      page("spa-profile", "https://example.test/profile/123", "/profile/123", { routeType: "spa", spaFallback: { mode: "entry-document", entryPageId: "spa-entry", entryRoute: "/", entryResource: "pages/spa-entry/rendered.html" } }),
      page("case-upper", "https://example.test/Case", "/Case"),
      page("case-lower", "https://example.test/case", "/case"),
    ],
  });
  assert.equal(routes.routes.find((entry) => entry.pageId === "about")?.routeType, "extensionless");
  assert.equal(routes.routes.find((entry) => entry.pageId === "spa-dashboard")?.fallback?.entryResource, "pages/spa-entry/rendered.html");
  assert.equal(routes.routes.filter((entry) => entry.resolutionState === "collision").length, 2);
  assert.equal(routes.routes.some((entry) => entry.localRoute === "/about/"), true);
  assert.equal(routes.collisions.some((collision) => collision.kind === "route"), true);
  assert.equal(serializeRouteMap(routes), serializeRouteMap(generateRouteMap({ projectId: PROJECT, runId: RUN, projectRevisionId: REVISION, pages: [
    page("root", "https://example.test/", "/"),
    page("about", "https://example.test/about", "/about"),
    page("about-slash", "https://example.test/about/", "/about/"),
    page("spa-dashboard", "https://example.test/dashboard", "/dashboard", { routeType: "spa", spaFallback: { mode: "entry-document", entryPageId: "spa-entry", entryRoute: "/", entryResource: "pages/spa-entry/rendered.html" } }),
    page("spa-profile", "https://example.test/profile/123", "/profile/123", { routeType: "spa", spaFallback: { mode: "entry-document", entryPageId: "spa-entry", entryRoute: "/", entryResource: "pages/spa-entry/rendered.html" } }),
    page("case-upper", "https://example.test/Case", "/Case"),
    page("case-lower", "https://example.test/case", "/case"),
  ] })));
  assert.equal(canonicalRouteCollisionKey("/Case"), canonicalRouteCollisionKey("/case"));
  assert.throws(() => canonicalRewriteLocalReference("../escape"), (error: unknown) => error instanceof RewriteOperationError && error.code === "REWRITE_PATH_UNSAFE");
  assert.equal(canonicalRewriteResourcePath("pages/about/rendered.html"), "pages/about/rendered.html");
});

test("Original URL to Local Resource map is stable and Phase 17 incomplete sources do not resolve locally", () => {
  const completed = archivedAssetMappingFromPhase17({
    projectId: PROJECT,
    runId: RUN,
    projectRevisionId: REVISION,
    assetSourceId: "stored-asset",
    originalUrl: "https://cdn.example.test/app.css",
    normalizedUrl: "https://cdn.example.test/app.css",
    identityHash: "stored-asset-identity",
    assetType: "css",
    state: "completed",
    storageRelativePath: "assets/objects/sha256/aa/hash",
    content: { contentId: "content-1", projectId: PROJECT, sha256: "a".repeat(64), byteLength: 1, storageRelativePath: "assets/objects/sha256/aa/hash", contentType: "text/css", createdAt: "2026-08-16T00:00:00.000Z", verifiedAt: "2026-08-16T00:00:00.000Z" },
  });
  const incomplete = archivedAssetMappingFromPhase17({
    projectId: PROJECT,
    runId: RUN,
    projectRevisionId: REVISION,
    assetSourceId: "partial-asset",
    originalUrl: "https://cdn.example.test/partial.css",
    normalizedUrl: "https://cdn.example.test/partial.css",
    identityHash: "partial-asset-identity",
    assetType: "css",
    state: "interrupted",
    storageRelativePath: "assets/objects/sha256/bb/hash",
    content: null,
  });
  assert.equal(completed?.localResource, "assets/objects/sha256/aa/hash");
  assert.equal(incomplete, null);
  const map = createOriginalResourceMap([page("home", "https://example.test/", "/"), completed!]);
  assert.deepEqual(map.resources.map((item) => item.entityId), ["stored-asset", "home"]);
  assert.equal(serializeExternalDependencyMap({ version: 1, rewriteContractVersion: 1, dependencies: [] }), '{"version":1,"rewriteContractVersion":1,"dependencies":[]}');
});

test("srcset parser preserves descriptors and embedded data candidates", () => {
  assert.deepEqual(parseSrcset("small.png 1x, large.png 640w"), [{ rawUrl: "small.png", descriptors: "1x" }, { rawUrl: "large.png", descriptors: "640w" }]);
  assert.deepEqual(parseSrcset("data:image/png;base64,AAAA 1x, image.png 2x"), [{ rawUrl: "data:image/png;base64,AAAA", descriptors: "1x" }, { rawUrl: "image.png", descriptors: "2x" }]);
});
