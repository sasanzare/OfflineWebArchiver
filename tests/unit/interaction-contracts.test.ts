import assert from "node:assert/strict";
import test from "node:test";
import { createHumanPacedInteractionProfile } from "@offline-web-archive/archive-core";
import { CONTRACT_VERSION, ContractValidationError, createProjectCommand, parseCommandEnvelope, parseResponseEnvelope } from "@offline-web-archive/contracts";

const metadata = { commandId: "interaction-contract-command", correlationId: "interaction-contract-correlation", timestamp: "2026-08-04T00:00:00.000Z" };
const projectPath = "C:\\interaction-project";
const projectId = "00000000-0000-4000-8000-000000000801";
const runId = "00000000-0000-4000-8000-000000000802";
const jobId = "00000000-0000-4000-8000-000000000803";
const profile = { ...createHumanPacedInteractionProfile({ profileId: "contract-profile-10", profileRevisionId: "contract-revision-10", projectId }), projectId };

test("Interaction command contracts preserve approved plans without raw typed text", () => {
  const plan = {
    schemaVersion: 1,
    planId: "contract-plan-10",
    approved: true as const,
    approvalReason: "approved contract fixture",
    steps: [
      { stepId: "click", stepType: "click" as const, sideEffect: "read-only" as const, target: { strategy: "role" as const, role: "button", name: "Read-only action" } },
      { stepId: "type", stepType: "type_text" as const, sideEffect: "read-only" as const, target: { strategy: "label" as const, text: "Search" }, textCategory: "ephemeral" as const, characterCount: 7 },
    ],
  };
  const commands = [
    createProjectCommand("interaction.profile.get", { projectPath }, metadata),
    createProjectCommand("interaction.profile.validate", { projectPath, profile }, metadata),
    createProjectCommand("interaction.plan.validate", { projectPath, profile, plan }, metadata),
    createProjectCommand("interaction.run", { projectPath, runId, jobId, ownerId: "contract-owner", leaseDurationMs: 60_000, planId: plan.planId, idempotencyKey: "interaction-idempotency-10", operationId: "interaction-operation-10" }, metadata),
    createProjectCommand("interaction.trace.list", { projectPath, runId, jobId, limit: 20 }, metadata),
    createProjectCommand("interaction.trace.inspect", { projectPath, runId, jobId, traceId: "00000000-0000-4000-8000-000000000804" }, metadata),
  ];
  commands.forEach((command) => assert.deepEqual(parseCommandEnvelope(JSON.parse(JSON.stringify(command))), command));
  assert.throws(() => createProjectCommand("interaction.plan.validate", { projectPath, profile, plan: { ...plan, steps: [{ ...plan.steps[1], text: "secret" }] } }, metadata), ContractValidationError);
});

test("Interaction Trace response contracts retain only bounded metadata", () => {
  const trace = {
    schemaVersion: 1,
    traceId: "00000000-0000-4000-8000-000000000804",
    projectId,
    runId,
    jobId,
    ownerId: "contract-owner",
    fencingGeneration: 1,
    profileId: profile.profileId,
    profileRevisionId: profile.profileRevisionId,
    contextProfileId: "owa-context-profile-1",
    createdAt: metadata.timestamp,
    completedAt: metadata.timestamp,
    status: "completed" as const,
    events: [{ sequence: 0, stepId: "type", stepType: "type_text" as const, targetId: "label", startedAt: metadata.timestamp, endedAt: metadata.timestamp, effectiveDelayMs: 400, status: "completed" as const, failureCategory: null, failureCode: null, navigationOutcome: "none" as const, domChanged: false, routeChanged: false, popupOutcome: "none" as const, dialogOutcome: "none" as const, discoveredUrlCount: 0, inputCategory: "ephemeral" as const, characterCount: 7, recoveryStatus: "none" as const }],
    truncated: false,
    serializedBytes: 512,
  };
  const response = parseResponseEnvelope({ contractVersion: CONTRACT_VERSION, commandId: metadata.commandId, correlationId: metadata.correlationId, timestamp: metadata.timestamp, status: "success", result: { resultType: "interaction.trace", trace }, error: null });
  assert.equal(response.status, "success");
  assert.equal(JSON.stringify(response).includes("secret"), false);
});
