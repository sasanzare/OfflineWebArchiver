import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createProxyMetadata, RenderOperationError } from "@offline-web-archive/archive-core";
import { CONTEXT_PROFILE, createPlaywrightBrowserRuntime, PLAYWRIGHT_VERSION } from "@offline-web-archive/browser-runtime";
import { startHttpProxyFixture, startProxyFixtureTarget, startSocks5ProxyFixture } from "../support/proxy-fixtures.js";
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

test("Browser Runtime sends connectivity checks through HTTP, HTTPS, and SOCKS5 proxies", async () => {
  const target = await startProxyFixtureTarget();
  const httpProxy = await startHttpProxyFixture();
  const httpsProxy = await startHttpProxyFixture({ secure: true });
  const socksProxy = await startSocks5ProxyFixture();
  const runtime = createPlaywrightBrowserRuntime({ browserRoot: path.resolve(".runtime", "browsers"), testOnlyAllowInsecureProxyCertificates: true });
  try {
    if (runtime.testProxy === undefined) throw new Error("Browser Runtime does not expose Proxy connectivity testing");
    for (const [index, fixture] of [httpProxy, httpsProxy, socksProxy].entries()) {
      const parsed = new URL(fixture.server);
      const proxy = createProxyMetadata({ id: `proxy-${index}`, protocol: fixture.protocol, host: parsed.hostname, port: Number(parsed.port), now: "2026-08-15T12:00:00.000Z" });
      const result = await runtime.testProxy({ proxy, targetUrl: target.url("/health"), ipCheckUrl: target.url("/ip"), timeoutMs: 5_000 });
      assert.equal(result.status, "success", `${fixture.protocol} proxy: ${result.errorCode ?? "unknown failure"}`);
      assert.equal(result.ipCheckStatus, "verified");
      assert.equal(result.observedIp, "203.0.113.42");
      assert.ok(fixture.requestCount() >= 2, `${fixture.protocol} proxy did not carry both target requests`);
    }
    const deadProxy = await startHttpProxyFixture();
    const deadAddress = new URL(deadProxy.server);
    await deadProxy.close();
    const beforeDeadCheck = target.requestCount();
    const deadResult = await runtime.testProxy({
      proxy: createProxyMetadata({ id: "proxy-dead", protocol: "http", host: deadAddress.hostname, port: Number(deadAddress.port), now: "2026-08-15T12:00:00.000Z" }),
      targetUrl: target.url("/dead-proxy"),
      timeoutMs: 1_000,
    });
    assert.equal(deadResult.status, "failure");
    assert.equal(target.requestCount(), beforeDeadCheck);
    assert.ok(target.requestCount() >= 6);
  } finally {
    await runtime.close();
    await socksProxy.close();
    await httpsProxy.close();
    await httpProxy.close();
    await target.close();
  }
});
