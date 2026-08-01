import {
  RenderOperationError,
  type RenderEngineInput,
  type RenderEngineOutput,
  type RenderEnginePort,
  type RenderFailure,
  type RenderOperationErrorCode,
  type RenderPolicy,
} from "@offline-web-archive/archive-core";

export const DEFAULT_RENDER_POLICY: Readonly<RenderPolicy> = Object.freeze({
  navigationTimeoutMs: 15_000,
  renderTimeoutMs: 30_000,
  stabilityTimeoutMs: 12_000,
  domQuietMs: 500,
  networkQuietMs: 500,
  pollIntervalMs: 50,
  captureScreenshot: false,
  fixtureScroll: false,
  maxHtmlBytes: 8 * 1024 * 1024,
  maxScreenshotBytes: 8 * 1024 * 1024,
  maxEvidenceEntries: 100,
});

export function validateRenderPolicy(policy: RenderPolicy): void {
  const integerBounds: Array<[number, number, number, string]> = [
    [policy.navigationTimeoutMs, 100, 120_000, "navigationTimeoutMs"],
    [policy.renderTimeoutMs, 500, 300_000, "renderTimeoutMs"],
    [policy.stabilityTimeoutMs, 100, 120_000, "stabilityTimeoutMs"],
    [policy.domQuietMs, 50, 10_000, "domQuietMs"],
    [policy.networkQuietMs, 50, 10_000, "networkQuietMs"],
    [policy.pollIntervalMs, 10, 1_000, "pollIntervalMs"],
    [policy.maxHtmlBytes, 1_024, 32 * 1024 * 1024, "maxHtmlBytes"],
    [policy.maxScreenshotBytes, 1_024, 16 * 1024 * 1024, "maxScreenshotBytes"],
    [policy.maxEvidenceEntries, 1, 100, "maxEvidenceEntries"],
  ];
  for (const [value, minimum, maximum, name] of integerBounds) {
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
      throw new RenderOperationError("RENDER_INPUT_INVALID", `${name} is outside the approved bounded policy`);
    }
  }
  if (policy.renderTimeoutMs < policy.navigationTimeoutMs || policy.renderTimeoutMs < policy.stabilityTimeoutMs) {
    throw new RenderOperationError("RENDER_INPUT_INVALID", "The total Render timeout must cover Navigation and Stability policy bounds");
  }
  if (policy.completionSelector !== undefined) {
    if (policy.completionSelector.length > 240 || /[\r\n\0]/.test(policy.completionSelector)) {
      throw new RenderOperationError("RENDER_INPUT_INVALID", "The completion selector is invalid or too large");
    }
  }
  if (policy.fixtureScroll && policy.completionSelector === undefined) {
    throw new RenderOperationError("RENDER_INPUT_INVALID", "Bounded fixture scrolling requires an explicit completion selector");
  }
}

export function classifyRenderFailure(error: unknown): {
  code: RenderOperationErrorCode;
  category: RenderFailure["failureCategory"];
  retryable: boolean;
  safeMessage: string;
} {
  const operation = error instanceof RenderOperationError
    ? error
    : new RenderOperationError("RENDER_EXTRACTION_FAILED", "The Render operation failed unexpectedly", true);
  const category: RenderFailure["failureCategory"] = operation.code.startsWith("BROWSER_") || operation.code === "PAGE_CRASHED"
    ? "browser"
    : operation.code.startsWith("NAVIGATION_") || operation.code === "REDIRECT_BLOCKED"
      ? "navigation"
      : operation.code === "RUNTIME_NETWORK_BLOCKED"
        ? "security"
        : operation.code.includes("STABILITY") || operation.code === "RENDER_BLANK_PAGE"
          ? "stability"
          : operation.code === "RENDER_CANCELLED"
            ? "cancellation"
            : operation.code.includes("COMMIT")
              ? "persistence"
              : "extraction";
  return { code: operation.code, category, retryable: operation.retryable, safeMessage: operation.message.slice(0, 800) };
}

function sleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new RenderOperationError("RENDER_CANCELLED", "The Render operation was cancelled"));
      return;
    }
    const onAbort = () => {
      clearTimeout(timeout);
      reject(new RenderOperationError("RENDER_CANCELLED", "The Render operation was cancelled"));
    };
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function createRenderEngine(): RenderEnginePort {
  return Object.freeze({
    async render(input: RenderEngineInput): Promise<RenderEngineOutput> {
      validateRenderPolicy(input.policy);
      const renderStarted = performance.now();
      const renderDeadline = renderStarted + input.policy.renderTimeoutMs;
      let lastHeartbeat = renderStarted;
      const guard = async (): Promise<void> => {
        if (input.signal.aborted) throw new RenderOperationError("RENDER_CANCELLED", "The Render operation was cancelled");
        if (performance.now() >= renderDeadline) throw new RenderOperationError("RENDER_TIMEOUT", "The total Render operation exceeded its configured timeout", true);
        if (await input.shouldPause()) throw new RenderOperationError("RENDER_CANCELLED", "The Run requested a cooperative pause");
        if (performance.now() - lastHeartbeat >= 15_000) {
          await input.heartbeat();
          lastHeartbeat = performance.now();
        }
      };

      await guard();
      await input.onStage("navigating", 0.2);
      const navigation = await input.page.navigate(input.requestedUrl, input.policy.navigationTimeoutMs);
      await guard();
      await input.onStage("waiting-for-stability", 0.4, { statusCode: navigation.statusCode, redirectCount: navigation.redirectCount });
      const stabilityStarted = performance.now();
      await input.page.initializeStabilityObserver(input.policy.completionSelector);
      if (input.policy.fixtureScroll) await input.page.scrollForFixture();
      const stabilityDeadline = Math.min(renderDeadline, stabilityStarted + input.policy.stabilityTimeoutMs);
      let stable = false;
      while (performance.now() < stabilityDeadline) {
        await guard();
        const snapshot = await input.page.readStabilitySnapshot(input.policy.completionSelector);
        const currentTime = Date.now();
        const domQuiet = currentTime - snapshot.lastMutationAtMs >= input.policy.domQuietMs;
        const networkQuiet = snapshot.activeRequests === 0 && currentTime - snapshot.lastNetworkActivityAtMs >= input.policy.networkQuietMs;
        if (snapshot.selectorMatched && domQuiet && networkQuiet) {
          stable = true;
          break;
        }
        await sleep(input.policy.pollIntervalMs, input.signal);
      }
      if (!stable) throw new RenderOperationError("RENDER_STABILITY_TIMEOUT", "The Page did not reach combined DOM and Network stability within the configured bound", true);
      const stabilityReachedAt = input.now();
      const stabilityDurationMs = Math.max(0, Math.round(performance.now() - stabilityStarted));
      await input.onStage("extracting-html", 0.7, { stabilityDurationMs });
      await guard();
      const html = await input.page.extractHtml();
      const htmlBytes = new TextEncoder().encode(html).byteLength;
      if (htmlBytes > input.policy.maxHtmlBytes) throw new RenderOperationError("RENDER_HTML_TOO_LARGE", "The rendered HTML exceeds the approved artifact limit");
      const body = await input.page.inspectBody();
      const titleSafe = await input.page.getTitle();
      if (body.textLength === 0 && body.elementCount < 2 && titleSafe === "") {
        throw new RenderOperationError("RENDER_BLANK_PAGE", "The Page reached stability but contained no meaningful rendered content");
      }
      const extractionCompletedAt = input.now();
      let screenshot: Uint8Array | null = null;
      if (input.policy.captureScreenshot) {
        await input.onStage("capturing-screenshot", 0.82);
        screenshot = await input.page.captureScreenshot();
        if (screenshot.byteLength > input.policy.maxScreenshotBytes) throw new RenderOperationError("RENDER_SCREENSHOT_TOO_LARGE", "The screenshot exceeds the approved artifact limit");
      }
      await guard();
      return {
        html,
        screenshot,
        navigation,
        titleSafe,
        qualityClassification: navigation.statusCode !== null && navigation.statusCode >= 400 ? "http-error" : "complete",
        stabilityReachedAt,
        extractionCompletedAt,
        stabilityDurationMs,
        totalDurationMs: Math.max(0, Math.round(performance.now() - renderStarted)),
        evidence: input.page.getEvidence(),
      };
    },
  });
}
