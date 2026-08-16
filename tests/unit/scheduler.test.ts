import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_WORKER_POOL_CONFIGURATION,
  InMemoryOriginNetworkBudget,
  SchedulerOperationError,
  WorkerPoolScheduler,
  createProxyMetadata,
  parseRetryAfter,
  recordProxyHealthCheck,
  type ProxyMetadata,
  type SchedulerJob,
  type WorkerPoolConfiguration,
} from "@offline-web-archive/archive-core";

const NOW = "2026-08-16T12:00:00.000Z";
const NOW_MS = Date.parse(NOW);

function configuration(overrides: Partial<WorkerPoolConfiguration> = {}): WorkerPoolConfiguration {
  return { ...DEFAULT_WORKER_POOL_CONFIGURATION, ...overrides };
}

function healthyProxy(id: string, port: number, options: { readonly priority?: number; readonly weight?: number; readonly maxConcurrency?: number } = {}): ProxyMetadata {
  const draft = createProxyMetadata({
    id,
    label: id,
    protocol: "http",
    host: `${id}.example.test`,
    port,
    ...(options.priority === undefined ? {} : { priority: options.priority }),
    ...(options.weight === undefined ? {} : { weight: options.weight }),
    ...(options.maxConcurrency === undefined ? {} : { maxConcurrency: options.maxConcurrency }),
    now: NOW,
  });
  return recordProxyHealthCheck(draft, { status: "success", latencyMs: 20, checkedAt: NOW }, NOW);
}

function job(jobId: string, url: string, extra: Omit<SchedulerJob, "jobId" | "url"> = {}) {
  return { jobId, url, ...extra };
}

test("Worker Pool configuration and Retry-After parsing are bounded", () => {
  assert.equal(parseRetryAfter("3", NOW_MS, 10_000), 3_000);
  assert.equal(parseRetryAfter(new Date(NOW_MS + 4_000).toUTCString(), NOW_MS, 10_000), 4_000);
  assert.equal(parseRetryAfter(new Date(NOW_MS - 4_000).toUTCString(), NOW_MS, 10_000), 0);
  assert.equal(parseRetryAfter("not-a-date", NOW_MS, 10_000), null);
  assert.equal(parseRetryAfter("999999999999999999999", NOW_MS, 10_000), 10_000);
  assert.throws(
    () => new WorkerPoolScheduler(configuration({ globalWorkerConcurrency: 0 }), { runId: "run-1" }),
    (error) => error instanceof SchedulerOperationError && error.code === "SCHEDULER_CONFIG_INVALID",
  );
});

test("direct scheduling rejects explicit and authenticated proxy affinity", () => {
  const scheduler = new WorkerPoolScheduler(configuration({ connectionMode: "direct" }), { runId: "run-1", nowMs: () => NOW_MS, now: () => NOW });
  assert.throws(
    () => scheduler.tryReserveWorker({ workerId: "worker-proxy", job: job("job-proxy", "https://example.test/", { proxyId: "proxy-a" }) }),
    (error) => error instanceof SchedulerOperationError && error.code === "SCHEDULER_AFFINITY_CONFLICT",
  );
  assert.throws(
    () => scheduler.tryReserveWorker({ workerId: "worker-session", job: job("job-session", "https://example.test/", { session: { sessionId: "session-1", proxyId: "proxy-a", browserProfileId: "profile-1" } }) }),
    (error) => error instanceof SchedulerOperationError && error.code === "SCHEDULER_AFFINITY_CONFLICT",
  );
});

test("Origin budget enforces shared cooldown and request concurrency", async () => {
  let nowMs = NOW_MS;
  const sleeps: number[] = [];
  const budget = new InMemoryOriginNetworkBudget(configuration({ perOriginRequestsPerSecond: null, perOriginMaxInflightRequests: 1, originCooldownFallbackMs: 5_000 }), {
    nowMs: () => nowMs,
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds);
      nowMs += milliseconds;
    },
  });
  budget.recordResponse({ origin: "https://example.test", status: 429, retryAfter: null }, nowMs);
  const permit = await budget.acquire({ origin: "https://example.test" });
  assert.ok(sleeps.some((value) => value >= 5_000));
  assert.equal(budget.snapshot("https://example.test", nowMs).inflight, 1);
  permit.release();

  const concurrencyBudget = new InMemoryOriginNetworkBudget(configuration({ perOriginRequestsPerSecond: null, perOriginMaxInflightRequests: 1 }));
  const first = await concurrencyBudget.acquire({ origin: "https://example.test" });
  let secondFinished = false;
  const second = concurrencyBudget.acquire({ origin: "https://example.test" }).then((next) => {
    secondFinished = true;
    next.release();
  });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(secondFinished, false);
  first.release();
  await second;
  assert.equal(secondFinished, true);
});

