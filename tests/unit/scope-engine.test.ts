import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyCanonical,
  classifyHost,
  classifyRedirect,
  createDefaultSiteProfileDraft,
  evaluateScope,
  evaluateScopeBatch,
  getScopeEngineInfo,
  normalizeSiteProfileDraft,
  parseSiteProfile,
  ScopeEngineError,
  serializeSiteProfile,
  type SiteProfile,
} from "@offline-web-archive/scope-engine";

function profile(overrides: Partial<SiteProfile> = {}): SiteProfile {
  const draft = createDefaultSiteProfileDraft({ name: "Scope tests", seedUrl: "https://example.com/" });
  return parseSiteProfile({
    schemaVersion: 1, engineVersion: 1,
    profileId: "00000000-0000-4000-8000-000000000501",
    projectId: "00000000-0000-4000-8000-000000000502",
    revisionId: "00000000-0000-4000-8000-000000000503",
    sequence: 1, createdAt: "2026-07-31T12:00:00.000Z", updatedAt: "2026-07-31T12:00:00.000Z",
    ...draft, ...overrides,
  });
}

test("profile serialization and normalization are deterministic", () => {
  const first = profile();
  const normalizedBase = createDefaultSiteProfileDraft({ name: "Base", seedUrl: "HTTPS://EXAMPLE.COM:443/docs/?utm_source=x#section" });
  assert.equal(normalizedBase.baseUrl, "https://example.com/docs/");
  assert.equal(evaluateScope(parseSiteProfile({ ...first, ...normalizedBase }), { rawUrl: "page" }).identityUrl, "https://example.com/docs/page");
  assert.equal(serializeSiteProfile(first), serializeSiteProfile(parseSiteProfile(JSON.parse(serializeSiteProfile(first)))));
  assert.throws(() => normalizeSiteProfileDraft({ ...first, domainRules: [...first.domainRules, first.domainRules[0]] }), ScopeEngineError);
  assert.throws(() => normalizeSiteProfileDraft({ ...first, domainRules: [...first.domainRules, { ...first.domainRules[0]!, ruleId: "same-policy" }] }), ScopeEngineError);
  assert.throws(() => normalizeSiteProfileDraft({ ...first, pathRules: [{ ruleId: "path-a", effect: "allow", match: "prefix", path: "/docs" }, { ruleId: "path-b", effect: "allow", match: "prefix", path: "/docs/" }] }), ScopeEngineError);
  assert.throws(() => normalizeSiteProfileDraft({ ...first, domainRules: Array.from({ length: 201 }, (_, index) => ({ ...first.domainRules[0]!, ruleId: `rule-${index}` })) }), ScopeEngineError);
  assert.throws(() => normalizeSiteProfileDraft({ ...first, seedUrls: ["https://outside.example/"] }), ScopeEngineError);
  assert.throws(() => normalizeSiteProfileDraft({ ...first, authorization: { status: "approved", legalBasisReference: "C:\\private\\approval.txt", approvedBy: ["owner"], approvedAt: "2026-07-31T12:00:00.000Z", expiresAt: null } }), ScopeEngineError);
});

test("canonical ordering does not depend on localeCompare", () => {
  const original = String.prototype.localeCompare;
  String.prototype.localeCompare = () => { throw new Error("locale-dependent comparison called"); };
  try {
    assert.equal(evaluateScope(profile(), { url: "https://example.com/?z=1&a=2" }).identityUrl, "https://example.com/?a=2&z=1");
  } finally {
    String.prototype.localeCompare = original;
  }
});

test("normalization removes default ports, dot segments, fragments, tracking, and sensitive values from identity", () => {
  const decision = evaluateScope(profile(), { url: "HTTPS://EXAMPLE.COM:443/a/../articles?token=secret&utm_source=x&id=3&id=2#frag" });
  assert.equal(decision.eligible, true);
  assert.equal(decision.normalizedUrl, "https://example.com/articles?id=2&id=3&utm_source=x");
  assert.equal(decision.identityUrl, "https://example.com/articles?id=2&id=3");
  assert.deepEqual(decision.query.omittedKeys, ["token", "utm_source"]);
  assert.ok(!JSON.stringify(decision).includes("secret"));
  assert.equal(decision.shouldQueue, false);
});

