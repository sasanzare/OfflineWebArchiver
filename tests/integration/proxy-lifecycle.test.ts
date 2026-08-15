import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  type ProxyConnectivityPort,
  type ProxyConnectivityResult,
} from "@offline-web-archive/archive-core";
import { createApplicationService } from "@offline-web-archive/application-service";
import { CONTRACT_VERSION, createProjectCommand, type ResponseEnvelope } from "@offline-web-archive/contracts";
import { createSqliteProjectStorage } from "@offline-web-archive/persistence-sqlite";
import { createInMemorySecretStore } from "@offline-web-archive/secrets";
import { fixedClock } from "@offline-web-archive/test-support";

const NOW = "2026-08-15T12:00:00.000Z";
const RAW_USERNAME = "proxy-user-sentinel";
const RAW_PASSWORD = "proxy-password-sentinel";

function connectivityFixture(): ProxyConnectivityPort {
  let failuresRemaining = 0;
  return {
    async testProxy(input): Promise<ProxyConnectivityResult> {
      if (failuresRemaining > 0) {
        failuresRemaining -= 1;
        return { proxyId: input.proxy.id, protocol: input.proxy.protocol, status: "failure", checkedAt: NOW, latencyMs: null, targetUrlSafe: input.targetUrl, targetEndpointId: "target", ipCheckStatus: "unavailable", observedIp: null, errorCode: "PROXY_UNREACHABLE", errorSummary: `failed ${RAW_PASSWORD}` };
      }
      return { proxyId: input.proxy.id, protocol: input.proxy.protocol, status: "success", checkedAt: NOW, latencyMs: 25, targetUrlSafe: input.targetUrl, targetEndpointId: "target", ipCheckStatus: "verified", observedIp: "203.0.113.10", errorCode: null, errorSummary: null };
    },
    setFailures(count: number): void { failuresRemaining = count; },
  } as ProxyConnectivityPort & { setFailures(count: number): void };
}

function serviceCommand(sequence: number, commandType: Parameters<typeof createProjectCommand>[0], payload: unknown): ReturnType<typeof createProjectCommand> {
  return createProjectCommand(commandType, payload, { commandId: `proxy-command-${sequence}`, correlationId: `proxy-correlation-${sequence}`, timestamp: NOW });
}

async function execute(service: ReturnType<typeof createApplicationService>, sequence: number, commandType: Parameters<typeof createProjectCommand>[0], payload: unknown): Promise<ResponseEnvelope> {
  return service.execute(serviceCommand(sequence, commandType, payload), { transport: "cli", authorized: true });
}

