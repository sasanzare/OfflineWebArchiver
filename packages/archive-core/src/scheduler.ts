import {
  getProxyEligibility,
  type ProxyConnectionMode,
  type ProxyMetadata,
} from "./proxy.js";
import type {
  QueueRepositoryPort,
  RecoveryRepositoryPort,
} from "./index.js";

export const WORKER_POOL_CONTRACT_VERSION = 1 as const;

export const WORKER_STATUSES = Object.freeze([
  "created", "starting", "idle", "leasing", "running", "draining", "stopping", "stopped", "failed",
] as const);
export type WorkerStatus = (typeof WORKER_STATUSES)[number];

export const WORKER_SELECTION_POLICIES = Object.freeze(["weighted-round-robin", "least-loaded", "sticky"] as const);
export type WorkerSelectionPolicy = (typeof WORKER_SELECTION_POLICIES)[number];

export const CIRCUIT_BREAKER_STATES = Object.freeze(["closed", "open", "half-open"] as const);
export type CircuitBreakerState = (typeof CIRCUIT_BREAKER_STATES)[number];

export type SchedulerFailureCategory = "proxy" | "origin-rate-limit" | "origin" | "browser" | "cancelled" | "unknown";

export type SchedulerOperationErrorCode =
  | "SCHEDULER_CONFIG_INVALID" | "SCHEDULER_JOB_INVALID" | "SCHEDULER_NO_ELIGIBLE_PROXY"
  | "SCHEDULER_AFFINITY_CONFLICT" | "SCHEDULER_CAPACITY_EXHAUSTED" | "SCHEDULER_ORIGIN_RATE_LIMITED"
  | "SCHEDULER_CANCELLED" | "SCHEDULER_CLAIM_SKIPPED" | "WORKER_START_FAILED" | "WORKER_CONTEXT_FAILED"
  | "WORKER_LEASE_LOST" | "WORKER_STALE_GENERATION" | "WORKER_CRASHED" | "PROXY_CIRCUIT_OPEN"
  | "PROXY_HALF_OPEN_FAILED" | "STALE_COMMIT_REJECTED" | "SCHEDULER_PERSISTENCE_FAILED";

export class SchedulerOperationError extends Error {
  public constructor(
    public readonly code: SchedulerOperationErrorCode,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "SchedulerOperationError";
  }
}

export interface WorkerPoolConfiguration {
  readonly version: typeof WORKER_POOL_CONTRACT_VERSION;
  readonly globalWorkerConcurrency: number;
  readonly perProxyWorkerConcurrency: number;
  readonly perOriginPageConcurrency: number;
  readonly perOriginMaxInflightRequests: number;
  readonly perOriginRequestsPerSecond: number | null;
  readonly burstLimit: number;
  readonly respectRetryAfter: boolean;
  readonly retryAfterMaximumMs: number;
  readonly originCooldownMaximumMs: number;
  readonly originCooldownFallbackMs: number;
  readonly temporaryErrorCooldownMs: number;
  readonly selectionPolicy: WorkerSelectionPolicy;
  readonly connectionMode: ProxyConnectionMode;
  readonly stickyAuthenticatedSessions: boolean;
  readonly leaseDurationMs: number;
  readonly heartbeatIntervalMs: number;
}

export const DEFAULT_WORKER_POOL_CONFIGURATION: WorkerPoolConfiguration = Object.freeze({
  version: WORKER_POOL_CONTRACT_VERSION,
  globalWorkerConcurrency: 1,
  perProxyWorkerConcurrency: 1,
  perOriginPageConcurrency: 1,
  perOriginMaxInflightRequests: 8,
  perOriginRequestsPerSecond: null,
  burstLimit: 4,
  respectRetryAfter: true,
  retryAfterMaximumMs: 300_000,
  originCooldownMaximumMs: 300_000,
  originCooldownFallbackMs: 30_000,
  temporaryErrorCooldownMs: 5_000,
  selectionPolicy: "weighted-round-robin",
  connectionMode: "direct",
  stickyAuthenticatedSessions: true,
  leaseDurationMs: 60_000,
  heartbeatIntervalMs: 15_000,
});

const MAX_CONCURRENCY = 256;
const MAX_REQUEST_LIMIT = 100_000;
const MAX_DURATION_MS = 86_400_000;
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const PROXY_CONNECTION_MODES: readonly ProxyConnectionMode[] = ["direct", "single-proxy", "proxy-pool"];

function invalid(message: string): never {
  throw new SchedulerOperationError("SCHEDULER_CONFIG_INVALID", message);
}

function assertInteger(value: unknown, label: string, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum || value > maximum) invalid(`${label} must be an integer from ${minimum} to ${maximum}`);
  return value;
}

function assertDuration(value: unknown, label: string, minimum = 0): number {
  return assertInteger(value, label, minimum, MAX_DURATION_MS);
}

