export const SERVICE_WORKER_POLICY_VERSION = 1 as const;

export const SERVICE_WORKER_POLICY_MODES = ["block", "allow", "profile-specific"] as const;
export type ServiceWorkerPolicyMode = (typeof SERVICE_WORKER_POLICY_MODES)[number];
export type ResolvedServiceWorkerPolicyMode = "block" | "allow";

export interface ServiceWorkerPolicy {
  version: typeof SERVICE_WORKER_POLICY_VERSION;
  mode: ServiceWorkerPolicyMode;
  /** Required when mode is profile-specific; never inferred from browser defaults. */
  profileMode?: ResolvedServiceWorkerPolicyMode;
}

export const DEFAULT_SERVICE_WORKER_POLICY: ServiceWorkerPolicy = Object.freeze({
  version: SERVICE_WORKER_POLICY_VERSION,
  mode: "block",
});

export function isServiceWorkerPolicy(value: unknown): value is ServiceWorkerPolicy {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const profileModeValid = candidate["profileMode"] === undefined || candidate["profileMode"] === "block" || candidate["profileMode"] === "allow";
  return candidate["version"] === SERVICE_WORKER_POLICY_VERSION &&
    typeof candidate["mode"] === "string" &&
    (SERVICE_WORKER_POLICY_MODES as readonly string[]).includes(candidate["mode"]) &&
    profileModeValid &&
    (candidate["mode"] !== "profile-specific" || candidate["profileMode"] !== undefined);
}

export function normalizeServiceWorkerPolicy(value: Partial<ServiceWorkerPolicy> | undefined): ServiceWorkerPolicy {
  const candidate = value ?? DEFAULT_SERVICE_WORKER_POLICY;
  const normalized = {
    version: candidate.version ?? SERVICE_WORKER_POLICY_VERSION,
    mode: candidate.mode ?? DEFAULT_SERVICE_WORKER_POLICY.mode,
    ...(candidate.profileMode === undefined ? {} : { profileMode: candidate.profileMode }),
  };
  if (normalized.mode === "profile-specific" && normalized.profileMode === undefined) throw new Error("Profile-specific Service Worker policy requires profileMode");
  if (!isServiceWorkerPolicy(normalized)) throw new Error("Unsupported Service Worker policy");
  return Object.freeze(normalized);
}

export function resolveServiceWorkerPolicy(policy: ServiceWorkerPolicy, profileMode?: ResolvedServiceWorkerPolicyMode): ResolvedServiceWorkerPolicyMode {
  if (policy.mode === "profile-specific" && policy.profileMode === undefined && profileMode === undefined) throw new Error("Profile-specific Service Worker policy requires an explicit profile decision");
  if (!isServiceWorkerPolicy(policy)) throw new Error("Unsupported Service Worker policy");
  if (policy.mode === "block" || policy.mode === "allow") return policy.mode;
  const resolved = profileMode ?? policy.profileMode;
  if (resolved === undefined) throw new Error("Profile-specific Service Worker policy requires an explicit profile decision");
  return resolved;
}

