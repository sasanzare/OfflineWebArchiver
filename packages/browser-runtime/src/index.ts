import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type CDPSession,
  type Page,
  type Request,
} from "playwright-core";
import {
  RenderOperationError,
  type BrowserEvidenceSnapshot,
  type BrowserHealth,
  type BrowserInstallationInfo,
  type BrowserPageSession,
  type BrowserRuntimePort,
  type BrowserSessionPolicy,
  type NavigationObservation,
  type PageStabilitySnapshot,
} from "@offline-web-archive/archive-core";

export const PLAYWRIGHT_VERSION = "1.56.1" as const;
export const BROWSER_MANIFEST_VERSION = 1 as const;
export const CONTEXT_PROFILE = Object.freeze({
  version: 1,
  locale: "en-US",
  timezoneId: "UTC",
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  colorScheme: "light" as const,
  reducedMotion: "reduce" as const,
  javaScriptEnabled: true,
  serviceWorkers: "block" as const,
  acceptDownloads: false,
  userAgent: "OfflineWebArchiveBuilder/0.8 PlaywrightChromium",
});

export interface BrowserResourceManifest {
  manifestVersion: 1;
  provider: "playwright-core";
  playwrightVersion: string;
  chromiumVersion: string;
  browserRevision: string;
  executablePath: string;
  executableSha256: string;
  installedAt: string;
  source: "official-playwright";
}

export interface PlaywrightBrowserRuntimeOptions {
  browserRoot: string;
  resourceRootKind?: "repository-owned" | "packaged-resource";
  now?: () => string;
  maximumPagesPerProcess?: number;
  maximumLifetimeMs?: number;
}

const MAX_EVIDENCE_ENTRIES = 100;
const RESTART_WINDOW_MS = 5 * 60_000;
const MAX_RESTARTS_PER_WINDOW = 3;

function sanitizeText(value: string, maximum = 800): string {
  return value
    .replace(/(authorization|cookie|password|token|secret)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, maximum);
}

function safeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.hash = "";
    if (url.search !== "") url.search = "?[redacted]";
    return url.toString().slice(0, 2_048);
  } catch {
    return "invalid-url";
  }
}