test("scheduler enforces global, per-origin, and per-proxy worker limits", () => {
  const proxyA = healthyProxy("proxy-a", 8081);
  const proxyB = healthyProxy("proxy-b", 8082);
  const scheduler = new WorkerPoolScheduler(configuration({ globalWorkerConcurrency: 2, perProxyWorkerConcurrency: 1, perOriginPageConcurrency: 1, connectionMode: "proxy-pool" }), { runId: "run-1", nowMs: () => NOW_MS, now: () => NOW });
  const first = scheduler.tryReserveWorker({ workerId: "worker-1", job: job("job-1", "https://one.example.test/page"), proxies: [proxyA, proxyB] });
  assert.equal(first?.proxy?.id, "proxy-a");
  assert.equal(scheduler.tryReserveWorker({ workerId: "worker-2", job: job("job-2", "https://one.example.test/other"), proxies: [proxyA, proxyB] }), null);
  const second = scheduler.tryReserveWorker({ workerId: "worker-2", job: job("job-2", "https://two.example.test/page"), proxies: [proxyA, proxyB] });
  assert.equal(second?.proxy?.id, "proxy-b");
  assert.equal(scheduler.tryReserveWorker({ workerId: "worker-3", job: job("job-3", "https://three.example.test/page"), proxies: [proxyA, proxyB] }), null);
  assert.deepEqual(scheduler.getLoadSnapshot(), {
    globalActiveWorkers: 2,
    originPages: { "https://one.example.test": 1, "https://two.example.test": 1 },
    proxyWorkers: { "proxy-a": 1, "proxy-b": 1 },
  });
  first && scheduler.releaseWorker(first, { status: "completed", atMs: NOW_MS + 100 });
  second && scheduler.releaseWorker(second, { status: "completed", atMs: NOW_MS + 200 });
  assert.equal(scheduler.getLoadSnapshot().globalActiveWorkers, 0);
});

test("authenticated Session affinity is sticky and never falls back to another proxy", () => {
  const proxyA = healthyProxy("proxy-a", 8081);
  const proxyB = healthyProxy("proxy-b", 8082);
  const scheduler = new WorkerPoolScheduler(configuration({ globalWorkerConcurrency: 2, connectionMode: "proxy-pool" }), { runId: "run-1", nowMs: () => NOW_MS, now: () => NOW });
  assert.throws(
    () => scheduler.tryReserveWorker({ workerId: "worker-1", job: job("job-1", "https://account.example.test/", { proxyId: "proxy-b", session: { sessionId: "session-1", proxyId: "proxy-a", browserProfileId: "profile-1" } }), proxies: [proxyA, proxyB] }),
    (error) => error instanceof SchedulerOperationError && error.code === "SCHEDULER_AFFINITY_CONFLICT",
  );
  const unavailable = { ...proxyA, enabled: false, healthState: "disabled" as const };
  assert.equal(scheduler.tryReserveWorker({ workerId: "worker-1", job: job("job-1", "https://account.example.test/", { session: { sessionId: "session-1", proxyId: "proxy-a", browserProfileId: "profile-1" } }), proxies: [unavailable, proxyB] }), null);
});

