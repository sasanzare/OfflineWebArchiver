import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { QueueEnqueueInput } from "@offline-web-archive/archive-core";
import { createSqliteProjectStorage, type SqliteProjectStorage } from "@offline-web-archive/persistence-sqlite";
import { createDefaultSiteProfileDraft, evaluateScope, type SiteProfile } from "@offline-web-archive/scope-engine";

export const QUEUE_TEST_TIME = "2026-07-31T12:00:00.000Z";

export interface QueueFixture {
  root: string;
  projectPath: string;
  databasePath: string;
  storage: SqliteProjectStorage;
  profile: SiteProfile;
  projectId: string;
  runId: string;
  projectRevisionId: string;
  setNow(value: string): void;
  enqueueInput(url: string, options?: {
    idempotencyKey?: string;
    operationId?: string;
    correlationId?: string;
    parentJobId?: string | null;
    sourceUrl?: string | null;
    sourceDepth?: number | null;
    discoveryType?: QueueEnqueueInput["sourceContext"]["discoveryType"];
    requestedPriority?: number;
    maxAttempts?: number;
  }): QueueEnqueueInput;
  dispose(): Promise<void>;
}

export async function createQueueFixture(prefix = "owa-queue-"): Promise<QueueFixture> {
  const root = await mkdtemp(path.join(tmpdir(), prefix));
  const projectPath = path.join(root, "project");
  let currentTime = QUEUE_TEST_TIME;
  const storage = createSqliteProjectStorage({ applicationVersion: "0.7.0", now: () => currentTime });
  await storage.create({ destinationPath: projectPath, name: "Queue Test", slug: "queue-test" });
  await storage.open(projectPath);
  const draft = createDefaultSiteProfileDraft({ name: "Approved Queue Profile", seedUrl: "https://example.com/" });
  const profile = await storage.createProfile({
    projectPath,
    draft: {
      ...draft,
      authorization: {
        status: "approved",
        legalBasisReference: "AUTH-QUEUE-TEST",
        approvedBy: ["test-owner"],
        approvedAt: QUEUE_TEST_TIME,
        expiresAt: null,
      },
    },
  });
  const current = storage.getCurrent();
  if (current === null) throw new Error("Queue test Project did not remain open");

  const fixture: QueueFixture = {
    root,
    projectPath,
    databasePath: path.join(projectPath, "database", "crawl.db"),
    storage,
    profile,
    projectId: current.projectId,
    runId: current.runId,
    projectRevisionId: current.revisionId,
    setNow(value) {
      currentTime = value;
    },
    enqueueInput(url, options = {}) {
      const discoveryType = options.discoveryType ?? "manual";
      const sourceDepth = options.sourceDepth ?? 0;
      const decision = evaluateScope(profile, {
        url,
        profileRevision: profile.revisionId,
        discoveryType,
        ...(options.sourceUrl === undefined || options.sourceUrl === null ? {} : { sourceUrl: options.sourceUrl }),
        ...(sourceDepth === null ? {} : { sourceDepth }),
      });
      return {
        projectId: current.projectId,
        runId: current.runId,
        projectRevisionId: current.revisionId,
        scopeDecision: {
          decisionId: decision.decisionId,
          engineVersion: decision.engineVersion,
          profileId: decision.profileId,
          profileRevisionId: decision.profileRevisionId,
          eligible: decision.eligible,
          shouldQueue: decision.shouldQueue,
          reasonCodes: decision.reasonCodes,
          normalizedUrl: decision.normalizedUrl,
          identityUrl: decision.identityUrl,
          identityHash: decision.identityHash,
          displayUrl: decision.displayUrl,
          depth: decision.depth,
          matchedRuleIds: decision.matchedRuleIds,
        },
        sourceContext: {
          parentJobId: options.parentJobId ?? null,
          safeSourceUrl: options.sourceUrl ?? null,
          discoveryType,
          sourceDepth,
        },
        ...(options.requestedPriority === undefined ? {} : { requestedPriority: options.requestedPriority }),
        maxAttempts: options.maxAttempts ?? 3,
        maxPages: profile.limits.maxPages,
        idempotencyKey: options.idempotencyKey ?? `enqueue-${randomUUID()}`,
        operationId: options.operationId ?? `operation-${randomUUID()}`,
        correlationId: options.correlationId ?? `correlation-${randomUUID()}`,
      };
    },
    async dispose() {
      if (storage.getCurrent() !== null) await storage.close().catch(() => undefined);
      await rm(root, { recursive: true, force: true });
    },
  };
  return fixture;
}