export function validateWorkerPoolConfiguration(input: WorkerPoolConfiguration): WorkerPoolConfiguration {
  if (typeof input !== "object" || input === null || input.version !== WORKER_POOL_CONTRACT_VERSION) invalid("The Worker Pool configuration version is unsupported");
  assertInteger(input.globalWorkerConcurrency, "globalWorkerConcurrency", 1, MAX_CONCURRENCY);
  assertInteger(input.perProxyWorkerConcurrency, "perProxyWorkerConcurrency", 1, MAX_CONCURRENCY);
  assertInteger(input.perOriginPageConcurrency, "perOriginPageConcurrency", 1, MAX_CONCURRENCY);
  assertInteger(input.perOriginMaxInflightRequests, "perOriginMaxInflightRequests", 1, MAX_REQUEST_LIMIT);
  if (input.perOriginRequestsPerSecond !== null) assertInteger(input.perOriginRequestsPerSecond, "perOriginRequestsPerSecond", 1, MAX_REQUEST_LIMIT);
  assertInteger(input.burstLimit, "burstLimit", 1, MAX_REQUEST_LIMIT);
  if (typeof input.respectRetryAfter !== "boolean") invalid("respectRetryAfter must be boolean");
  assertDuration(input.retryAfterMaximumMs, "retryAfterMaximumMs");
  assertDuration(input.originCooldownMaximumMs, "originCooldownMaximumMs");
  assertDuration(input.originCooldownFallbackMs, "originCooldownFallbackMs");
  assertDuration(input.temporaryErrorCooldownMs, "temporaryErrorCooldownMs");
  if (!(WORKER_SELECTION_POLICIES as readonly string[]).includes(input.selectionPolicy)) invalid("selectionPolicy is unsupported");
  if (!PROXY_CONNECTION_MODES.includes(input.connectionMode)) invalid("connectionMode is unsupported");
  if (typeof input.stickyAuthenticatedSessions !== "boolean") invalid("stickyAuthenticatedSessions must be boolean");
  assertDuration(input.leaseDurationMs, "leaseDurationMs", 5_000);
  assertDuration(input.heartbeatIntervalMs, "heartbeatIntervalMs", 1_000);
  if (input.heartbeatIntervalMs >= input.leaseDurationMs) invalid("heartbeatIntervalMs must be shorter than leaseDurationMs");
  return Object.freeze({ ...input });
}

export function canonicalOrigin(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("unsupported scheme");
    if (parsed.username !== "" || parsed.password !== "") throw new Error("credential-bearing URL");
    return parsed.origin;
  } catch {
    throw new SchedulerOperationError("SCHEDULER_JOB_INVALID", "The Page Job URL cannot produce a safe HTTP Origin");
  }
}

export interface SchedulerJob {
  readonly jobId: string;
  readonly url: string;
  readonly origin?: string;
  readonly proxyId?: string | null;
  readonly session?: { readonly sessionId: string; readonly proxyId: string | null; readonly browserProfileId: string };
}

export function normalizeSchedulerJob(input: SchedulerJob): SchedulerJob & { readonly origin: string } {
  if (typeof input !== "object" || input === null || typeof input.jobId !== "string" || !SAFE_IDENTIFIER.test(input.jobId)) throw new SchedulerOperationError("SCHEDULER_JOB_INVALID", "The Worker Job identifier is invalid");
  const origin = canonicalOrigin(input.url);
  if (input.origin !== undefined && input.origin !== origin) throw new SchedulerOperationError("SCHEDULER_JOB_INVALID", "The Worker Job Origin does not match its URL");
  if (input.proxyId !== undefined && input.proxyId !== null && !SAFE_IDENTIFIER.test(input.proxyId)) throw new SchedulerOperationError("SCHEDULER_JOB_INVALID", "The Worker Job Proxy identifier is invalid");
  if (input.session !== undefined) {
    if (!SAFE_IDENTIFIER.test(input.session.sessionId) || !SAFE_IDENTIFIER.test(input.session.browserProfileId)) throw new SchedulerOperationError("SCHEDULER_JOB_INVALID", "The authenticated Session affinity metadata is invalid");
    if (input.session.proxyId !== null && !SAFE_IDENTIFIER.test(input.session.proxyId)) throw new SchedulerOperationError("SCHEDULER_JOB_INVALID", "The authenticated Session Proxy affinity is invalid");
  }
  return { ...input, origin };
}

export interface OriginResponseObservation {
  readonly origin: string;
  readonly status: number;
  readonly retryAfter: string | null;
}

export interface OriginNetworkPermit {
  readonly origin: string;
  readonly acquiredAtMs: number;
  release(): void;
}

export interface OriginNetworkRequestBudget {
  acquire(input: { readonly origin: string; readonly signal?: AbortSignal }): Promise<OriginNetworkPermit>;
  isPaused(origin: string, nowMs?: number): boolean;
  recordResponse(input: OriginResponseObservation, nowMs?: number): OriginRateLimitSnapshot;
  restore(input: { readonly origin: string; readonly cooldownUntilMs: number; readonly lastStatus?: number | null }): void;
  snapshot(origin: string, nowMs?: number): OriginRateLimitSnapshot;
}

export interface OriginRateLimitSnapshot {
  readonly origin: string;
  readonly inflight: number;
  readonly maxInflight: number;
  readonly cooldownUntilMs: number | null;
  readonly lastStatus: number | null;
  readonly requestsPerSecond: number | null;
  readonly burstLimit: number;
}

export interface OriginRateLimitState {
  readonly projectId: string;
  readonly runId: string;
  readonly origin: string;
  readonly cooldownUntil: string | null;
  readonly lastStatus: number | null;
  readonly updatedAt: string;
}

export interface SchedulerStateRepositoryPort {
  getOriginRateLimit(input: { readonly projectId: string; readonly runId: string; readonly origin: string }): Promise<OriginRateLimitState | null>;
  saveOriginRateLimit(input: OriginRateLimitState): Promise<OriginRateLimitState>;
  listOriginRateLimits(input: { readonly projectId: string; readonly runId: string }): Promise<readonly OriginRateLimitState[]>;
}

function sleepWithSignal(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted === true) return Promise.reject(new SchedulerOperationError("SCHEDULER_CANCELLED", "The Scheduler operation was cancelled"));
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, Math.max(1, Math.ceil(milliseconds)));
    const onAbort = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(new SchedulerOperationError("SCHEDULER_CANCELLED", "The Scheduler operation was cancelled"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function parseRetryAfterValue(value: string | null, nowMs: number, maximumMs: number): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    if (!Number.isSafeInteger(seconds)) return maximumMs;
    return Math.min(seconds * 1_000, maximumMs);
  }
  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp)) return null;
  return Math.min(Math.max(0, timestamp - nowMs), maximumMs);
}

