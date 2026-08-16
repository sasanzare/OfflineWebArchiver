import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  AssetOperationError,
  ASSET_TYPES,
  assetIdentityBasis,
  canonicalAssetContentLockPath,
  canonicalAssetContentPath,
  canonicalAssetIdentity,
  canonicalAssetPartialPath,
  canonicalAssetSourcePath,
  decideAssetResume,
  parseAssetContentRange,
  safeAssetUrl,
  validateCanonicalRelativePath,
} from "@offline-web-archive/archive-core";

const identityHash = createHash("sha256").update("asset-fixture", "utf8").digest("hex");

test("Asset identity preserves meaningful query parameters and redacts sensitive URL values", () => {
  const identity = canonicalAssetIdentity({
    originalUrl: "https://example.test/app.js?v=17&token=secret-value",
    normalizedUrl: "https://example.test/app.js?v=17&token=secret-value",
    identityHash,
  });
  assert.equal(identity.origin, "https://example.test");
  assert.match(identity.originalUrl, /v=17/);
  assert.equal(identity.originalUrl.includes("secret-value"), false);
  assert.equal(identity.originalUrl.includes("token=%5Bredacted%5D"), true);
  assert.equal(assetIdentityBasis(identity.normalizedUrl).startsWith("asset-identity-v1\n"), true);
  assert.equal(safeAssetUrl("https://example.test/redirect?next=asset&token=secret-value").includes("secret-value"), false);
  assert.throws(
    () => canonicalAssetIdentity({ originalUrl: "https://user:password@example.test/app.js", normalizedUrl: "https://example.test/app.js", identityHash }),
    (error: unknown) => error instanceof AssetOperationError && error.code === "ASSET_INPUT_INVALID",
  );
});

test("Asset storage paths are generated through the canonical Project-relative mapper", () => {
  const paths = [
    canonicalAssetSourcePath({ assetType: "javascript", identityHash }),
    canonicalAssetContentPath(identityHash),
    canonicalAssetPartialPath("00000000-0000-4000-8000-000000000001", 2),
    canonicalAssetContentLockPath(identityHash),
  ];
  for (const value of paths) {
    const validation = validateCanonicalRelativePath(value);
    assert.equal(validation.valid, true, value);
    assert.equal(validation.normalized, value);
  }
  assert.deepEqual([...ASSET_TYPES], ["css", "javascript", "image", "svg", "font", "audio", "video", "json", "manifest", "favicon", "binary"]);
});

test("Asset Range and resume decisions require a durable validator", () => {
  assert.deepEqual(parseAssetContentRange("bytes 100-199/500"), { start: 100, end: 199, total: 500 });
  assert.equal(parseAssetContentRange("bytes 100-199/*")?.total, null);
  assert.equal(parseAssetContentRange("bytes 200-100/500"), null);
  assert.equal(decideAssetResume({ localBytes: 100, durableBytes: 100, expectedBytes: 500, rangeSupported: true, storedValidator: '"v1"', remoteValidator: '"v1"', storedSha256: null, actualSha256: null }).decision, "resume");
  assert.equal(decideAssetResume({ localBytes: 100, durableBytes: 100, expectedBytes: 500, rangeSupported: false, storedValidator: '"v1"', remoteValidator: '"v1"', storedSha256: null, actualSha256: null }).decision, "restart");
  assert.equal(decideAssetResume({ localBytes: 100, durableBytes: 100, expectedBytes: 500, rangeSupported: true, storedValidator: '"v1"', remoteValidator: '"v2"', storedSha256: null, actualSha256: null }).reasonCode, "REMOTE_VALIDATOR_CHANGED");
});
