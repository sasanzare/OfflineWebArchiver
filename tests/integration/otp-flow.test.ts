import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  parseElementLocator,
  parseLoginFlow,
  type BrowserAuthenticationPolicy,
  type BrowserAuthenticationSession,
  type BrowserAuthenticationValidation,
  type BrowserContextProfileDescriptor,
  type BrowserHealth,
  type BrowserInstallationInfo,
  type BrowserLocatorResolution,
  type BrowserPageSession,
  type BrowserRuntimePort,
  type BrowserSessionPolicy,
  type ElementPickerController,
  type ElementPickerSelection,
  type ElementLocator,
  type LoginCondition,
  type OtpBrowserInteraction,
  type SecretStorePort,
} from "@offline-web-archive/archive-core";
import { createApplicationService } from "@offline-web-archive/application-service";
import { CONTRACT_VERSION, createProjectCommand, type ResponseEnvelope } from "@offline-web-archive/contracts";
import { createInMemorySecretStore } from "@offline-web-archive/secrets";

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

const flow = parseLoginFlow({
  version: 1,
  profileId: "00000000-0000-4000-8000-000000000010",
  loginUrl: "http://127.0.0.1:43121/login",
  phoneNumberLocator: { version: 1, strategy: "css", selector: "#phone" },
  countryCodeLocator: null,
  requestOtpLocator: { version: 1, strategy: "css", selector: "#request" },
  otp: { mode: "single", locator: { version: 1, strategy: "css", selector: "#otp" } },
  otpSubmitLocator: { version: 1, strategy: "css", selector: "#submit" },
  successCondition: { kind: "locator", locator: { version: 1, strategy: "css", selector: "#success" } },
  incorrectCodeCondition: { kind: "locator", locator: { version: 1, strategy: "css", selector: "#invalid" } },
  expiredCodeCondition: { kind: "locator", locator: { version: 1, strategy: "css", selector: "#expired" } },
  resendControl: { version: 1, strategy: "css", selector: "#resend" },
  resendCooldownMs: 0,
  otpTimeoutMs: 30_000,
});

class FakePicker implements ElementPickerController {
  public started = false;
  public async start(): Promise<void> { this.started = true; }
  public async select(kind: ElementPickerSelection["kind"]): Promise<ElementPickerSelection> {
    return { version: 1, kind, locator: parseElementLocator({ version: 1, strategy: "css", selector: "#picked" }) };
  }
  public async stop(): Promise<void> { this.started = false; }
}

class FakeOtpInteraction implements OtpBrowserInteraction {
  public closed = false;
  public success = false;
  public invalid = false;
  public readonly picker = new FakePicker();
  private readonly fields = new Map<string, string>();

  public async navigate(): Promise<void> {}
  public async resolve(): Promise<BrowserLocatorResolution> { return { count: 1, visible: true, enabled: true }; }
  public async fill(target: ElementLocator, value: string): Promise<void> { this.fields.set(JSON.stringify(target), value); }
  public async click(target: ElementLocator): Promise<void> {
    if (JSON.stringify(target).includes("#submit")) {
      this.success = this.fields.get(JSON.stringify(parseElementLocator({ version: 1, strategy: "css", selector: "#otp" }))) === "2468";
      this.invalid = !this.success;
    }
  }
  public async clear(target: ElementLocator): Promise<void> { this.fields.delete(JSON.stringify(target)); }
  public async checkCondition(condition: LoginCondition): Promise<boolean> {
    if (condition.kind !== "locator" || condition.locator.strategy !== "css") return false;
    if (condition.locator.selector === "#success") return this.success;
    if (condition.locator.selector === "#invalid") return this.invalid;
    return false;
  }
  public getCurrentUrlSafe(): string { return "http://127.0.0.1:43121/login"; }
  public isClosed(): boolean { return this.closed; }
}

const STORAGE_STATE = new TextEncoder().encode(JSON.stringify({ cookies: [], origins: [] }));

class FakeAuthenticationSession implements BrowserAuthenticationSession {
  private closed = false;
  public readonly interaction = new FakeOtpInteraction();

