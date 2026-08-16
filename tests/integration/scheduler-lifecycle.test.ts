import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_WORKER_POOL_CONFIGURATION,
  WorkerPoolScheduler,
} from "@offline-web-archive/archive-core";
import { createQueueFixture } from "../support/queue-fixture.js";

const NOW = "2026-08-16T12:00:00.000Z";
const NOW_MS = Date.parse(NOW);

test("Origin cooldown state persists through SQLite and restores fail-closed scheduling", async () => {
  const fixture = await createQueueFixture("owa-scheduler-");
  try {
    const configuration = {
      ...DEFAULT_WORKER_POOL_CONFIGURATION,
      originCooldownFallbackMs: 5_000,
      originCooldownMaximumMs: 30_000,
    } as const;
    const scheduler = new WorkerPoolScheduler(configuration, {
      projectId: fixture.projectId,
      runId: fixture.runId,
      nowMs: () => NOW_MS,
      now: () => NOW,
      stateRepository: fixture.storage,
    });
    scheduler.recordOriginResponse({ origin: "https://example.test/articles", status: 429, retryAfter: null }, NOW_MS);
    await scheduler.flushStatePersistence();

    const saved = await fixture.storage.getOriginRateLimit({ projectId: fixture.projectId, runId: fixture.runId, origin: "https://example.test/" });
    assert.deepEqual(saved, {
      projectId: fixture.projectId,
      runId: fixture.runId,
      origin: "https://example.test",
      cooldownUntil: "2026-08-16T12:00:05.000Z",
      lastStatus: 429,
      updatedAt: NOW,
    });

    const restored = new WorkerPoolScheduler(configuration, {
      projectId: fixture.projectId,
      runId: fixture.runId,
      nowMs: () => NOW_MS,
      now: () => NOW,
      stateRepository: fixture.storage,
    });
    const states = await restored.restorePersistedOriginRateLimits();
    assert.equal(states.length, 1);
    assert.equal(restored.networkBudget.isPaused("https://example.test", NOW_MS), true);
    assert.equal(restored.networkBudget.snapshot("https://example.test", NOW_MS).lastStatus, 429);
  } finally {
    await fixture.dispose();
  }
});

test("scheduler state repository keeps one canonical row per Project, Run, and Origin", async () => {
  const fixture = await createQueueFixture("owa-scheduler-state-");
  try {
    await fixture.storage.saveOriginRateLimit({ projectId: fixture.projectId, runId: fixture.runId, origin: "https://example.test:443/", cooldownUntil: null, lastStatus: 200, updatedAt: NOW });
    await fixture.storage.saveOriginRateLimit({ projectId: fixture.projectId, runId: fixture.runId, origin: "https://example.test", cooldownUntil: "2026-08-16T12:01:00.000Z", lastStatus: 429, updatedAt: NOW });
    const states = await fixture.storage.listOriginRateLimits({ projectId: fixture.projectId, runId: fixture.runId });
    assert.equal(states.length, 1);
    assert.equal(states[0]?.origin, "https://example.test");
    assert.equal(states[0]?.cooldownUntil, "2026-08-16T12:01:00.000Z");
    assert.equal(states[0]?.lastStatus, 429);
  } finally {
    await fixture.dispose();
  }
});
