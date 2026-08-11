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

async function waitForBlockedRegistration(page: BrowserPageSession, timeoutMs = 5_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let html = "";
  while (Date.now() < deadline) {
    html = await page.extractHtml();
    if (html.includes('data-state="blocked"') || page.getEvidence().consoleEntries.some((entry) => /service worker registration blocked by playwright/i.test(entry.textSafe))) return html;
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
      const blockedHtml = await waitForBlockedRegistration(blocked);
      const blockedEvidence = blocked.getEvidence();
      assert.ok(
        blockedHtml.includes('data-state="blocked"') || blockedEvidence.consoleEntries.some((entry) => /service worker registration blocked by playwright/i.test(entry.textSafe)),
        "blocked policy should expose a browser-level registration block",
      );
      assert.equal(fixture.requestCount("/sw-probe"), 0, "blocked Service Workers must not control fixture fetches");
    } finally {
      await blocked.close();
    }

    const allowed = await runtime.createPageSession("service-worker-allowed", policy(fixture.origin, "allow"));
    try {
      await allowed.navigate(fixture.url("service-worker"), 5_000);
      assert.match(await waitForState(allowed, "allowed"), /data-state="allowed"/);
      assert.ok(fixture.requestCount("/service-worker.js") >= 1, "allow policy should register the fixture worker");
      assert.equal(fixture.requestCount("/sw-probe"), 0, "allow policy should let the worker intercept the probe before network dispatch");
    } finally {
      await allowed.close();
    }
  } finally {
    await runtime.close();
    await fixture.close();
  }
});