export function parseRetryAfter(value: string | null, nowMs: number, maximumMs: number): number | null {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0 || !Number.isSafeInteger(maximumMs) || maximumMs < 0) throw new SchedulerOperationError("SCHEDULER_CONFIG_INVALID", "Retry-After parsing bounds are invalid");
  return parseRetryAfterValue(value, nowMs, maximumMs);
}

interface OriginBudgetState {
  inflight: number;
  tokens: number;
  lastRefillMs: number;
  cooldownUntilMs: number | null;
  lastStatus: number | null;
}

export interface OriginNetworkBudgetOptions {
  readonly nowMs?: () => number;
  readonly onRateLimit?: (snapshot: OriginRateLimitSnapshot) => void | Promise<void>;
  readonly sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
}

export class InMemoryOriginNetworkBudget implements OriginNetworkRequestBudget {
  private readonly configuration: WorkerPoolConfiguration;
  private readonly states = new Map<string, OriginBudgetState>();
  private readonly nowMs: () => number;
  private readonly sleep: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
  private readonly onRateLimit: (snapshot: OriginRateLimitSnapshot) => void | Promise<void>;

  public constructor(configuration: WorkerPoolConfiguration, options: OriginNetworkBudgetOptions = {}) {
    this.configuration = validateWorkerPoolConfiguration(configuration);
    this.nowMs = options.nowMs ?? (() => Date.now());
    this.sleep = options.sleep ?? sleepWithSignal;
    this.onRateLimit = options.onRateLimit ?? (() => undefined);
  }

  private state(origin: string, nowMs: number): OriginBudgetState {
    const existing = this.states.get(origin);
    if (existing !== undefined) return existing;
    const created: OriginBudgetState = { inflight: 0, tokens: this.configuration.burstLimit, lastRefillMs: nowMs, cooldownUntilMs: null, lastStatus: null };
    this.states.set(origin, created);
    return created;
  }

  private refill(state: OriginBudgetState, nowMs: number): void {
    const rate = this.configuration.perOriginRequestsPerSecond;
    if (rate === null) { state.lastRefillMs = nowMs; return; }
    if (nowMs <= state.lastRefillMs) return;
    state.tokens = Math.min(this.configuration.burstLimit, state.tokens + ((nowMs - state.lastRefillMs) / 1_000) * rate);
    state.lastRefillMs = nowMs;
  }

  private waitMilliseconds(state: OriginBudgetState, nowMs: number): number {
    if (state.cooldownUntilMs !== null && state.cooldownUntilMs > nowMs) return state.cooldownUntilMs - nowMs;
    if (state.inflight >= this.configuration.perOriginMaxInflightRequests) return 10;
    if (this.configuration.perOriginRequestsPerSecond === null || state.tokens >= 1) return 0;
    return Math.max(1, ((1 - state.tokens) / this.configuration.perOriginRequestsPerSecond) * 1_000);
  }

  public async acquire(input: { readonly origin: string; readonly signal?: AbortSignal }): Promise<OriginNetworkPermit> {
    const origin = canonicalOrigin(input.origin);
    for (;;) {
      if (input.signal?.aborted === true) throw new SchedulerOperationError("SCHEDULER_CANCELLED", "The network request budget acquisition was cancelled");
      const nowMs = this.nowMs();
      const state = this.state(origin, nowMs);
      this.refill(state, nowMs);
      const wait = this.waitMilliseconds(state, nowMs);
      if (wait <= 0) {
        if (this.configuration.perOriginRequestsPerSecond !== null) state.tokens -= 1;
        state.inflight += 1;
        let released = false;
        return { origin, acquiredAtMs: nowMs, release: (): void => { if (!released) { released = true; state.inflight = Math.max(0, state.inflight - 1); } } };
      }
      await this.sleep(wait, input.signal);
    }
  }

  public isPaused(origin: string, nowMs = this.nowMs()): boolean {
    const state = this.state(canonicalOrigin(origin), nowMs);
    return state.cooldownUntilMs !== null && state.cooldownUntilMs > nowMs;
  }

  public recordResponse(input: OriginResponseObservation, nowMs = this.nowMs()): OriginRateLimitSnapshot {
    const origin = canonicalOrigin(input.origin);
    if (!Number.isInteger(input.status) || input.status < 100 || input.status > 599) throw new SchedulerOperationError("SCHEDULER_CONFIG_INVALID", "The Origin response status is invalid");
    const state = this.state(origin, nowMs);
    state.lastStatus = input.status;
    let delayMs: number | null = null;
    const cooldownMaximumMs = Math.min(this.configuration.retryAfterMaximumMs, this.configuration.originCooldownMaximumMs);
    if (input.status === 429) {
      delayMs = this.configuration.respectRetryAfter ? parseRetryAfterValue(input.retryAfter, nowMs, cooldownMaximumMs) : null;
      if (delayMs === null) delayMs = Math.min(this.configuration.originCooldownFallbackMs, this.configuration.originCooldownMaximumMs);
    } else if (input.status === 503) {
      delayMs = Math.min(this.configuration.temporaryErrorCooldownMs, this.configuration.originCooldownMaximumMs);
    }
    if (delayMs !== null && delayMs > 0) {
      state.cooldownUntilMs = Math.max(state.cooldownUntilMs ?? 0, nowMs + delayMs);
    }
    const snapshot = this.snapshot(origin, nowMs);
    if (input.status === 429 || input.status === 503) void Promise.resolve(this.onRateLimit(snapshot)).catch(() => undefined);
    return snapshot;
  }

  public restore(input: { readonly origin: string; readonly cooldownUntilMs: number; readonly lastStatus?: number | null }): void {
    const origin = canonicalOrigin(input.origin);
    if (!Number.isSafeInteger(input.cooldownUntilMs) || input.cooldownUntilMs < 0) throw new SchedulerOperationError("SCHEDULER_CONFIG_INVALID", "The persisted Origin cooldown is invalid");
    const state = this.state(origin, this.nowMs());
    state.cooldownUntilMs = input.cooldownUntilMs;
    state.lastStatus = input.lastStatus ?? null;
  }

