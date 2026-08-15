import { createSign, generateKeyPairSync } from "node:crypto";
import { createServer as createHttpServer, request as httpRequest, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { connect as netConnect, createServer as createNetServer, type Server as NetServer, type Socket } from "node:net";

export interface ProxyFixtureTarget {
  readonly origin: string;
  readonly url: (pathname?: string) => string;
  readonly requestCount: () => number;
  close(): Promise<void>;
}

export interface ProxyFixtureServer {
  readonly protocol: "http" | "https" | "socks5";
  readonly server: string;
  readonly requestCount: () => number;
  close(): Promise<void>;
}

function der(tag: number, value: Buffer): Buffer {
  if (value.length < 128) return Buffer.concat([Buffer.from([tag, value.length]), value]);
  const bytes: number[] = [];
  let remaining = value.length;
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }
  return Buffer.concat([Buffer.from([tag, 0x80 | bytes.length, ...bytes]), value]);
}

function sequence(...values: Buffer[]): Buffer { return der(0x30, Buffer.concat(values)); }
function set(...values: Buffer[]): Buffer { return der(0x31, Buffer.concat(values)); }
function integer(value: number): Buffer {
  const bytes: number[] = [];
  let remaining = value;
  do { bytes.unshift(remaining & 0xff); remaining >>= 8; } while (remaining > 0);
  if ((bytes[0] ?? 0) & 0x80) bytes.unshift(0);
  return der(0x02, Buffer.from(bytes));
}
function oid(parts: readonly number[]): Buffer {
  const output: number[] = [(parts[0] ?? 0) * 40 + (parts[1] ?? 0)];
  for (const part of parts.slice(2)) {
    const encoded = [part & 0x7f];
    let remaining = part >> 7;
    while (remaining > 0) { encoded.unshift((remaining & 0x7f) | 0x80); remaining >>= 7; }
    output.push(...encoded);
  }
  return der(0x06, Buffer.from(output));
}
function utf8(value: string): Buffer { return der(0x0c, Buffer.from(value, "utf8")); }
function generalizedTime(value: Date): Buffer {
  const text = value.toISOString().replace(/[-:.]/g, "").replace("T", "").replace(/\d{3}Z$/, "Z");
  return der(0x18, Buffer.from(text, "ascii"));
}
function algorithmIdentifier(): Buffer { return sequence(oid([1, 2, 840, 113549, 1, 1, 11]), der(0x05, Buffer.alloc(0))); }
function distinguishedName(commonName: string): Buffer {
  return sequence(set(sequence(oid([2, 5, 4, 3]), utf8(commonName))));
}

function createLocalCertificate(): { readonly key: string; readonly cert: string } {
  const keyPair = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { format: "pem", type: "pkcs8" },
    publicKeyEncoding: { format: "der", type: "spki" },
  });
  const subject = distinguishedName("127.0.0.1");
  const subjectAlternativeName = der(0x87, Buffer.from([127, 0, 0, 1]));
  const extensions = sequence(sequence(oid([2, 5, 29, 17]), der(0x04, sequence(subjectAlternativeName))));
  const notBefore = new Date(Date.now() - 60_000);
  const notAfter = new Date(Date.now() + 24 * 60 * 60_000);
  const tbs = sequence(
    der(0xa0, integer(2)),
    integer(1),
    algorithmIdentifier(),
    subject,
    sequence(generalizedTime(notBefore), generalizedTime(notAfter)),
    subject,
    keyPair.publicKey,
    der(0xa3, extensions),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(tbs);
  signer.end();
  const signature = signer.sign(keyPair.privateKey);
  const certificate = sequence(tbs, algorithmIdentifier(), der(0x03, Buffer.concat([Buffer.from([0]), signature])));
  const pem = (label: string, value: Buffer): string => `-----BEGIN ${label}-----\n${value.toString("base64").match(/.{1,64}/g)?.join("\n") ?? ""}\n-----END ${label}-----\n`;
  return { key: keyPair.privateKey, cert: pem("CERTIFICATE", certificate) };
}

async function listen(server: Server | NetServer): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  server.unref();
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Proxy fixture did not bind a TCP port");
  return address.port;
}

