import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  type BrowserAuthenticationSession,
  type BrowserAuthenticationValidation,
  type BrowserContextProfileDescriptor,
  type BrowserHealth,
  type BrowserInstallationInfo,
  type BrowserPageSession,
  type BrowserRuntimePort,
  type BrowserSessionPolicy,
  type BrowserAuthenticationPolicy,
  type ProxyConnectivityPort,
  type SecretStorePort,
} from "@offline-web-archive/archive-core";
import { createApplicationService } from "@offline-web-archive/application-service";
import { CONTRACT_VERSION, createProjectCommand, type ResponseEnvelope } from "@offline-web-archive/contracts";
import { createInMemorySecretStore } from "@offline-web-archive/secrets";
import { createSqliteProjectStorage } from "@offline-web-archive/persistence-sqlite";

const PROFILE: BrowserContextProfileDescriptor = {
  version: 1,
  profileId: "owa-context-profile-1",
  locale: "en-US",
  timezoneId: "UTC",
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  acceptLanguage: "en-US,en;q=0.9",
  userAgentPolicy: "fixed",
  headless: true,
  digest: "context-profile-digest-v1",
};

const STORAGE_STATE = new TextEncoder().encode(JSON.stringify({
  cookies: [{ name: "auth", value: "opaque-auth-value", domain: "127.0.0.1", path: "/" }],
  origins: [{ origin: "http://127.0.0.1:43121", localStorage: [{ name: "auth-state", value: "signed-in" }], indexedDB: [] }],
}));

class FakeAuthenticationSession implements BrowserAuthenticationSession {
  private closed = false;

  public constructor(
    public readonly sessionId: string,
    public readonly mode: "manual" | "restored",
    private readonly validation: BrowserAuthenticationValidation,
  ) {}

  public getContextProfile(): BrowserContextProfileDescriptor {
    return { ...PROFILE, headless: this.mode === "restored" };
  }

  public getCurrentUrlSafe(): string {
    return this.closed ? "about:blank" : this.validation.finalUrlSafe;
  }

  public async captureStorageState(): Promise<Uint8Array> {
    if (this.closed) throw new Error("closed");
    return new Uint8Array(STORAGE_STATE);
  }

  public async validate(): Promise<BrowserAuthenticationValidation> {
    if (this.closed) throw new Error("closed");
    return this.validation;
  }

  public async close(): Promise<void> {
    this.closed = true;
  }
}

class FakeBrowserRuntime implements BrowserRuntimePort {
  public manualStatus: BrowserAuthenticationValidation["status"] = "valid";
  public restoredStatus: BrowserAuthenticationValidation["status"] = "valid";
  public manualOpenCount = 0;
  public restoreCount = 0;
  public lastManualProxyServer: string | null = null;
  public lastRestoredProxyServer: string | null = null;

  public getContextProfile(): BrowserContextProfileDescriptor {
    return PROFILE;
  }

  private validation(status: BrowserAuthenticationValidation["status"]): BrowserAuthenticationValidation {
    return {
      status,
      finalUrlSafe: status === "valid" ? "http://127.0.0.1:43121/account" : "http://127.0.0.1:43121/login",
      statusCode: status === "valid" ? 200 : status === "expired" ? 401 : status === "unavailable" ? null : 403,
      markerMatched: status === "valid",
      reasonCode: `FAKE_${status.toUpperCase()}`,
    };
  }

  public async openManualLoginSession(sessionId: string, policy: BrowserAuthenticationPolicy): Promise<BrowserAuthenticationSession> {
    this.manualOpenCount += 1;
    this.lastManualProxyServer = policy.proxy?.server ?? null;
    return new FakeAuthenticationSession(sessionId, "manual", this.validation(this.manualStatus));
  }

  public async restoreAuthenticationSession(sessionId: string, _storageState: Uint8Array, policy: BrowserAuthenticationPolicy): Promise<BrowserAuthenticationSession> {
    this.restoreCount += 1;
    this.lastRestoredProxyServer = policy.proxy?.server ?? null;
    return new FakeAuthenticationSession(sessionId, "restored", this.validation(this.restoredStatus));
  }

