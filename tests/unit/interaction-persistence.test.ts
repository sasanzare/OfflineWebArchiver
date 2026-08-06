import assert from "node:assert/strict";
import test from "node:test";
import type { InteractionTrace } from "@offline-web-archive/archive-core";
import { createQueueFixture } from "../support/queue-fixture.js";

test("Interaction Profiles and Trace writes are fenced, idempotent, and redacted in SQLite", async () => {
  const fixture = await createQueueFixture("owa-interaction-persistence-");
  try {
    const profile = await fixture.storage.getInteractionProfile({ projectId: fixture.projectId });
    assert.equal(profile.enabled, false);
    const savedProfile = await fixture.storage.saveInteractionProfile({ projectId: fixture.projectId, profile: { ...profile, profileId: "interaction-persisted", profileRevisionId: "interaction-revision" }, operationId: "interaction-profile-save" });
    assert.equal(savedProfile.profileId, "interaction-persisted");
    assert.equal((await fixture.storage.getInteractionProfile({ projectId: fixture.projectId })).profileRevisionId, "interaction-revision");

    const enqueued = await fixture.storage.enqueue(fixture.enqueueInput("https://example.com/interaction", { idempotencyKey: "interaction-persist-enqueue", operationId: "interaction-persist-enqueue-operation" }));
    assert.notEqual(enqueued.job, null);
    const claim = await fixture.storage.claimJobWithLease({ projectId: fixture.projectId, runId: fixture.runId, jobId: enqueued.job!.jobId, ownerId: "interaction-persist-owner", leaseDurationMs: 60_000, idempotencyKey: "interaction-persist-claim", operationId: "interaction-persist-claim-operation", correlationId: "interaction-persist-correlation" });
    const trace = {
      schemaVersion: 1,
      traceId: "interaction-persist-trace",
      projectId: fixture.projectId,
      runId: fixture.runId,
      jobId: enqueued.job!.jobId,
      ownerId: "interaction-persist-owner",
      fencingGeneration: claim.lease.fencingGeneration,
      profileId: "interaction-persisted",
      profileRevisionId: "interaction-revision",
      contextProfileId: "owa-context-profile-1",
      createdAt: "2026-07-31T12:00:00.000Z",
      completedAt: "2026-07-31T12:00:00.000Z",
      status: "completed" as const,
      events: [{ sequence: 0, stepId: "safe", stepType: "click" as const, targetId: "role", startedAt: "2026-07-31T12:00:00.000Z", endedAt: "2026-07-31T12:00:00.000Z", effectiveDelayMs: 400, status: "completed" as const, failureCategory: null, failureCode: null, navigationOutcome: "none" as const, domChanged: false, routeChanged: false, popupOutcome: "none" as const, dialogOutcome: "none" as const, discoveredUrlCount: 0, inputCategory: "none" as const, characterCount: null, recoveryStatus: "none" as const, secretText: "fixture-secret", url: "https://example.com/?token=fixture-secret" } as unknown as InteractionTrace["events"][number]],
      truncated: false,
      serializedBytes: 0,
    } satisfies InteractionTrace;
    const stored = await fixture.storage.saveInteractionTrace({ projectId: fixture.projectId, runId: fixture.runId, jobId: enqueued.job!.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: "interaction-persist-owner", operationId: "interaction-trace-save", trace });
    assert.equal(JSON.stringify(stored).includes("fixture-secret"), false);
    const replay = await fixture.storage.saveInteractionTrace({ projectId: fixture.projectId, runId: fixture.runId, jobId: enqueued.job!.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: "interaction-persist-owner", operationId: "interaction-trace-replay", trace });
    assert.deepEqual(replay, stored);
    const inspected = await fixture.storage.getInteractionTrace({ projectId: fixture.projectId, runId: fixture.runId, jobId: enqueued.job!.jobId, traceId: trace.traceId });
    assert.equal(JSON.stringify(inspected).includes("fixture-secret"), false);
    assert.equal((await fixture.storage.listInteractionTraces({ projectId: fixture.projectId, runId: fixture.runId, jobId: enqueued.job!.jobId, limit: 10 })).length, 1);
    await fixture.storage.releaseLease({ projectId: fixture.projectId, runId: fixture.runId, jobId: enqueued.job!.jobId, leaseToken: claim.leaseToken, fencingGeneration: claim.lease.fencingGeneration, ownerId: "interaction-persist-owner", reasonCode: "INTERACTION_COMPLETED", operationId: "interaction-trace-release" });
  } finally {
    await fixture.dispose();
  }
});
