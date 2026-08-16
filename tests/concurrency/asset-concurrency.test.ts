import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { AssetOperationError, canonicalAssetIdentity, type AssetSourceInput, type LeaseClaim } from "@offline-web-archive/archive-core";
import { createQueueFixture, type QueueFixture } from "../support/queue-fixture.js";

function input(fixture: QueueFixture, claim: LeaseClaim): AssetSourceInput {
  const url = "https://example.com/shared.js?v=1";
  return {
    projectId: fixture.projectId,
    runId: fixture.runId,
    projectRevisionId: fixture.projectRevisionId,
    pageJobId: claim.job.jobId,
    assetType: "javascript",
    relationKind: "script",
    identity: canonicalAssetIdentity({ originalUrl: url, normalizedUrl: url, identityHash: createHash("sha256").update(url, "utf8").digest("hex") }),
  };
}

async function claim(fixture: QueueFixture, url: string, ownerId: string): Promise<LeaseClaim> {
  await fixture.storage.enqueue(fixture.enqueueInput(url));
  const result = await fixture.storage.claimNextWithLease({ projectId: fixture.projectId, runId: fixture.runId, ownerId, leaseDurationMs: 120_000, idempotencyKey: `asset-concurrency-${ownerId}`, operationId: `asset-concurrency-op-${ownerId}`, correlationId: `asset-concurrency-correlation-${ownerId}` });
  if (result === null) throw new Error("Asset concurrency fixture could not claim a Page Job");
  return result;
}

async function release(fixture: QueueFixture, value: LeaseClaim): Promise<void> {
  await fixture.storage.releaseLease({ projectId: fixture.projectId, runId: fixture.runId, jobId: value.job.jobId, leaseToken: value.leaseToken, fencingGeneration: value.lease.fencingGeneration, ownerId: value.lease.ownerId, reasonCode: "ASSET_CONCURRENCY_TEST", operationId: `asset-concurrency-release-${value.job.jobId}` }).catch(() => undefined);
}

test("Asset source creation is idempotent and an active fencing claim excludes a second worker", async () => {
  const fixture = await createQueueFixture("owa-asset-concurrency-");
  let first: LeaseClaim | null = null;
  let second: LeaseClaim | null = null;
  try {
    first = await claim(fixture, "https://example.com/page-one", "asset-concurrency-one");
    second = await claim(fixture, "https://example.com/page-two", "asset-concurrency-two");
    const secondClaim = second;
    if (secondClaim === null) throw new Error("Asset concurrency fixture lost the second claim");
    const firstInput = input(fixture, first);
    const created = await Promise.all(Array.from({ length: 6 }, () => fixture.storage.ensureAssetSource(firstInput)));
    assert.equal(new Set(created.map((value) => value.assetSourceId)).size, 1);
    const secondInput = input(fixture, secondClaim);
    const related = await fixture.storage.ensureAssetSource(secondInput);
    assert.equal(related.assetSourceId, created[0]!.assetSourceId);
    const pages = await fixture.storage.listAssetPages({ projectId: fixture.projectId, runId: fixture.runId, assetSourceId: related.assetSourceId });
    assert.deepEqual([...pages].sort(), [first.job.jobId, secondClaim.job.jobId].sort());

    const owned = await fixture.storage.beginAssetDownload({ projectId: first.job.projectId, runId: first.job.runId, jobId: first.job.jobId, leaseToken: first.leaseToken, fencingGeneration: first.lease.fencingGeneration, ownerId: first.lease.ownerId, assetSourceId: ownedSourceId(created[0]!) });
    assert.equal(owned.state, "downloading");
    await assert.rejects(
      () => fixture.storage.beginAssetDownload({ projectId: secondClaim.job.projectId, runId: secondClaim.job.runId, jobId: secondClaim.job.jobId, leaseToken: secondClaim.leaseToken, fencingGeneration: secondClaim.lease.fencingGeneration, ownerId: secondClaim.lease.ownerId, assetSourceId: ownedSourceId(related) }),
      (error: unknown) => error instanceof AssetOperationError && error.code === "ASSET_ALREADY_IN_PROGRESS",
    );
  } finally {
    if (first !== null) await release(fixture, first);
    if (second !== null) await release(fixture, second);
    await fixture.dispose();
  }
});

function ownedSourceId(source: { readonly assetSourceId: string }): string {
  return source.assetSourceId;
}
