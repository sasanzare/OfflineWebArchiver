import { createServer, type Server, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { SpikeError } from "./errors.js";
import { assertWithinRoot, isWithinRoot } from "./paths.js";

const CONTENT_TYPES = new Map<string, string>([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

export interface LoopbackServer {
  readonly host: "127.0.0.1";
  readonly port: number;
  readonly origin: string;
  readonly requests: string[];
  stop(): Promise<void>;
}

export interface ArchiveServer extends LoopbackServer {
  setArchiveRoot(root: string): void;
}

function send(
  response: ServerResponse,
  status: number,
  body: string | Buffer,
  contentType: string,
  extraHeaders: Record<string, string> = {},
): void {
  response.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extraHeaders,
  });
  response.end(body);
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.closeAllConnections?.();
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function listenLoopback(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new SpikeError(
      "SPIKE_RUNTIME_SERVER_ERROR",
      "The loopback server did not expose a TCP address.",
    );
  }
  return address.port;
}

export async function startFixtureServer(
  fixtureRoot: string,
): Promise<LoopbackServer> {
  const resolvedRoot = path.resolve(fixtureRoot);
  const requests: string[] = [];
  const staticFiles = new Map<string, string>([
    ["/", "index.html"],
    ["/index.html", "index.html"],
    ["/app.js", "app.js"],
    ["/styles.css", "styles.css"],
    ["/lazy.svg", "lazy.svg"],
  ]);

  const server = createServer((request, response) => {
    void (async () => {
      const target = request.url ?? "/";
      const pathname = target.split("?", 1)[0] ?? "/";
      requests.push(pathname);

      if (request.method !== "GET" && request.method !== "HEAD") {
        send(response, 405, "Method not allowed", "text/plain; charset=utf-8");
        return;
      }

      if (pathname === "/api/catalog") {
        await new Promise((resolve) => setTimeout(resolve, 140));
        send(
          response,
          200,
          JSON.stringify({
            items: [
              { id: "example-item", name: "Example Item" },
              { id: "second-item", name: "Second Item" },
            ],
          }),
          "application/json; charset=utf-8",
        );
        return;
      }

      const routeFile = staticFiles.get(pathname);
      const name = routeFile ?? (path.extname(pathname) === "" ? "index.html" : null);
      if (name === null) {
        send(response, 404, "Not found", "text/plain; charset=utf-8");
        return;
      }

      const filePath = path.join(resolvedRoot, name);
      assertWithinRoot(resolvedRoot, filePath);
      const bytes = await readFile(filePath);
      send(
        response,
        200,
        request.method === "HEAD" ? "" : bytes,
        CONTENT_TYPES.get(path.extname(filePath)) ?? "application/octet-stream",
      );
    })().catch((error: unknown) => {
      send(
        response,
        500,
        error instanceof Error ? error.message : "Fixture server error",
        "text/plain; charset=utf-8",
      );
    });
  });

  try {
    const port = await listenLoopback(server);
    return {
      host: "127.0.0.1",
      port,
      origin: `http://127.0.0.1:${port}`,
      requests,
      stop: () => closeServer(server),
    };
  } catch (error) {
    throw new SpikeError(
      "SPIKE_FIXTURE_START_ERROR",
      "The synthetic fixture server could not start on loopback.",
      { cause: error },
    );
  }
}

export function resolveArchiveRequest(
  archiveRoot: string,
  requestTarget: string,
): { status: "file" | "route-fallback" | "rejected"; filePath: string | null } {
  const rawPath = requestTarget.split("?", 1)[0] ?? "/";
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return { status: "rejected", filePath: null };
  }

  if (decoded.includes("\0") || decoded.includes("\\")) {
    return { status: "rejected", filePath: null };
  }

  const segments = decoded.split("/").filter(Boolean);
  if (segments.some((segment) => segment === ".." || segment === ".")) {
    return { status: "rejected", filePath: null };
  }

  const relative = segments.join(path.sep);
  const candidate = path.resolve(archiveRoot, relative || "index.html");
  if (!isWithinRoot(archiveRoot, candidate)) {
    return { status: "rejected", filePath: null };
  }

  if (relative === "" || path.extname(relative) !== "") {
    return { status: "file", filePath: candidate };
  }
  return {
    status: "route-fallback",
    filePath: path.join(path.resolve(archiveRoot), "index.html"),
  };
}

export async function startArchiveServer(
  initialArchiveRoot: string,
  excludedPorts: ReadonlySet<number> = new Set(),
): Promise<ArchiveServer> {
  let currentRoot = path.resolve(initialArchiveRoot);
  const requests: string[] = [];

  const server = createServer((request, response) => {
    void (async () => {
      const target = request.url ?? "/";
      requests.push(target);

      if (request.method !== "GET" && request.method !== "HEAD") {
        send(response, 405, "Method not allowed", "text/plain; charset=utf-8");
        return;
      }

      const resolved = resolveArchiveRequest(currentRoot, target);
      if (resolved.status === "rejected" || resolved.filePath === null) {
        send(response, 403, "Rejected archive path", "text/plain; charset=utf-8");
        return;
      }

      try {
        const fileInfo = await stat(resolved.filePath);
        if (!fileInfo.isFile()) {
          throw Object.assign(new Error("Not a file"), { code: "ENOENT" });
        }
      } catch {
        if (resolved.status === "file" && path.extname(resolved.filePath) !== "") {
          send(response, 404, "Not found", "text/plain; charset=utf-8");
          return;
        }
        send(response, 404, "Not found", "text/plain; charset=utf-8");
        return;
      }

      const bytes = await readFile(resolved.filePath);
      send(
        response,
        200,
        request.method === "HEAD" ? "" : bytes,
        CONTENT_TYPES.get(path.extname(resolved.filePath)) ?? "application/octet-stream",
        {
          "content-security-policy":
            "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'none'; connect-src 'none'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
        },
      );
    })().catch(() => {
      send(response, 500, "Archive server error", "text/plain; charset=utf-8");
    });
  });

  let port = await listenLoopback(server);
  if (excludedPorts.has(port)) {
    await closeServer(server);
    return startArchiveServer(initialArchiveRoot, excludedPorts);
  }

  return {
    host: "127.0.0.1",
    port,
    origin: `http://127.0.0.1:${port}`,
    requests,
    setArchiveRoot(root: string): void {
      currentRoot = path.resolve(root);
    },
    stop: () => closeServer(server),
  };
}

