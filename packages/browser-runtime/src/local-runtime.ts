import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import {
  runtimeResourcePaths,
  resolveRuntimeRequest,
  safeReplayUrl,
  validateRuntimeOrigin,
  type ExternalDependencyMap,
  type OriginalResourceMap,
  type RouteMap,
  type RouteMapEntry,
  type RuntimeResolution,
} from "@offline-web-archive/archive-core";

export interface LocalRuntimeEvent {
  readonly eventType: "missing-resource" | "unknown-route" | "path-rejected" | "host-rejected" | "method-rejected";
  readonly projectId: string;
  readonly requestPath: string;
  readonly reasonCode: string;
  readonly occurredAt: string;
}

export interface LocalRuntimeServerOptions {
  readonly projectId: string;
  readonly routeMap: RouteMap;
  readonly originalResourceMap: OriginalResourceMap;
  readonly externalDependencyMap?: ExternalDependencyMap;
  readonly projectRoot?: string;
  readonly additionalResourcePaths?: readonly string[];
  readonly readResource?: (relativePath: string) => Promise<Uint8Array>;
  readonly pageResourceForRoute?: (route: RouteMapEntry) => string;
  readonly onEvent?: (event: LocalRuntimeEvent) => void | Promise<void>;
}

export interface LocalRuntimeServer {
  readonly projectId: string;
  readonly origin: string;
  readonly port: number;
  resolve(requestPath: string, method?: "GET" | "HEAD"): RuntimeResolution;
  urlForRoute(route: string): string;
  readonly close: () => Promise<void>;
}

function contentType(relativePath: string): string {
  const extension = path.posix.extname(relativePath).toLowerCase();
  return ({
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
  } as Readonly<Record<string, string>>)[extension] ?? "application/octet-stream";
}

async function assertNoSymlinkInRoot(target: string, root: string): Promise<void> {
  let current = path.resolve(target);
  const resolvedRoot = path.resolve(root);
  if (current !== resolvedRoot && !current.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error("Runtime path escapes Project root");
  while (true) {
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink()) throw new Error("Runtime symbolic links are forbidden");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        const parent = path.dirname(current);
        if (parent === current || current === resolvedRoot) break;
        current = parent;
        continue;
      }
      throw error;
    }
    if (current === resolvedRoot) break;
    current = path.dirname(current);
  }
}

async function projectReader(projectRoot: string, allowed: ReadonlySet<string>, relativePath: string): Promise<Uint8Array> {
  if (!allowed.has(relativePath)) throw new Error("Runtime resource is not in the active archive map");
  const root = path.resolve(projectRoot);
  const target = path.resolve(root, ...relativePath.split("/"));
  await assertNoSymlinkInRoot(target, root);
  const stat = await lstat(target);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Runtime resource is not a regular file");
  return new Uint8Array(await readFile(target));
}

function requestOrigin(request: IncomingMessage, origin: string): boolean {
  const expectedHost = new URL(origin).host;
  const host = typeof request.headers.host === "string" ? request.headers.host.toLowerCase() : "";
  if (host !== expectedHost.toLowerCase()) return false;
  const requestOriginHeader = request.headers.origin;
  return requestOriginHeader === undefined || requestOriginHeader === "null" || requestOriginHeader === origin;
}

