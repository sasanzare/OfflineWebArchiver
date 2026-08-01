import { randomUUID } from "node:crypto";
import path from "node:path";
import { createApplicationService } from "@offline-web-archive/application-service";
import { CONTRACT_VERSION, createProjectCommand } from "@offline-web-archive/contracts";
import { createSqliteProjectStorage } from "@offline-web-archive/persistence-sqlite";
import { createDefaultSiteProfileDraft, evaluateScope } from "@offline-web-archive/scope-engine";

const projectPath = process.argv[2];
const origin = process.argv[3];
if (projectPath === undefined || origin === undefined) throw new Error("Render crash child requires a Project path and fixture origin");

const storage = createSqliteProjectStorage({ applicationVersion: "0.8.0" });
await storage.create({ destinationPath: projectPath, name: "Render Crash", slug: "render-crash" });
await storage.open(projectPath);
const draft = createDefaultSiteProfileDraft({ name: "Crash Profile", seedUrl: `${origin}/continuous` });
const profile = await storage.createProfile({
  projectPath,
  draft: {
    ...draft,
    authorization: { status: "approved", legalBasisReference: "AUTH-CRASH-TEST", approvedBy: ["process-kill-test"], approvedAt: new Date().toISOString(), expiresAt: null },
    networkPolicy: { allowedIpClasses: ["public", "loopback"] },
  },
});
const project = storage.getCurrent();
if (project === null) throw new Error("Crash child Project is not open");
const decision = evaluateScope(profile, { url: `${origin}/continuous`, profileRevision: profile.revisionId, discoveryType: "manual", sourceDepth: 0 });
const queued = await storage.enqueue({
  projectId: project.projectId, runId: project.runId, projectRevisionId: project.revisionId,
  scopeDecision: {
    decisionId: decision.decisionId, engineVersion: decision.engineVersion, profileId: decision.profileId, profileRevisionId: decision.profileRevisionId,
    eligible: decision.eligible, shouldQueue: decision.shouldQueue, reasonCodes: decision.reasonCodes, normalizedUrl: decision.normalizedUrl,
    identityUrl: decision.identityUrl, identityHash: decision.identityHash, displayUrl: decision.displayUrl, depth: decision.depth, matchedRuleIds: decision.matchedRuleIds,
  },
  sourceContext: { parentJobId: null, safeSourceUrl: null, discoveryType: "manual", sourceDepth: 0 }, maxAttempts: 3, maxPages: profile.limits.maxPages,
  idempotencyKey: `crash-enqueue-${randomUUID()}`, operationId: `crash-enqueue-operation-${randomUUID()}`, correlationId: `crash-enqueue-correlation-${randomUUID()}`,
});
if (queued.job === null) throw new Error("Crash Page Job was not created");
const service = createApplicationService({
  configuration: { applicationName: "Offline Web Archive Builder", applicationVersion: "0.8.0", contractVersion: CONTRACT_VERSION, logLevel: "error" },
  runtime: { name: "Node.js", version: process.versions.node }, platform: { operatingSystem: "windows", architecture: "x64" },
  projectStorage: storage, browserRoot: path.resolve(".runtime", "browsers"), renderTestMode: true, fixtureOrigins: [origin],
});
process.stdout.write(`CRASH_CHILD_READY=${queued.job.jobId}\n`);
const response = await service.execute(createProjectCommand("render.start", {
  projectPath, runId: project.runId, jobId: queued.job.jobId, ownerId: "process-kill-renderer", leaseDurationMs: 120_000,
  idempotencyKey: `crash-render-${randomUUID()}`, operationId: `crash-render-operation-${randomUUID()}`,
  policy: { navigationTimeoutMs: 3_000, stabilityTimeoutMs: 60_000, renderTimeoutMs: 90_000, domQuietMs: 500, networkQuietMs: 500 },
}, { commandId: "crash-render-command", correlationId: "crash-render-correlation", timestamp: new Date().toISOString() }), { transport: "cli", authorized: true });
const job = await storage.get({ projectId: project.projectId, runId: project.runId, jobId: queued.job.jobId });
process.stdout.write(`CRASH_CHILD_RESULT=${JSON.stringify({ status: response.status, errorCode: response.status === "error" ? response.error.code : null, jobState: job.state })}\n`);
await service.close();
