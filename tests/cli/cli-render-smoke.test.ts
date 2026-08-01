import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { createApplicationService } from "@offline-web-archive/application-service";
import { CONTRACT_VERSION, createProjectCommand } from "@offline-web-archive/contracts";
import { createSqliteProjectStorage } from "@offline-web-archive/persistence-sqlite";
import { createDefaultSiteProfileDraft, evaluateScope } from "@offline-web-archive/scope-engine";
import { startRenderFixtureServer } from "../support/render-fixture-server.js";

const executable = path.resolve("apps/cli/dist/index.js");

function run(arguments_: readonly string[]) {
  return spawnSync(process.execPath, [executable, ...arguments_], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, OWAB_LOG_LEVEL: "error" } });
}

test("built CLI inspects and idempotently replays a real committed Render Result", async () => {
  const fixture = await startRenderFixtureServer();
  const root = mkdtempSync(path.join(tmpdir(), "owa-cli-render-"));
  const projectPath = path.join(root, "project");
  const storage = createSqliteProjectStorage({ applicationVersion: "0.8.0" });
  const service = createApplicationService({
    configuration: { applicationName: "Offline Web Archive Builder", applicationVersion: "0.8.0", contractVersion: CONTRACT_VERSION, logLevel: "error" },
    runtime: { name: "Node.js", version: process.versions.node },
    platform: { operatingSystem: "windows", architecture: "x64" },
    projectStorage: storage,
    browserRoot: path.resolve(".runtime", "browsers"),
    renderTestMode: true,
    fixtureOrigins: [fixture.origin],
  });
  try {
    await storage.create({ destinationPath: projectPath, name: "CLI Render", slug: "cli-render" });
    await storage.open(projectPath);
    const draft = createDefaultSiteProfileDraft({ name: "CLI Render Profile", seedUrl: fixture.url("static") });
    const profile = await storage.createProfile({ projectPath, draft: { ...draft, authorization: { status: "approved", legalBasisReference: "AUTH-CLI-RENDER", approvedBy: ["cli-render-smoke"], approvedAt: new Date().toISOString(), expiresAt: null }, networkPolicy: { allowedIpClasses: ["public", "loopback"] } } });
    const project = storage.getCurrent();
    assert.notEqual(project, null);
    const scope = evaluateScope(profile, { url: fixture.url("static"), profileRevision: profile.revisionId, discoveryType: "manual", sourceDepth: 0 });
    const queued = await storage.enqueue({
      projectId: project!.projectId, runId: project!.runId, projectRevisionId: project!.revisionId,
      scopeDecision: { decisionId: scope.decisionId, engineVersion: scope.engineVersion, profileId: scope.profileId, profileRevisionId: scope.profileRevisionId, eligible: scope.eligible, shouldQueue: scope.shouldQueue, reasonCodes: scope.reasonCodes, normalizedUrl: scope.normalizedUrl, identityUrl: scope.identityUrl, identityHash: scope.identityHash, displayUrl: scope.displayUrl, depth: scope.depth, matchedRuleIds: scope.matchedRuleIds },
      sourceContext: { parentJobId: null, safeSourceUrl: null, discoveryType: "manual", sourceDepth: 0 }, maxAttempts: 3, maxPages: profile.limits.maxPages,
      idempotencyKey: `cli-render-enqueue-${randomUUID()}`, operationId: `cli-render-enqueue-${randomUUID()}`, correlationId: `cli-render-enqueue-${randomUUID()}`,
    });
    assert.notEqual(queued.job, null);
    const initial = await service.execute(createProjectCommand("render.start", { projectPath, runId: project!.runId, jobId: queued.job!.jobId, ownerId: "cli-render-owner", leaseDurationMs: 60_000, idempotencyKey: `cli-render-${randomUUID()}`, operationId: `cli-render-${randomUUID()}`, policy: {} }, { commandId: "cli-render-command", correlationId: "cli-render-correlation", timestamp: new Date().toISOString() }), { transport: "cli", authorized: true });
    assert.equal(initial.status, "success");
    await service.close();
    await fixture.close();

    const identity = [project!.runId, queued.job!.jobId] as const;
    const status = run(["render", "status", projectPath, identity[1], "--run", identity[0], "--json"]);
    assert.equal(status.status, 0, status.stderr);
    assert.equal(JSON.parse(status.stdout).result.status.resultStatus, "completed");
    const result = run(["render", "result", projectPath, identity[1], "--run", identity[0], "--json"]);
    assert.equal(result.status, 0, result.stderr);
    const resultId = JSON.parse(result.stdout).result.result.renderResultId;
    const events = run(["render", "events", projectPath, identity[1], "--run", identity[0], "--limit", "100", "--json"]);
    assert.equal(events.status, 0, events.stderr);
    assert.ok(JSON.parse(events.stdout).result.events.length >= 1);
    const replay = run(["render", "start", projectPath, identity[1], "--run", identity[0], "--owner", "cli-render-owner", "--operation-id", `cli-replay-${randomUUID()}`, "--idempotency-key", `cli-replay-${randomUUID()}`, "--json"]);
    assert.equal(replay.status, 0, replay.stderr);
    assert.equal(JSON.parse(replay.stdout).result.result.renderResultId, resultId);
    const human = run(["render", "result", projectPath, identity[1], "--run", identity[0]]);
    assert.equal(human.status, 0, human.stderr);
    assert.match(human.stdout, /HTML: pages\/.+\/rendered\.html/);
    assert.doesNotMatch(`${status.stdout}${result.stdout}${events.stdout}${replay.stdout}${human.stdout}`, /claimToken|leaseToken|fixture-secret/);
  } finally {
    await service.close().catch(() => undefined);
    await fixture.close().catch(() => undefined);
    rmSync(root, { recursive: true, force: true });
  }
});