test("proxy circuit breaker opens after proxy failures and allows a bounded half-open probe", () => {
  let nowMs = NOW_MS;
  const proxy = healthyProxy("proxy-a", 8081);
  const scheduler = new WorkerPoolScheduler(configuration({ connectionMode: "proxy-pool" }), { runId: "run-1", nowMs: () => nowMs, now: () => new Date(nowMs).toISOString(), circuitBreaker: { failureThreshold: 2, openDurationMs: 1_000, halfOpenMaxProbes: 1 } });
  for (let index = 1; index <= 2; index += 1) {
    const reservation = scheduler.tryReserveWorker({ workerId: `worker-${index}`, job: job(`job-${index}`, `https://origin-${index}.example.test/`), proxies: [proxy] });
    assert.ok(reservation);
    scheduler.releaseWorker(reservation, { status: "failed", failureCategory: "proxy", atMs: nowMs });
  }
  assert.equal(scheduler.getProxyThroughput(nowMs)[0]?.circuit.state, "open");
  assert.equal(scheduler.tryReserveWorker({ workerId: "worker-open", job: job("job-open", "https://open.example.test/"), proxies: [proxy] }), null);
  nowMs += 1_000;
  const probe = scheduler.tryReserveWorker({ workerId: "worker-probe", job: job("job-probe", "https://probe.example.test/"), proxies: [proxy] });
  assert.ok(probe);
  scheduler.releaseWorker(probe, { status: "completed", atMs: nowMs + 10 });
  assert.equal(scheduler.getProxyThroughput(nowMs + 10)[0]?.circuit.state, "closed");
});

test("run provides observable backpressure while keeping global concurrency bounded", async () => {
  const scheduler = new WorkerPoolScheduler(configuration({ globalWorkerConcurrency: 2, perOriginPageConcurrency: 2 }), { runId: "run-1", nowMs: () => Date.now() });
  let active = 0;
  let maximumActive = 0;
  const result = await scheduler.run(
    [job("job-1", "https://one.example.test/"), job("job-2", "https://two.example.test/"), job("job-3", "https://three.example.test/"), job("job-4", "https://four.example.test/")],
    {
      async execute({ reservation }) {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await new Promise<void>((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return reservation.job.jobId;
      },
    },
  );
  assert.equal(result.completed.length, 4);
  assert.equal(result.failed.length, 0);
  assert.equal(result.blocked.length, 0);
  assert.equal(maximumActive <= 2, true);
  assert.equal(scheduler.getLoadSnapshot().globalActiveWorkers, 0);
});

test("shared origin cooldown blocks alternate proxies until the cooldown expires", () => {
  let nowMs = NOW_MS;
  const proxyA = healthyProxy("proxy-a", 8081);
  const proxyB = healthyProxy("proxy-b", 8082);
  const scheduler = new WorkerPoolScheduler(configuration({ connectionMode: "proxy-pool", originCooldownFallbackMs: 5_000 }), { runId: "run-1", nowMs: () => nowMs, now: () => new Date(nowMs).toISOString() });
  scheduler.recordOriginResponse({ origin: "https://shared.example.test", status: 429, retryAfter: null }, nowMs);
  assert.equal(scheduler.tryReserveWorker({ workerId: "worker-a", job: job("job-a", "https://shared.example.test/a"), proxies: [proxyA, proxyB] }), null);
  assert.equal(scheduler.tryReserveWorker({ workerId: "worker-b", job: job("job-b", "https://shared.example.test/b"), proxies: [proxyA, proxyB] }), null);
  nowMs += 5_000;
  const reservation = scheduler.tryReserveWorker({ workerId: "worker-c", job: job("job-c", "https://shared.example.test/c"), proxies: [proxyA, proxyB] });
  assert.ok(reservation);
  scheduler.releaseWorker(reservation, { status: "completed", atMs: nowMs });
});

test("429 Retry-After values are bounded and invalid values use the fallback cooldown", () => {
  let nowMs = NOW_MS;
  const budget = new InMemoryOriginNetworkBudget(configuration({ originCooldownFallbackMs: 7_000, retryAfterMaximumMs: 10_000, originCooldownMaximumMs: 8_000 }), { nowMs: () => nowMs });
  assert.equal(budget.recordResponse({ origin: "https://retry.example.test", status: 429, retryAfter: "3" }, nowMs).cooldownUntilMs, NOW_MS + 3_000);
  nowMs += 3_000;
  assert.equal(budget.recordResponse({ origin: "https://retry.example.test", status: 429, retryAfter: "invalid" }, nowMs).cooldownUntilMs, NOW_MS + 10_000);
  nowMs = NOW_MS + 10_000;
  assert.equal(budget.recordResponse({ origin: "https://retry.example.test", status: 429, retryAfter: null }, nowMs).cooldownUntilMs, NOW_MS + 17_000);
});