  public snapshot(origin: string, nowMs = this.nowMs()): OriginRateLimitSnapshot {
    const canonical = canonicalOrigin(origin);
    const state = this.state(canonical, nowMs);
    this.refill(state, nowMs);
    if (state.cooldownUntilMs !== null && state.cooldownUntilMs <= nowMs) state.cooldownUntilMs = null;
    return Object.freeze({ origin: canonical, inflight: state.inflight, maxInflight: this.configuration.perOriginMaxInflightRequests, cooldownUntilMs: state.cooldownUntilMs, lastStatus: state.lastStatus, requestsPerSecond: this.configuration.perOriginRequestsPerSecond, burstLimit: this.configuration.burstLimit });
  }
}

export interface CircuitBreakerConfiguration {
  readonly failureThreshold: number;
  readonly openDurationMs: number;
  readonly halfOpenMaxProbes: number;
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIGURATION: CircuitBreakerConfiguration = Object.freeze({ failureThreshold: 3, openDurationMs: 30_000, halfOpenMaxProbes: 1 });

export interface CircuitBreakerSnapshot {
  readonly proxyId: string;
  readonly state: CircuitBreakerState;
  readonly consecutiveFailures: number;
  readonly openedUntilMs: number | null;
  readonly probeInFlight: number;
}

export class ProxyCircuitBreaker {
  private stateValue: CircuitBreakerState = "closed";
  private consecutiveFailures = 0;
  private openedUntilMs: number | null = null;
  private probeInFlight = 0;

  public constructor(public readonly proxyId: string, private readonly configuration: CircuitBreakerConfiguration = DEFAULT_CIRCUIT_BREAKER_CONFIGURATION) {
    if (!SAFE_IDENTIFIER.test(proxyId) || !Number.isSafeInteger(configuration.failureThreshold) || configuration.failureThreshold < 1 || !Number.isSafeInteger(configuration.openDurationMs) || configuration.openDurationMs < 1 || !Number.isSafeInteger(configuration.halfOpenMaxProbes) || configuration.halfOpenMaxProbes < 1) {
      throw new SchedulerOperationError("SCHEDULER_CONFIG_INVALID", "The Circuit Breaker configuration is invalid");
    }
  }

  public canSchedule(nowMs: number): boolean {
    if (this.stateValue === "open" && this.openedUntilMs !== null && nowMs >= this.openedUntilMs) this.stateValue = "half-open";
    return this.stateValue === "closed" || (this.stateValue === "half-open" && this.probeInFlight < this.configuration.halfOpenMaxProbes);
  }

  public beginProbe(nowMs: number): boolean {
    if (!this.canSchedule(nowMs)) return false;
    if (this.stateValue === "half-open") {
      if (this.probeInFlight >= this.configuration.halfOpenMaxProbes) return false;
      this.probeInFlight += 1;
    }
    return true;
  }

  public recordSuccess(): void {
    if (this.stateValue === "half-open") this.probeInFlight = Math.max(0, this.probeInFlight - 1);
    this.stateValue = "closed";
    this.consecutiveFailures = 0;
    this.openedUntilMs = null;
  }

  public recordFailure(nowMs: number): void {
    if (this.stateValue === "half-open") {
      this.probeInFlight = Math.max(0, this.probeInFlight - 1);
      this.stateValue = "open";
      this.openedUntilMs = nowMs + this.configuration.openDurationMs;
      this.consecutiveFailures = this.configuration.failureThreshold;
      return;
    }
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.configuration.failureThreshold) {
      this.stateValue = "open";
      this.openedUntilMs = nowMs + this.configuration.openDurationMs;
    }
  }

  public releaseProbe(nowMs: number, successful: boolean): void {
    if (this.stateValue !== "half-open" || this.probeInFlight === 0) return;
    if (successful) this.recordSuccess();
    else this.recordFailure(nowMs);
  }

  public cancelProbe(): void {
    if (this.stateValue === "half-open") this.probeInFlight = Math.max(0, this.probeInFlight - 1);
  }

  public snapshot(nowMs: number): CircuitBreakerSnapshot {
    this.canSchedule(nowMs);
    return Object.freeze({ proxyId: this.proxyId, state: this.stateValue, consecutiveFailures: this.consecutiveFailures, openedUntilMs: this.openedUntilMs, probeInFlight: this.probeInFlight });
  }
}

export interface WorkerStatusSnapshot {
  readonly workerId: string;
  readonly runId: string;
  readonly currentJobId: string | null;
  readonly proxyId: string | null;
  readonly origin: string | null;
  readonly startedAt: string;
  readonly lastHeartbeatAt: string;
  readonly completedJobs: number;
  readonly failedJobs: number;
  readonly averageDurationMs: number | null;
  readonly throughputPerMinute: number;
  readonly status: WorkerStatus;
  readonly waitReason: string | null;
}

export interface ProxyThroughputSnapshot {
  readonly proxyId: string;
  readonly activeWorkers: number;
  readonly completedJobs: number;
  readonly failedJobs: number;
  readonly throughputPerMinute: number;
  readonly circuit: CircuitBreakerSnapshot;
}

export interface WorkerReservation {
  readonly workerId: string;
  readonly runId: string;
  readonly job: SchedulerJob & { readonly origin: string };
  readonly origin: string;
  readonly proxy: ProxyMetadata | null;
  readonly startedAtMs: number;
  readonly startedAt: string;
  readonly halfOpenProbe: boolean;
}

export interface WorkerExecutionInput {
  readonly reservation: WorkerReservation;
  readonly signal: AbortSignal;
  readonly networkBudget: OriginNetworkRequestBudget;
  readonly heartbeat: () => Promise<void>;
  readonly observeResponse: (input: OriginResponseObservation) => OriginRateLimitSnapshot;
}

