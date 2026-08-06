import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { createApplicationService } from "@offline-web-archive/application-service";
import { createHumanPacedInteractionProfile, type InteractionPlan } from "@offline-web-archive/archive-core";
import { CONTRACT_VERSION, createProjectCommand, type ResponseEnvelope } from "@offline-web-archive/contracts";
import { createSqliteProjectStorage } from "@offline-web-archive/persistence-sqlite";
import { createDefaultSiteProfileDraft, evaluateScope } from "@offline-web-archive/scope-engine";
import { startRenderFixtureServer } from "../support/render-fixture-server.js";

test("Application Service runs an approved Interaction against a queued Page Job and persists the Trace", async () => {
  const fixture = await startRenderFixtureServer();
  const root = await mkdtemp(path.join(tmpdir(), "owa-interaction-service-"));
  const projectPath = path.join(root, "project");
  const storage = createSqliteProjectStorage({ applicationVersion: "0.8.0" });
  await storage.create({ destinationPath: projectPath, name: "Interaction Test", slug: "interaction-test" });
  await storage.open(projectPath);
  const siteProfile = await storage.createProfile({
    projectPath,
    draft: {
      ...createDefaultSiteProfileDraft({ name: "Interaction Profile", seedUrl: fixture.url("interaction") }),
      authorization: { status: "approved", legalBasisReference: "AUTH-INTERACTION-TEST", approvedBy: ["test-owner"], approvedAt: "2026-08-04T00:00:00.000Z", expiresAt: null },
      networkPolicy: { allowedIpClasses: ["loopback"] },
    },
  });
  const project = storage.getCurrent();
  assert.notEqual(project, null);
  const decision = evaluateScope(siteProfile, { url: fixture.url("interaction"), profileRevision: siteProfile.revisionId, discoveryType: "manual", sourceDepth: 0 });
  assert.equal(decision.shouldQueue, true);
  const enqueue = await storage.enqueue({
    projectId: project!.projectId,
    runId: project!.runId,
    projectRevisionId: project!.revisionId,
    scopeDecision: { decisionId: decision.decisionId, engineVersion: decision.engineVersion, profileId: decision.profileId, profileRevisionId: decision.profileRevisionId, eligible: decision.eligible, shouldQueue: decision.shouldQueue, reasonCodes: decision.reasonCodes, normalizedUrl: decision.normalizedUrl, identityUrl: decision.identityUrl, identityHash: decision.identityHash, displayUrl: decision.displayUrl, depth: decision.depth, matchedRuleIds: decision.matchedRuleIds },
    sourceContext: { parentJobId: null, safeSourceUrl: null, discoveryType: "manual", sourceDepth: 0 },
    maxAttempts: 3,
    maxPages: siteProfile.limits.maxPages,
    idempotencyKey: "interaction-service-enqueue",
    operationId: "interaction-service-enqueue-operation",
    correlationId: "interaction-service-enqueue-correlation",
  });
  assert.notEqual(enqueue.job, null);
  const profileBase = createHumanPacedInteractionProfile({ profileId: "service-profile-10", profileRevisionId: "service-revision-10", projectId: project!.projectId, seed: "service-fixture" });
  const profile = { ...profileBase, actionDelayMinMs: 0, actionDelayMaxMs: 0, typingDelayMinMs: 0, typingDelayMaxMs: 0, pointerMoveDurationMinMs: 0, pointerMoveDurationMaxMs: 0, scrollDelayMinMs: 0, scrollDelayMaxMs: 0 };
  await storage.saveInteractionProfile({ projectId: project!.projectId, profile, operationId: "interaction-service-profile-save" });
  const plan: InteractionPlan = {
    schemaVersion: 1,
    planId: "service-plan-10",
    approved: true,
    approvalReason: "approved service fixture",
    steps: [{ stepId: "service-click", stepType: "click", sideEffect: "read-only", target: { strategy: "role", role: "button", name: "Read-only action", exact: true } }],
  };
  const service = createApplicationService({
    configuration: { applicationName: "Offline Web Archive Builder", applicationVersion: "0.8.0", contractVersion: CONTRACT_VERSION, logLevel: "error" },
    runtime: { name: "Node.js", version: process.versions.node },
    platform: { operatingSystem: "windows", architecture: "x64" },
    projectStorage: storage,
    browserRoot: path.resolve(".runtime", "browsers"),
    renderTestMode: true,
    fixtureOrigins: [fixture.origin],
    renderHeartbeatIntervalMs: 50,
    interactionPlanProvider: async () => plan,
  });
  let sequence = 0;
  const execute = async (commandType: Parameters<typeof createProjectCommand>[0], payload: unknown): Promise<ResponseEnvelope> => {
    sequence += 1;
    return service.execute(createProjectCommand(commandType, payload, { commandId: "interaction-service-command-" + sequence, correlationId: "interaction-service-correlation-" + sequence, timestamp: new Date().toISOString() }), { transport: "cli", authorized: true });
  };
  try {
    const profileResponse = await execute("interaction.profile.get", { projectPath });
    assert.equal(profileResponse.status, "success");
    const profileValidation = await execute("interaction.profile.validate", { projectPath });
    assert.equal(profileValidation.status, "success");
    const planValidation = await execute("interaction.plan.validate", { projectPath, profile, plan: { ...plan, steps: [{ ...plan.steps[0] }] } });
    assert.equal(planValidation.status, "success");
    const runResponse = await execute("interaction.run", { projectPath, runId: project!.runId, jobId: enqueue.job!.jobId, ownerId: "interaction-service-owner", leaseDurationMs: 60_000, planId: plan.planId, idempotencyKey: "interaction-service-run", operationId: "interaction-service-run-operation" });
    assert.equal(runResponse.status, "success");
    assert.equal(runResponse.status === "success" && runResponse.result.resultType === "interaction.result" ? runResponse.result.trace.status : "failed", "completed");
    const traces = await execute("interaction.trace.list", { projectPath, runId: project!.runId, jobId: enqueue.job!.jobId, limit: 10 });
    assert.equal(traces.status, "success");
    if (traces.status === "success" && traces.result.resultType === "interaction.traces") assert.equal(traces.result.traces.length, 1);
  } finally {
    await service.close();
    await fixture.close();
    await rm(root, { recursive: true, force: true });
  }
});
