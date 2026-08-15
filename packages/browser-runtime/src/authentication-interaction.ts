import type { FrameLocator, Locator, Page } from "playwright-core";
import {
  parseElementPickerSelection,
  type BrowserLocatorResolution,
  type ElementLocator,
  type ElementPickerController,
  type ElementPickerSelection,
  type LoginCondition,
  type LoginElementKind,
  OtpFlowError,
  type OtpBrowserInteraction,
} from "@offline-web-archive/archive-core";

const PICKER_STATE_KEY = "__owaElementPickerV1";

type LocatorRoot = Page | FrameLocator;

function escapeCssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function frameRoot(page: Page, frame: NonNullable<ElementLocator["frame"]>): FrameLocator {
  if (frame.strategy === "css") return page.frameLocator(frame.value);
  if (frame.strategy === "name") return page.frameLocator(`iframe[name="${escapeCssString(frame.value)}"]`);
  return page.frameLocator(`iframe[src="${escapeCssString(frame.value)}"]`);
}

function locatorRoot(page: Page, locator: ElementLocator): LocatorRoot {
  return locator.frame === undefined || locator.frame === null ? page : frameRoot(page, locator.frame);
}

function toLocator(page: Page, locator: ElementLocator): Locator {
  const root = locatorRoot(page, locator);
  switch (locator.strategy) {
    case "role":
      return root.getByRole(locator.role as never, { ...(locator.name === undefined ? {} : { name: locator.name }), ...(locator.exact === undefined ? {} : { exact: locator.exact }) });
    case "label":
      return root.getByLabel(locator.text, ...(locator.exact === undefined ? [] : [{ exact: locator.exact }]));
    case "placeholder":
      return root.getByPlaceholder(locator.text, ...(locator.exact === undefined ? [] : [{ exact: locator.exact }]));
    case "test-id":
      return root.getByTestId(locator.value);
    case "attribute":
      return root.locator(`[${locator.name}="${escapeCssString(locator.value)}"]`);
    case "css":
      return root.locator(locator.selector);
  }
}

async function resolveLocator(page: Page, locator: ElementLocator): Promise<BrowserLocatorResolution> {
  const target = toLocator(page, locator);
  const count = await target.count();
  if (count === 0) return { count, visible: false, enabled: false };
  const first = target.first();
  return { count, visible: await first.isVisible(), enabled: await first.isEnabled() };
}

function safePageUrl(page: Page): string {
  try {
    const url = new URL(page.url());
    url.username = "";
    url.password = "";
    url.hash = "";
    if (url.search !== "") url.search = "?[redacted]";
    return url.toString().slice(0, 2_048);
  } catch {
    return "invalid-url";
  }
}

function conditionUrlMatches(page: Page, condition: Extract<LoginCondition, { kind: "url" }>): boolean {
  try {
    const current = new URL(page.url());
    if (current.origin !== condition.origin) return false;
    return condition.exactPath === false ? current.pathname.startsWith(condition.path) : current.pathname === condition.path;
  } catch {
    return false;
  }
}

export class PlaywrightElementPicker implements ElementPickerController {
  private active = false;
  private startedUrl = "";

  public constructor(private readonly page: Page) {}

