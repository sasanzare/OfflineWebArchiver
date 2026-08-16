import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEFAULT_WORKER_POOL_CONFIGURATION,
  WorkerPoolScheduler,
  canonicalAssetIdentity,
  type AssetNetworkPort,
  type AssetNetworkRequest,
  type AssetNetworkResponse,
  type AssetSourceInput,
  type LeaseClaim,
} from "@offline-web-archive/archive-core";
import { downloadAsset, type AssetDownloadResult } from "@offline-web-archive/application-service";
import { resolveProjectRelativePath } from "@offline-web-archive/persistence-sqlite";
import { createQueueFixture, type QueueFixture } from "../support/queue-fixture.js";

const PAYLOAD = Buffer.from("asset-payload-".repeat(400), "utf8");

async function* chunks(value: Buffer, faultAfter: number | null = null): AsyncIterable<Uint8Array> {
  const chunkSize = 47;
  let offset = 0;
  while (offset < value.length) {
    const end = Math.min(value.length, offset + chunkSize);
    yield value.subarray(offset, end);
    offset = end;
    if (faultAfter !== null && offset >= faultAfter) throw new Error("fixture stream interruption");
  }
}

class FixtureAssetNetwork implements AssetNetworkPort {
  public readonly requests: AssetNetworkRequest[] = [];
  public interruptNextRangeRequest = false;

  public async request(input: AssetNetworkRequest): Promise<AssetNetworkResponse> {
    this.requests.push({ ...input, headers: { ...input.headers } });
    const url = new URL(input.url);
    if (url.pathname === "/redirect") {
      return { status: 302, url: input.url, headers: { location: "https://example.com/same?v=1" }, body: chunks(Buffer.alloc(0)) };
    }
    const range = input.headers["Range"] ?? input.headers["range"];
    const rangeMatch = range === undefined ? null : /^bytes=(\d+)-$/.exec(range);
    const start = rangeMatch === null ? 0 : Number(rangeMatch[1]);
    if (rangeMatch !== null && url.pathname === "/range.bin") {
      return {
        status: 206,
        url: input.url,
        headers: {
          "content-type": "application/octet-stream",
          "content-range": `bytes ${start}-${PAYLOAD.length - 1}/${PAYLOAD.length}`,
          "content-length": String(PAYLOAD.length - start),
          etag: '"asset-v1"',
        },
        body: chunks(PAYLOAD.subarray(start)),
      };
    }
    const faultAfter = url.pathname === "/range.bin" && this.interruptNextRangeRequest ? Math.max(47, Math.floor(PAYLOAD.length / 3)) : null;
    this.interruptNextRangeRequest = false;
    return {
      status: 200,
      url: input.url,
      headers: { "content-type": "application/javascript", "content-length": String(PAYLOAD.length), etag: '"asset-v1"' },
      body: chunks(PAYLOAD, faultAfter),
    };
  }
}

function assetInput(fixture: QueueFixture, claim: LeaseClaim, url: string, relationKind = "stylesheet"): AssetSourceInput {
  return {
    projectId: fixture.projectId,
    runId: fixture.runId,
    projectRevisionId: fixture.projectRevisionId,
    pageJobId: claim.job.jobId,
    assetType: "javascript",
    relationKind,
    identity: canonicalAssetIdentity({
      originalUrl: url,
      normalizedUrl: url,
      identityHash: createHash("sha256").update(url, "utf8").digest("hex"),
    }),
  };
}

async function enqueueAndClaim(fixture: QueueFixture, pageUrl: string, ownerId: string): Promise<LeaseClaim> {
  await fixture.storage.enqueue(fixture.enqueueInput(pageUrl));
  const claim = await fixture.storage.claimNextWithLease({
    projectId: fixture.projectId,
    runId: fixture.runId,
    ownerId,
    leaseDurationMs: 120_000,
    idempotencyKey: `asset-claim-${pageUrl}-${ownerId}`,
    operationId: `asset-claim-op-${pageUrl}-${ownerId}`,
    correlationId: `asset-claim-correlation-${pageUrl}-${ownerId}`,
  });
  if (claim === null) throw new Error(`Could not claim ${pageUrl}`);
  return claim;
}

async function executeClaim(fixture: QueueFixture, claim: LeaseClaim, network: FixtureAssetNetwork, input: AssetSourceInput): Promise<{ result: AssetDownloadResult | null; failure: string | null }> {
  const scheduler = new WorkerPoolScheduler(DEFAULT_WORKER_POOL_CONFIGURATION, { projectId: fixture.projectId, runId: fixture.runId, now: () => "2026-07-31T12:00:00.000Z" });
  const run = await scheduler.run(
    [{ jobId: claim.job.jobId, url: claim.job.normalizedUrl }],
    {
      async execute(execution) {
        return {
          value: await downloadAsset({
            projectRoot: fixture.projectPath,
            asset: input,
            storage: fixture.storage,
            fileStore: fixture.storage,
            network,
            lease: { projectId: claim.job.projectId, runId: claim.job.runId, jobId: claim.job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: claim.lease.ownerId },
            reservation: execution.reservation,
            networkBudget: execution.networkBudget,
            observeResponse: execution.observeResponse,
            heartbeat: execution.heartbeat,
            authorizeUrl: async (url) => ({ allowed: new URL(url).origin === "https://example.com" }),
            recovery: fixture.storage,
            checkpointIntervalBytes: 47,
            operationId: `asset-download-${claim.job.jobId}-${network.requests.length}`,
            signal: execution.signal,
          }),
        };
      },
    },
    { workerIdPrefix: `asset-worker-${claim.job.jobId}` },
  );
  if (run.completed.length > 0) return { result: run.completed[0]!.value as AssetDownloadResult, failure: null };
  return { result: null, failure: run.failed[0]?.errorCode ?? "unknown" };
}

