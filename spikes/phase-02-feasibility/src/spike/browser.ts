import type { SpikeStage } from "../shared/contracts.js";
import { SpikeError } from "./errors.js";
import {
  assertBrowserExecutable,
  describeBrowserExecutable,
} from "./paths.js";

export interface BrowserCapture {
  html: string;
  originalUrl: string;
  finalUrl: string;
  title: string;
  renderStartedAt: string;
  renderCompletedAt: string;
  renderDurationMs: number;
  chromiumVersion: string;
  browserExecutable: string;
  consoleErrors: Array<{ type: "error"; text: string; url: string }>;
  failedRequests: Array<{ url: string; method: string; error: string }>;
  routes: string[];
}

export interface BrowserCaptureOptions {
  fixtureOrigin: string;
  browserRoot: string;
  packaged: boolean;
  onStage(stage: SpikeStage, message: string): void;
}

export const PLAYWRIGHT_CHROMIUM_SANDBOX = true;

async function waitForDomQuiet(
  page: import("playwright").Page,
  quietPeriodMs: number,
  maximumWaitMs: number,
): Promise<void> {
  await page.evaluate(
    ({ quietPeriodMs: quiet, maximumWaitMs: maximum }) =>
      new Promise<void>((resolve, reject) => {
        let quietTimer = window.setTimeout(finish, quiet);
        const maximumTimer = window.setTimeout(() => {
          observer.disconnect();
          window.clearTimeout(quietTimer);
          reject(new Error("DOM quiet-window timeout"));
        }, maximum);
        const observer = new MutationObserver(() => {
          window.clearTimeout(quietTimer);
          quietTimer = window.setTimeout(finish, quiet);
        });

        function finish(): void {
          observer.disconnect();
          window.clearTimeout(maximumTimer);
          resolve();
        }

        observer.observe(document.documentElement, {
          attributes: true,
          childList: true,
          subtree: true,
          characterData: true,
        });
      }),
    { quietPeriodMs, maximumWaitMs },
  );
}