  public constructor(public readonly sessionId: string, public readonly mode: "manual" | "restored") {}
  public getContextProfile(): BrowserContextProfileDescriptor { return { ...PROFILE, headless: this.mode === "restored" }; }
  public getCurrentUrlSafe(): string { return this.closed ? "about:blank" : "http://127.0.0.1:43121/login"; }
  public async captureStorageState(): Promise<Uint8Array> { return new Uint8Array(STORAGE_STATE); }
  public async validate(): Promise<BrowserAuthenticationValidation> {
    return { status: "valid", finalUrlSafe: "http://127.0.0.1:43121/account", statusCode: 200, markerMatched: true, reasonCode: "FAKE_VALID" };
  }
  public getAuthenticationInteraction(): OtpBrowserInteraction { return this.interaction; }
  public async close(): Promise<void> { this.closed = true; this.interaction.closed = true; }
}

class FakeBrowserRuntime implements BrowserRuntimePort {
  public lastSession: FakeAuthenticationSession | null = null;
  public getContextProfile(): BrowserContextProfileDescriptor { return PROFILE; }
  public async openManualLoginSession(sessionId: string, _policy: BrowserAuthenticationPolicy): Promise<BrowserAuthenticationSession> {
    this.lastSession = new FakeAuthenticationSession(sessionId, "manual");
    return this.lastSession;
  }
  public async restoreAuthenticationSession(sessionId: string, _state: Uint8Array, _policy: BrowserAuthenticationPolicy): Promise<BrowserAuthenticationSession> { return new FakeAuthenticationSession(sessionId, "restored"); }
  public async getRuntimeInfo(): Promise<BrowserInstallationInfo> { return { installed: true, valid: true, provider: "playwright-core", playwrightVersion: "test", chromiumVersion: "test", browserRevision: "test", executableSha256: "a".repeat(64), resourceRootKind: "repository-owned", systemBrowserFallback: false, launchDownloadAllowed: false, sandboxEnabled: true, reasonCode: null }; }
  public async validateInstallation(): Promise<BrowserInstallationInfo> { return this.getRuntimeInfo(); }
  public async getHealth(): Promise<BrowserHealth> { return { state: "ready", connected: true, activeJobId: null, restartCountInWindow: 0, startedAt: null, lastCrashAt: null, browserVersion: "test" }; }
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

let sequence = 0;
function send(service: ReturnType<typeof createApplicationService>, commandType: Parameters<typeof createProjectCommand>[0], payload: Record<string, unknown>): Promise<ResponseEnvelope> {
  sequence += 1;
  const second = String(sequence % 60).padStart(2, "0");
  return service.execute(createProjectCommand(commandType, payload, { commandId: `otp-command-${sequence}`, correlationId: `otp-correlation-${sequence}`, timestamp: `2026-08-12T00:00:${second}.000Z` }), { transport: "cli", authorized: true });
}

test("OTP commands use the existing Session and resume the same Crawl Run without persisting sensitive inputs", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "owa-otp-"));
  const projectPath = path.join(root, "project");
  const runtime = new FakeBrowserRuntime();
  const stores = new Map<string, SecretStorePort>();
  const logs: unknown[] = [];
  const now = () => "2026-08-12T00:00:00.000Z";
  const service = createApplicationService({
    configuration: { applicationName: "Offline Web Archive Builder", applicationVersion: "0.8.0", contractVersion: CONTRACT_VERSION, logLevel: "error" },
    runtime: { name: "Node.js", version: "24.0.0" },
    platform: { operatingSystem: "windows", architecture: "x64" },
    browserRuntime: runtime,
    now,
    logger: { log: (event) => logs.push(event) },
    secretStoreFactory: ({ projectId }) => {
      const existing = stores.get(projectId);
      if (existing !== undefined) return existing;
      const created = persistentMemoryStore(projectId, now);
      stores.set(projectId, created);
      return created;
    },
  });
  try {
    const createdProject = await send(service, "project.create", { destinationPath: projectPath, name: "OTP Project", slug: "otp-project" });
    assert.equal(createdProject.status, "success");
    if (createdProject.status !== "success" || createdProject.result.resultType !== "project.summary") throw new Error("project creation failed");
    const runId = createdProject.result.project.runId;
    const createdProfile = await send(service, "profile.create", { projectPath, name: "OTP Profile", seedUrl: "http://127.0.0.1:43121/" });
    assert.equal(createdProfile.status, "success");
    assert.equal(createdProfile.result.resultType, "profile.value");
    if (createdProfile.status !== "success" || createdProfile.result.resultType !== "profile.value") throw new Error("profile creation failed");
    const { schemaVersion: _schemaVersion, engineVersion: _engineVersion, profileId: _profileId, projectId: _projectId, revisionId: _revisionId, sequence: _sequence, createdAt: _createdAt, updatedAt: _updatedAt, ...draft } = createdProfile.result.profile;
    const updatedProfile = await send(service, "profile.update", { projectPath, expectedRevisionId: createdProfile.result.profile.revisionId, draft: { ...draft, loginFlow: { ...flow, profileId: createdProfile.result.profile.profileId } } });
    assert.equal(updatedProfile.status, "success");

    const opened = await send(service, "session.open", { projectPath, loginUrl: "http://127.0.0.1:43121/login", validationUrl: "http://127.0.0.1:43121/account", allowedOrigins: ["http://127.0.0.1:43121"] });
    assert.equal(opened.status, "success");
    if (opened.status !== "success" || opened.result.resultType !== "session.metadata") throw new Error("session open failed");
    const sessionId = opened.result.session.sessionId;

    const picked = await send(service, "elementPicker.select", { projectPath, sessionId, kind: "phone-input" });
    assert.equal(picked.status, "success");
    assert.equal(picked.result.resultType, "elementPicker.result");
    if (picked.status === "success" && picked.result.resultType === "elementPicker.result") assert.equal(picked.result.selection?.kind, "phone-input");

    const before = await send(service, "run.getControlState", { projectPath, runId });
    assert.equal(before.status, "success");
    if (before.status !== "success" || before.result.resultType !== "run.control") throw new Error("run state read failed");
    assert.equal(before.result.run.runState, "running");

    const started = await send(service, "otp.start", { projectPath, sessionId, runId, phoneNumber: "447700900123", countryCode: "+44", operationId: "otp-start" });
    assert.equal(started.status, "success");
    if (started.status !== "success" || started.result.resultType !== "otp.flow") throw new Error("OTP start failed");
    assert.equal(started.result.flow.state, "waiting_for_otp");
    assert.equal(started.result.run?.runState, "waiting_for_auth");
    assert.equal(JSON.stringify(started).includes("447700900123"), false);

    const wrong = await send(service, "otp.provide", { projectPath, sessionId, otp: "0000", operationId: "otp-wrong" });
    assert.equal(wrong.status, "error");
    if (wrong.status === "error") assert.equal(wrong.error.code, "OTP_INVALID");
    const completed = await send(service, "otp.provide", { projectPath, sessionId, otp: "2468", operationId: "otp-provide" });
    assert.equal(completed.status, "success");
    if (completed.status !== "success" || completed.result.resultType !== "otp.flow") throw new Error("OTP completion failed");
    assert.equal(completed.result.flow.state, "authenticated");
    assert.equal(completed.result.run?.runId, runId);
    assert.equal(completed.result.run?.runState, "running");
    assert.equal(JSON.stringify(completed).includes("2468"), false);

    const session = await send(service, "session.get", { projectPath, sessionId });
    assert.equal(session.status, "success");
    if (session.status === "success" && session.result.resultType === "session.metadata") assert.equal(session.result.session.state, "valid");
    assert.equal(JSON.stringify(logs).includes("447700900123"), false);
    assert.equal(JSON.stringify(logs).includes("2468"), false);
    assert.equal(JSON.stringify(logs).includes("0000"), false);
  } finally {
    await service.close();
    await rm(root, { recursive: true, force: true });
  }
});
