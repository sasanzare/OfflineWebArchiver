export const NETWORK_CONCURRENCY_CONTRACT_VERSION = 1 as const;

export interface WorkerNetworkConcurrencyPolicy {
  version: typeof NETWORK_CONCURRENCY_CONTRACT_VERSION;
  globalWorkerConcurrency: number;
  perProxyWorkerConcurrency: number;
  perOriginPageConcurrency: number;
  perOriginInflightRequests: number;
  requestRatePerOrigin: number;
  retryAfterMaximumMs: number;
  originCooldownMaximumMs: number;
}

export const DEFAULT_WORKER_NETWORK_CONCURRENCY_POLICY: WorkerNetworkConcurrencyPolicy = Object.freeze({
  version: NETWORK_CONCURRENCY_CONTRACT_VERSION,
  globalWorkerConcurrency: 1,
  perProxyWorkerConcurrency: 1,
  perOriginPageConcurrency: 1,
  perOriginInflightRequests: 8,
  requestRatePerOrigin: 1,
  retryAfterMaximumMs: 300_000,
  originCooldownMaximumMs: 300_000,
});

export function validateWorkerNetworkConcurrencyPolicy(policy: WorkerNetworkConcurrencyPolicy): WorkerNetworkConcurrencyPolicy {
  const positive = [
    policy.globalWorkerConcurrency,
    policy.perProxyWorkerConcurrency,
    policy.perOriginPageConcurrency,
    policy.perOriginInflightRequests,
    policy.requestRatePerOrigin,
  ];
  if (policy.version !== NETWORK_CONCURRENCY_CONTRACT_VERSION || positive.some((value) => !Number.isSafeInteger(value) || value < 1) ||
      !Number.isSafeInteger(policy.retryAfterMaximumMs) || policy.retryAfterMaximumMs < 0 ||
      !Number.isSafeInteger(policy.originCooldownMaximumMs) || policy.originCooldownMaximumMs < 0) {
    throw new Error("Worker/network concurrency policy is invalid");
  }
  return Object.freeze({ ...policy });
}

export function originBudgetKey(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Origin budget requires HTTP or HTTPS");
  return parsed.origin;
}

export function effectiveOriginRequestBudget(policy: WorkerNetworkConcurrencyPolicy): number {
  validateWorkerNetworkConcurrencyPolicy(policy);
  return policy.requestRatePerOrigin;
}

export * from "./scheduler.js";

