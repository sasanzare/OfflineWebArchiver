import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { RenderOperationError } from "@offline-web-archive/archive-core";
import { CONTEXT_PROFILE, createPlaywrightBrowserRuntime, PLAYWRIGHT_VERSION } from "@offline-web-archive/browser-runtime";
import { startRenderFixtureServer } from "../support/render-fixture-server.js";

test("repository-owned Chromium has a deterministic one-Job lifecycle and explicit restart", async () => {
  const fixture = await startRenderFixtureServer();
  const runtime = createPlaywrightBrowserRuntime({ browserRoot: path.resolve(".runtime", "browsers"), maximumPagesPerProcess: 2, maximumLifetimeMs: 60_000 });
  const policy = {
    testMode: true,
    allowedFixtureOrigins: [fixture.origin],
    maxEvidenceEntries: 10,
    async authorizeUrl(url: string) { return { allowed: new URL(url).origin === fixture.origin, reasonCode: "TEST_FIXTURE", safeUrl: url, resolvedAddresses: ["127.0.0.1"] }; },
  };
  try {
    const installation = await runtime.validateInstallation();
    assert.equal(installation.valid, true);
    assert.equal(installation.playwrightVersion, PLAYWRIGHT_VERSION);
    assert.equal(installation.systemBrowserFallback, false);
    assert.equal(installation.launchDownloadAllowed, false);
    assert.equal(installation.sandboxEnabled, true);
    assert.deepEqual(CONTEXT_PROFILE.viewport, { width: 1280, height: 720 });

    const started = await runtime.start();
    assert.equal(started.state, "ready");
    assert.equal(started.connected, true);
    const page = await runtime.createPageSession("job-browser-1", policy);
    const navigation = await page.navigate(fixture.url("javascript"), 2_000);
    assert.equal(navigation.statusCode, 200);
    await assert.rejects(runtime.createPageSession("job-browser-2", policy), (error: unknown) => error instanceof RenderOperationError && error.code === "BROWSER_BUSY");
    await assert.rejects(runtime.restart(), (error: unknown) => error instanceof RenderOperationError && error.code === "BROWSER_BUSY");
    await page.close();

    const blockedRedirect = await runtime.createPageSession("job-browser-redirect-block", policy);
    let redirectError: unknown;
    try { await blockedRedirect.navigate(fixture.url("redirect-private"), 2_000); } catch (error) { redirectError = error; }
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.ok(redirectError instanceof RenderOperationError && ["RUNTIME_NETWORK_BLOCKED", "NAVIGATION_TIMEOUT"].includes(redirectError.code));
    assert.ok(blockedRedirect.getEvidence().blockedRequests >= 1);
    await blockedRedirect.close();

    const next = await runtime.createPageSession("job-browser-2", policy);
    await next.navigate(fixture.url("static"), 2_000);
    assert.match(await next.extractHtml(), /Static render ready/);
    await next.close();

    const restarted = await runtime.restart();
    assert.equal(restarted.state, "ready");
    assert.equal(restarted.restartCountInWindow, 2);
  } finally {
    await runtime.close();
    await fixture.close();
  }
  const closed = await runtime.getHealth();
  assert.equal(closed.state, "stopped");
  assert.equal(closed.connected, false);
});

test("Browser Runtime blocks non-GET requests before network dispatch", async () => {
  const fixture = await startRenderFixtureServer();
  const runtime = createPlaywrightBrowserRuntime({ browserRoot: path.resolve(".runtime", "browsers") });
  const policy = {
    testMode: true,
    allowedFixtureOrigins: [fixture.origin],
    maxEvidenceEntries: 10,
    async authorizeUrl(url: string) { return { allowed: new URL(url).origin === fixture.origin, reasonCode: "TEST_FIXTURE", safeUrl: url, resolvedAddresses: ["127.0.0.1"] }; },
  };
  try {
    const page = await runtime.createPageSession("job-browser-method", policy);
    await page.navigate(fixture.url("method"), 2_000);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const html = await page.extractHtml();
    assert.match(html, /POST must be blocked/);
    assert.equal(page.getEvidence().blockedRequests, 1);
    await page.close();
  } finally {
    await runtime.close();
    await fixture.close();
  }
});

test("Browser Runtime dismisses dialogs, closes popups, cancels downloads, and denies permissions", async () => {
  const fixture = await startRenderFixtureServer();
  const runtime = createPlaywrightBrowserRuntime({ browserRoot: path.resolve(".runtime", "browsers") });
  const policy = {
    testMode: true,
    allowedFixtureOrigins: [fixture.origin],
    maxEvidenceEntries: 10,
    async authorizeUrl(url: string) { return { allowed: new URL(url).origin === fixture.origin, reasonCode: "TEST_FIXTURE", safeUrl: url, resolvedAddresses: ["127.0.0.1"] }; },
  };
  try {
    const page = await runtime.createPageSession("job-browser-controls", policy);
    await page.navigate(fixture.url("controls"), 2_000);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const html = await page.extractHtml();
    assert.match(html, /data-dialog="dismissed"/);
    assert.match(html, /data-popup="requested"/);
    assert.match(html, /data-download="requested"/);
    assert.match(html, /data-permission="denied"/);
    await page.close();
  } finally {
    await runtime.close();
    await fixture.close();
  }
});

test("Browser Runtime applies one global evidence cap", async () => {
  const fixture = await startRenderFixtureServer();
  const runtime = createPlaywrightBrowserRuntime({ browserRoot: path.resolve(".runtime", "browsers") });
  const policy = {
    testMode: true,
    allowedFixtureOrigins: [fixture.origin],
    maxEvidenceEntries: 5,
    async authorizeUrl(url: string) { return { allowed: new URL(url).origin === fixture.origin, reasonCode: "TEST_FIXTURE", safeUrl: url, resolvedAddresses: ["127.0.0.1"] }; },
  };
  try {
    const page = await runtime.createPageSession("job-browser-evidence-cap", policy);
    await page.navigate(fixture.url("evidence-cap"), 2_000);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const evidence = page.getEvidence();
    assert.equal(evidence.consoleEntries.length + evidence.pageErrors.length + evidence.failedRequests.length + evidence.redirects.length, 5);
    assert.equal(evidence.evidenceTruncated, true);
    await page.close();
  } finally {
    await runtime.close();
    await fixture.close();
  }
});