async function fileSha256(filePath: string): Promise<string> {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function isManifest(value: unknown): value is BrowserResourceManifest {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return row["manifestVersion"] === 1 &&
    row["provider"] === "playwright-core" &&
    row["playwrightVersion"] === PLAYWRIGHT_VERSION &&
    typeof row["chromiumVersion"] === "string" && row["chromiumVersion"].length > 0 &&
    typeof row["browserRevision"] === "string" && row["browserRevision"].length > 0 &&
    typeof row["executablePath"] === "string" && row["executablePath"].length > 0 &&
    typeof row["executableSha256"] === "string" && /^[a-f0-9]{64}$/.test(row["executableSha256"]) &&
    typeof row["installedAt"] === "string" &&
    row["source"] === "official-playwright";
}

class PlaywrightPageSession implements BrowserPageSession {
  private readonly activeRequests = new Set<Request>();
  private readonly consoleEntries: BrowserEvidenceSnapshot["consoleEntries"][number][] = [];
  private readonly pageErrors: BrowserEvidenceSnapshot["pageErrors"][number][] = [];
  private readonly failedRequests: BrowserEvidenceSnapshot["failedRequests"][number][] = [];
  private readonly redirects: BrowserEvidenceSnapshot["redirects"][number][] = [];
  private lastNetworkActivityAtMs = Date.now();
  private blockedRequests = 0;
  private navigationBlocked = false;
  private navigationAuthorizationPending = false;
  private evidenceTruncated = false;
  private evidenceCount = 0;
  private crashed = false;
  private readonly crashSignal: Promise<void>;
  private resolveCrash: () => void = () => undefined;
  private closed = false;
  private cdpSession: CDPSession | null = null;

  public constructor(
    public readonly jobId: string,
    private readonly context: BrowserContext,
    private readonly page: Page,
    private readonly policy: BrowserSessionPolicy,
    private readonly browserConnected: () => boolean,
    private readonly onClosed: () => void,
  ) {
    this.crashSignal = new Promise((resolve) => { this.resolveCrash = resolve; });
    page.on("crash", () => {
      this.crashed = true;
      this.resolveCrash();
    });
    page.on("console", (message) => {
      if (message.type() !== "error" && message.type() !== "warning") return;
      this.pushBounded(this.consoleEntries, {
        index: this.consoleEntries.length,
        type: message.type(),
        textSafe: sanitizeText(message.text()),
        locationSafe: message.location().url === "" ? null : safeUrl(message.location().url),
        occurredAt: new Date().toISOString(),
      });
    });
    page.on("pageerror", (error) => this.pushBounded(this.pageErrors, {
      index: this.pageErrors.length,
      messageSafe: sanitizeText(error.message),
      occurredAt: new Date().toISOString(),
    }));
    page.on("request", (request) => {
      if (!this.isLongLived(request)) this.activeRequests.add(request);
      this.lastNetworkActivityAtMs = Date.now();
    });
    page.on("requestfinished", (request) => {
      this.activeRequests.delete(request);
      this.lastNetworkActivityAtMs = Date.now();
    });
    page.on("requestfailed", (request) => {
      this.activeRequests.delete(request);
      this.lastNetworkActivityAtMs = Date.now();
      this.pushBounded(this.failedRequests, {
        index: this.failedRequests.length,
        urlSafe: safeUrl(request.url()),
        method: request.method() === "HEAD" ? "HEAD" : "GET",
        resourceType: request.resourceType().slice(0, 80),
        failureSafe: sanitizeText(request.failure()?.errorText ?? "request failed", 240),
        occurredAt: new Date().toISOString(),
      });
    });
    page.on("dialog", (dialog) => void dialog.dismiss().catch(() => undefined));
    page.on("download", (download) => void download.cancel().catch(() => undefined));
    page.on("popup", (popup) => void popup.close().catch(() => undefined));
  }

  private pushBounded<T>(target: T[], value: T): void {
    if (this.evidenceCount < Math.min(MAX_EVIDENCE_ENTRIES, this.policy.maxEvidenceEntries)) {
      target.push(value);
      this.evidenceCount += 1;
    } else this.evidenceTruncated = true;
  }

  private isLongLived(request: Request): boolean {
    return request.resourceType() === "websocket" || request.resourceType() === "eventsource";
  }

  private async pageOperation<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.browserConnected()) throw new RenderOperationError("BROWSER_CRASHED", "The Browser process disconnected during the active Page Job", true);
    if (this.crashed) throw new RenderOperationError("PAGE_CRASHED", "The browser Page crashed during the active Page Job", true);
    try {
      return await Promise.race([
        operation(),
        this.crashSignal.then(() => {
          throw new RenderOperationError("PAGE_CRASHED", "The browser Page crashed during the active Page Job", true);
        }),
      ]);
    } catch (error) {
      if (!this.browserConnected()) throw new RenderOperationError("BROWSER_CRASHED", "The Browser process disconnected during the active Page Job", true);
      if (this.crashed || (error instanceof Error && /page crashed|target page.*closed/i.test(error.message))) {
        throw new RenderOperationError("PAGE_CRASHED", "The browser Page crashed during the active Page Job", true);
      }
      throw error;
    }
  }

  public async installRouting(): Promise<void> {
    const session = await this.context.newCDPSession(this.page);
    this.cdpSession = session;
    session.on("Fetch.requestPaused", (event) => {
      const mainFrameNavigation = event.resourceType === "Document";
      void (async () => {
        const method = event.request.method;
        if (method !== "GET" && method !== "HEAD") {
          this.blockedRequests += 1;
          if (mainFrameNavigation) this.navigationBlocked = true;
          await session.send("Fetch.failRequest", { requestId: event.requestId, errorReason: "BlockedByClient" }).catch(() => undefined);
          return;
        }
        if (mainFrameNavigation) this.navigationAuthorizationPending = true;
        const decision = await this.policy.authorizeUrl(event.request.url).catch(() => ({ allowed: false }));
        const fixtureAllowed = this.policy.testMode && this.policy.allowedFixtureOrigins.some((origin) => {
          try { return new URL(event.request.url).origin === origin; } catch { return false; }
        });
        if (!decision.allowed && !fixtureAllowed) {
          this.blockedRequests += 1;
          if (mainFrameNavigation) {
            this.navigationBlocked = true;
            this.navigationAuthorizationPending = false;
          }
          await session.send("Fetch.failRequest", { requestId: event.requestId, errorReason: "BlockedByClient" }).catch(() => undefined);
          return;
        }
        if (mainFrameNavigation) this.navigationAuthorizationPending = false;
        await session.send("Fetch.continueRequest", { requestId: event.requestId }).catch(() => undefined);
      })().catch(async () => {
        if (mainFrameNavigation) this.navigationAuthorizationPending = false;
        await session.send("Fetch.failRequest", { requestId: event.requestId, errorReason: "BlockedByClient" }).catch(() => undefined);
      });
    });
    await session.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  }

  public async navigate(url: string, timeoutMs: number): Promise<NavigationObservation> {
    const blockedBeforeNavigation = this.blockedRequests;
    this.navigationBlocked = false;
    this.navigationAuthorizationPending = false;
    const initialDecision = await this.policy.authorizeUrl(url).catch(() => ({ allowed: false }));
    const initialFixtureAllowed = this.policy.testMode && this.policy.allowedFixtureOrigins.some((origin) => {
      try { return new URL(url).origin === origin; } catch { return false; }
    });
    if (!initialDecision.allowed && !initialFixtureAllowed) throw new RenderOperationError("RUNTIME_NETWORK_BLOCKED", "Runtime network authorization blocked navigation");
    const started = performance.now();
    const startedAt = new Date().toISOString();
    let response;
    try {
      response = await Promise.race([
        this.page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs }),
        this.crashSignal.then(() => {
          throw new RenderOperationError("PAGE_CRASHED", "The browser Page crashed during navigation", true);
        }),
      ]);
    } catch (error) {
      if (!this.browserConnected()) throw new RenderOperationError("BROWSER_CRASHED", "The Browser process disconnected during navigation", true);
      const message = error instanceof Error ? error.message : "Navigation failed";
      if (!this.crashed) await new Promise((resolve) => setTimeout(resolve, 100));
      if (!this.browserConnected()) throw new RenderOperationError("BROWSER_CRASHED", "The Browser process disconnected during navigation", true);
      if (this.crashed || /page crashed|target page.*closed/i.test(message)) throw new RenderOperationError("PAGE_CRASHED", "The browser page crashed during navigation", true);
      if (this.navigationBlocked || this.navigationAuthorizationPending || this.blockedRequests > blockedBeforeNavigation) throw new RenderOperationError("RUNTIME_NETWORK_BLOCKED", "Runtime network authorization blocked navigation");
      if (/timeout/i.test(message)) throw new RenderOperationError("NAVIGATION_TIMEOUT", "Navigation exceeded the configured timeout", true);
      if (/ERR_ABORTED|blockedbyclient/i.test(message)) throw new RenderOperationError("RUNTIME_NETWORK_BLOCKED", "Runtime network authorization blocked navigation");
      throw new RenderOperationError("NAVIGATION_FAILED", "Navigation failed before DOM content loaded", true);
    }
    let cursor = response?.request().redirectedFrom();
    const redirectRows: Array<{ from: string; to: string; status: number }> = [];
    while (cursor !== null && cursor !== undefined) {
      const redirectedTo = cursor.redirectedTo();
      const redirectResponse = await cursor.response();
      if (redirectedTo !== null) redirectRows.push({ from: cursor.url(), to: redirectedTo.url(), status: redirectResponse?.status() ?? 0 });
      cursor = cursor.redirectedFrom();
    }
    redirectRows.reverse().forEach((redirect) => this.pushBounded(this.redirects, {
      index: this.redirects.length,
      fromUrlSafe: safeUrl(redirect.from),
      toUrlSafe: safeUrl(redirect.to),
      status: redirect.status,
      occurredAt: new Date().toISOString(),
    }));
    const finalDecision = await this.policy.authorizeUrl(this.page.url());
    const fixtureAllowed = this.policy.testMode && this.policy.allowedFixtureOrigins.some((origin) => {
      try { return new URL(this.page.url()).origin === origin; } catch { return false; }
    });
    if (!finalDecision.allowed && !fixtureAllowed) throw new RenderOperationError("REDIRECT_BLOCKED", "The final navigation URL is outside the authorized runtime scope");
    const completedAt = new Date().toISOString();
    return {
      requestedUrlSafe: safeUrl(url),
      finalUrlSafe: safeUrl(this.page.url()),
      statusCode: response?.status() ?? null,
      contentType: (await response?.headerValue("content-type"))?.slice(0, 240) ?? null,
      redirectCount: this.redirects.length,
      startedAt,
      completedAt,
      durationMs: Math.max(0, Math.round(performance.now() - started)),
    };
  }

  public async initializeStabilityObserver(selector?: string): Promise<void> {
    await this.pageOperation(() => this.page.evaluate((completionSelector) => {
      const state = { mutationCount: 0, lastMutationAtMs: Date.now() };
      Object.defineProperty(window, "__owabStability", { value: state, configurable: true });
      const observer = new MutationObserver(() => {
        state.mutationCount += 1;
        state.lastMutationAtMs = Date.now();
      });
      observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
      if (completionSelector !== undefined) document.querySelector(completionSelector);
    }, selector));
  }

  public async readStabilitySnapshot(selector?: string): Promise<PageStabilitySnapshot> {
    const dom = await this.pageOperation(() => this.page.evaluate((completionSelector) => {
      const state = (window as unknown as { __owabStability?: { mutationCount: number; lastMutationAtMs: number } }).__owabStability;
      return {
        mutationCount: state?.mutationCount ?? 0,
        lastMutationAtMs: state?.lastMutationAtMs ?? Date.now(),
        selectorMatched: completionSelector === undefined || document.querySelector(completionSelector) !== null,
      };
    }, selector));
    return { ...dom, activeRequests: this.activeRequests.size, lastNetworkActivityAtMs: this.lastNetworkActivityAtMs };
  }

  public async scrollForFixture(): Promise<void> {
    if (!this.policy.testMode) throw new RenderOperationError("RENDER_INPUT_INVALID", "Fixture scrolling is available only in deterministic test mode");
    await this.pageOperation(() => this.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)));
  }

  public async extractHtml(): Promise<string> { return this.pageOperation(() => this.page.content()); }
  public async getTitle(): Promise<string> { return sanitizeText(await this.pageOperation(() => this.page.title()), 300); }
  public async inspectBody(): Promise<{ textLength: number; elementCount: number }> {
    return this.pageOperation(() => this.page.evaluate(() => ({ textLength: document.body?.innerText.trim().length ?? 0, elementCount: document.body?.querySelectorAll("*").length ?? 0 })));
  }
  public async captureScreenshot(): Promise<Uint8Array> { return this.pageOperation(() => this.page.screenshot({ type: "png", fullPage: false, animations: "disabled" })); }
  public getEvidence(): BrowserEvidenceSnapshot {
    return { consoleEntries: [...this.consoleEntries], pageErrors: [...this.pageErrors], failedRequests: [...this.failedRequests], redirects: [...this.redirects], blockedRequests: this.blockedRequests, evidenceTruncated: this.evidenceTruncated };
  }
  public isCrashed(): boolean { return this.crashed; }
  public async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.page.close({ runBeforeUnload: false }).catch(() => undefined);
    await this.cdpSession?.detach().catch(() => undefined);
    this.cdpSession = null;
    await this.context.close().catch(() => undefined);
    this.onClosed();
  }
}