function hasProxyAuthorization(request: IncomingMessage, username: string | undefined, password: string | undefined): boolean {
  if (username === undefined || password === undefined) return true;
  return request.headers["proxy-authorization"] === `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

function writeProxyAuthRequired(response: ServerResponse): void {
  response.writeHead(407, { "proxy-authenticate": "Basic realm=owa-proxy-fixture" });
  response.end("proxy authentication required");
}

function createHttpProxyHandler(username?: string, password?: string, requestCount?: { value: number }) {
  return (request: IncomingMessage, response: ServerResponse): void => {
    request.on("error", () => undefined);
    response.on("error", () => undefined);
    if (!hasProxyAuthorization(request, username, password)) { writeProxyAuthRequired(response); return; }
    const rawUrl = request.url ?? "";
    let target: URL;
    try { target = new URL(rawUrl); } catch { response.writeHead(400); response.end("invalid proxy target"); return; }
    requestCount!.value += 1;
    const headers = { ...request.headers };
    delete headers["proxy-authorization"];
    delete headers["proxy-connection"];
    delete headers.connection;
    const upstream = httpRequest({ hostname: target.hostname, port: Number(target.port || 80), method: request.method, path: `${target.pathname || "/"}${target.search}`, headers: { ...headers, host: target.host } }, (upstreamResponse) => {
      upstreamResponse.on("error", () => response.destroy());
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    });
    upstream.once("error", () => { if (!response.headersSent) response.writeHead(502); response.end("proxy upstream failure"); });
    request.pipe(upstream);
  };
}

function attachConnectHandler(server: Server, username: string | undefined, password: string | undefined, requestCount: { value: number }): void {
  server.on("connect", (request: IncomingMessage, client: Socket, head: Buffer) => {
    client.on("error", () => undefined);
    if (!hasProxyAuthorization(request, username, password)) { client.end("HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm=owa-proxy-fixture\r\n\r\n"); return; }
    const [hostname, portText] = (request.url ?? "").split(":");
    const port = Number(portText);
    if (hostname === undefined || !Number.isInteger(port) || port < 1 || port > 65_535) { client.end("HTTP/1.1 400 Bad Request\r\n\r\n"); return; }
    requestCount.value += 1;
    const upstream = netConnect(port, hostname);
    upstream.on("error", () => client.destroy());
    upstream.once("connect", () => {
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length > 0) upstream.write(head);
      client.pipe(upstream);
      upstream.pipe(client);
    });
    upstream.once("error", () => client.end("HTTP/1.1 502 Bad Gateway\r\n\r\n"));
  });
}

export async function startProxyFixtureTarget(): Promise<ProxyFixtureTarget> {
  let requests = 0;
  const server = createHttpServer((request, response) => {
    requests += 1;
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    response.end(pathname === "/ip" ? "203.0.113.42" : "proxy-target-ok");
  });
  server.on("clientError", (_error, socket) => socket.destroy());
  const port = await listen(server);
  const origin = `http://127.0.0.1:${port}`;
  return {
    origin,
    url(pathname = "/") { return `${origin}${pathname.startsWith("/") ? pathname : `/${pathname}`}`; },
    requestCount() { return requests; },
    async close() { await new Promise<void>((resolve, reject) => server.close((error) => error === undefined ? resolve() : reject(error))); },
  };
}

export async function startHttpProxyFixture(options: { readonly secure?: boolean; readonly username?: string; readonly password?: string } = {}): Promise<ProxyFixtureServer> {
  const requests = { value: 0 };
  const handler = createHttpProxyHandler(options.username, options.password, requests);
  const server = options.secure === true
    ? createHttpsServer(createLocalCertificate(), handler)
    : createHttpServer(handler);
  server.on("clientError", (_error, socket) => socket.destroy());
  attachConnectHandler(server, options.username, options.password, requests);
  const port = await listen(server);
  return {
    protocol: options.secure === true ? "https" : "http",
    server: `${options.secure === true ? "https" : "http"}://127.0.0.1:${port}`,
    requestCount() { return requests.value; },
    async close() { await new Promise<void>((resolve, reject) => server.close((error) => error === undefined ? resolve() : reject(error))); },
  };
}

export async function startSocks5ProxyFixture(): Promise<ProxyFixtureServer> {
  const requests = { value: 0 };
  const server = createNetServer((client) => {
    client.on("error", () => undefined);
    let buffer = Buffer.alloc(0);
    let stage: "greeting" | "request" | "stream" = "greeting";
    const consume = (): void => {
      if (stage === "greeting") {
        if (buffer.length < 2) return;
        const methodCount = buffer[1]!;
        if (buffer.length < 2 + methodCount) return;
        const methods = buffer.subarray(2, 2 + methodCount);
        buffer = buffer.subarray(2 + methodCount);
        if (!methods.includes(0)) { client.end(Buffer.from([5, 0xff])); return; }
        client.write(Buffer.from([5, 0]));
        stage = "request";
      }
      if (stage !== "request" || buffer.length < 7) return;
      const addressType = buffer[3]!;
      let offset = 4;
      let host: string;
      if (addressType === 1) {
        if (buffer.length < offset + 4 + 2) return;
        host = [...buffer.subarray(offset, offset + 4)].join(".");
        offset += 4;
      } else if (addressType === 3) {
        const length = buffer[offset]!;
        if (length === undefined || buffer.length < offset + 1 + length + 2) return;
        host = buffer.subarray(offset + 1, offset + 1 + length).toString("utf8");
        offset += 1 + length;
      } else if (addressType === 4) {
        if (buffer.length < offset + 16 + 2) return;
        host = [...buffer.subarray(offset, offset + 16)].reduce((value, byte, index) => `${value}${index > 0 && index % 2 === 0 ? ":" : ""}${byte.toString(16).padStart(2, "0")}`, "");
        offset += 16;
      } else { client.end(Buffer.from([5, 8, 0, 1, 0, 0, 0, 0, 0, 0])); return; }
      if (buffer[1] !== 1) { client.end(Buffer.from([5, 7, 0, 1, 0, 0, 0, 0, 0, 0])); return; }
      const port = buffer.readUInt16BE(offset);
      buffer = Buffer.alloc(0);
      stage = "stream";
      requests.value += 1;
      const upstream = netConnect(port, host);
      upstream.on("error", () => client.destroy());
      upstream.once("connect", () => {
        client.write(Buffer.from([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]));
        client.pipe(upstream);
        upstream.pipe(client);
      });
      upstream.once("error", () => client.end(Buffer.from([5, 5, 0, 1, 0, 0, 0, 0, 0, 0])));
    };
    client.on("data", (chunk) => { if (stage !== "stream") { buffer = Buffer.concat([buffer, chunk]); consume(); } });
  });
  const port = await listen(server);
  return {
    protocol: "socks5",
    server: `socks5://127.0.0.1:${port}`,
    requestCount() { return requests.value; },
    async close() { await new Promise<void>((resolve, reject) => server.close((error) => error === undefined ? resolve() : reject(error))); },
  };
}