async function releaseClaim(fixture: QueueFixture, claim: LeaseClaim, reasonCode: string): Promise<void> {
  await fixture.storage.releaseLease({
    projectId: claim.job.projectId,
    runId: claim.job.runId,
    jobId: claim.job.jobId,
    leaseToken: claim.leaseToken,
    fencingGeneration: claim.lease.fencingGeneration,
    ownerId: claim.lease.ownerId,
    reasonCode,
    operationId: `asset-release-${claim.job.jobId}-${reasonCode}`,
  });
}

test("Asset Downloader stores content, preserves Page↔Asset relations, and deduplicates bytes", async () => {
  const fixture = await createQueueFixture("owa-asset-download-");
  const network = new FixtureAssetNetwork();
  const claims: LeaseClaim[] = [];
  try {
    const firstClaim = await enqueueAndClaim(fixture, "https://example.com/page-a", "asset-owner-a");
    claims.push(firstClaim);
    const firstInput = assetInput(fixture, firstClaim, "https://example.com/same?v=1");
    const first = await executeClaim(fixture, firstClaim, network, firstInput);
    assert.equal(first.failure, null);
    assert.equal(first.result?.deduplicated, false);
    const firstResult = first.result!;
    const storedPath = await resolveProjectRelativePath(fixture.projectPath, firstResult.content.storageRelativePath);
    assert.deepEqual(await readFile(storedPath), PAYLOAD);
    assert.equal(network.requests.length, 1);

    const secondClaim = await enqueueAndClaim(fixture, "https://example.com/page-b", "asset-owner-b");
    claims.push(secondClaim);
    const second = await executeClaim(fixture, secondClaim, network, assetInput(fixture, secondClaim, "https://example.com/same?v=1"));
    assert.equal(second.failure, null);
    assert.equal(second.result?.reused, true);
    assert.equal(network.requests.length, 1);

    const thirdClaim = await enqueueAndClaim(fixture, "https://example.com/page-c", "asset-owner-c");
    claims.push(thirdClaim);
    const third = await executeClaim(fixture, thirdClaim, network, assetInput(fixture, thirdClaim, "https://example.com/same?v=2"));
    assert.equal(third.failure, null);
    assert.equal(third.result?.deduplicated, true);
    assert.equal(third.result?.content.contentId, firstResult.content.contentId);
    assert.equal(network.requests.length, 2);
    const pages = await fixture.storage.listAssetPages({ projectId: fixture.projectId, runId: fixture.runId, assetSourceId: firstResult.source.assetSourceId });
    assert.deepEqual([...pages].sort(), [firstClaim.job.jobId, secondClaim.job.jobId].sort());
    assert.notEqual(firstResult.source.normalizedUrl, third.result!.source.normalizedUrl);
  } finally {
    for (const claim of claims) await releaseClaim(fixture, claim, "ASSET_TEST_COMPLETED").catch(() => undefined);
    await fixture.dispose();
  }
});

test("Asset Downloader resumes a durable partial with HTTP Range and fences incomplete output", async () => {
  const fixture = await createQueueFixture("owa-asset-range-");
  const network = new FixtureAssetNetwork();
  network.interruptNextRangeRequest = true;
  let claim: LeaseClaim | null = null;
  try {
    claim = await enqueueAndClaim(fixture, "https://example.com/page-range", "asset-range-owner");
    const input = assetInput(fixture, claim, "https://example.com/range.bin");
    const first = await executeClaim(fixture, claim, network, input);
    assert.notEqual(first.failure, null);
    const interrupted = await fixture.storage.listPageAssets({ projectId: fixture.projectId, runId: fixture.runId, pageJobId: claim.job.jobId });
    assert.equal(interrupted.length, 1);
    assert.equal(interrupted[0]!.state, "interrupted");
    assert.ok(interrupted[0]!.resumeOffset > 0);

    const second = await executeClaim(fixture, claim, network, input);
    assert.equal(second.failure, null);
    assert.equal(second.result?.source.state, "completed");
    assert.equal(network.requests.some((request) => request.headers["Range"] === `bytes=${interrupted[0]!.resumeOffset}-`), true);
    const finalPath = await resolveProjectRelativePath(fixture.projectPath, second.result!.content.storageRelativePath);
    assert.deepEqual(await readFile(finalPath), PAYLOAD);
  } finally {
    if (claim !== null) await releaseClaim(fixture, claim, "ASSET_TEST_COMPLETED").catch(() => undefined);
    await fixture.dispose();
  }
});
