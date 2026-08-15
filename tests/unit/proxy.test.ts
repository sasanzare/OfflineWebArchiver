import assert from "node:assert/strict";
import test from "node:test";
import {
  ProxyOperationError,
  assertProxyAffinity,
  createProxyMetadata,
  createProxyRuntimeConfiguration,
  expireProxyCooldown,
  getProxyEligibility,
  normalizeProxyHost,
  parseSecretRef,
  parseProxyImport,
  recordProxyHealthCheck,
  selectEligibleProxy,
} from "@offline-web-archive/archive-core";

const CREATED_AT = "2026-08-15T12:00:00.000Z";
const SECRET_REF = "secret://v1/project/00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002";

function proxy() {
  return createProxyMetadata({ id: "edge-one", protocol: "http", host: "Proxy.Example.test.", port: 8080, now: CREATED_AT });
}

test("Proxy normalization canonicalizes safe hosts and keeps credentials out of metadata", () => {
  const metadata = proxy();
  assert.equal(normalizeProxyHost("[::1]"), "::1");
  assert.equal(metadata.host, "proxy.example.test");
  assert.equal(metadata.credentialRef, null);
  assert.equal(JSON.stringify(metadata).includes("password"), false);
  assert.throws(() => createProxyRuntimeConfiguration({ ...metadata, credentialRef: parseSecretRef(SECRET_REF).serialized }, null), (error) => error instanceof ProxyOperationError && error.code === "PROXY_SECRET_MISSING");
});

test("Proxy import parsing is deterministic and accepts ephemeral credentials only in memory", () => {
  const parsed = parseProxyImport({
    format: "csv",
    text: "id,protocol,host,port,username,password\nedge-one,http,proxy.example.test,8080,alice,ephemeral-pass\nedge-two,socks5,127.0.0.1,1080,,",
  });
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.records.length, 2);
  assert.deepEqual(parsed.records[0]?.credential, { username: "alice", password: "ephemeral-pass" });
  assert.equal(parsed.records[1]?.credential, null);
  const invalid = parseProxyImport({ format: "json", text: JSON.stringify([{ protocol: "ftp", host: "proxy.example.test", port: 80 }]) });
  assert.equal(invalid.records.length, 0);
  assert.equal(invalid.errors[0]?.code, "PROXY_PROTOCOL_UNSUPPORTED");
});

test("Proxy health transitions require a successful check and persist cooldown semantics", () => {
  let current = proxy();
  current = recordProxyHealthCheck(current, { status: "success", checkedAt: CREATED_AT, latencyMs: 40 }, CREATED_AT);
  assert.equal(current.healthState, "healthy");
  assert.equal(getProxyEligibility(current, CREATED_AT).eligible, true);
  const firstFailureAt = "2026-08-15T12:00:01.000Z";
  current = recordProxyHealthCheck(current, { status: "failure", checkedAt: firstFailureAt, errorCode: "PROXY_UNREACHABLE", errorSummary: "safe failure" }, firstFailureAt);
  current = recordProxyHealthCheck(current, { status: "failure", checkedAt: "2026-08-15T12:00:02.000Z", errorCode: "PROXY_UNREACHABLE" }, "2026-08-15T12:00:02.000Z");
  current = recordProxyHealthCheck(current, { status: "failure", checkedAt: "2026-08-15T12:00:03.000Z", errorCode: "PROXY_UNREACHABLE" }, "2026-08-15T12:00:03.000Z");
  assert.equal(current.healthState, "cooldown");
  assert.equal(getProxyEligibility(current, "2026-08-15T12:00:04.000Z").reasonCode, "PROXY_COOLDOWN");
  const expired = expireProxyCooldown(current, "2026-08-15T12:00:34.000Z");
  assert.equal(expired.healthState, "degraded");
  assert.equal(getProxyEligibility(expired, "2026-08-15T12:00:34.000Z").eligible, false);
});

test("Proxy affinity blocks silent direct fallback and alternate Proxy selection", () => {
  const selected = recordProxyHealthCheck(proxy(), { status: "success", checkedAt: CREATED_AT }, CREATED_AT);
  assert.throws(() => selectEligibleProxy({ mode: "direct", proxies: [selected], sessionProxyId: selected.id, now: CREATED_AT }), (error) => error instanceof ProxyOperationError && error.code === "PROXY_DIRECT_FALLBACK_BLOCKED");
  assert.throws(() => assertProxyAffinity(selected.id, "another-proxy"), (error) => error instanceof ProxyOperationError && error.code === "PROXY_AFFINITY_MISMATCH");
  assert.equal(selectEligibleProxy({ mode: "single-proxy", proxies: [selected], selectedProxyId: selected.id, now: CREATED_AT })?.id, selected.id);
});
