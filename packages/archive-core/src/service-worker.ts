export const SERVICE_WORKER_POLICY_VERSION = 1 as const;

export const SERVICE_WORKER_POLICY_MODES = ["block", "allow"] as const;
export type ServiceWorkerPolicyMode = (typeof SERVICE_WORKER_POLICY_MODES)[number];

export interface ServiceWorkerPolicy {
  version: typeof SERVICE_WORKER_POLICY_VERSION;
  mode: ServiceWorkerPolicyMode;
}

export const DEFAULT_SERVICE_WORKER_POLICY: ServiceWorkerPolicy = Object.freeze({
  version: SERVICE_WORKER_POLICY_VERSION,
  mode: "block",
});

export function isServiceWorkerPolicy(value: unknown): value is ServiceWorkerPolicy {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate["version"] === SERVICE_WORKER_POLICY_VERSION &&
    typeof candidate["mode"] === "string" &&
    (SERVICE_WORKER_POLICY_MODES as readonly string[]).includes(candidate["mode"]);
}

export function normalizeServiceWorkerPolicy(value: Partial<ServiceWorkerPolicy> | undefined): ServiceWorkerPolicy {
  const candidate = value ?? DEFAULT_SERVICE_WORKER_POLICY;
  const normalized = {
    version: candidate.version ?? SERVICE_WORKER_POLICY_VERSION,
    mode: candidate.mode ?? DEFAULT_SERVICE_WORKER_POLICY.mode,
  };
  if (!isServiceWorkerPolicy(normalized)) throw new Error("Unsupported Service Worker policy");
  return Object.freeze(normalized);
}