test("approved authorization changes queue eligibility without performing I/O", () => {
  const approved = profile({ authorization: { status: "approved", legalBasisReference: "AUTH-2026-001", approvedBy: ["target-owner"], approvedAt: "2026-07-31T12:00:00.000Z", expiresAt: null } });
  const decision = evaluateScope(approved, { url: "https://example.com/" });
  assert.equal(decision.eligible, true);
  assert.equal(decision.shouldQueue, true);
  assert.equal(decision.security.networkAuthorized, false);
});

test("relative resolution, bounded domain and path matching, and deny precedence are explicit", () => {
  const scoped = profile({
    baseUrl: "https://www.example.com/docs/",
    seedUrls: ["https://www.example.com/docs/"],
    domainRules: [
      { ruleId: "allow-site", effect: "allow", match: "subdomains", hostname: "example.com", schemes: ["https"], ports: [] },
      { ruleId: "deny-admin", effect: "deny", match: "exact", hostname: "admin.example.com", schemes: ["https"], ports: [] },
    ],
    pathRules: [{ ruleId: "allow-docs", effect: "allow", match: "prefix", path: "/docs" }, { ruleId: "deny-private", effect: "deny", match: "prefix", path: "/docs/private" }],
  });
  assert.equal(evaluateScope(scoped, { url: "guide", baseUrl: "https://www.example.com/docs/" }).eligible, true);
  const contextual = evaluateScope(scoped, {
    rawUrl: "guide",
    sourceUrl: "https://www.example.com/docs/",
    sourceDepth: 2,
    discoveryType: "dom-link",
    profileRevision: scoped.revisionId,
  });
  assert.equal(contextual.identityUrl, "https://www.example.com/docs/guide");
  assert.equal(contextual.depth, 2);
  assert.deepEqual(evaluateScope(scoped, { rawUrl: "guide", sourceUrl: "https://www.example.com/docs/", profileRevision: "00000000-0000-4000-8000-000000000099" }).reasonCodes, ["PROFILE_REVISION_MISMATCH"]);
  const deniedDomain = evaluateScope(scoped, { url: "https://admin.example.com/docs/" });
  assert.ok(deniedDomain.reasonCodes.includes("DOMAIN_DENIED"));
  assert.deepEqual(deniedDomain.matchedRules[0], { ruleId: "deny-admin", ruleType: "domain", ruleAction: "deny", ruleMatch: "exact" });
  assert.ok(evaluateScope(scoped, { url: "https://badexample.com/docs/" }).reasonCodes.includes("DOMAIN_NOT_ALLOWED"));
  assert.ok(evaluateScope(scoped, { url: "https://www.example.com/docs/private/a" }).reasonCodes.includes("PATH_DENIED"));
  assert.ok(evaluateScope(scoped, { url: "https://www.example.com/document" }).reasonCodes.includes("PATH_NOT_ALLOWED"));
  assert.ok(evaluateScope(scoped, { rawUrl: "https://www.example.com/docs/%2e%2e/admin" }).reasonCodes.includes("PATH_NOT_ALLOWED"));
});

test("URL forms, IDN, ports, paths, query denial, and fragment modes are explicit", () => {
  const idn = profile({
    baseUrl: "https://xn--bcher-kva.example/",
    seedUrls: ["https://xn--bcher-kva.example/"],
    domainRules: [{ ruleId: "idn", effect: "allow", match: "exact", hostname: "xn--bcher-kva.example", schemes: ["https"], ports: [] }],
    queryPolicy: { unknown: "identity", rules: [{ key: "blocked", classification: "denied", sensitive: true }] },
    fragmentPolicy: "preserve-hash-routes",
  });
  const accepted = evaluateScope(idn, { url: "//bücher.example:443/a//b/%2f/%5c?q=1#/route", baseUrl: "https://xn--bcher-kva.example/root" });
  assert.equal(accepted.normalizedUrl, "https://xn--bcher-kva.example/a//b/%2F/%5C?q=1#/route");
  assert.equal(accepted.relation, "same-origin");
  const ordinaryFragment = evaluateScope(idn, { url: "?q=1#section", baseUrl: "https://xn--bcher-kva.example/a" });
  assert.equal(ordinaryFragment.identityUrl, "https://xn--bcher-kva.example/a?q=1");
  const preserved = evaluateScope(profile({ fragmentPolicy: "preserve-all" }), { url: "https://example.com/a#section" });
  assert.equal(preserved.identityUrl, "https://example.com/a#section");
  const sensitiveFragment = evaluateScope(profile({ fragmentPolicy: "preserve-all" }), { url: "https://example.com/a#token=secret" });
  assert.ok(sensitiveFragment.reasonCodes.includes("SENSITIVE_FRAGMENT_REMOVED"));
  assert.ok(!JSON.stringify(sensitiveFragment).includes("secret"));
  const denied = evaluateScope(idn, { url: "https://xn--bcher-kva.example/?blocked=secret" });
  assert.ok(denied.reasonCodes.includes("QUERY_DENIED"));
  assert.ok(!JSON.stringify(denied).includes("secret"));
});

