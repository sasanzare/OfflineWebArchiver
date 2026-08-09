import assert from "node:assert/strict";
import test from "node:test";
import { authenticationRequestMetadata, decideAuthenticationRequest } from "@offline-web-archive/browser-runtime";

const siteOrigin = "https://site.example.test";
const providerOrigin = "https://auth.example.test";

function authorize(url: string) {
  return Promise.resolve({
    allowed: new URL(url).origin === siteOrigin || new URL(url).origin === providerOrigin,
    reasonCode: "AUTH_TEST_ALLOWLIST",
    safeUrl: new URL(url).origin + new URL(url).pathname,
    resolvedAddresses: ["203.0.113.10"],
  });
}

test("Authentication Context applies the origin allowlist to documents, subresources, redirects, and providers", async () => {
  const allowedOrigins = [siteOrigin, providerOrigin];
  const allowedDocument = await decideAuthenticationRequest({ url: `${siteOrigin}/login`, resourceType: "document", allowedOrigins, authorizeUrl: authorize });
  assert.equal(allowedDocument.allowed, true);

  const blockedDocument = await decideAuthenticationRequest({ url: "https://other.example.test/login", resourceType: "document", allowedOrigins, authorizeUrl: authorize });
  assert.equal(blockedDocument.allowed, false);
  assert.equal(blockedDocument.reasonCode, "AUTH_REQUEST_ORIGIN_NOT_APPROVED");

  const allowedSubresource = await decideAuthenticationRequest({ url: `${siteOrigin}/assets/app.js`, resourceType: "script", allowedOrigins, authorizeUrl: authorize });
  assert.equal(allowedSubresource.allowed, true);

  const blockedSubresource = await decideAuthenticationRequest({ url: "https://other.example.test/tracker.js", resourceType: "script", allowedOrigins, authorizeUrl: authorize });
  assert.equal(blockedSubresource.allowed, false);

  const allowedRedirect = await decideAuthenticationRequest({ url: `${siteOrigin}/after-login`, resourceType: "document", allowedOrigins, authorizeUrl: authorize });
  assert.equal(allowedRedirect.allowed, true);

  const blockedRedirect = await decideAuthenticationRequest({ url: "https://redirect.example.test/landing", resourceType: "document", allowedOrigins, authorizeUrl: authorize });
  assert.equal(blockedRedirect.allowed, false);

  const allowedProvider = await decideAuthenticationRequest({ url: `${providerOrigin}/oauth/authorize`, resourceType: "xhr", allowedOrigins, authorizeUrl: authorize });
  assert.equal(allowedProvider.allowed, true);
});

test("Authentication request metadata is bounded and does not expose query secrets", () => {
  const metadata = authenticationRequestMetadata({
    url: `${siteOrigin}/callback?access_token=should-not-appear&code=secret-code`,
    method: "POST",
    resourceType: "xhr",
  });
  assert.equal(metadata.method, "POST");
  assert.equal(metadata.resourceType, "xhr");
  assert.equal(metadata.urlSafe, `${siteOrigin}/callback?[redacted]`);
  assert.equal(JSON.stringify(metadata).includes("should-not-appear"), false);
  assert.equal(JSON.stringify(metadata).includes("secret-code"), false);
});