export async function createLocalRuntimeServer(options: LocalRuntimeServerOptions): Promise<LocalRuntimeServer> {
  const scope = options.routeMap;
  if (scope.projectId !== options.projectId ||
      scope.routes.some((route) => route.projectId !== scope.projectId || route.runId !== scope.runId || route.projectRevisionId !== scope.projectRevisionId) ||
      options.originalResourceMap.resources.some((resource) => resource.projectId !== scope.projectId || resource.runId !== scope.runId || resource.projectRevisionId !== scope.projectRevisionId) ||
      options.externalDependencyMap?.dependencies.some((dependency) => dependency.projectId !== scope.projectId || dependency.runId !== scope.runId || dependency.projectRevisionId !== scope.projectRevisionId)) {
    throw new Error("Local Runtime map ownership does not match the Project/Run/Revision scope");
  }
  const routeOverrides = options.pageResourceForRoute === undefined ? [] : options.routeMap.routes.map((route) => options.pageResourceForRoute!(route));
  const additional = [...(options.additionalResourcePaths ?? []), ...routeOverrides];
  const allowed = new Set(runtimeResourcePaths({ routeMap: options.routeMap, originalResourceMap: options.originalResourceMap, additionalResourcePaths: additional }));
  const reader = options.readResource ?? (options.projectRoot === undefined ? null : (relativePath: string) => projectReader(options.projectRoot!, allowed, relativePath));
  if (reader === null) throw new Error("Local Runtime requires a bounded resource reader or Project root");
  let server: Server | null = null;
  let origin: string | null = null;
  const emit = async (event: LocalRuntimeEvent): Promise<void> => { await Promise.resolve(options.onEvent?.(event)).catch(() => undefined); };
  const resolution = (requestPath: string, method: "GET" | "HEAD" = "GET"): RuntimeResolution => resolveRuntimeRequest({
    requestPath,
    method,
    routeMap: options.routeMap,
    originalResourceMap: options.originalResourceMap,
    ...(options.externalDependencyMap === undefined ? {} : { externalDependencyMap: options.externalDependencyMap }),
    additionalResourcePaths: additional,
  });
  const handler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const activeOrigin = origin;
    if (activeOrigin === null || !requestOrigin(request, activeOrigin)) {
      await emit({ eventType: "host-rejected", projectId: options.projectId, requestPath: safeReplayUrl(request.url ?? "/"), reasonCode: "RUNTIME_HOST_NOT_ASSIGNED_ORIGIN", occurredAt: new Date().toISOString() });
      response.writeHead(421, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      response.end("misdirected request");
      return;
    }
    const method = request.method === "HEAD" ? "HEAD" : request.method === "GET" ? "GET" : null;
    if (method === null) {
      await emit({ eventType: "method-rejected", projectId: options.projectId, requestPath: request.url ?? "/", reasonCode: "RUNTIME_METHOD_NOT_ALLOWED", occurredAt: new Date().toISOString() });
      response.writeHead(405, { "allow": "GET, HEAD", "cache-control": "no-store" });
      response.end();
      return;
    }
    let requestPath = "/";
    try { requestPath = new URL(request.url ?? "/", activeOrigin).pathname; }
    catch { /* The resolver records a bounded invalid path. */ }
    const resolved = resolution(requestPath, method);
    if (resolved.status !== 200 || resolved.relativeResource === null) {
      await emit({ eventType: resolved.kind === "invalid" ? "path-rejected" : "unknown-route", projectId: options.projectId, requestPath: requestPath.slice(0, 2_048), reasonCode: resolved.reasonCode, occurredAt: new Date().toISOString() });
      response.writeHead(resolved.status, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
      response.end(resolved.reasonCode);
      return;
    }
    let relativeResource = resolved.relativeResource;
    if (resolved.route !== null && options.pageResourceForRoute !== undefined) relativeResource = options.pageResourceForRoute(resolved.route);
    if (!allowed.has(relativeResource)) {
      await emit({ eventType: "missing-resource", projectId: options.projectId, requestPath: requestPath.slice(0, 2_048), reasonCode: "RUNTIME_RESOURCE_NOT_IN_MAP", occurredAt: new Date().toISOString() });
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      response.end("resource not archived");
      return;
    }
    try {
      const bytes = await reader(relativeResource);
      response.writeHead(200, {
        "content-type": contentType(relativeResource),
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "content-length": String(bytes.byteLength),
      });
      if (method === "HEAD") response.end();
      else response.end(Buffer.from(bytes));
    } catch {
      await emit({ eventType: "missing-resource", projectId: options.projectId, requestPath: requestPath.slice(0, 2_048), reasonCode: "RUNTIME_RESOURCE_MISSING_OR_INVALID", occurredAt: new Date().toISOString() });
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
      response.end("resource not archived");
    }
  };
  server = createServer((request, response) => { void handler(request, response).catch(() => { response.destroy(); }); });
  await new Promise<void>((resolve, reject) => {
    server!.once("error", reject);
    server!.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Local Runtime did not bind an ephemeral loopback port");
  origin = validateRuntimeOrigin(`http://127.0.0.1:${address.port}`);
  const runtime: LocalRuntimeServer = {
    projectId: options.projectId,
    get origin() { return origin!; },
    get port() { return address.port; },
    resolve: resolution,
    urlForRoute(route) { return `${origin}${route.startsWith("/") ? route : `/${route}`}`; },
    async close() {
      const active = server;
      server = null;
      origin = null;
      if (active === null) return;
      await new Promise<void>((resolve, reject) => active.close((error) => error === undefined ? resolve() : reject(error)));
    },
  };
  return Object.freeze(runtime);
}