test("unsafe URL forms and non-page schemes fail closed without echoing input", () => {
  for (const [url, code] of [["https:\\example.com", "URL_BACKSLASH_CONFUSION"], ["https://example.com/%zz", "URL_INVALID_PERCENT_ENCODING"], ["https://user:pass@example.test/", "URL_CREDENTIALS_FORBIDDEN"], ["javascript:alert(1)", "SCHEME_NOT_ALLOWED"], ["\0https://example.com/", "URL_CONTROL_CHARACTER"], [`https://example.com/${"a".repeat(8_193)}`, "URL_TOO_LONG"]] as const) {
    const decision = evaluateScope(profile(), { url });
    assert.deepEqual(decision.reasonCodes, [code]);
    assert.equal(decision.displayUrl, null);
  }
  assert.equal(evaluateScope(profile(), { rawUrl: "  HTTPS://EXAMPLE.COM:443/path  " }).normalizedUrl, "https://example.com/path");
  assert.equal(evaluateScope(profile(), { rawUrl: "%6aavascript:alert(1)" }).normalizedUrl, "https://example.com/%6Aavascript:alert(1)");
  assert.deepEqual(evaluateScope(profile(), { rawUrl: "//example.com/a", sourceUrl: "ftp://example.com/root" }).reasonCodes, ["SCHEME_NOT_ALLOWED"]);
});

test("IP literals are classified without DNS and private addresses require explicit policy", () => {
  assert.equal(classifyHost("127.0.0.1"), "loopback");
  assert.equal(classifyHost("10.0.0.1"), "private");
  assert.equal(classifyHost("169.254.1.2"), "link-local");
  assert.equal(classifyHost("0.0.0.0"), "unspecified");
  assert.equal(classifyHost("224.0.0.1"), "multicast");
  assert.equal(classifyHost("192.0.2.1"), "reserved");
  assert.equal(classifyHost("[::1]"), "loopback");
  const local = profile({ baseUrl: "http://127.0.0.1/", seedUrls: ["http://127.0.0.1/"], domainRules: [{ ruleId: "local", effect: "allow", match: "exact", hostname: "127.0.0.1", schemes: ["http"], ports: [] }] });
  assert.ok(evaluateScope(local, { url: "http://127.0.0.1/" }).reasonCodes.includes("PRIVATE_NETWORK_NOT_ALLOWED"));
  const localV6 = profile({ baseUrl: "http://[::1]/", seedUrls: ["http://[::1]/"], domainRules: [{ ruleId: "local-v6", effect: "allow", match: "exact", hostname: "::1", schemes: ["http"], ports: [] }] });
  assert.ok(evaluateScope(localV6, { url: "http://[::1]/" }).reasonCodes.includes("PRIVATE_NETWORK_NOT_ALLOWED"));
});