export interface WorkerExecutionResult<T = unknown> {
  readonly value: T;
  readonly failureCategory?: SchedulerFailureCategory;
}

export interface WorkerPoolExecutor<T = unknown> {
  execute(input: WorkerExecutionInput): Promise<WorkerExecutionResult<T> | T>;
}

export interface WorkerPoolRunResult<T = unknown> {
  readonly completed: readonly { readonly jobId: string; readonly value: T }[];
  readonly failed: readonly { readonly jobId: string; readonly errorCode: string; readonly failureCategory: SchedulerFailureCategory }[];
  readonly skipped: readonly { readonly jobId: string; readonly reason: string }[];
  readonly blocked: readonly { readonly jobId: string; readonly reason: string }[];
  readonly cancelled: boolean;
}

interface WorkerInternalState {
  status: WorkerStatusSnapshot;
  durations: number[];
}

interface ProxyInternalState {
  activeWorkers: number;
  completedJobs: number;
  failedJobs: number;
  completedAtMs: number[];
  circuit: ProxyCircuitBreaker;
  smoothWeight: number;
}

function timestamp(ms: number): string { return new Date(ms).toISOString(); }

function safeErrorCode(error: unknown): string {
  if (error instanceof SchedulerOperationError) return error.code;
  if (error instanceof Error && SAFE_IDENTIFIER.test(error.name)) return error.name;
  return "WORKER_EXECUTION_FAILED";
}

function safeFailureCategory(error: unknown): SchedulerFailureCategory {
  if (error instanceof SchedulerOperationError && error.code === "SCHEDULER_CANCELLED") return "cancelled";
  if (error instanceof SchedulerOperationError && (error.code === "PROXY_CIRCUIT_OPEN" || error.code === "PROXY_HALF_OPEN_FAILED" || error.code === "SCHEDULER_NO_ELIGIBLE_PROXY")) return "proxy";
  if (error instanceof SchedulerOperationError && error.code === "SCHEDULER_ORIGIN_RATE_LIMITED") return "origin-rate-limit";
  if (error instanceof SchedulerOperationError && (error.code === "WORKER_CONTEXT_FAILED" || error.code === "WORKER_CRASHED")) return "browser";
  return "unknown";
}

export interface WorkerPoolSchedulerOptions {
  readonly runId: string;
  readonly projectId?: string;
  readonly nowMs?: () => number;
  readonly now?: () => string;
  readonly circuitBreaker?: CircuitBreakerConfiguration;
  readonly networkBudget?: OriginNetworkRequestBudget;
  readonly stateRepository?: SchedulerStateRepositoryPort;
  readonly onWait?: (input: { readonly reason: string; readonly origin: string | null; readonly untilMs: number | null }) => void | Promise<void>;
}

export class WorkerPoolScheduler {
  public readonly configuration: WorkerPoolConfiguration;
  public readonly networkBudget: OriginNetworkRequestBudget;
  private readonly runId: string;
  private readonly nowMs: () => number;
  private readonly now: () => string;
  private readonly circuitConfiguration: CircuitBreakerConfiguration;
  private readonly onWait: NonNullable<WorkerPoolSchedulerOptions["onWait"]>;
  private readonly projectId: string | null;
  private readonly stateRepository: SchedulerStateRepositoryPort | null;
  private persistenceTail: Promise<void> = Promise.resolve();
  private persistenceError: unknown = null;
  private readonly workers = new Map<string, WorkerInternalState>();
  private readonly proxies = new Map<string, ProxyInternalState>();
  private readonly originPages = new Map<string, number>();

  public constructor(configuration: WorkerPoolConfiguration, options: WorkerPoolSchedulerOptions) {
    this.configuration = validateWorkerPoolConfiguration(configuration);
    if (!SAFE_IDENTIFIER.test(options.runId)) throw new SchedulerOperationError("SCHEDULER_CONFIG_INVALID", "The Run identifier is invalid");
    this.runId = options.runId;
    this.projectId = options.projectId ?? null;
    this.stateRepository = options.stateRepository ?? null;
    if (this.stateRepository !== null && this.projectId === null) invalid("projectId is required when scheduler state persistence is configured");
    this.nowMs = options.nowMs ?? (() => Date.now());
    this.now = options.now ?? (() => timestamp(this.nowMs()));
    this.circuitConfiguration = options.circuitBreaker ?? DEFAULT_CIRCUIT_BREAKER_CONFIGURATION;
    this.networkBudget = options.networkBudget ?? new InMemoryOriginNetworkBudget(this.configuration, {
      nowMs: this.nowMs,
      onRateLimit: (snapshot) => this.queuePersistedRateLimit(snapshot),
    });
    this.onWait = options.onWait ?? (() => undefined);
  }

  private queuePersistedRateLimit(snapshot: OriginRateLimitSnapshot): void {
    if (this.stateRepository === null || this.projectId === null) return;
    this.persistenceTail = this.persistenceTail.then(async () => {
      await this.stateRepository!.saveOriginRateLimit({
        projectId: this.projectId!,
        runId: this.runId,
        origin: snapshot.origin,
        cooldownUntil: snapshot.cooldownUntilMs === null ? null : timestamp(snapshot.cooldownUntilMs),
        lastStatus: snapshot.lastStatus,
        updatedAt: this.now(),
      });
    }).catch((error: unknown) => {
      this.persistenceError = error;
    });
  }

  public async flushStatePersistence(): Promise<void> {
    await this.persistenceTail;
    if (this.persistenceError !== null) throw new SchedulerOperationError("SCHEDULER_PERSISTENCE_FAILED", "The Origin rate-limit state could not be persisted", true);
  }