  public async getRuntimeInfo(): Promise<BrowserInstallationInfo> {
    return { installed: true, valid: true, provider: "playwright-core", playwrightVersion: "test", chromiumVersion: "test", browserRevision: "test", executableSha256: "a".repeat(64), resourceRootKind: "repository-owned", systemBrowserFallback: false, launchDownloadAllowed: false, sandboxEnabled: true, reasonCode: null };
  }

  public async validateInstallation(): Promise<BrowserInstallationInfo> { return this.getRuntimeInfo(); }

  public async getHealth(): Promise<BrowserHealth> {
    return { state: "ready", connected: true, activeJobId: null, restartCountInWindow: 0, startedAt: null, lastCrashAt: null, browserVersion: "test" };
  }

  public async start(): Promise<BrowserHealth> { return this.getHealth(); }
  public async restart(): Promise<BrowserHealth> { return this.getHealth(); }
  public async createPageSession(_jobId: string, _policy: BrowserSessionPolicy): Promise<BrowserPageSession> { throw new Error("not used"); }
  public async close(): Promise<void> {}
}

function persistentMemoryStore(projectId: string, now: () => string): SecretStorePort {
  const inner = createInMemorySecretStore({ projectId, now });
  return new Proxy(inner, {
    get(target, property) {
      if (property === "lock" || property === "dispose") return async (): Promise<void> => undefined;
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as SecretStorePort;
}

let commandSequence = 0;
function send(service: ReturnType<typeof createApplicationService>, commandType: Parameters<typeof createProjectCommand>[0], payload: Record<string, unknown>): Promise<ResponseEnvelope> {
  commandSequence += 1;
  const timestamp = `2026-08-07T12:00:${String(commandSequence % 60).padStart(2, "0")}.000Z`;
  return service.execute(createProjectCommand(commandType, payload, { commandId: `session-test-command-${commandSequence}`, correlationId: `session-test-correlation-${commandSequence}`, timestamp }), { transport: "cli", authorized: true });
}

test("manual Session lifecycle persists only safe metadata and restores after service restart", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "owa-session-") );
  const projectPath = path.join(root, "project");
  const runtime = new FakeBrowserRuntime();
  const stores = new Map<string, SecretStorePort>();
  const now = () => "2026-08-07T12:00:00.000Z";
  const createService = () => createApplicationService({
    configuration: { applicationName: "Offline Web Archive Builder", applicationVersion: "0.8.0", contractVersion: CONTRACT_VERSION, logLevel: "error" },
    runtime: { name: "Node.js", version: "24.0.0" },
    platform: { operatingSystem: "macos", architecture: "arm64" },
    browserRuntime: runtime,
    now,
    secretStoreFactory: ({ projectId }) => {
      const existing = stores.get(projectId);
      if (existing !== undefined) return existing;
      const created = persistentMemoryStore(projectId, now);
      stores.set(projectId, created);
      return created;
    },
  });
  const service = createService();
  try {
    const created = await send(service, "project.create", { destinationPath: projectPath, name: "Session Project", slug: "session-project" });
    assert.equal(created.status, "success");
    const profile = await send(service, "profile.create", { projectPath, name: "Session Profile", seedUrl: "http://127.0.0.1:43121/" });
    assert.equal(profile.status, "success");

    const opened = await send(service, "session.open", { projectPath, loginUrl: "http://127.0.0.1:43121/login", validationUrl: "http://127.0.0.1:43121/account", allowedOrigins: ["http://127.0.0.1:43121"] });
    assert.equal(opened.status, "success");
    assert.equal(opened.result.resultType, "session.metadata");
    const sessionId = opened.result.resultType === "session.metadata" ? opened.result.session.sessionId : "";
    assert.equal(opened.result.resultType === "session.metadata" && opened.result.session.state, "login_browser_open");

    const saved = await send(service, "session.save", { projectPath, sessionId, confirmation: "SAVE-SESSION" });
    assert.equal(saved.status, "success");
    assert.equal(saved.result.resultType, "session.metadata");
    if (saved.status === "success" && saved.result.resultType === "session.metadata") {
      assert.equal(saved.result.session.state, "valid");
      assert.equal("secretRef" in saved.result.session, false);
    }
    assert.equal(JSON.stringify(saved).includes("opaque-auth-value"), false);

    const listed = await send(service, "session.list", { projectPath });
    assert.equal(listed.status, "success");
    assert.equal(listed.result.resultType, "session.list");
    if (listed.status === "success" && listed.result.resultType === "session.list") assert.equal(listed.result.sessions.length, 1);

    const database = new DatabaseSync(path.join(projectPath, "database", "crawl.db"), { readOnly: true });
    const durable = database.prepare("SELECT lifecycle_state, secret_ref FROM browser_sessions WHERE session_id = ?").get(sessionId) as { lifecycle_state: string; secret_ref: string | null } | undefined;
    assert.equal(durable?.lifecycle_state, "valid");
    assert.notEqual(durable?.secret_ref, null);
    database.close();

    await service.close();
    const restarted = createService();
    const restored = await send(restarted, "session.restore", { projectPath, sessionId });
    assert.equal(restored.status, "success");
    assert.equal(restored.result.resultType, "session.metadata");
    if (restored.status === "success" && restored.result.resultType === "session.metadata") assert.equal(restored.result.session.validationResult, "valid");
    assert.equal(runtime.restoreCount, 1);

    runtime.manualStatus = "expired";
    const reauth = await send(restarted, "session.reauthenticate", { projectPath, sessionId, loginUrl: "http://127.0.0.1:43121/login", validationUrl: "http://127.0.0.1:43121/account", allowedOrigins: ["http://127.0.0.1:43121"] });
    assert.equal(reauth.status, "success");
    const rejectedSave = await send(restarted, "session.save", { projectPath, sessionId, confirmation: "SAVE-SESSION" });
    assert.equal(rejectedSave.status, "success");
    if (rejectedSave.status === "success" && rejectedSave.result.resultType === "session.metadata") assert.equal(rejectedSave.result.session.state, "valid");

    runtime.manualStatus = "valid";
    const reauthAgain = await send(restarted, "session.reauthenticate", { projectPath, sessionId, loginUrl: "http://127.0.0.1:43121/login", validationUrl: "http://127.0.0.1:43121/account", allowedOrigins: ["http://127.0.0.1:43121"] });
    assert.equal(reauthAgain.status, "success");
    const replaced = await send(restarted, "session.save", { projectPath, sessionId, confirmation: "SAVE-SESSION" });
    assert.equal(replaced.status, "success");

    const deleted = await send(restarted, "session.delete", { projectPath, sessionId, confirmation: "DELETE-SESSION" });
    const deletedAgain = await send(restarted, "session.delete", { projectPath, sessionId, confirmation: "DELETE-SESSION" });
    assert.equal(deleted.status, "success");
    assert.equal(deletedAgain.status, "success");
    await restarted.close();
  } finally {
    await service.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("Session URLs reject credential-bearing and unapproved origins at the contract boundary", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "owa-session-contract-") );
  const service = createApplicationService({
    configuration: { applicationName: "Offline Web Archive Builder", applicationVersion: "0.8.0", contractVersion: CONTRACT_VERSION, logLevel: "error" },
    runtime: { name: "Node.js", version: "24.0.0" },
    platform: { operatingSystem: "macos", architecture: "arm64" },
    browserRuntime: new FakeBrowserRuntime(),
    now: () => "2026-08-07T12:00:00.000Z",
  });
  try {
    const response = await service.execute({ contractVersion: CONTRACT_VERSION, commandId: "bad-session", commandType: "session.open", correlationId: "bad-session-correlation", timestamp: "2026-08-07T12:00:00.000Z", payload: { projectPath: path.join(root, "project"), loginUrl: "https://user:password@example.test/login", validationUrl: "https://example.test/account", allowedOrigins: ["https://example.test"] } }, { transport: "cli", authorized: true });
    assert.equal(response.status, "error");
    if (response.status === "error") assert.equal(response.error.code, "CONTRACT_INVALID_PAYLOAD");
  } finally {
    await service.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("authenticated Session Proxy Affinity is explicit, preserved, and fail-closed", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "owa-session-proxy-affinity-"));
  const projectPath = path.join(root, "project");
  const runtime = new FakeBrowserRuntime();
  const stores = new Map<string, SecretStorePort>();
  const now = () => "2026-08-15T12:00:00.000Z";
  const proxyConnectivity: ProxyConnectivityPort = {
    async testProxy(input) {
      return { proxyId: input.proxy.id, protocol: input.proxy.protocol, status: "success", checkedAt: now(), latencyMs: 10, targetUrlSafe: input.targetUrl, targetEndpointId: "target", ipCheckStatus: "unavailable", observedIp: null, errorCode: null, errorSummary: null };
    },
  };
  const service = createApplicationService({
    configuration: { applicationName: "Offline Web Archive Builder", applicationVersion: "0.8.0", contractVersion: CONTRACT_VERSION, logLevel: "error", proxyPool: { mode: "single-proxy", failOpenToDirect: false, healthCheckBeforeRun: true, cooldownAfterFailures: 3, stickyAuthenticatedSessions: true, allowAuthenticatedMultiProxy: false, defaultPerProxyWorkerConcurrency: 1 } },
    runtime: { name: "Node.js", version: "24.0.0" },
    platform: { operatingSystem: "windows", architecture: "x64" },
    browserRuntime: runtime,
    proxyConnectivity,
    now,
    secretStoreFactory: ({ projectId }) => {
      const existing = stores.get(projectId);
      if (existing !== undefined) return existing;
      const created = persistentMemoryStore(projectId, now);
      stores.set(projectId, created);
      return created;
    },
  });
  try {
    assert.equal((await send(service, "project.create", { destinationPath: projectPath, name: "Affinity Project", slug: "affinity-project" })).status, "success");
    assert.equal((await send(service, "profile.create", { projectPath, name: "Affinity Profile", seedUrl: "http://127.0.0.1:43121/" })).status, "success");
    assert.equal((await send(service, "proxy.create", { projectPath, proxy: { id: "affined", protocol: "http", host: "127.0.0.1", port: 8123 } })).status, "success");
    const health = await send(service, "proxy.test", { projectPath, proxyId: "affined", targetUrl: "http://127.0.0.1:43121/health" });
    assert.equal(health.status, "success");
    const opened = await send(service, "session.open", { projectPath, loginUrl: "http://127.0.0.1:43121/login", validationUrl: "http://127.0.0.1:43121/account", allowedOrigins: ["http://127.0.0.1:43121"], proxyId: "affined" });
    assert.equal(opened.status, "success");
    assert.equal(runtime.lastManualProxyServer, "http://127.0.0.1:8123");
    const sessionId = opened.status === "success" && opened.result.resultType === "session.metadata" ? opened.result.session.sessionId : "";
    const activeAffinityChange = await send(service, "session.setProxyAffinity", { projectPath, sessionId, proxyId: null });
    assert.equal(activeAffinityChange.status, "error");
    if (activeAffinityChange.status === "error") assert.equal(activeAffinityChange.error.code, "SESSION_STATE_CONFLICT");
    const saved = await send(service, "session.save", { projectPath, sessionId, confirmation: "SAVE-SESSION" });
    assert.equal(saved.status, "success");
    const disabled = await send(service, "proxy.disable", { projectPath, proxyId: "affined", expectedRevision: 2 });
    assert.equal(disabled.status, "success");
    const blockedRestore = await send(service, "session.restore", { projectPath, sessionId });
    assert.equal(blockedRestore.status, "error");
    if (blockedRestore.status === "error") assert.equal(blockedRestore.error.code, "PROXY_DISABLED");
    const explicitChange = await send(service, "session.setProxyAffinity", { projectPath, sessionId, proxyId: null });
    assert.equal(explicitChange.status, "success");
    if (explicitChange.status === "success" && explicitChange.result.resultType === "session.metadata") {
      assert.equal(explicitChange.result.session.state, "reauth_required");
      assert.equal(explicitChange.result.session.requiresReauthentication, true);
      assert.equal(explicitChange.result.session.affinity.proxyId, null);
    }
    assert.equal(runtime.lastRestoredProxyServer, null);
  } finally {
    await service.close();
    await rm(root, { recursive: true, force: true });
  }
});
