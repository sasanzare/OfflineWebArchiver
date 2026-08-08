import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import type { BrowserAuthenticationPolicy } from "@offline-web-archive/archive-core";
import { RenderOperationError } from "@offline-web-archive/archive-core";
import { createPlaywrightBrowserRuntime } from "@offline-web-archive/browser-runtime";
import { startRenderFixtureServer } from "../support/render-fixture-server.js";

test("real Chromium saves and restores an isolated manual Authentication Session", async () => {
  const fixture = await startRenderFixtureServer();
  const runtime = createPlaywrightBrowserRuntime({ browserRoot: path.resolve(".runtime", "browsers") });
  const policy: BrowserAuthenticationPolicy = {
    initialUrl: fixture.url("auth-login"),
    allowedOrigins: [fixture.origin],
    async authorizeUrl(url) {
      return {
        allowed: new URL(url).origin === fixture.origin,
        reasonCode: "TEST_AUTH_FIXTURE",
        safeUrl: url,
        resolvedAddresses: ["127.0.0.1"],
      };
    },
    validation: {
      validationUrl: fixture.url("auth-account"),
      expectedOrigin: fixture.origin,
      expectedPath: "/auth-account",
      markerSelector: "#authenticated",
      markerText: "Signed in fixture",
    },
    navigationTimeoutMs: 5_000,
    testMode: true,
  };
  let savedState: Uint8Array | null = null;
  try {
    const manual = await runtime.openManualLoginSession("browser-session-fixture", policy);
    assert.equal(manual.mode, "manual");
    assert.equal(manual.getContextProfile().headless, false);
    assert.equal(manual.getCurrentUrlSafe(), fixture.url("auth-login"));
    const manualValidation = await manual.validate();
    assert.equal(manualValidation.status, "valid");
    assert.equal(manualValidation.markerMatched, true);

    savedState = await manual.captureStorageState();
    const parsed = JSON.parse(Buffer.from(savedState).toString("utf8")) as {
      cookies: Array<{ name: string }>;
      origins: Array<{ localStorage: Array<{ name: string }>; indexedDB?: unknown }>;
    };
    assert.ok(parsed.cookies.some((cookie) => cookie.name === "owa_auth"));
    assert.ok(parsed.origins.some((origin) => origin.localStorage.some((entry) => entry.name === "auth-state")));
    assert.ok(parsed.origins.some((origin) => Array.isArray(origin.indexedDB)));
    await manual.close();

    const restored = await runtime.restoreAuthenticationSession("browser-session-fixture", savedState, policy);
    assert.equal(restored.mode, "restored");
    assert.equal(restored.getContextProfile().headless, true);
    const restoredValidation = await restored.validate();
    assert.equal(restoredValidation.status, "valid");
    assert.equal(restoredValidation.markerMatched, true);
    await restored.close();

    await assert.rejects(
      runtime.restoreAuthenticationSession("browser-session-corrupt", new TextEncoder().encode("{\"cookies\":[]}"), policy),
      (error: unknown) => error instanceof RenderOperationError && error.code === "BROWSER_STORAGE_STATE_INVALID",
    );
  } finally {
    savedState?.fill(0);
    await runtime.close();
    await fixture.close();
  }
});