  public async restorePersistedOriginRateLimits(): Promise<readonly OriginRateLimitState[]> {
    if (this.stateRepository === null || this.projectId === null) return [];
    const states = await this.stateRepository.listOriginRateLimits({ projectId: this.projectId, runId: this.runId });
    for (const state of states) {
      if (state.cooldownUntil === null) continue;
      const cooldownUntilMs = Date.parse(state.cooldownUntil);
      if (!Number.isFinite(cooldownUntilMs) || cooldownUntilMs < 0) throw new SchedulerOperationError("SCHEDULER_PERSISTENCE_FAILED", "The persisted Origin cooldown is invalid");
      this.networkBudget.restore({ origin: state.origin, cooldownUntilMs, lastStatus: state.lastStatus });
    }
    return states;
  }

  private proxyState(proxy: ProxyMetadata): ProxyInternalState {
    const existing = this.proxies.get(proxy.id);
    if (existing !== undefined) return existing;
    const created: ProxyInternalState = { activeWorkers: 0, completedJobs: 0, failedJobs: 0, completedAtMs: [], circuit: new ProxyCircuitBreaker(proxy.id, this.circuitConfiguration), smoothWeight: 0 };
    this.proxies.set(proxy.id, created);
    return created;
  }

  private proxyCapacity(proxy: ProxyMetadata): number { return Math.min(this.configuration.perProxyWorkerConcurrency, proxy.maxConcurrency); }

