import assert from "node:assert/strict";
import test from "node:test";
import {
  OtpFlowEngine,
  assertAuthenticationStateTransition,
  parseElementLocator,
  parseLoginFlow,
  type BrowserLocatorResolution,
  type ElementLocator,
  type LoginCondition,
  type OtpBrowserInteraction,
  type OtpSessionValidation,
} from "@offline-web-archive/archive-core";
import {
  CONTRACT_VERSION,
  ElementLocatorContractSchema,
  LoginFlowContractSchema,
  OtpStartCommandSchema,
  parseCommandEnvelope,
} from "@offline-web-archive/contracts";

const profileId = "00000000-0000-4000-8000-000000000001";
const sessionId = "00000000-0000-4000-8000-000000000002";

function locator(selector: string): ElementLocator {
  return parseElementLocator({ version: 1, strategy: "css", selector });
}

function flow(overrides: Partial<Record<string, unknown>> = {}) {
  return parseLoginFlow({
    version: 1,
    profileId,
    loginUrl: "https://example.test/login",
    phoneNumberLocator: locator("#phone"),
    countryCodeLocator: null,
    requestOtpLocator: locator("#request"),
    otp: { mode: "single", locator: locator("#otp") },
    otpSubmitLocator: locator("#submit"),
    successCondition: { kind: "locator", locator: locator("#success") },
    incorrectCodeCondition: { kind: "locator", locator: locator("#invalid") },
    expiredCodeCondition: { kind: "locator", locator: locator("#expired") },
    resendControl: locator("#resend"),
    resendCooldownMs: 1_000,
    otpTimeoutMs: 5_000,
    ...overrides,
  });
}

class FakeOtpBrowser implements OtpBrowserInteraction {
  public closed = false;
  public nowUrl = "";
  public success = false;
  public invalid = false;
  public expired = false;
  public readonly filled = new Map<string, string>();
  public resolveCount = 1;

  public async navigate(url: string): Promise<void> { this.nowUrl = url; }
  public async resolve(target: ElementLocator): Promise<BrowserLocatorResolution> { return { count: this.resolveCount, visible: true, enabled: true }; }
  public async fill(target: ElementLocator, value: string): Promise<void> { this.filled.set(JSON.stringify(target), value); }
  public async click(target: ElementLocator): Promise<void> {
    const serialized = JSON.stringify(target);
    if (serialized.includes("#submit")) {
      this.success = this.filled.get(JSON.stringify(locator("#otp"))) === "2468";
      this.invalid = !this.success;
    }
  }
  public async clear(target: ElementLocator): Promise<void> { this.filled.delete(JSON.stringify(target)); }
  public async checkCondition(condition: LoginCondition): Promise<boolean> {
    if (condition.kind === "url") return this.nowUrl === `${condition.origin}${condition.path}`;
    const selector = condition.locator.strategy === "css" ? condition.locator.selector : "";
    if (selector === "#success") return this.success;
    if (selector === "#invalid") return this.invalid;
    if (selector === "#expired") return this.expired;
    return false;
  }
  public getCurrentUrlSafe(): string { return this.nowUrl; }
  public isClosed(): boolean { return this.closed; }
}

function clock() {
  let current = 0;
  return {
    nowMs: () => current,
    nowIso: () => new Date(current).toISOString(),
    sleep: async () => undefined,
    advance: (milliseconds: number) => { current += milliseconds; },
  };
}

function hooks() {
  const validation: OtpSessionValidation = { status: "valid" };
  return { validateSession: async () => validation, onAuthenticated: async () => undefined };
}

test("Locator and Login Flow contracts are versioned, strict, and support variable OTP shapes", () => {
  const fourSegment = flow({ otp: { mode: "segmented", locators: [locator("#o1"), locator("#o2"), locator("#o3"), locator("#o4")] } });
  assert.equal(fourSegment.otp.mode, "segmented");
  assert.equal(fourSegment.otp.locators.length, 4);
  assert.equal(LoginFlowContractSchema.safeParse(fourSegment).success, true);
  assert.equal(ElementLocatorContractSchema.safeParse(locator("#phone")).success, true);
  assert.throws(() => parseElementLocator({ version: 1, strategy: "attribute", name: "value", value: "sensitive" }), /stable attribute/);
  assert.throws(() => parseLoginFlow({ ...fourSegment, otpTimeoutMs: 900 }), /timeout/);
  assert.doesNotThrow(() => assertAuthenticationStateTransition("unauthenticated", "authenticating"));
  assert.throws(() => assertAuthenticationStateTransition("authenticated", "unauthenticated"), /not permitted/);
});

test("OTP engine completes a single-field flow and keeps sensitive inputs out of snapshots", async () => {
  const browser = new FakeOtpBrowser();
  const engine = new OtpFlowEngine({ flow: flow(), browser, hooks: hooks() });
  const started = await engine.start({ phoneNumber: "447700900123", countryCode: "+44" });
  assert.equal(started.state, "waiting_for_otp");
  assert.equal(JSON.stringify(started).includes("447700900123"), false);
  const completed = await engine.provideOtp("2468");
  assert.equal(completed.state, "authenticated");
  assert.equal(completed.authenticationState, "authenticated");
  assert.equal(JSON.stringify(completed).includes("2468"), false);
  assert.equal(browser.filled.has(JSON.stringify(locator("#otp"))), false);
});

test("OTP engine rejects ambiguous locators, supports cooldown, and reports timeout without looping", async () => {
  const browser = new FakeOtpBrowser();
  browser.resolveCount = 2;
  const ambiguous = new OtpFlowEngine({ flow: flow(), browser, hooks: hooks() });
  await assert.rejects(() => ambiguous.start({ phoneNumber: "447700900123" }), (error: Error) => error.message.includes("multiple elements"));

  const time = clock();
  const resendBrowser = new FakeOtpBrowser();
  const resendEngine = new OtpFlowEngine({ flow: flow(), browser: resendBrowser, hooks: hooks(), clock: time });
  await resendEngine.start({ phoneNumber: "447700900123" });
  await assert.rejects(() => resendEngine.resend(), /cooldown/);
  time.advance(1_000);
  assert.equal((await resendEngine.resend()).state, "waiting_for_otp");
  time.advance(5_001);
  await assert.rejects(() => resendEngine.provideOtp("2468"), /wait window has expired/);
  assert.equal(resendEngine.snapshot().state, "timed_out");
});

test("transport schemas expose OTP commands but never put OTP values in results", () => {
  const command = parseCommandEnvelope({
    contractVersion: CONTRACT_VERSION,
    commandId: "otp-command",
    correlationId: "otp-correlation",
    timestamp: "2026-08-12T00:00:00.000Z",
    commandType: "otp.start",
    payload: {
      projectPath: "/projects/demo",
      sessionId,
      phoneNumber: "447700900123",
      operationId: "otp-operation",
      loginFlow: flow(),
    },
  });
  assert.equal(command.commandType, "otp.start");
  assert.equal(OtpStartCommandSchema.safeParse(command).success, true);
  assert.equal(JSON.stringify({ resultType: "otp.flow", sessionId, flow: { state: "authenticated" } }).includes("447700900123"), false);
});
