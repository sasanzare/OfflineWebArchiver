import { createServer, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface RenderFixtureServer {
  origin: string;
  url(name: string): string;
  waitForRequest(pathname: string, timeoutMs?: number): Promise<void>;
  close(): Promise<void>;
}

const routeFiles: Readonly<Record<string, string>> = Object.freeze({
  "/static": "static.html",
  "/javascript": "javascript.html",
  "/spa": "spa.html",
  "/spa/route": "spa.html",
  "/lazy": "lazy.html",
  "/continuous": "continuous.html",
  "/continuous-pause": "continuous.html",
  "/render-timeout": "continuous.html",
  "/long-lived": "long-lived.html",
  "/blank": "blank.html",
  "/page-crash": "page-crash.html",
  "/browser-crash": "browser-crash.html",
  "/method": "method.html",
  "/controls": "controls.html",
  "/evidence-cap": "evidence-cap.html",
  "/interaction": "interaction.html",
  "/popup": "static.html",
  "/service-worker": "service-worker.html",
});

function finish(response: ServerResponse, status: number, body: string, contentType = "text/plain; charset=utf-8"): void {
  response.writeHead(status, { "content-type": contentType, "cache-control": "no-store" });
  response.end(body);
}

export async function startRenderFixtureServer(): Promise<RenderFixtureServer> {
  const pending = new Set<ServerResponse>();
  const requestCounts = new Map<string, number>();
  const requestWaiters = new Map<string, Set<() => void>>();
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    const cookies = request.headers.cookie ?? "";
    requestCounts.set(pathname, (requestCounts.get(pathname) ?? 0) + 1);
    for (const resolve of requestWaiters.get(pathname) ?? []) resolve();
    requestWaiters.delete(pathname);
    if (pathname === "/redirect") {
      response.writeHead(302, { location: "/javascript" });
      response.end();
      return;
    }
    if (pathname === "/redirect-private") {
      response.writeHead(302, { location: "http://169.254.169.254/latest/meta-data" });
      response.end();
      return;
    }
    if (pathname === "/navigation-timeout") {
      pending.add(response);
      response.on("close", () => pending.delete(response));
      return;
    }
    if (pathname === "/failed-request") {
      response.destroy();
      return;
    }
    if (pathname === "/page-active") {
      response.writeHead(204, { "cache-control": "no-store" });
      response.end();
      return;
    }
    if (pathname === "/events") {
      response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      response.write("event: ready\ndata: fixture\n\n");
      pending.add(response);
      response.on("close", () => pending.delete(response));
      return;
    }
    if (pathname === "/service-worker.js") {
      finish(response, 200, `self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (new URL(event.request.url).pathname === "/sw-probe") {
    event.respondWith(new Response("service-worker-response", { status: 200, headers: { "content-type": "text/plain", "x-owab-sw": "intercepted" } }));
  }
});`, "application/javascript; charset=utf-8");
      return;
    }
    if (pathname === "/sw-probe") {
      finish(response, 200, "network-response");
      return;
    }
    if (pathname === "/auth-login") {
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "set-cookie": ["owa_auth=fixture-session; Path=/; HttpOnly"],
      });
      response.end("<!doctype html><html><body><main id=login>Manual login fixture</main><script>localStorage.setItem('auth-state','signed-in'); const request=indexedDB.open('auth-db',1); request.onupgradeneeded=()=>request.result.createObjectStore('tokens');</script></body></html>");
      return;
    }
    if (pathname === "/auth-account") {
      if (!cookies.includes("owa_auth=fixture-session")) {
        finish(response, 401, "unauthorized");
        return;
      }
      finish(response, 200, "<!doctype html><html><body><main id=authenticated>Signed in fixture</main></body></html>", "text/html; charset=utf-8");
      return;
    }
    const file = routeFiles[pathname];
    if (file === undefined) {
      finish(response, 404, "fixture not found");
      return;
    }
    try {
      const body = await readFile(path.join(process.cwd(), "tests", "fixtures", "rendering", file), "utf8");
      finish(response, 200, body, "text/html; charset=utf-8");
    } catch {
      finish(response, 500, "fixture read failed");
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  server.unref();
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Render fixture server did not bind a TCP port");
  const origin = `http://127.0.0.1:${address.port}`;
  return {
    origin,
    url(name) { return `${origin}/${name.replace(/^\/+/, "")}`; },
    async waitForRequest(pathname, timeoutMs = 15_000) {
      if ((requestCounts.get(pathname) ?? 0) > 0) return;
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          requestWaiters.get(pathname)?.delete(onRequest);
          reject(new Error(`Timed out waiting for fixture request ${pathname}`));
        }, timeoutMs);
        const onRequest = () => {
          clearTimeout(timeout);
          resolve();
        };
        const waiters = requestWaiters.get(pathname) ?? new Set<() => void>();
        waiters.add(onRequest);
        requestWaiters.set(pathname, waiters);
      });
    },
    async close() {
      for (const response of pending) response.destroy();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error === undefined ? resolve() : reject(error));
        server.closeAllConnections();
      });
    },
  };
}
