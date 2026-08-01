import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { RenderOperationError, type RenderResult } from "@offline-web-archive/archive-core";
import { createQueueFixture } from "../support/queue-fixture.js";

const evidence = { consoleEntries: [], pageErrors: [], failedRequests: [], redirects: [], blockedRequests: 0, evidenceTruncated: false } as const;
type RenderResultDraft = Omit<RenderResult, "renderResultId" | "attemptId" | "htmlArtifact" | "screenshotArtifact" | "createdAt">;

function resultDraft(jobId: string, projectId: string, runId: string): RenderResultDraft {
  return {
    renderResultVersion: 1, jobId, projectId, runId,
    requestedUrlSafe: "https://example.com/", finalUrlSafe: "https://example.com/", httpStatus: 200, contentType: "text/html",
    pageTitleSafe: "Fault fixture", resultStatus: "completed", qualityClassification: "complete",
    navigationStartedAt: "2026-07-31T12:00:00.000Z", stabilityReachedAt: "2026-07-31T12:00:00.100Z", extractionCompletedAt: "2026-07-31T12:00:00.200Z", renderCompletedAt: "2026-07-31T12:00:00.300Z",
    navigationDurationMs: 100, stabilityDurationMs: 100, totalDurationMs: 300, browserVersion: "141.0.7390.37", playwrightVersion: "1.56.1", renderEngineVersion: 1, contextProfileVersion: 1, evidence,
  };
}

async function claimFixture(fault: "after-html-write" | "after-database-commit") {
  const fixture = await createQueueFixture(`owa-render-${fault}-`, { renderCommitFault: fault });
  const queued = await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/", { idempotencyKey: `enqueue-${randomUUID()}` }));
  assert.notEqual(queued.job, null);
  const job = queued.job!;
  const claim = await fixture.storage.claimJobWithLease({
    projectId: fixture.projectId, runId: fixture.runId, jobId: job.jobId, ownerId: "fault-test", leaseDurationMs: 60_000,
    idempotencyKey: `claim-${randomUUID()}`, operationId: `claim-operation-${randomUUID()}`, correlationId: `claim-correlation-${randomUUID()}`,
  });
  return { fixture, job, claim };
}

test("artifact-first failure leaves no false database result and remains recoverable", async () => {
  const { fixture, job, claim } = await claimFixture("after-html-write");
  const operationId = `render-${randomUUID()}`;
  try {
    await assert.rejects(fixture.storage.commitRenderResult({
      projectId: fixture.projectId, runId: fixture.runId, jobId: job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: "fault-test", operationId,
      result: resultDraft(job.jobId, fixture.projectId, fixture.runId), html: "<!doctype html><main>artifact-first</main>", screenshot: null,
    }), (error: unknown) => error instanceof RenderOperationError && error.code === "RENDER_COMMIT_FAILED");
    assert.match(await readFile(path.join(fixture.projectPath, "pages", job.jobId, "rendered.html"), "utf8"), /artifact-first/);
    await assert.rejects(fixture.storage.getRenderResult({ projectId: fixture.projectId, runId: fixture.runId, jobId: job.jobId }), (error: unknown) => error instanceof RenderOperationError && error.code === "RENDER_RESULT_NOT_FOUND");
    await fixture.storage.recordRenderFailure({ projectId: fixture.projectId, runId: fixture.runId, jobId: job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: "fault-test", operationId: `${operationId}:failure`, failureCode: "RENDER_COMMIT_FAILED", failureCategory: "persistence", retryable: true, safeMessage: "Injected artifact-first failure", occurredAt: "2026-07-31T12:00:00.400Z" });
    assert.equal((await fixture.storage.get({ projectId: fixture.projectId, runId: fixture.runId, jobId: job.jobId })).state, "retrying");
  } finally {
    await fixture.dispose();
  }
});

test("database-commit crash replays the single durable Render Result", async () => {
  const { fixture, job, claim } = await claimFixture("after-database-commit");
  const operationId = `render-${randomUUID()}`;
  const input = {
    projectId: fixture.projectId, runId: fixture.runId, jobId: job.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: "fault-test", operationId,
    result: resultDraft(job.jobId, fixture.projectId, fixture.runId), html: "<!doctype html><main>database-committed</main>", screenshot: null,
  };
  try {
    await assert.rejects(fixture.storage.commitRenderResult(input), (error: unknown) => error instanceof RenderOperationError && error.code === "RENDER_COMMIT_FAILED");
    const durable = await fixture.storage.getRenderResult({ projectId: fixture.projectId, runId: fixture.runId, jobId: job.jobId });
    assert.equal(durable.resultStatus, "completed");
    assert.equal((await fixture.storage.get({ projectId: fixture.projectId, runId: fixture.runId, jobId: job.jobId })).state, "completed");
    await assert.rejects(fixture.storage.commitRenderResult(input), (error: unknown) => error instanceof RenderOperationError && error.code === "RENDER_COMMIT_FAILED");
    const replay = await fixture.storage.getRenderResult({ projectId: fixture.projectId, runId: fixture.runId, jobId: job.jobId });
    assert.equal(replay.renderResultId, durable.renderResultId);
  } finally {
    await fixture.dispose();
  }
});
