import assert from "node:assert/strict";
import test from "node:test";
import {
  RenderOperationError,
  type BrowserEvidenceSnapshot,
  type BrowserPageSession,
  type NavigationObservation,
  type PageStabilitySnapshot,
  type RenderPolicy,
} from "@offline-web-archive/archive-core";
import { createRenderEngine, DEFAULT_RENDER_POLICY } from "@offline-web-archive/rendering";

const navigation: NavigationObservation = {
  requestedUrlSafe: "https://example.invalid/",
  finalUrlSafe: "https://example.invalid/",
  statusCode: 200,
  contentType: "text/html",
  redirectCount: 0,
  startedAt: "2026-08-01T12:00:00.000Z",
  completedAt: "2026-08-01T12:00:00.100Z",
  durationMs: 100,
};

function pageFixture(options: { html?: string; title?: string; body?: { textLength: number; elementCount: number }; snapshots?: PageStabilitySnapshot[]; navigationDelayMs?: number; screenshotBytes?: number } = {}): BrowserPageSession {
  let snapshotIndex = 0;
  const snapshots = options.snapshots ?? [{ mutationCount: 1, lastMutationAtMs: Date.now() - 1_000, selectorMatched: true, activeRequests: 0, lastNetworkActivityAtMs: Date.now() - 1_000 }];
  const evidence: BrowserEvidenceSnapshot = { consoleEntries: [], pageErrors: [], failedRequests: [], redirects: [], blockedRequests: 0, evidenceTruncated: false };
  return {
    jobId: "job-render-unit",
    async navigate() { if (options.navigationDelayMs !== undefined) await new Promise((resolve) => setTimeout(resolve, options.navigationDelayMs)); return navigation; },
    async initializeStabilityObserver() {},
    async readStabilitySnapshot() { return snapshots[Math.min(snapshotIndex++, snapshots.length - 1)]!; },
    async scrollForFixture() {},
    async extractHtml() { return options.html ?? "<!doctype html><title>Ready</title><main>ready</main>"; },
    async getTitle() { return options.title ?? "Ready"; },
    async inspectBody() { return options.body ?? { textLength: 5, elementCount: 1 }; },
    async captureScreenshot() { return options.screenshotBytes === undefined ? new Uint8Array([137, 80, 78, 71]) : new Uint8Array(options.screenshotBytes); },
    getEvidence() { return evidence; },
    isCrashed() { return false; },
    async close() {},
  };
}

function policy(overrides: Partial<RenderPolicy> = {}): RenderPolicy {
  return { ...DEFAULT_RENDER_POLICY, navigationTimeoutMs: 500, stabilityTimeoutMs: 500, renderTimeoutMs: 2_000, domQuietMs: 50, networkQuietMs: 50, pollIntervalMs: 10, ...overrides };
}

test("Render Engine requires combined DOM and Network quiet and keeps screenshots opt-in", async () => {
  const stages: string[] = [];
  const output = await createRenderEngine().render({
    jobId: "job-render-unit",
    requestedUrl: "https://example.invalid/",
    page: pageFixture({ snapshots: [
      { mutationCount: 1, lastMutationAtMs: Date.now() - 1_000, selectorMatched: true, activeRequests: 1, lastNetworkActivityAtMs: Date.now() },
      { mutationCount: 1, lastMutationAtMs: Date.now() - 1_000, selectorMatched: true, activeRequests: 0, lastNetworkActivityAtMs: Date.now() - 1_000 },
    ] }),
    policy: policy(),
    signal: new AbortController().signal,
    now: () => "2026-08-01T12:00:01.000Z",
    onStage: async (stage) => { stages.push(stage); },
    heartbeat: async () => {},
    shouldPause: async () => false,
  });
  assert.equal(output.screenshot, null);
  assert.equal(output.qualityClassification, "complete");
  assert.deepEqual(stages, ["navigating", "waiting-for-stability", "extracting-html"]);
});

test("Render Engine captures an optional bounded screenshot", async () => {
  const output = await createRenderEngine().render({
    jobId: "job-render-screenshot", requestedUrl: "https://example.invalid/", page: pageFixture(), policy: policy({ captureScreenshot: true }),
    signal: new AbortController().signal, now: () => "2026-08-01T12:00:01.000Z", onStage: async () => {}, heartbeat: async () => {}, shouldPause: async () => false,
  });
  assert.equal(output.screenshot?.byteLength, 4);
});

test("Render Engine classifies blank, unstable, and cancelled work explicitly", async () => {
  const engine = createRenderEngine();
  const run = (page: BrowserPageSession, signal = new AbortController().signal) => engine.render({
    jobId: "job-render-failure", requestedUrl: "https://example.invalid/", page, policy: policy({ stabilityTimeoutMs: 100 }), signal,
    now: () => "2026-08-01T12:00:01.000Z", onStage: async () => {}, heartbeat: async () => {}, shouldPause: async () => false,
  });
  await assert.rejects(run(pageFixture({ html: "<!doctype html><html><body></body></html>", title: "", body: { textLength: 0, elementCount: 0 } })), (error: unknown) => error instanceof RenderOperationError && error.code === "RENDER_BLANK_PAGE");
  await assert.rejects(run(pageFixture({ snapshots: [{ mutationCount: 10, lastMutationAtMs: Date.now(), selectorMatched: true, activeRequests: 1, lastNetworkActivityAtMs: Date.now() }] })), (error: unknown) => error instanceof RenderOperationError && error.code === "RENDER_STABILITY_TIMEOUT");
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(run(pageFixture(), controller.signal), (error: unknown) => error instanceof RenderOperationError && error.code === "RENDER_CANCELLED");
});

test("Render Engine enforces total, selector, HTML, and screenshot bounds", async () => {
  const engine = createRenderEngine();
  const run = (page: BrowserPageSession, renderPolicy: RenderPolicy) => engine.render({
    jobId: "job-render-bounds", requestedUrl: "https://example.invalid/", page, policy: renderPolicy,
    signal: new AbortController().signal, now: () => "2026-08-01T12:00:01.000Z", onStage: async () => {}, heartbeat: async () => {}, shouldPause: async () => false,
  });
  await assert.rejects(run(pageFixture({ navigationDelayMs: 550 }), policy({ navigationTimeoutMs: 500, stabilityTimeoutMs: 100, renderTimeoutMs: 500 })), (error: unknown) => error instanceof RenderOperationError && error.code === "RENDER_TIMEOUT");
  await assert.rejects(run(pageFixture(), policy({ completionSelector: "bad\nselector" })), (error: unknown) => error instanceof RenderOperationError && error.code === "RENDER_INPUT_INVALID");
  await assert.rejects(run(pageFixture({ html: "x".repeat(2_048) }), policy({ maxHtmlBytes: 1_024 })), (error: unknown) => error instanceof RenderOperationError && error.code === "RENDER_HTML_TOO_LARGE");
  await assert.rejects(run(pageFixture({ screenshotBytes: 2_048 }), policy({ captureScreenshot: true, maxScreenshotBytes: 1_024 })), (error: unknown) => error instanceof RenderOperationError && error.code === "RENDER_SCREENSHOT_TOO_LARGE");
});
