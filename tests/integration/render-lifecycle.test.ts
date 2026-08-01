import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createApplicationService } from "@offline-web-archive/application-service";
import { CONTRACT_VERSION, createProjectCommand, type ResponseEnvelope } from "@offline-web-archive/contracts";
import { createSqliteProjectStorage } from "@offline-web-archive/persistence-sqlite";
import { createDefaultSiteProfileDraft, evaluateScope } from "@offline-web-archive/scope-engine";
import { createInMemoryLogger } from "@offline-web-archive/test-support";
import { startRenderFixtureServer } from "../support/render-fixture-server.js";

test("real Chromium renders queued static, JavaScript, redirect, long-lived, screenshot, and bounded failure fixtures", async () => {
  const server = await startRenderFixtureServer();
  const root = await mkdtemp(path.join(tmpdir(), "owa-render-"));
  const projectPath = path.join(root, "project");
  const logger = createInMemoryLogger();
  const storage = createSqliteProjectStorage({ applicationVersion: "0.8.0", logger });
  await storage.create({ destinationPath: projectPath, name: "Render Test", slug: "render-test" });
  await storage.open(projectPath);
  const draft = createDefaultSiteProfileDraft({ name: "Render Profile", seedUrl: server.url("static") });
  const profile = await storage.createProfile({
    projectPath,
    draft: {
      ...draft,
      authorization: { status: "approved", legalBasisReference: "AUTH-RENDER-TEST", approvedBy: ["test-owner"], approvedAt: "2026-08-01T12:00:00.000Z", expiresAt: null },
      networkPolicy: { allowedIpClasses: ["public", "loopback"] },
    },
  });
  const project = storage.getCurrent();
  assert.notEqual(project, null);
  const service = createApplicationService({
    configuration: { applicationName: "Offline Web Archive Builder", applicationVersion: "0.8.0", contractVersion: CONTRACT_VERSION, logLevel: "error" },
    runtime: { name: "Node.js", version: process.versions.node },
    platform: { operatingSystem: "windows", architecture: "x64" },
    projectStorage: storage,
    browserRoot: path.resolve(".runtime", "browsers"),
    renderTestMode: true,
    fixtureOrigins: [server.origin],
    renderHeartbeatIntervalMs: 50,
    logger,
  });
  let sequence = 0;
  const execute = async (commandType: Parameters<typeof createProjectCommand>[0], payload: unknown): Promise<ResponseEnvelope> => {
    sequence += 1;
    return service.execute(createProjectCommand(commandType, payload, { commandId: `render-command-${sequence}`, correlationId: `render-correlation-${sequence}`, timestamp: new Date().toISOString() }), { transport: "cli", authorized: true });
  };
  const enqueue = async (name: string) => {
    if (project === null) throw new Error("Render Project is unavailable");
    const decision = evaluateScope(profile, { url: server.url(name), profileRevision: profile.revisionId, discoveryType: "manual", sourceDepth: 0 });
    assert.equal(decision.shouldQueue, true, `${name} must be eligible for the controlled fixture queue`);
    const result = await storage.enqueue({
      projectId: project.projectId,
      runId: project.runId,
      projectRevisionId: project.revisionId,
      scopeDecision: {
        decisionId: decision.decisionId, engineVersion: decision.engineVersion, profileId: decision.profileId, profileRevisionId: decision.profileRevisionId,
        eligible: decision.eligible, shouldQueue: decision.shouldQueue, reasonCodes: decision.reasonCodes, normalizedUrl: decision.normalizedUrl,
        identityUrl: decision.identityUrl, identityHash: decision.identityHash, displayUrl: decision.displayUrl, depth: decision.depth, matchedRuleIds: decision.matchedRuleIds,
      },
      sourceContext: { parentJobId: null, safeSourceUrl: null, discoveryType: "manual", sourceDepth: 0 },
      maxAttempts: 3,
      maxPages: profile.limits.maxPages,
      idempotencyKey: `enqueue-${name}-${randomUUID()}`,
      operationId: `enqueue-operation-${randomUUID()}`,
      correlationId: `enqueue-correlation-${randomUUID()}`,
    });
    assert.notEqual(result.job, null);
    return result.job!;
  };
  const render = async (name: string, policy: Record<string, unknown> = {}) => {
    if (project === null) throw new Error("Render Project is unavailable");
    const job = await enqueue(name);
    const response = await execute("render.start", {
      projectPath,
      runId: project.runId,
      jobId: job.jobId,
      ownerId: "integration-renderer",
      leaseDurationMs: 60_000,
      idempotencyKey: `render-${name}-${randomUUID()}`,
      operationId: `render-operation-${name}-${randomUUID()}`,
      policy,
    });
    return { job, response };
  };
  try {
    const staticRender = await render("static");
    assert.equal(staticRender.response.status, "success");
    if (staticRender.response.status === "success" && staticRender.response.result.resultType === "render.result") {
      assert.equal(staticRender.response.result.result.qualityClassification, "complete");
      assert.equal(staticRender.response.result.result.screenshotArtifact, null);
    }

    const javascript = await render("javascript", { completionSelector: "body[data-ready='true']", captureScreenshot: true });
    assert.equal(javascript.response.status, "success");
    if (javascript.response.status === "success" && javascript.response.result.resultType === "render.result") {
      assert.notEqual(javascript.response.result.result.screenshotArtifact, null);
      assert.ok(javascript.response.result.result.evidence.consoleEntries.length >= 1);
      assert.ok(javascript.response.result.result.evidence.pageErrors.length >= 1);
      assert.ok(javascript.response.result.result.evidence.failedRequests.length >= 1);
      assert.doesNotMatch(JSON.stringify(javascript.response.result.result.evidence), /fixture-secret|fixture-password/);
      const lease = await storage.getLease({ projectId: project!.projectId, runId: project!.runId, jobId: javascript.job.jobId });
      assert.ok(Date.parse(lease.heartbeatAt) > Date.parse(lease.acquiredAt));
      const replay = await execute("render.start", {
        projectPath, runId: project!.runId, jobId: javascript.job.jobId, ownerId: "integration-renderer", leaseDurationMs: 60_000,
        idempotencyKey: `render-replay-${randomUUID()}`, operationId: `render-replay-${randomUUID()}`, policy: { completionSelector: "body[data-ready='true']", captureScreenshot: true },
      });
      assert.equal(replay.status, "success");
      if (replay.status === "success" && replay.result.resultType === "render.result") assert.equal(replay.result.result.renderResultId, javascript.response.result.result.renderResultId);
    }

    const spa = await render("spa", { completionSelector: "body[data-ready='true']" });
    assert.equal(spa.response.status, "success");
    if (spa.response.status === "success" && spa.response.result.resultType === "render.result") {
      assert.match(spa.response.result.result.finalUrlSafe, /\/spa\/route$/);
      assert.match(await readFile(path.join(projectPath, spa.response.result.result.htmlArtifact.relativePath), "utf8"), /SPA route ready/);
    }

    const lazy = await render("lazy", { completionSelector: "body[data-ready='true']", fixtureScroll: true });
    assert.equal(lazy.response.status, "success");
    if (lazy.response.status === "success" && lazy.response.result.resultType === "render.result") {
      assert.match(await readFile(path.join(projectPath, lazy.response.result.result.htmlArtifact.relativePath), "utf8"), /Lazy content ready/);
    }

    const redirected = await render("redirect", { completionSelector: "body[data-ready='true']" });
    assert.equal(redirected.response.status, "success");
    if (redirected.response.status === "success" && redirected.response.result.resultType === "render.result") {
      assert.equal(redirected.response.result.result.evidence.redirects.length, 1);
      assert.match(redirected.response.result.result.finalUrlSafe, /\/javascript$/);
    }

    const longLived = await render("long-lived", { completionSelector: "body[data-ready='true']" });
    assert.equal(longLived.response.status, "success");

    const pauseJob = await enqueue("continuous-pause");
    const pauseRender = execute("render.start", {
      projectPath, runId: project!.runId, jobId: pauseJob.jobId, ownerId: "integration-renderer", leaseDurationMs: 60_000,
      idempotencyKey: `render-pause-${randomUUID()}`, operationId: `render-pause-${randomUUID()}`,
      policy: { navigationTimeoutMs: 500, stabilityTimeoutMs: 5_000, renderTimeoutMs: 6_000, domQuietMs: 100, networkQuietMs: 100 },
    });
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if ((await storage.get({ projectId: project!.projectId, runId: project!.runId, jobId: pauseJob.jobId })).state === "processing") break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    await storage.requestPause({ projectId: project!.projectId, runId: project!.runId, operationId: `pause-${randomUUID()}` });
    const pausedRender = await pauseRender;
    assert.equal(pausedRender.status, "error");
    if (pausedRender.status === "error") assert.equal(pausedRender.error.code, "RENDER_CANCELLED");
    assert.equal((await storage.get({ projectId: project!.projectId, runId: project!.runId, jobId: pauseJob.jobId })).state, "paused");
    await storage.resumeRun({ projectId: project!.projectId, runId: project!.runId, operationId: `resume-${randomUUID()}`, correlationId: `resume-${randomUUID()}` });
    assert.equal((await storage.get({ projectId: project!.projectId, runId: project!.runId, jobId: pauseJob.jobId })).state, "pending");

    const blank = await render("blank", { navigationTimeoutMs: 500, stabilityTimeoutMs: 700, renderTimeoutMs: 2_000, domQuietMs: 100, networkQuietMs: 100 });
    assert.equal(blank.response.status, "error");
    if (blank.response.status === "error") assert.equal(blank.response.error.code, "RENDER_BLANK_PAGE");

    const unstable = await render("continuous", { navigationTimeoutMs: 500, stabilityTimeoutMs: 400, renderTimeoutMs: 2_000, domQuietMs: 100, networkQuietMs: 100 });
    assert.equal(unstable.response.status, "error");
    if (unstable.response.status === "error") assert.equal(unstable.response.error.code, "RENDER_STABILITY_TIMEOUT");

    const navigationTimeout = await render("navigation-timeout", { navigationTimeoutMs: 200, stabilityTimeoutMs: 500, renderTimeoutMs: 2_000, domQuietMs: 100, networkQuietMs: 100 });
    assert.equal(navigationTimeout.response.status, "error");
    if (navigationTimeout.response.status === "error") assert.equal(navigationTimeout.response.error.code, "NAVIGATION_TIMEOUT");

    const privateRedirect = await render("redirect-private", { navigationTimeoutMs: 500, stabilityTimeoutMs: 500, renderTimeoutMs: 2_000, domQuietMs: 100, networkQuietMs: 100 });
    assert.equal(privateRedirect.response.status, "error");
    if (privateRedirect.response.status === "error") assert.ok(["REDIRECT_BLOCKED", "RUNTIME_NETWORK_BLOCKED", "NAVIGATION_FAILED", "NAVIGATION_TIMEOUT"].includes(privateRedirect.response.error.code), privateRedirect.response.error.code);

    assert.ok(logger.events.every((event) => !JSON.stringify(event).includes("claimToken")));
  } finally {
    await service.close();
    await server.close();
    await rm(root, { recursive: true, force: true });
  }
});