export async function captureRenderedSpa(
  options: BrowserCaptureOptions,
): Promise<BrowserCapture> {
  process.env.PLAYWRIGHT_BROWSERS_PATH = options.browserRoot;
  process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";

  let playwright: typeof import("playwright");
  try {
    playwright = await import("playwright");
  } catch (error) {
    throw new SpikeError(
      "SPIKE_CONFIGURATION_ERROR",
      "The repository-local Playwright runtime could not be loaded.",
      { cause: error },
    );
  }

  const executablePath = playwright.chromium.executablePath();
  assertBrowserExecutable(options.browserRoot, executablePath);
  const browserExecutable = describeBrowserExecutable(
    options.browserRoot,
    executablePath,
    options.packaged,
  );

  options.onStage(
    "Starting Chromium",
    `Launching Playwright Chromium from ${browserExecutable}.`,
  );

  let browser: import("playwright").Browser;
  try {
    browser = await playwright.chromium.launch({
      headless: true,
      executablePath,
      chromiumSandbox: PLAYWRIGHT_CHROMIUM_SANDBOX,
    });
  } catch (error) {
    throw new SpikeError(
      "SPIKE_BROWSER_LAUNCH_ERROR",
      "Playwright could not launch the configured bundled Chromium executable.",
      { cause: error },
    );
  }

  const renderStart = performance.now();
  const renderStartedAt = new Date().toISOString();
  const consoleErrors: BrowserCapture["consoleErrors"] = [];
  const failedRequests: BrowserCapture["failedRequests"] = [];
  const routes: string[] = [];
  const originalUrl = `${options.fixtureOrigin}/`;

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      serviceWorkers: "block",
    });
    await context.route("**/*", async (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.origin === options.fixtureOrigin) {
        await route.continue();
      } else {
        await route.abort("blockedbyclient");
      }
    });

    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push({
          type: "error",
          text: message.text(),
          url: message.location().url || originalUrl,
        });
      }
    });
    page.on("requestfailed", (request) => {
      failedRequests.push({
        url: request.url(),
        method: request.method(),
        error: request.failure()?.errorText ?? "Unknown request failure",
      });
    });

    options.onStage("Loading SPA", "Navigating to the synthetic SPA root.");
    try {
      await page.goto(originalUrl, {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      });
    } catch (error) {
      throw new SpikeError(
        "SPIKE_NAVIGATION_ERROR",
        "Chromium could not navigate to the synthetic SPA.",
        { cause: error },
      );
    }

    options.onStage(
      "Waiting for rendered state",
      "Waiting for the explicit render marker, client routes, lazy content, and a bounded DOM quiet window.",
    );
    try {
      await page.waitForSelector('body[data-render-state="complete"]', {
        timeout: 15_000,
      });
      routes.push(new URL(page.url()).pathname);

      await Promise.all([
        page.waitForURL("**/products", { timeout: 10_000 }),
        page.click('a[data-route="/products"]'),
      ]);
      await page.waitForSelector('body[data-render-state="complete"]');
      routes.push(new URL(page.url()).pathname);

      await Promise.all([
        page.waitForURL("**/products/example-item", { timeout: 10_000 }),
        page.click('a[data-route="/products/example-item"]'),
      ]);
      await page.waitForSelector('body[data-render-state="complete"]');
      routes.push(new URL(page.url()).pathname);

      await page.locator("#lazy-zone").scrollIntoViewIfNeeded();
      await page.waitForSelector('body[data-lazy-state="loaded"]', {
        timeout: 10_000,
      });
      await page.waitForFunction(
        () =>
          document.querySelector("#catalog-status")?.textContent ===
            "Catalog loaded: 2 items" &&
          document.querySelector("#delayed-component")?.textContent ===
            "Delayed component ready" &&
          document.querySelector("#lazy-image")?.getAttribute("data-loaded") ===
            "true",
        undefined,
        { timeout: 10_000 },
      );
      await waitForDomQuiet(page, 350, 5_000);
    } catch (error) {
      throw new SpikeError(
        "SPIKE_RENDER_TIMEOUT",
        "The SPA did not reach the explicit complete and stable state within the bounded timeout.",
        { cause: error },
      );
    }

    options.onStage(
      "Extracting HTML",
      "Serializing the final rendered DOM with fixture-specific offline materialization.",
    );
    let html: string;
    try {
      html = await page.evaluate(() => {
        const clone = document.documentElement.cloneNode(true) as HTMLElement;
        clone.querySelectorAll("script").forEach((element) => element.remove());
        clone.querySelectorAll("*").forEach((element) => {
          for (const attribute of [...element.attributes]) {
            if (attribute.name.toLowerCase().startsWith("on")) {
              element.removeAttribute(attribute.name);
            }
          }
        });
        const head = clone.querySelector("head");
        if (head !== null) {
          const marker = document.createElement("meta");
          marker.name = "offline-web-archive-builder-spike";
          marker.content = "phase-02-experimental";
          head.prepend(marker);
        }
        return `<!doctype html>\n${clone.outerHTML}`;
      });
    } catch (error) {
      throw new SpikeError(
        "SPIKE_HTML_EXTRACTION_ERROR",
        "The final rendered DOM could not be serialized.",
        { cause: error },
      );
    }

    const renderCompletedAt = new Date().toISOString();
    const renderDurationMs = Math.round(performance.now() - renderStart);
    const result: BrowserCapture = {
      html,
      originalUrl,
      finalUrl: page.url(),
      title: await page.title(),
      renderStartedAt,
      renderCompletedAt,
      renderDurationMs,
      chromiumVersion: browser.version(),
      browserExecutable,
      consoleErrors,
      failedRequests,
      routes: [...new Set(routes)],
    };
    await context.close();
    return result;
  } finally {
    await browser.close();
  }
}