export function createPlaywrightBrowserRuntime(options: PlaywrightBrowserRuntimeOptions): BrowserRuntimePort {
  const browserRoot = path.resolve(options.browserRoot);
  const manifestPath = path.join(browserRoot, "browser-manifest.json");
  const resourceRootKind = options.resourceRootKind ?? "repository-owned";
  const now = options.now ?? (() => new Date().toISOString());
  const maximumPages = options.maximumPagesPerProcess ?? 100;
  const maximumLifetimeMs = options.maximumLifetimeMs ?? 30 * 60_000;
  let browser: Browser | null = null;
  let state: BrowserHealth["state"] = "stopped";
  let activeJobId: string | null = null;
  let startedAt: string | null = null;
  let lastCrashAt: string | null = null;
  let pagesRendered = 0;
  const restartTimes: number[] = [];

  const readManifest = async (): Promise<{ manifest: BrowserResourceManifest; executablePath: string }> => {
    let value: unknown;
    try { value = JSON.parse(await readFile(manifestPath, "utf8")); }
    catch { throw new RenderOperationError("BROWSER_INSTALLATION_MISSING", "The repository-owned Chromium manifest is missing"); }
    if (!isManifest(value)) throw new RenderOperationError("BROWSER_INSTALLATION_INVALID", "The Chromium resource manifest is invalid or incompatible");
    const executablePath = path.resolve(browserRoot, value.executablePath);
    const relative = path.relative(browserRoot, executablePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new RenderOperationError("BROWSER_INSTALLATION_INVALID", "The Chromium executable escapes the approved resource root");
    let digest: string;
    try { digest = await fileSha256(executablePath); }
    catch { throw new RenderOperationError("BROWSER_INSTALLATION_MISSING", "The Chromium executable is missing from the approved resource root"); }
    if (digest !== value.executableSha256) throw new RenderOperationError("BROWSER_INSTALLATION_INVALID", "The Chromium executable checksum does not match its manifest");
    return { manifest: value, executablePath };
  };

  const installation = async (): Promise<BrowserInstallationInfo> => {
    try {
      const { manifest } = await readManifest();
      return { installed: true, valid: true, provider: "playwright-core", playwrightVersion: PLAYWRIGHT_VERSION, chromiumVersion: manifest.chromiumVersion, browserRevision: manifest.browserRevision, executableSha256: manifest.executableSha256, resourceRootKind, systemBrowserFallback: false, launchDownloadAllowed: false, sandboxEnabled: true, reasonCode: null };
    } catch (error) {
      const code = error instanceof RenderOperationError ? error.code : "BROWSER_INSTALLATION_INVALID";
      return { installed: code !== "BROWSER_INSTALLATION_MISSING", valid: false, provider: "playwright-core", playwrightVersion: PLAYWRIGHT_VERSION, chromiumVersion: null, browserRevision: null, executableSha256: null, resourceRootKind, systemBrowserFallback: false, launchDownloadAllowed: false, sandboxEnabled: true, reasonCode: code };
    }
  };

  const health = (): BrowserHealth => ({
    state,
    connected: browser?.isConnected() ?? false,
    activeJobId,
    restartCountInWindow: restartTimes.filter((value) => Date.now() - value <= RESTART_WINDOW_MS).length,
    startedAt,
    lastCrashAt,
    browserVersion: browser?.isConnected() === true ? browser.version() : null,
  });

  const closeBrowser = async (): Promise<void> => {
    if (browser === null) { state = "stopped"; return; }
    state = "closing";
    const owned = browser;
    browser = null;
    await owned.close().catch(() => undefined);
    state = "stopped";
    startedAt = null;
    pagesRendered = 0;
  };

  const api: BrowserRuntimePort = {
    async getRuntimeInfo() { return installation(); },
    async validateInstallation() { return installation(); },
    async getHealth() { return health(); },
    async start() {
      if (browser?.isConnected() === true) return health();
      const { executablePath } = await readManifest();
      state = "starting";
      try {
        const launched = await chromium.launch({
          executablePath,
          headless: true,
          chromiumSandbox: true,
          args: ["--deny-permission-prompts"],
          handleSIGHUP: false,
          handleSIGINT: false,
          handleSIGTERM: false,
        });
        browser = launched;
        state = "ready";
        startedAt = now();
        pagesRendered = 0;
        launched.on("disconnected", () => {
          if (state !== "closing" && state !== "stopped") {
            state = "crashed";
            lastCrashAt = now();
          }
        });
        return health();
      } catch {
        state = "unhealthy";
        throw new RenderOperationError("BROWSER_LAUNCH_FAILED", "The approved Playwright Chromium process could not start", true);
      }
    },
    async restart() {
      if (activeJobId !== null) throw new RenderOperationError("BROWSER_BUSY", "The Browser Runtime cannot restart while a Page Job is active");
      const recent = restartTimes.filter((value) => Date.now() - value <= RESTART_WINDOW_MS);
      restartTimes.splice(0, restartTimes.length, ...recent);
      if (recent.length >= MAX_RESTARTS_PER_WINDOW) throw new RenderOperationError("BROWSER_RESTART_LIMITED", "The Browser Runtime restart budget is exhausted", true);
      restartTimes.push(Date.now());
      state = "restarting";
      await closeBrowser();
      return api.start();
    },
    async createPageSession(jobId, policy) {
      if (activeJobId !== null) throw new RenderOperationError("BROWSER_BUSY", "Phase 8 permits one active Page Job per Browser Runtime");
      if (browser?.isConnected() !== true) await api.start();
      const age = startedAt === null ? 0 : Date.now() - Date.parse(startedAt);
      if (pagesRendered >= maximumPages || age >= maximumLifetimeMs) await api.restart();
      if (browser?.isConnected() !== true) throw new RenderOperationError("BROWSER_UNHEALTHY", "The Browser Runtime is not connected", true);
      activeJobId = jobId;
      try {
        const context = await browser.newContext({
          viewport: CONTEXT_PROFILE.viewport,
          deviceScaleFactor: CONTEXT_PROFILE.deviceScaleFactor,
          locale: CONTEXT_PROFILE.locale,
          timezoneId: CONTEXT_PROFILE.timezoneId,
          colorScheme: CONTEXT_PROFILE.colorScheme,
          reducedMotion: CONTEXT_PROFILE.reducedMotion,
          javaScriptEnabled: CONTEXT_PROFILE.javaScriptEnabled,
          serviceWorkers: CONTEXT_PROFILE.serviceWorkers,
          acceptDownloads: CONTEXT_PROFILE.acceptDownloads,
          userAgent: CONTEXT_PROFILE.userAgent,
          bypassCSP: false,
          ignoreHTTPSErrors: false,
        });
        await context.clearPermissions();
        const page = await context.newPage();
        const session = new PlaywrightPageSession(jobId, context, page, policy, () => browser?.isConnected() === true, () => {
          activeJobId = null;
          pagesRendered += 1;
        });
        await session.installRouting();
        return session;
      } catch (error) {
        activeJobId = null;
        if (error instanceof RenderOperationError) throw error;
        throw new RenderOperationError("BROWSER_CONTEXT_FAILED", "A fresh isolated Browser Context could not be created", true);
      }
    },
    async close() { await closeBrowser(); },
  };
  return Object.freeze(api);
}