test("depth, page, known identity, and batch limits are deterministic", () => {
  const limited = profile({ limits: { maxDepth: 0, maxPages: 0, maxRedirects: 2, maxBatchSize: 1 } });
  assert.deepEqual(evaluateScope(limited, { url: "https://example.com/child", depth: -1 }).reasonCodes, ["DEPTH_INVALID"]);
  assert.deepEqual(evaluateScope(limited, { url: "https://example.com/child", currentEligibleCount: -1 }).reasonCodes, ["PAGE_COUNT_INVALID"]);
  assert.ok(evaluateScope(limited, { url: "https://example.com/child", depth: 1 }).reasonCodes.includes("DEPTH_LIMIT_REACHED"));
  const first = evaluateScope(limited, { url: "https://example.com/" });
  assert.ok(first.reasonCodes.includes("PAGE_LIMIT_REACHED"));
  const known = evaluateScope(limited, { url: "https://example.com/", knownIdentityHashes: [first.identityHash!] });
  assert.ok(known.reasonCodes.includes("KNOWN_IDENTITY"));
  assert.equal(evaluateScope(profile({ limits: { maxDepth: null, maxPages: null, maxRedirects: 2, maxBatchSize: 1 } }), { url: "https://example.com/", currentEligibleCount: 10_000_000 }).eligible, true);
  assert.throws(() => evaluateScopeBatch(limited, [{ url: "https://example.com/" }, { url: "https://example.com/a" }]), ScopeEngineError);
});

test("canonical and redirect classifiers never fetch and expose stable classifications", () => {
  const value = profile();
  assert.equal(classifyCanonical(value, { url: "https://example.com/a?utm_source=x" }, "https://example.com/a").classification, "accepted-same-identity");
  const newCanonical = classifyCanonical(value, { url: "https://example.com/a" }, "https://example.com/b");
  assert.equal(newCanonical.classification, "accepted-new-identity");
  assert.equal(classifyCanonical(value, { url: "https://example.com/a" }, "https://outside.example/a").classification, "ignored-external");
  assert.equal(classifyCanonical(value, { url: "https://example.com/a" }, "javascript:bad").classification, "rejected-invalid");
  assert.equal(classifyCanonical(value, { url: "https://example.com/a" }, "https://example.com/b", { [newCanonical.sourceIdentityHash!]: newCanonical.canonicalIdentityHash! }).classification, "alias");
  assert.equal(classifyCanonical(value, { url: "https://example.com/a" }, "https://example.com/b", { [newCanonical.sourceIdentityHash!]: "0".repeat(64) }).classification, "conflict");
  assert.deepEqual(classifyCanonical(value, { url: "https://example.com/a" }, "https://example.com/b", { [newCanonical.canonicalIdentityHash!]: newCanonical.sourceIdentityHash! }).reasonCodes, ["CANONICAL_CYCLE"]);
  assert.equal(classifyRedirect(value, { sourceUrl: "https://example.com/a", targetUrl: "/b", statusCode: 302, chain: [] }).classification, "follow-in-scope");
  assert.equal(classifyRedirect(value, { sourceUrl: "https://example.com/a", targetUrl: "/a", statusCode: 302, chain: ["https://example.com/a"] }).classification, "stop-loop");
  assert.equal(classifyRedirect(value, { sourceUrl: "https://example.com/a", targetUrl: "/b", statusCode: 304, chain: [] }).classification, "stop-invalid");
  assert.equal(classifyRedirect(value, { sourceUrl: "https://example.com/a", targetUrl: "https://outside.example/b", statusCode: 302, chain: [] }).classification, "stop-external");
  assert.equal(classifyRedirect(value, { sourceUrl: "https://example.com/a", targetUrl: "http://example.com/b", statusCode: 302, chain: [] }).classification, "stop-denied");
  const externalAllowed = profile({
    domainRules: [
      { ruleId: "seed", effect: "allow", match: "exact", hostname: "example.com", schemes: ["https"], ports: [] },
      { ruleId: "external", effect: "allow", match: "exact", hostname: "outside.example", schemes: ["https"], ports: [] },
    ],
    redirectPolicy: { allowApprovedExternal: true, allowHttpsDowngrade: false },
  });
  assert.equal(classifyRedirect(externalAllowed, { sourceUrl: "https://example.com/a", targetUrl: "https://outside.example/b", statusCode: 307, chain: [] }).classification, "follow-approved-external");
  assert.equal(classifyRedirect(profile({ limits: { maxDepth: 10, maxPages: 100, maxRedirects: 0, maxBatchSize: 10 } }), { sourceUrl: "https://example.com/a", targetUrl: "/b", statusCode: 302, chain: [] }).classification, "stop-max-redirects");
  assert.equal(getScopeEngineInfo().networkAccess, false);
});