  public async start(): Promise<void> {
    if (this.page.isClosed()) throw new OtpFlowError("OTP_BROWSER_CLOSED", "The Authentication Browser is closed", true);
    this.startedUrl = this.page.url();
    try {
      await this.page.evaluate((key) => {
        const windowRecord = window as unknown as Record<string, unknown>;
        const existing = windowRecord[key] as { cleanup?: () => void } | undefined;
        existing?.cleanup?.();
        let highlighted: HTMLElement | null = null;
        let previousOutline = "";
        const state: {
          selected: unknown;
          cleanup: () => void;
        } = {
          selected: null,
          cleanup: () => {
            if (highlighted !== null) highlighted.style.outline = previousOutline;
            document.removeEventListener("pointerover", onPointerOver, true);
            document.removeEventListener("click", onClick, true);
            delete windowRecord[key];
          },
        };
        const cssPath = (element: Element): string => {
          const segments: string[] = [];
          let current: Element | null = element;
          while (current !== null && current !== document.body && segments.length < 8) {
            const parent: Element | null = current.parentElement;
            if (parent === null) break;
            const siblings = Array.from(parent.children);
            const index = siblings.indexOf(current) + 1;
            segments.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
            current = parent;
          }
          return segments.join(" > ");
        };
        const locatorFor = (element: Element): unknown => {
          const target = element.closest("input,textarea,button,select,[role],a") ?? element;
          const testId = target.getAttribute("data-testid");
          if (testId !== null && testId.length > 0) return { version: 1, strategy: "test-id", value: testId };
          const ariaLabel = target.getAttribute("aria-label");
          if (ariaLabel !== null && ariaLabel.length > 0) return { version: 1, strategy: "label", text: ariaLabel, exact: true };
          const placeholder = target.getAttribute("placeholder");
          if (placeholder !== null && placeholder.length > 0) return { version: 1, strategy: "placeholder", text: placeholder, exact: true };
          const id = target.getAttribute("id");
          if (id !== null && id.length > 0) return { version: 1, strategy: "attribute", name: "id", value: id };
          const name = target.getAttribute("name");
          if (name !== null && name.length > 0) return { version: 1, strategy: "attribute", name: "name", value: name };
          const autocomplete = target.getAttribute("autocomplete");
          if (autocomplete !== null && autocomplete.length > 0) return { version: 1, strategy: "attribute", name: "autocomplete", value: autocomplete };
          const path = cssPath(target);
          return { version: 1, strategy: "css", selector: path.length > 0 ? path : target.tagName.toLowerCase() };
        };
        const onPointerOver = (event: Event): void => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;
          if (highlighted !== null) highlighted.style.outline = previousOutline;
          highlighted = target;
          previousOutline = target.style.outline;
          target.style.outline = "2px solid #2563eb";
        };
        const onClick = (event: Event): void => {
          event.preventDefault();
          event.stopPropagation();
          const target = event.target;
          if (!(target instanceof Element)) return;
          state.selected = { version: 1, kind: "phone-input", locator: locatorFor(target) };
        };
        document.addEventListener("pointerover", onPointerOver, true);
        document.addEventListener("click", onClick, true);
        windowRecord[key] = state;
      }, PICKER_STATE_KEY);
      this.active = true;
    } catch {
      throw new OtpFlowError("ELEMENT_PICKER_NOT_ACTIVE", "The Element Picker could not be activated", true);
    }
  }

  public async select(kind: LoginElementKind, timeoutMs = 60_000): Promise<ElementPickerSelection> {
    if (timeoutMs < 1_000 || timeoutMs > 300_000) throw new OtpFlowError("ELEMENT_PICKER_NOT_ACTIVE", "The Element Picker timeout is invalid");
    if (!this.active) await this.start();
    const deadline = Date.now() + timeoutMs;
    try {
      while (Date.now() < deadline) {
        if (this.page.isClosed()) throw new OtpFlowError("OTP_BROWSER_CLOSED", "The Authentication Browser is closed", true);
        if (this.page.url() !== this.startedUrl) throw new OtpFlowError("ELEMENT_PICKER_NAVIGATION_CHANGED", "The page changed while the Element Picker was active", true);
        const selected = await this.page.evaluate((key) => {
          const value = (window as unknown as Record<string, unknown>)[key] as { selected?: unknown } | undefined;
          return value?.selected ?? null;
        }, PICKER_STATE_KEY);
        if (selected !== null) {
          const parsed = parseElementPickerSelection({ ...(selected as Record<string, unknown>), kind });
          await this.stop();
          return parsed;
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
      }
      throw new OtpFlowError("ELEMENT_PICKER_NOT_ACTIVE", "The Element Picker timed out without a selection", true);
    } catch (error) {
      await this.stop();
      if (error instanceof OtpFlowError) throw error;
      if (this.page.isClosed()) throw new OtpFlowError("OTP_BROWSER_CLOSED", "The Authentication Browser is closed", true);
      if (this.page.url() !== this.startedUrl) throw new OtpFlowError("ELEMENT_PICKER_NAVIGATION_CHANGED", "The page changed while the Element Picker was active", true);
      throw new OtpFlowError("ELEMENT_PICKER_NOT_ACTIVE", "The Element Picker could not read its temporary selection", true);
    }
  }

  public async stop(): Promise<void> {
    this.active = false;
    if (this.page.isClosed()) return;
    await this.page.evaluate((key) => {
      const state = (window as unknown as Record<string, unknown>)[key] as { cleanup?: () => void } | undefined;
      state?.cleanup?.();
    }, PICKER_STATE_KEY).catch(() => undefined);
  }
}

export function createPlaywrightAuthenticationInteraction(page: Page): OtpBrowserInteraction {
  const picker = new PlaywrightElementPicker(page);
  return Object.freeze({
    async navigate(url: string, timeoutMs: number): Promise<void> {
      if (page.isClosed()) throw new OtpFlowError("OTP_BROWSER_CLOSED", "The Authentication Browser is closed", true);
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
      } catch {
        throw new OtpFlowError("OTP_NAVIGATION_CHANGED", "The Login Flow navigation could not be completed", true);
      }
    },
    async resolve(locator: ElementLocator): Promise<BrowserLocatorResolution> {
      if (page.isClosed()) throw new OtpFlowError("OTP_BROWSER_CLOSED", "The Authentication Browser is closed", true);
      try {
        return await resolveLocator(page, locator);
      } catch {
        throw new OtpFlowError("LOCATOR_NOT_FOUND", "A configured Login Flow Locator could not be resolved", true);
      }
    },
    async fill(locator: ElementLocator, value: string): Promise<void> {
      if (page.isClosed()) throw new OtpFlowError("OTP_BROWSER_CLOSED", "The Authentication Browser is closed", true);
      try { await toLocator(page, locator).fill(value); }
      catch { throw new OtpFlowError("LOCATOR_NOT_INTERACTABLE", "A configured Login Flow element could not accept input", true); }
    },
    async click(locator: ElementLocator): Promise<void> {
      if (page.isClosed()) throw new OtpFlowError("OTP_BROWSER_CLOSED", "The Authentication Browser is closed", true);
      try { await toLocator(page, locator).click(); }
      catch { throw new OtpFlowError("LOCATOR_NOT_INTERACTABLE", "A configured Login Flow control could not be activated", true); }
    },
    async clear(locator: ElementLocator): Promise<void> {
      try { await toLocator(page, locator).fill(""); }
      catch { /* The browser may have navigated away after verification. */ }
    },
    async checkCondition(condition: LoginCondition): Promise<boolean> {
      if (condition.kind === "url") return conditionUrlMatches(page, condition);
      try {
        const target = toLocator(page, condition.locator);
        if (await target.count() === 0 || !(await target.first().isVisible())) return false;
        if (condition.text === undefined || condition.text === null) return true;
        return (await target.first().textContent())?.includes(condition.text) ?? false;
      } catch {
        return false;
      }
    },
    getCurrentUrlSafe(): string { return safePageUrl(page); },
    isClosed(): boolean { return page.isClosed(); },
    picker,
  });
}