  private eligibleProxies(input: { readonly proxies: readonly ProxyMetadata[]; readonly requestedProxyId: string | null; readonly credentialAvailable?: (proxy: ProxyMetadata) => boolean }): ProxyMetadata[] {
    const now = this.now();
    const nowMs = this.nowMs();
    const candidates = [...input.proxies]
      .filter((proxy) => input.requestedProxyId === null || proxy.id === input.requestedProxyId)
      .filter((proxy) => getProxyEligibility(proxy, now, input.credentialAvailable?.(proxy) ?? false).eligible)
      .filter((proxy) => { const state = this.proxyState(proxy); return state.activeWorkers < this.proxyCapacity(proxy) && state.circuit.canSchedule(nowMs); })
      .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id, "en"));
    const highestPriority = candidates[0]?.priority;
    return highestPriority === undefined ? [] : candidates.filter((proxy) => proxy.priority === highestPriority);
  }

  private selectWeighted(candidates: readonly ProxyMetadata[]): ProxyMetadata | null {
    if (candidates.length === 0) return null;
    let totalWeight = 0;
    let selected: ProxyMetadata | null = null;
    let selectedScore = Number.NEGATIVE_INFINITY;
    for (const candidate of candidates) {
      const state = this.proxyState(candidate);
      state.smoothWeight += candidate.weight;
      totalWeight += candidate.weight;
      if (selected === null || state.smoothWeight > selectedScore || (state.smoothWeight === selectedScore && candidate.id.localeCompare(selected.id, "en") < 0)) {
        selected = candidate;
        selectedScore = state.smoothWeight;
      }
    }
    if (selected !== null) this.proxyState(selected).smoothWeight -= totalWeight;
    return selected;
  }

  private selectLeastLoaded(candidates: readonly ProxyMetadata[]): ProxyMetadata | null {
    return [...candidates].sort((left, right) => {
      const leftState = this.proxyState(left);
      const rightState = this.proxyState(right);
      const leftLoad = leftState.activeWorkers / this.proxyCapacity(left);
      const rightLoad = rightState.activeWorkers / this.proxyCapacity(right);
      return leftLoad - rightLoad || left.priority - right.priority || left.id.localeCompare(right.id, "en");
    })[0] ?? null;
  }

  private selectProxy(job: SchedulerJob & { readonly origin: string }, proxies: readonly ProxyMetadata[], credentialAvailable?: (proxy: ProxyMetadata) => boolean): { proxy: ProxyMetadata | null; halfOpenProbe: boolean } {
    const affinityProxyId = job.session?.proxyId ?? null;
    const explicitProxyId = job.proxyId ?? null;
    if (affinityProxyId !== null && explicitProxyId !== null && affinityProxyId !== explicitProxyId) throw new SchedulerOperationError("SCHEDULER_AFFINITY_CONFLICT", "An authenticated Job requested a Proxy different from its Session affinity");
    const requestedProxyId = affinityProxyId ?? explicitProxyId;
    if (this.configuration.connectionMode === "direct") {
      if (affinityProxyId !== null || explicitProxyId !== null) {
        throw new SchedulerOperationError("SCHEDULER_AFFINITY_CONFLICT", "A direct Worker cannot execute a Job bound to a Proxy");
      }
      return { proxy: null, halfOpenProbe: false };
    }
    const candidates = this.eligibleProxies({ proxies, requestedProxyId, ...(credentialAvailable === undefined ? {} : { credentialAvailable }) });
    if (candidates.length === 0) return { proxy: null, halfOpenProbe: false };
    const selected = requestedProxyId !== null
      ? candidates[0]!
      : this.configuration.selectionPolicy === "least-loaded"
        ? this.selectLeastLoaded(candidates)
        : this.selectWeighted(candidates);
    if (selected === null) return { proxy: null, halfOpenProbe: false };
    const circuit = this.proxyState(selected).circuit;
    const halfOpenProbe = circuit.snapshot(this.nowMs()).state === "half-open";
    if (!circuit.beginProbe(this.nowMs())) return { proxy: null, halfOpenProbe: false };
    return { proxy: selected, halfOpenProbe };
  }

  public tryReserveWorker(input: { readonly workerId: string; readonly job: SchedulerJob; readonly proxies?: readonly ProxyMetadata[]; readonly credentialAvailable?: (proxy: ProxyMetadata) => boolean }): WorkerReservation | null {
    if (!SAFE_IDENTIFIER.test(input.workerId)) throw new SchedulerOperationError("SCHEDULER_CONFIG_INVALID", "The Worker identifier is invalid");
    const job = normalizeSchedulerJob(input.job);
    if (this.workers.has(input.workerId)) throw new SchedulerOperationError("SCHEDULER_CONFIG_INVALID", "The Worker identifier is already active");
    if (this.workers.size >= this.configuration.globalWorkerConcurrency) return null;
    if ((this.originPages.get(job.origin) ?? 0) >= this.configuration.perOriginPageConcurrency) return null;
    if (this.networkBudget.isPaused(job.origin, this.nowMs())) return null;
    const selected = this.selectProxy(job, input.proxies ?? [], input.credentialAvailable);
    if (this.configuration.connectionMode !== "direct" && selected.proxy === null) return null;
    const nowMs = this.nowMs();
    const worker: WorkerInternalState = {
      durations: [],
      status: {
        workerId: input.workerId, runId: this.runId, currentJobId: job.jobId, proxyId: selected.proxy?.id ?? null, origin: job.origin,
        startedAt: timestamp(nowMs), lastHeartbeatAt: timestamp(nowMs), completedJobs: 0, failedJobs: 0, averageDurationMs: null, throughputPerMinute: 0, status: "running", waitReason: null,
      },
    };
    this.workers.set(input.workerId, worker);
    this.originPages.set(job.origin, (this.originPages.get(job.origin) ?? 0) + 1);
    if (selected.proxy !== null) this.proxyState(selected.proxy).activeWorkers += 1;
    return Object.freeze({ workerId: input.workerId, runId: this.runId, job, origin: job.origin, proxy: selected.proxy, startedAtMs: nowMs, startedAt: timestamp(nowMs), halfOpenProbe: selected.halfOpenProbe });
  }

  public releaseWorker(reservation: WorkerReservation, outcome: { readonly status: "completed" | "failed" | "cancelled"; readonly failureCategory?: SchedulerFailureCategory; readonly atMs?: number }): void {
    const state = this.workers.get(reservation.workerId);
    if (state === undefined) return;
    const atMs = outcome.atMs ?? this.nowMs();
    const duration = Math.max(0, atMs - reservation.startedAtMs);
    state.durations.push(duration);
    const averageDurationMs = state.durations.reduce((sum, value) => sum + value, 0) / state.durations.length;
    state.status = outcome.status === "completed"
      ? { ...state.status, status: "stopped", completedJobs: state.status.completedJobs + 1, averageDurationMs, lastHeartbeatAt: timestamp(atMs) }
      : { ...state.status, status: outcome.status === "cancelled" ? "stopped" : "failed", failedJobs: state.status.failedJobs + 1, averageDurationMs, lastHeartbeatAt: timestamp(atMs) };
    const proxyState = reservation.proxy === null ? null : this.proxyState(reservation.proxy);
    if (proxyState !== null) {
      proxyState.activeWorkers = Math.max(0, proxyState.activeWorkers - 1);
      if (outcome.status === "completed") {
        proxyState.completedJobs += 1;
        proxyState.completedAtMs.push(atMs);
        proxyState.circuit.recordSuccess();
      } else {
        proxyState.failedJobs += 1;
        if (outcome.failureCategory === "proxy") proxyState.circuit.recordFailure(atMs);
        else if (reservation.halfOpenProbe) proxyState.circuit.cancelProbe();
      }
    }
    const pages = (this.originPages.get(reservation.origin) ?? 1) - 1;
    if (pages <= 0) this.originPages.delete(reservation.origin); else this.originPages.set(reservation.origin, pages);
    this.workers.delete(reservation.workerId);
  }

  public heartbeat(reservation: WorkerReservation): WorkerStatusSnapshot {
    const state = this.workers.get(reservation.workerId);
    if (state === undefined) throw new SchedulerOperationError("WORKER_LEASE_LOST", "The Worker is no longer active");
    const atMs = this.nowMs();
    state.status = { ...state.status, lastHeartbeatAt: timestamp(atMs) };
    return state.status;
  }

  public recordOriginResponse(input: OriginResponseObservation, nowMs = this.nowMs()): OriginRateLimitSnapshot { return this.networkBudget.recordResponse(input, nowMs); }

  public getWorkerStatus(): readonly WorkerStatusSnapshot[] {
    return [...this.workers.values()].map((state) => state.status).sort((left, right) => left.workerId.localeCompare(right.workerId, "en"));
  }

  public getProxyThroughput(nowMs = this.nowMs()): readonly ProxyThroughputSnapshot[] {
    return [...this.proxies.entries()].map(([proxyId, state]) => Object.freeze({ proxyId, activeWorkers: state.activeWorkers, completedJobs: state.completedJobs, failedJobs: state.failedJobs, throughputPerMinute: state.completedAtMs.filter((value) => value >= nowMs - 60_000).length, circuit: state.circuit.snapshot(nowMs) })).sort((left, right) => left.proxyId.localeCompare(right.proxyId, "en"));
  }

  public getLoadSnapshot(): Readonly<{ globalActiveWorkers: number; originPages: Readonly<Record<string, number>>; proxyWorkers: Readonly<Record<string, number>> }> {
    return Object.freeze({ globalActiveWorkers: this.workers.size, originPages: Object.freeze(Object.fromEntries(this.originPages)), proxyWorkers: Object.freeze(Object.fromEntries([...this.proxies.entries()].map(([id, state]) => [id, state.activeWorkers]))) });
  }

  public async run<T>(jobs: readonly SchedulerJob[], executor: WorkerPoolExecutor<T>, options: { readonly signal?: AbortSignal; readonly workerIdPrefix?: string; readonly proxies?: readonly ProxyMetadata[]; readonly credentialAvailable?: (proxy: ProxyMetadata) => boolean; readonly heartbeatIntervalMs?: number } = {}): Promise<WorkerPoolRunResult<T>> {
    const pending = jobs.map(normalizeSchedulerJob);
    const completed: { jobId: string; value: T }[] = [];
    const failed: { jobId: string; errorCode: string; failureCategory: SchedulerFailureCategory }[] = [];
    const skipped: { jobId: string; reason: string }[] = [];
    const blocked: { jobId: string; reason: string }[] = [];
    const active = new Map<Promise<void>, string>();
    let sequence = 0;
    let cancelled = false;
    const signal = options.signal;
    const executionSignal = signal ?? new AbortController().signal;
    const workerPrefix = options.workerIdPrefix ?? "worker";
    const start = (job: SchedulerJob & { readonly origin: string }, reservation: WorkerReservation): void => {
      const task = (async (): Promise<void> => {
        let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
        try {
          const heartbeatIntervalMs = options.heartbeatIntervalMs ?? this.configuration.heartbeatIntervalMs;
          heartbeatTimer = setInterval(() => { try { this.heartbeat(reservation); } catch { /* the executor surfaces ownership loss */ } }, heartbeatIntervalMs);
          const raw = await executor.execute({ reservation, signal: executionSignal, networkBudget: this.networkBudget, heartbeat: async () => { this.heartbeat(reservation); }, observeResponse: (input) => this.recordOriginResponse(input) });
          const result = raw !== null && typeof raw === "object" && "value" in raw ? raw as WorkerExecutionResult<T> : { value: raw as T };
          this.releaseWorker(reservation, { status: "completed" });
          completed.push({ jobId: job.jobId, value: result.value });
        } catch (error) {
          const isSkip = error instanceof SchedulerOperationError && error.code === "SCHEDULER_CLAIM_SKIPPED";
          const category = safeFailureCategory(error);
          if (isSkip) {
            skipped.push({ jobId: job.jobId, reason: "CLAIM_CONFLICT" });
            this.releaseWorker(reservation, { status: "cancelled", failureCategory: category });
          } else {
            failed.push({ jobId: job.jobId, errorCode: safeErrorCode(error), failureCategory: category });
            this.releaseWorker(reservation, { status: "failed", failureCategory: category });
          }
          if (error instanceof SchedulerOperationError && error.code === "SCHEDULER_CANCELLED") cancelled = true;
        } finally {
          if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
        }
      })();
      active.set(task, job.jobId);
      void task.finally(() => active.delete(task));
    };
    while (pending.length > 0 || active.size > 0) {
      if (signal?.aborted === true) cancelled = true;
      if (cancelled) {
        while (pending.length > 0) skipped.push({ jobId: pending.shift()!.jobId, reason: "CANCELLED" });
      } else {
        let scheduled = true;
        while (scheduled && pending.length > 0 && active.size < this.configuration.globalWorkerConcurrency) {
          scheduled = false;
          for (let index = 0; index < pending.length; index += 1) {
            const candidate = pending[index]!;
            try {
              const reservation = this.tryReserveWorker({
                workerId: `${workerPrefix}-${sequence += 1}`,
                job: candidate,
                ...(options.proxies === undefined ? {} : { proxies: options.proxies }),
                ...(options.credentialAvailable === undefined ? {} : { credentialAvailable: options.credentialAvailable }),
              });
              if (reservation === null) continue;
              pending.splice(index, 1);
              start(candidate, reservation);
              scheduled = true;
              break;
            } catch (error) {
              pending.splice(index, 1);
              blocked.push({ jobId: candidate.jobId, reason: safeErrorCode(error) });
              scheduled = true;
              break;
            }
          }
        }
      }
      if (active.size > 0) await Promise.race([...active.keys()]);
      else if (pending.length > 0 && !cancelled) {
        const paused = pending.map((job) => this.networkBudget.snapshot(job.origin, this.nowMs())).find((snapshot) => snapshot.cooldownUntilMs !== null && snapshot.cooldownUntilMs > this.nowMs());
        if (paused !== undefined && paused.cooldownUntilMs !== null && paused.cooldownUntilMs > this.nowMs()) {
          await this.onWait({ reason: "waiting_for_rate_limit", origin: paused.origin, untilMs: paused.cooldownUntilMs });
          await sleepWithSignal(Math.min(100, Math.max(1, paused.cooldownUntilMs - this.nowMs())), signal).catch(() => { cancelled = true; });
        } else {
          while (pending.length > 0) blocked.push({ jobId: pending.shift()!.jobId, reason: this.configuration.connectionMode === "direct" ? "CAPACITY_EXHAUSTED" : "SCHEDULER_NO_ELIGIBLE_PROXY" });
        }
      }
    }
    return Object.freeze({ completed, failed, skipped, blocked, cancelled });
  }
}

