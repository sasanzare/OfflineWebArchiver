import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import type { BrowserPageSession, BrowserSessionPolicy, ServiceWorkerPolicyMode } from "@offline-web-archive/archive-core";
import { createPlaywrightBrowserRuntime } from "@offline-web-archive/browser-runtime";
import { startRenderFixtureServer } from "../support/render-fixture-server.js";

async function waitForState(page: BrowserPageSession, state: string, timeoutMs = 5_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let html = "";
  while (Date.now() < deadline) {
    html = await page.extractHtml();
    if (html.includes(`data-state="${state}"`)) return html;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return html;
}

function policy(fixtureOrigin: string, mode: ServiceWorkerPolicyMode): BrowserSessionPolicy {
  return {
    testMode: true,
    allowedFixtureOrigins: [fixtureOrigin],
    maxEvidenceEntries: 20,
    serviceWorkerPolicy: { version: 1, mode },
    async authorizeUrl(url: string) {
      return {
        allowed: new URL(url).origin === fixtureOrigin,
        reasonCode: "TEST_FIXTURE",
        safeUrl: url,
        resolvedAddresses: ["127.0.0.1"],
      };
    },
  };
}

test("Service Worker policy blocks by default and allows only explicit registration", async () => {
  const fixture = await startRenderFixtureServer();
  const runtime = createPlaywrightBrowserRuntime({ browserRoot: path.resolve(".runtime", "browsers") });
  try {
    const blocked = await runtime.createPageSession("service-worker-blocked", policy(fixture.origin, "block"));
    try {
      await blocked.navigate(fixture.url("service-worker"), 5_000);
      assert.match(await waitForState(blocked, "blocked"), /data-state="blocked"/);
    } finally {
      await blocked.close();
    }

    const allowed = await runtime.createPageSession("service-worker-allowed", policy(fixture.origin, "allow"));
    try {
      await allowed.navigate(fixture.url("service-worker"), 5_000);
      assert.match(await waitForState(allowed, "allowed"), /data-state="allowed"/);
    } finally {
      await allowed.close();
    }
  } finally {
    await runtime.close();
    await fixture.close();
  }
});
