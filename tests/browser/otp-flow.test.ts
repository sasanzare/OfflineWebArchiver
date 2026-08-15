import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  OtpFlowEngine,
  parseLoginFlow,
  type BrowserAuthenticationPolicy,
  type OtpBrowserInteraction,
} from "@offline-web-archive/archive-core";
import { createPlaywrightBrowserRuntime } from "@offline-web-archive/browser-runtime";
import { startRenderFixtureServer } from "../support/render-fixture-server.js";

test("real Chromium executes a native single-field OTP flow and temporary Element Picker", async () => {
  const fixture = await startRenderFixtureServer();
  const runtime = createPlaywrightBrowserRuntime({ browserRoot: path.resolve(".runtime", "browsers") });
  const policy: BrowserAuthenticationPolicy = {
    initialUrl: fixture.url("otp-login"),
    allowedOrigins: [fixture.origin],
    async authorizeUrl(url) {
      return { allowed: new URL(url).origin === fixture.origin, reasonCode: "TEST_OTP_FIXTURE", safeUrl: url, resolvedAddresses: ["127.0.0.1"] };
    },
    validation: {
      validationUrl: fixture.url("otp-account"),
      expectedOrigin: fixture.origin,
      expectedPath: "/otp-account",
      markerSelector: "#authenticated",
      markerText: "OTP signed in fixture",
    },
    navigationTimeoutMs: 5_000,
    testMode: true,
  };
  try {
    const session = await runtime.openManualLoginSession("browser-otp-flow", policy);
    const browser = session.getAuthenticationInteraction?.();
    assert.ok(browser);
    const picker = browser.picker;
    assert.ok(picker);
    await picker.start();
    await assert.rejects(() => picker.select("phone-input", 1_000), (error: unknown) => error instanceof Error && /timed out/i.test(error.message));
    await picker.start();
    const selectionPromise = picker.select("phone-input", 5_000);
    await browser.click({ version: 1, strategy: "css", selector: "#phone" });
    const selection = await selectionPromise;
    assert.equal(selection.kind, "phone-input");
    assert.equal(selection.locator.version, 1);
    assert.equal(JSON.stringify(selection).includes("2468"), false);

    const flow = parseLoginFlow({
      version: 1,
      profileId: "00000000-0000-4000-8000-000000000010",
      loginUrl: fixture.url("otp-login"),
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
    const engine = new OtpFlowEngine({
      flow,
      browser: browser as OtpBrowserInteraction,
      hooks: {
        validateSession: async () => {
          const validation = await session.validate();
          return { status: validation.status };
        },
        onAuthenticated: async () => undefined,
      },
    });
    const started = await engine.start({ phoneNumber: "447700900123", countryCode: "+44" });
    assert.equal(started.state, "waiting_for_otp");
    const authenticated = await engine.provideOtp("2468");
    assert.equal(authenticated.state, "authenticated");
    assert.equal(authenticated.authenticationState, "authenticated");
    assert.equal(JSON.stringify(authenticated).includes("447700900123"), false);
    const validation = await session.validate();
    assert.equal(validation.status, "valid");
    await session.close();
  } finally {
    await runtime.close();
    await fixture.close();
  }
});
