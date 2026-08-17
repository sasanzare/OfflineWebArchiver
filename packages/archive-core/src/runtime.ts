import { canonicalRelativePath, validateCanonicalRelativePath } from "./path-safety.js";
import type { ExternalDependencyMap, OriginalResourceMap, RouteMap, RouteMapEntry } from "./rewrite.js";

export const LOCAL_RUNTIME_CONTRACT_VERSION = 1 as const;

export type RuntimeResolutionKind = "page" | "resource" | "missing" | "collision" | "invalid";

export interface RuntimeResolution {
  readonly version: typeof LOCAL_RUNTIME_CONTRACT_VERSION;
  readonly status: 200 | 400 | 404 | 409;
  readonly kind: RuntimeResolutionKind;
  readonly requestPath: string;
  readonly relativeResource: string | null;
  readonly route: RouteMapEntry | null;
  readonly reasonCode: string;
}

export interface RuntimeRequestResolutionInput {
  readonly requestPath: string;
  readonly method: "GET" | "HEAD";
  readonly routeMap: RouteMap;
  readonly originalResourceMap: OriginalResourceMap;
  readonly externalDependencyMap?: ExternalDependencyMap;
  readonly additionalResourcePaths?: readonly string[];
}

function normalizedRoutePath(value: string): string | null {
  if (value === "/") return "/";
  if (!value.startsWith("/") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return null;
  const relative = value.slice(1);
  const validation = validateCanonicalRelativePath(relative);
  return validation.valid && validation.normalized !== null ? `/${validation.normalized}` : null;
}

function decodeRuntimePath(value: string): string | null {
  if (!value.startsWith("/") || value.includes("\\")) return null;
  let decoded = value;
  for (let pass = 0; pass < 3; pass += 1) {
    let next: string;
    try { next = decodeURIComponent(decoded); }
    catch { return null; }
    if (next.includes("\\") || next.split("/").some((segment) => segment === "." || segment === "..")) return null;
    if (next === decoded) break;
    decoded = next;
  }
  return normalizedRoutePath(decoded);
}

function resourceSet(input: RuntimeRequestResolutionInput): Set<string> {
  const resources = new Set<string>();
  const blockedMappedResources = new Set<string>(input.routeMap.routes
    .filter((route) => route.resolutionState !== "local-match" || input.routeMap.collisions.some((collision) => collision.routeIds.includes(route.routeId)))
    .flatMap((route) => {
      const validated = validateCanonicalRelativePath(route.localResource);
      return validated.valid && validated.normalized !== null ? [validated.normalized] : [];
    }));
  for (const entry of input.originalResourceMap.resources) {
    if (entry.resolutionState !== "local-match") continue;
    const validated = validateCanonicalRelativePath(entry.localResource);
    if (validated.valid && validated.normalized !== null && !blockedMappedResources.has(validated.normalized)) resources.add(validated.normalized);
  }
  for (const value of input.additionalResourcePaths ?? []) {
    const validated = validateCanonicalRelativePath(value);
    if (validated.valid && validated.normalized !== null && !blockedMappedResources.has(validated.normalized)) resources.add(validated.normalized);
  }
  for (const route of input.routeMap.routes) {
    if (route.resolutionState !== "local-match" || input.routeMap.collisions.some((collision) => collision.routeIds.includes(route.routeId))) continue;
    const validated = validateCanonicalRelativePath(route.localResource);
    if (validated.valid && validated.normalized !== null) resources.add(validated.normalized);
    if (route.fallback?.mode === "entry-document") {
      const fallback = validateCanonicalRelativePath(route.fallback.entryResource);
      if (fallback.valid && fallback.normalized !== null) resources.add(fallback.normalized);
    }
  }
  return resources;
}

function mapsShareRuntimeScope(input: RuntimeRequestResolutionInput): boolean {
  const scope = input.routeMap;
  if (input.originalResourceMap.resources.some((resource) => resource.projectId !== scope.projectId || resource.runId !== scope.runId || resource.projectRevisionId !== scope.projectRevisionId)) return false;
  if (scope.routes.some((route) => route.projectId !== scope.projectId || route.runId !== scope.runId || route.projectRevisionId !== scope.projectRevisionId)) return false;
  if (input.externalDependencyMap?.dependencies.some((dependency) => dependency.projectId !== scope.projectId || dependency.runId !== scope.runId || dependency.projectRevisionId !== scope.projectRevisionId)) return false;
  return true;
}

export function resolveRuntimeRequest(input: RuntimeRequestResolutionInput): RuntimeResolution {
  if (input.method !== "GET" && input.method !== "HEAD") return {
    version: LOCAL_RUNTIME_CONTRACT_VERSION,
    status: 400,
    kind: "invalid",
    requestPath: input.requestPath,
    relativeResource: null,
    route: null,
    reasonCode: "RUNTIME_METHOD_NOT_ALLOWED",
  };
  if (!mapsShareRuntimeScope(input)) return {
    version: LOCAL_RUNTIME_CONTRACT_VERSION,
    status: 409,
    kind: "invalid",
    requestPath: input.requestPath,
    relativeResource: null,
    route: null,
    reasonCode: "RUNTIME_MAP_SCOPE_MISMATCH",
  };
  const pathValue = decodeRuntimePath(input.requestPath);
  if (pathValue === null) return {
    version: LOCAL_RUNTIME_CONTRACT_VERSION,
    status: 400,
    kind: "invalid",
    requestPath: input.requestPath,
    relativeResource: null,
    route: null,
    reasonCode: "RUNTIME_PATH_UNSAFE",
  };
  const routeMatches = input.routeMap.routes.filter((route) => route.localRoute === pathValue);
  if (routeMatches.length > 1 || routeMatches.some((candidate) => candidate.resolutionState === "collision" || input.routeMap.collisions.some((collision) => collision.routeIds.includes(candidate.routeId)))) return {
    version: LOCAL_RUNTIME_CONTRACT_VERSION,
    status: 409,
    kind: "collision",
    requestPath: pathValue,
    relativeResource: null,
    route: null,
    reasonCode: "RUNTIME_ROUTE_COLLISION",
  };
  const route = routeMatches[0] ?? null;
  if (route !== null) {
    if (route.resolutionState !== "local-match") return {
      version: LOCAL_RUNTIME_CONTRACT_VERSION,
      status: 409,
      kind: "collision",
      requestPath: pathValue,
      relativeResource: null,
      route,
      reasonCode: route.resolutionState === "collision" ? "RUNTIME_ROUTE_COLLISION" : "RUNTIME_ROUTE_UNRESOLVED",
    };
    try {
      const relativeResource = route.routeType === "spa" && route.fallback?.mode === "entry-document"
        ? route.fallback.entryResource
        : route.localResource;
      return {
      version: LOCAL_RUNTIME_CONTRACT_VERSION,
      status: 200,
      kind: "page",
      requestPath: pathValue,
      relativeResource: canonicalRelativePath(relativeResource),
      route,
      reasonCode: route.routeType === "spa" ? "RUNTIME_SPA_ENTRY_DOCUMENT" : "RUNTIME_ROUTE_MATCH",
      };
    }
    catch { /* A malformed persisted map is not a file-serving permission. */ }
  }
  const relativeResource = pathValue === "/" ? null : pathValue.slice(1);
  if (relativeResource !== null && resourceSet(input).has(relativeResource)) return {
    version: LOCAL_RUNTIME_CONTRACT_VERSION,
    status: 200,
    kind: "resource",
    requestPath: pathValue,
    relativeResource,
    route: null,
    reasonCode: "RUNTIME_RESOURCE_MATCH",
  };
  return {
    version: LOCAL_RUNTIME_CONTRACT_VERSION,
    status: 404,
    kind: "missing",
    requestPath: pathValue,
    relativeResource: null,
    route: null,
    reasonCode: "RUNTIME_RESOURCE_NOT_ARCHIVED",
  };
}

export function runtimeResourcePaths(input: Pick<RuntimeRequestResolutionInput, "routeMap" | "originalResourceMap" | "additionalResourcePaths">): readonly string[] {
  return [...resourceSet({ ...input, requestPath: "/", method: "GET" })].sort();
}

export function validateRuntimeOrigin(origin: string): string {
  const parsed = new URL(origin);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Local Runtime origin must use HTTP or HTTPS");
  if (parsed.username !== "" || parsed.password !== "" || parsed.pathname !== "/" || parsed.search !== "" || parsed.hash !== "") throw new Error("Local Runtime origin must be an origin only");
  if (parsed.hostname !== "127.0.0.1") throw new Error("Local Runtime must bind to 127.0.0.1");
  return parsed.origin;
}
