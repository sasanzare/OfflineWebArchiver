import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFile, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { createServer, get } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { decidePartialFileRecovery } from "@offline-web-archive/recovery";

function request(url: string, headers: Record<string, string> = {}): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    get(url, { headers }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode ?? 0, headers: response.headers, body: Buffer.concat(chunks) }));
    }).on("error", reject);
  });
}

test("loopback Range fixture resumes a validated partial and restarts safely without Range support", async () => {
  const payload = Buffer.from("range-resume-fixture-".repeat(128), "utf8");
  const etag = '"fixture-v1"';
  const server = createServer((request_, response) => {
    const range = request_.headers.range;
    if (request_.url === "/range" && range !== undefined) {
      const match = /^bytes=(\d+)-$/.exec(range);
      const start = match === null ? 0 : Number(match[1]);
      response.writeHead(206, { "accept-ranges": "bytes", "content-range": `bytes ${start}-${payload.length - 1}/${payload.length}`, "content-length": payload.length - start, etag });
      response.end(payload.subarray(start));
      return;
    }
    response.writeHead(200, { "content-length": payload.length, etag, ...(request_.url === "/range" ? { "accept-ranges": "bytes" } : {}) });
    response.end(payload);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Loopback fixture did not bind a TCP port");
  const root = await mkdtemp(path.join(tmpdir(), "owa-range-resume-"));
  try {
    const partial = path.join(root, "asset.bin.part");
    const final = path.join(root, "asset.bin");
    await writeFile(partial, payload.subarray(0, 100));
    const decision = decidePartialFileRecovery({ localBytes: 100, expectedBytes: payload.length, rangeSupported: true, storedValidator: etag, remoteValidator: etag, storedSha256: null, actualSha256: null });
    assert.equal(decision.decision, "resume");
    const resumed = await request(`http://127.0.0.1:${address.port}/range`, { range: `bytes=${decision.resumeOffset}-`, "if-range": etag });
    assert.equal(resumed.status, 206);
    await appendFile(partial, resumed.body);
    assert.equal(createHash("sha256").update(await readFile(partial)).digest("hex"), createHash("sha256").update(payload).digest("hex"));
    await rename(partial, final);
    assert.deepEqual(await readFile(final), payload);

    await writeFile(partial, payload.subarray(0, 100));
    const restart = decidePartialFileRecovery({ localBytes: 100, expectedBytes: payload.length, rangeSupported: false, storedValidator: etag, remoteValidator: etag, storedSha256: null, actualSha256: null });
    assert.equal(restart.decision, "restart");
    const restarted = await request(`http://127.0.0.1:${address.port}/no-range`);
    assert.equal(restarted.status, 200);
    await writeFile(partial, restarted.body);
    assert.deepEqual(await readFile(partial), payload);
  } finally {
    server.close();
    await rm(root, { recursive: true, force: true });
  }
});