test("Proxy CRUD, Secret Store references, health, eligibility, import, and persistence are fail-closed", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "owa-proxy-") );
  const projectPath = path.join(root, "project");
  const connectivity = connectivityFixture() as ProxyConnectivityPort & { setFailures(count: number): void };
  const stores: ReturnType<typeof createInMemorySecretStore>[] = [];
  const storage = createSqliteProjectStorage({ applicationVersion: "0.8.0", now: fixedClock(NOW) });
  const service = createApplicationService({
    configuration: { applicationName: "Offline Web Archive Builder", applicationVersion: "0.8.0", contractVersion: CONTRACT_VERSION, logLevel: "info", proxyPool: { mode: "single-proxy", failOpenToDirect: false, healthCheckBeforeRun: true, cooldownAfterFailures: 3, stickyAuthenticatedSessions: true, allowAuthenticatedMultiProxy: false, defaultPerProxyWorkerConcurrency: 1 } },
    runtime: { name: "Node.js", version: "24.17.0" },
    platform: { operatingSystem: "windows", architecture: "x64" },
    projectStorage: storage,
    proxyConnectivity: connectivity,
    now: fixedClock(NOW),
    secretStoreFactory: ({ projectId, now }) => {
      const store = createInMemorySecretStore({ projectId, now });
      stores.push(store);
      return store;
    },
  });
  try {
    const createdProject = await execute(service, 1, "project.create", { destinationPath: projectPath, name: "Proxy Lifecycle", slug: "proxy-lifecycle" });
    assert.equal(createdProject.status, "success");
    const created = await execute(service, 2, "proxy.create", { projectPath, proxy: { id: "primary", label: "Primary", protocol: "http", host: "127.0.0.1", port: 8123 }, credential: { username: RAW_USERNAME, password: RAW_PASSWORD } });
    assert.equal(created.status, "success", created.status === "error" ? JSON.stringify(created.error) : JSON.stringify(created.result));
    assert.equal(created.result && created.result.resultType, "proxy.metadata");
    if (created.status !== "success" || created.result.resultType !== "proxy.metadata") return;
    assert.notEqual(created.result.proxy.credentialRef, null);
    assert.equal(JSON.stringify(created).includes(RAW_PASSWORD), false);
    const databaseBytes = await readFile(path.join(projectPath, "database", "crawl.db"));
    assert.equal(databaseBytes.toString("utf8").includes(RAW_PASSWORD), false);

    await stores[0]!.unlock({ passphrase: new TextEncoder().encode("test") });
    const tested = await execute(service, 3, "proxy.test", { projectPath, proxyId: "primary", targetUrl: "https://example.com/", timeoutMs: 5_000, ipCheckUrl: "https://example.com/ip" });
    assert.equal(tested.status, "success", tested.status === "error" ? JSON.stringify(tested.error) : JSON.stringify(tested.result));
    if (tested.status === "success" && tested.result.resultType === "proxy.test") {
      assert.equal(tested.result.result.status, "success");
      assert.equal(tested.result.proxy.healthState, "healthy");
      assert.equal(JSON.stringify(tested).includes(RAW_PASSWORD), false);
    }
    const eligible = await execute(service, 4, "proxy.eligibility", { projectPath, proxyId: "primary" });
    assert.equal(eligible.status, "success");
    if (eligible.status === "success" && eligible.result.resultType === "proxy.eligibility") assert.equal(eligible.result.eligibility.eligible, true);

    const updated = await execute(service, 5, "proxy.update", { projectPath, proxyId: "primary", expectedRevision: 2, proxy: { label: "Primary Updated", protocol: "http", host: "127.0.0.1", port: 8123 } });
    assert.equal(updated.status, "success");
    if (updated.status === "success" && updated.result.resultType === "proxy.metadata") {
      assert.equal(updated.result.proxy.label, "Primary Updated");
      assert.notEqual(updated.result.proxy.credentialRef, null);
    }

    await stores[0]!.unlock({ passphrase: new TextEncoder().encode("test") });
    const imported = await execute(service, 6, "proxy.import", { projectPath, format: "json", operationId: "proxy-import-1", content: JSON.stringify({ version: 1, proxies: [{ id: "secondary", protocol: "socks5", host: "proxy.example.test", port: 1080, username: RAW_USERNAME, password: RAW_PASSWORD }, { id: "invalid", protocol: "ftp", host: "proxy.example.test", port: 80 }] }) });
    assert.equal(imported.status, "success");
    if (imported.status === "success" && imported.result.resultType === "proxy.import") {
      assert.equal(imported.result.summary.imported, 1);
      assert.equal(imported.result.summary.failed >= 1, true);
      assert.equal(JSON.stringify(imported).includes(RAW_PASSWORD), false);
    }

    const disabled = await execute(service, 7, "proxy.disable", { projectPath, proxyId: "primary", expectedRevision: 3 });
    assert.equal(disabled.status, "success");
    const blocked = await execute(service, 8, "proxy.test", { projectPath, proxyId: "primary", targetUrl: "https://example.com/", timeoutMs: 5_000 });
    assert.equal(blocked.status, "error");
    if (blocked.status === "error") assert.equal(blocked.error.code, "PROXY_DISABLED");
    const listed = await execute(service, 9, "proxy.list", { projectPath });
    assert.equal(listed.status, "success");
    if (listed.status === "success" && listed.result.resultType === "proxy.list") assert.equal(listed.result.proxies.length, 2);
  } finally {
    await service.close();
    await rm(root, { recursive: true, force: true });
  }
});