export interface DurableWorkerQueuePort {
  claim(input: Parameters<RecoveryRepositoryPort["claimNextWithLease"]>[0]): ReturnType<RecoveryRepositoryPort["claimNextWithLease"]>;
  heartbeat(input: Parameters<RecoveryRepositoryPort["heartbeatLease"]>[0]): ReturnType<RecoveryRepositoryPort["heartbeatLease"]>;
  complete(input: Parameters<QueueRepositoryPort["complete"]>[0]): ReturnType<QueueRepositoryPort["complete"]>;
  fail(input: Parameters<QueueRepositoryPort["fail"]>[0]): ReturnType<QueueRepositoryPort["fail"]>;
}

export function createDurableWorkerQueuePort(input: { readonly queue: QueueRepositoryPort; readonly recovery: RecoveryRepositoryPort }): DurableWorkerQueuePort {
  return Object.freeze({
    claim: (claimInput: Parameters<RecoveryRepositoryPort["claimNextWithLease"]>[0]) => input.recovery.claimNextWithLease(claimInput),
    heartbeat: (heartbeatInput: Parameters<RecoveryRepositoryPort["heartbeatLease"]>[0]) => input.recovery.heartbeatLease(heartbeatInput),
    complete: (completeInput: Parameters<QueueRepositoryPort["complete"]>[0]) => input.queue.complete(completeInput),
    fail: (failInput: Parameters<QueueRepositoryPort["fail"]>[0]) => input.queue.fail(failInput),
  });
}
