export const AUTHENTICATION_CONTRACT_VERSION = 1 as const;
export const LOCATOR_CONTRACT_VERSION = 1 as const;
export const LOGIN_FLOW_CONTRACT_VERSION = 1 as const;
export const ELEMENT_PICKER_CONTRACT_VERSION = 1 as const;

export const AUTHENTICATION_STATES = Object.freeze([
  "unauthenticated",
  "authenticating",
  "authenticated",
  "expired",
  "re_auth_required",
] as const);
export type AuthenticationState = (typeof AUTHENTICATION_STATES)[number];

export const LOGIN_ELEMENT_KINDS = Object.freeze([
  "phone-input",
  "country-code-control",
  "request-otp-control",
  "otp-input",
  "otp-segment",
  "verify-control",
  "success-indicator",
  "invalid-code-indicator",
  "expired-code-indicator",
  "resend-control",
] as const);
export type LoginElementKind = (typeof LOGIN_ELEMENT_KINDS)[number];

export interface LocatorFrame {
  readonly strategy: "css" | "name" | "url";
  readonly value: string;
}

interface LocatorCommon {
  readonly version: typeof LOCATOR_CONTRACT_VERSION;
  readonly frame?: LocatorFrame | null;
}

export type ElementLocator =
  | (LocatorCommon & { readonly strategy: "role"; readonly role: string; readonly name?: string; readonly exact?: boolean })
  | (LocatorCommon & { readonly strategy: "label"; readonly text: string; readonly exact?: boolean })
  | (LocatorCommon & { readonly strategy: "placeholder"; readonly text: string; readonly exact?: boolean })
  | (LocatorCommon & { readonly strategy: "test-id"; readonly value: string })
  | (LocatorCommon & { readonly strategy: "attribute"; readonly name: string; readonly value: string })
  | (LocatorCommon & { readonly strategy: "css"; readonly selector: string });

export type LoginCondition =
  | { readonly kind: "url"; readonly origin: string; readonly path: string; readonly exactPath?: boolean }
  | { readonly kind: "locator"; readonly locator: ElementLocator; readonly text?: string | null };

export type OtpConfiguration =
  | { readonly mode: "single"; readonly locator: ElementLocator }
  | { readonly mode: "segmented"; readonly locators: readonly ElementLocator[] };

export interface LoginFlow {
  readonly version: typeof LOGIN_FLOW_CONTRACT_VERSION;
  readonly profileId: string;
  readonly loginUrl: string;
  readonly phoneNumberLocator: ElementLocator;
  readonly countryCodeLocator: ElementLocator | null;
  readonly requestOtpLocator: ElementLocator;
  readonly otp: OtpConfiguration;
  readonly otpSubmitLocator: ElementLocator | null;
  readonly successCondition: LoginCondition;
  readonly incorrectCodeCondition: LoginCondition | null;
  readonly expiredCodeCondition: LoginCondition | null;
  readonly resendControl: ElementLocator | null;
  readonly resendCooldownMs: number;
  readonly otpTimeoutMs: number;
}

export interface ElementPickerSelection {
  readonly version: typeof ELEMENT_PICKER_CONTRACT_VERSION;
  readonly kind: LoginElementKind;
  readonly locator: ElementLocator;
}

export interface AuthenticationContractIssue {
  readonly path: string;
  readonly message: string;
}

export type AuthenticationContractErrorCode = "LOGIN_FLOW_INVALID" | "LOCATOR_INVALID" | "LOCATOR_FRAME_INVALID" | "ELEMENT_PICKER_SELECTION_INVALID";

export class AuthenticationContractError extends Error {
  public constructor(
    public readonly code: AuthenticationContractErrorCode,
    message: string,
    public readonly issues: readonly AuthenticationContractIssue[] = [],
  ) {
    super(message);
    this.name = "AuthenticationContractError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textValue(value: unknown, label: string, maximum: number): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new AuthenticationContractError("LOCATOR_INVALID", `${label} is invalid`);
  }
  return value;
}

function nullableTextValue(value: unknown, label: string, maximum: number): string | null {
  if (value === null || value === undefined) return null;
  return textValue(value, label, maximum);
}

function safeOrigin(value: unknown, label: string): string {
  const candidate = textValue(value, label, 512);
  try {
    const url = new URL(candidate);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.origin !== candidate || url.username !== "" || url.password !== "" || url.pathname !== "/" || url.search !== "" || url.hash !== "") {
      throw new Error("unsafe origin");
    }
  } catch {
    throw new AuthenticationContractError("LOGIN_FLOW_INVALID", `${label} must be an HTTP(S) origin`);
  }
  return candidate;
}

function safeLoginUrl(value: unknown): string {
  const candidate = textValue(value, "loginUrl", 2_048);
  try {
    const url = new URL(candidate);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") throw new Error("unsafe URL");
    return url.toString();
  } catch {
    throw new AuthenticationContractError("LOGIN_FLOW_INVALID", "loginUrl must be a credential-free HTTP(S) URL without query or fragment data");
  }
}

function parseFrame(value: unknown): LocatorFrame | null {
  if (value === undefined || value === null) return null;
  if (!isRecord(value)) throw new AuthenticationContractError("LOCATOR_FRAME_INVALID", "The locator frame context is invalid");
  const strategy = value["strategy"];
  if (strategy !== "css" && strategy !== "name" && strategy !== "url") throw new AuthenticationContractError("LOCATOR_FRAME_INVALID", "The locator frame strategy is invalid");
  const frameValue = textValue(value["value"], "The locator frame value", 2_048);
  if (strategy === "css" && (/[{};]/.test(frameValue) || /^javascript\s*:/i.test(frameValue))) throw new AuthenticationContractError("LOCATOR_FRAME_INVALID", "The locator frame selector is unsafe");
  if (strategy === "url") {
    try {
      const url = new URL(frameValue);
      if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") throw new Error("unsafe frame URL");
    } catch {
      throw new AuthenticationContractError("LOCATOR_FRAME_INVALID", "The locator frame URL is invalid");
    }
  }
  return { strategy, value: frameValue };
}

function withFrame<T extends Record<string, unknown>>(value: T, frame: LocatorFrame | null): T & { readonly frame?: LocatorFrame | null } {
  return frame === null ? value as T & { readonly frame?: LocatorFrame | null } : { ...value, frame } as T & { readonly frame?: LocatorFrame | null };
}

export function parseElementLocator(value: unknown): ElementLocator {
  if (!isRecord(value) || value["version"] !== LOCATOR_CONTRACT_VERSION) throw new AuthenticationContractError("LOCATOR_INVALID", "The Locator contract version is unsupported");
  const frame = parseFrame(value["frame"]);
  const strategy = value["strategy"];
  if (strategy === "role") {
    const role = textValue(value["role"], "The Locator role", 64).toLowerCase();
    const name = nullableTextValue(value["name"], "The Locator accessible name", 512);
    const exact = value["exact"] === undefined ? undefined : value["exact"];
    if (exact !== undefined && typeof exact !== "boolean") throw new AuthenticationContractError("LOCATOR_INVALID", "The Locator exact flag is invalid");
    return withFrame({ version: LOCATOR_CONTRACT_VERSION, strategy, role, ...(name === null ? {} : { name }), ...(exact === undefined ? {} : { exact }) }, frame) as ElementLocator;
  }
  if (strategy === "label" || strategy === "placeholder") {
    const text = textValue(value["text"], `The ${strategy} Locator text`, 512);
    const exact = value["exact"] === undefined ? undefined : value["exact"];
    if (exact !== undefined && typeof exact !== "boolean") throw new AuthenticationContractError("LOCATOR_INVALID", "The Locator exact flag is invalid");
    return withFrame({ version: LOCATOR_CONTRACT_VERSION, strategy, text, ...(exact === undefined ? {} : { exact }) }, frame) as ElementLocator;
  }
  if (strategy === "test-id") {
    const testId = textValue(value["value"], "The test-id Locator value", 512);
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(testId)) throw new AuthenticationContractError("LOCATOR_INVALID", "The test-id Locator value is unsafe");
    return withFrame({ version: LOCATOR_CONTRACT_VERSION, strategy, value: testId }, frame) as ElementLocator;
  }
  if (strategy === "attribute") {
    const name = textValue(value["name"], "The Locator attribute name", 64).toLowerCase();
    const attributeValue = textValue(value["value"], "The Locator attribute value", 512);
    if (!/^(?:id|name|autocomplete|aria-label|data-[a-z0-9._:-]+)$/.test(name) || name === "value") throw new AuthenticationContractError("LOCATOR_INVALID", "The Locator attribute is not an approved stable attribute");
    return withFrame({ version: LOCATOR_CONTRACT_VERSION, strategy, name, value: attributeValue }, frame) as ElementLocator;
  }
  if (strategy === "css") {
    const selector = textValue(value["selector"], "The CSS Locator selector", 512);
    if (/[{};]/.test(selector) || /^javascript\s*:/i.test(selector)) throw new AuthenticationContractError("LOCATOR_INVALID", "The CSS Locator selector is unsafe");
    return withFrame({ version: LOCATOR_CONTRACT_VERSION, strategy, selector }, frame) as ElementLocator;
  }
  throw new AuthenticationContractError("LOCATOR_INVALID", "The Locator strategy is unsupported");
}

export function serializeElementLocator(value: ElementLocator): string {
  return JSON.stringify(parseElementLocator(value));
}

export function locatorDiagnostic(value: unknown): string {
  try {
    const locator = parseElementLocator(value);
    return locator.frame === undefined || locator.frame === null ? `strategy=${locator.strategy}` : `strategy=${locator.strategy};frame=${locator.frame.strategy}`;
  } catch {
    return "strategy=invalid";
  }
}

export function parseLoginCondition(value: unknown): LoginCondition {
  if (!isRecord(value)) throw new AuthenticationContractError("LOGIN_FLOW_INVALID", "A Login Flow condition is invalid");
  const kind = value["kind"];
  if (kind === "url") {
    const origin = safeOrigin(value["origin"], "The Login Flow URL condition origin");
    const path = textValue(value["path"], "The Login Flow URL condition path", 2_048);
    if (!path.startsWith("/") || path.includes("?") || path.includes("#") || path.includes("\\")) throw new AuthenticationContractError("LOGIN_FLOW_INVALID", "The Login Flow URL condition path is unsafe");
    const exactPath = value["exactPath"] === undefined ? undefined : value["exactPath"];
    if (exactPath !== undefined && typeof exactPath !== "boolean") throw new AuthenticationContractError("LOGIN_FLOW_INVALID", "The Login Flow URL condition exactPath flag is invalid");
    return { kind, origin, path, ...(exactPath === undefined ? {} : { exactPath }) };
  }
  if (kind === "locator") {
    const locator = parseElementLocator(value["locator"]);
    const text = nullableTextValue(value["text"], "The Login Flow condition text", 512);
    return { kind, locator, ...(text === null ? {} : { text }) };
  }
  throw new AuthenticationContractError("LOGIN_FLOW_INVALID", "The Login Flow condition kind is unsupported");
}

function parseOptionalLocator(value: unknown): ElementLocator | null {
  return value === undefined || value === null ? null : parseElementLocator(value);
}

export function parseLoginFlow(value: unknown): LoginFlow {
  const issues: AuthenticationContractIssue[] = [];
  try {
    if (!isRecord(value) || value["version"] !== LOGIN_FLOW_CONTRACT_VERSION) throw new AuthenticationContractError("LOGIN_FLOW_INVALID", "The Login Flow contract version is unsupported");
    const profileId = textValue(value["profileId"], "The Login Flow Profile identifier", 128);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId)) throw new AuthenticationContractError("LOGIN_FLOW_INVALID", "The Login Flow Profile identifier is invalid");
    const loginUrl = safeLoginUrl(value["loginUrl"]);
    const phoneNumberLocator = parseElementLocator(value["phoneNumberLocator"]);
    const countryCodeLocator = parseOptionalLocator(value["countryCodeLocator"]);
    const requestOtpLocator = parseElementLocator(value["requestOtpLocator"]);
    const otpValue = value["otp"];
    if (!isRecord(otpValue)) throw new AuthenticationContractError("LOGIN_FLOW_INVALID", "The Login Flow OTP configuration is missing");
    const mode = otpValue["mode"];
    let otp: OtpConfiguration;
    if (mode === "single") otp = { mode, locator: parseElementLocator(otpValue["locator"]) };
    else if (mode === "segmented") {
      const rawLocators = otpValue["locators"];
      if (!Array.isArray(rawLocators) || rawLocators.length < 2 || rawLocators.length > 20) throw new AuthenticationContractError("LOGIN_FLOW_INVALID", "Segmented OTP must define between two and twenty fields");
      otp = { mode, locators: rawLocators.map((locator) => parseElementLocator(locator)) };
    } else throw new AuthenticationContractError("LOGIN_FLOW_INVALID", "The Login Flow OTP mode is unsupported");
    const otpSubmitLocator = parseOptionalLocator(value["otpSubmitLocator"]);
    const successCondition = parseLoginCondition(value["successCondition"]);
    const incorrectCodeCondition = value["incorrectCodeCondition"] === undefined || value["incorrectCodeCondition"] === null ? null : parseLoginCondition(value["incorrectCodeCondition"]);
    const expiredCodeCondition = value["expiredCodeCondition"] === undefined || value["expiredCodeCondition"] === null ? null : parseLoginCondition(value["expiredCodeCondition"]);
    const resendControl = parseOptionalLocator(value["resendControl"]);
    const resendCooldownMs = value["resendCooldownMs"];
    const otpTimeoutMs = value["otpTimeoutMs"];
    if (typeof resendCooldownMs !== "number" || !Number.isSafeInteger(resendCooldownMs) || resendCooldownMs < 0 || resendCooldownMs > 600_000) throw new AuthenticationContractError("LOGIN_FLOW_INVALID", "The OTP resend cooldown is invalid");
    if (typeof otpTimeoutMs !== "number" || !Number.isSafeInteger(otpTimeoutMs) || otpTimeoutMs < 1_000 || otpTimeoutMs > 900_000) throw new AuthenticationContractError("LOGIN_FLOW_INVALID", "The OTP timeout is invalid");
    if (resendControl === null && resendCooldownMs !== 0) throw new AuthenticationContractError("LOGIN_FLOW_INVALID", "A resend cooldown requires a resend control Locator");
    return {
      version: LOGIN_FLOW_CONTRACT_VERSION,
      profileId,
      loginUrl,
      phoneNumberLocator,
      countryCodeLocator,
      requestOtpLocator,
      otp,
      otpSubmitLocator,
      successCondition,
      incorrectCodeCondition,
      expiredCodeCondition,
      resendControl,
      resendCooldownMs,
      otpTimeoutMs,
    };
  } catch (error) {
    if (error instanceof AuthenticationContractError) issues.push(...(error.issues.length > 0 ? error.issues : [{ path: "loginFlow", message: error.message }]));
    else issues.push({ path: "loginFlow", message: "The Login Flow configuration is invalid" });
    throw new AuthenticationContractError("LOGIN_FLOW_INVALID", issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "), issues);
  }
}

export function validateLoginFlow(value: unknown): { readonly valid: boolean; readonly errors: readonly AuthenticationContractIssue[] } {
  try {
    parseLoginFlow(value);
    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: error instanceof AuthenticationContractError && error.issues.length > 0 ? error.issues : [{ path: "loginFlow", message: error instanceof Error ? error.message : "The Login Flow configuration is invalid" }] };
  }
}

export function serializeLoginFlow(value: LoginFlow): string {
  return `${JSON.stringify(parseLoginFlow(value), null, 2)}\n`;
}

export function parseElementPickerSelection(value: unknown): ElementPickerSelection {
  if (!isRecord(value) || value["version"] !== ELEMENT_PICKER_CONTRACT_VERSION || typeof value["kind"] !== "string" || !(LOGIN_ELEMENT_KINDS as readonly string[]).includes(value["kind"])) {
    throw new AuthenticationContractError("ELEMENT_PICKER_SELECTION_INVALID", "The Element Picker selection is invalid");
  }
  return { version: ELEMENT_PICKER_CONTRACT_VERSION, kind: value["kind"] as LoginElementKind, locator: parseElementLocator(value["locator"]) };
}

export function serializeElementPickerSelection(value: ElementPickerSelection): string {
  return JSON.stringify(parseElementPickerSelection(value));
}

const AUTHENTICATION_TRANSITIONS: Readonly<Record<AuthenticationState, readonly AuthenticationState[]>> = Object.freeze({
  unauthenticated: ["authenticating", "expired", "re_auth_required"],
  authenticating: ["authenticated", "unauthenticated", "expired", "re_auth_required"],
  authenticated: ["expired", "re_auth_required"],
  expired: ["authenticating", "re_auth_required", "unauthenticated"],
  re_auth_required: ["authenticating", "expired", "unauthenticated"],
});

export function canTransitionAuthenticationState(from: AuthenticationState, to: AuthenticationState): boolean {
  return from === to || AUTHENTICATION_TRANSITIONS[from].includes(to);
}

export function assertAuthenticationStateTransition(from: AuthenticationState, to: AuthenticationState): void {
  if (!canTransitionAuthenticationState(from, to)) throw new AuthenticationContractError("LOGIN_FLOW_INVALID", `Authentication state transition ${from} -> ${to} is not permitted`);
}

export const OTP_FLOW_STATES = Object.freeze([
  "idle",
  "opening_login",
  "resolving_elements",
  "entering_phone",
  "requesting_otp",
  "waiting_for_otp",
  "verifying",
  "invalid_code",
  "expired_code",
  "timed_out",
  "authenticated",
  "cancelled",
  "browser_closed",
  "navigation_changed",
  "failed",
] as const);
export type OtpFlowState = (typeof OTP_FLOW_STATES)[number];

export type OtpFlowErrorCode =
  | "OTP_FLOW_STATE_CONFLICT"
  | "LOCATOR_NOT_FOUND"
  | "LOCATOR_AMBIGUOUS"
  | "LOCATOR_NOT_INTERACTABLE"
  | "OTP_TIMEOUT"
  | "OTP_INVALID"
  | "OTP_EXPIRED"
  | "OTP_RESEND_COOLDOWN_ACTIVE"
  | "OTP_RESEND_NOT_CONFIGURED"
  | "OTP_BROWSER_CLOSED"
  | "OTP_NAVIGATION_CHANGED"
  | "OTP_CANCELLED"
  | "AUTHENTICATION_SESSION_INVALID"
  | "ELEMENT_PICKER_NOT_ACTIVE"
  | "ELEMENT_PICKER_NAVIGATION_CHANGED";

export class OtpFlowError extends Error {
  public constructor(
    public readonly code: OtpFlowErrorCode,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "OtpFlowError";
  }
}

export interface BrowserLocatorResolution {
  readonly count: number;
  readonly visible: boolean;
  readonly enabled: boolean;
}

export interface ElementPickerController {
  start(): Promise<void>;
  select(kind: LoginElementKind, timeoutMs?: number): Promise<ElementPickerSelection>;
  stop(): Promise<void>;
}

export interface OtpBrowserInteraction {
  navigate(url: string, timeoutMs: number): Promise<void>;
  resolve(locator: ElementLocator): Promise<BrowserLocatorResolution>;
  fill(locator: ElementLocator, value: string): Promise<void>;
  click(locator: ElementLocator): Promise<void>;
  clear(locator: ElementLocator): Promise<void>;
  checkCondition(condition: LoginCondition): Promise<boolean>;
  getCurrentUrlSafe(): string;
  isClosed(): boolean;
  readonly picker?: ElementPickerController;
}

export interface OtpSessionValidation {
  readonly status: "valid" | "expired" | "invalid" | "unavailable" | "configuration_missing" | "incompatible_profile" | "corrupt";
}

export interface OtpFlowClock {
  nowMs(): number;
  nowIso(): string;
  sleep(milliseconds: number): Promise<void>;
}

export interface OtpFlowSnapshot {
  readonly version: typeof AUTHENTICATION_CONTRACT_VERSION;
  readonly state: OtpFlowState;
  readonly authenticationState: AuthenticationState;
  readonly attemptCount: number;
  readonly resendAvailableAt: string | null;
  readonly expiresAt: string | null;
  readonly lastErrorCode: OtpFlowErrorCode | null;
  readonly lastTransitionAt: string;
}

export interface OtpFlowHooks {
  readonly validateSession: () => Promise<OtpSessionValidation>;
  readonly onAuthenticated: () => Promise<void>;
  readonly onStateChange?: (snapshot: OtpFlowSnapshot) => Promise<void>;
}

export interface OtpFlowOptions {
  readonly flow: LoginFlow;
  readonly browser: OtpBrowserInteraction;
  readonly hooks: OtpFlowHooks;
  readonly clock?: OtpFlowClock;
}

const defaultOtpClock: OtpFlowClock = Object.freeze({
  nowMs: () => Date.now(),
  nowIso: () => new Date().toISOString(),
  sleep: async (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)),
});

export class OtpFlowEngine {
  private state: OtpFlowState = "idle";
  private authenticationState: AuthenticationState = "unauthenticated";
  private attemptCount = 0;
  private lastRequestedAtMs: number | null = null;
  private expiresAtMs: number | null = null;
  private lastErrorCode: OtpFlowErrorCode | null = null;
  private lastTransitionAt: string;
  private readonly clock: OtpFlowClock;

  public constructor(private readonly options: OtpFlowOptions) {
    parseLoginFlow(options.flow);
    this.clock = options.clock ?? defaultOtpClock;
    this.lastTransitionAt = this.clock.nowIso();
  }

  private setStateSync(state: OtpFlowState, authenticationState = this.authenticationState, errorCode: OtpFlowErrorCode | null = null): void {
    this.state = state;
    this.authenticationState = authenticationState;
    this.lastErrorCode = errorCode;
    this.lastTransitionAt = this.clock.nowIso();
    void this.options.hooks.onStateChange?.(this.snapshot());
  }

  private async setState(state: OtpFlowState, authenticationState = this.authenticationState, errorCode: OtpFlowErrorCode | null = null): Promise<void> {
    this.setStateSync(state, authenticationState, errorCode);
  }

  private snapshotExpires(): void {
    if (this.state === "waiting_for_otp" && this.expiresAtMs !== null && this.clock.nowMs() >= this.expiresAtMs) {
      this.expiresAtMs = null;
      this.setStateSync("timed_out", "authenticating", "OTP_TIMEOUT");
      void this.clearOtpFields();
    }
  }

  public snapshot(): OtpFlowSnapshot {
    this.snapshotExpires();
    const availableAt = this.lastRequestedAtMs === null ? null : this.lastRequestedAtMs + this.options.flow.resendCooldownMs;
    return {
      version: AUTHENTICATION_CONTRACT_VERSION,
      state: this.state,
      authenticationState: this.authenticationState,
      attemptCount: this.attemptCount,
      resendAvailableAt: availableAt === null || availableAt <= this.clock.nowMs() ? null : new Date(availableAt).toISOString(),
      expiresAt: this.expiresAtMs === null ? null : new Date(this.expiresAtMs).toISOString(),
      lastErrorCode: this.lastErrorCode,
      lastTransitionAt: this.lastTransitionAt,
    };
  }

  private requireAvailableState(action: "provide" | "resend"): void {
    this.snapshotExpires();
    if (action === "provide" && this.state === "timed_out") throw new OtpFlowError("OTP_TIMEOUT", "The OTP wait window has expired", true);
    const allowed = action === "provide"
      ? this.state === "waiting_for_otp" || this.state === "invalid_code"
      : this.state === "waiting_for_otp" || this.state === "invalid_code" || this.state === "expired_code" || this.state === "timed_out";
    if (!allowed) throw new OtpFlowError("OTP_FLOW_STATE_CONFLICT", `The OTP flow cannot ${action} an OTP while it is ${this.state}`);
  }

  private async resolve(locator: ElementLocator): Promise<void> {
    if (this.options.browser.isClosed()) throw new OtpFlowError("OTP_BROWSER_CLOSED", "The Authentication Browser is closed", true);
    let resolution: BrowserLocatorResolution;
    try { resolution = await this.options.browser.resolve(locator); }
    catch { throw new OtpFlowError("LOCATOR_NOT_FOUND", "A configured Login Flow Locator could not be resolved", true); }
    if (resolution.count === 0) throw new OtpFlowError("LOCATOR_NOT_FOUND", "A configured Login Flow Locator matched no elements", true);
    if (resolution.count !== 1) throw new OtpFlowError("LOCATOR_AMBIGUOUS", "A configured Login Flow Locator matched multiple elements", true);
    if (!resolution.visible || !resolution.enabled) throw new OtpFlowError("LOCATOR_NOT_INTERACTABLE", "A configured Login Flow element is not interactable", true);
  }

  private async clearOtpFields(): Promise<void> {
    const locators = this.options.flow.otp.mode === "single" ? [this.options.flow.otp.locator] : this.options.flow.otp.locators;
    for (const locator of locators) await this.options.browser.clear(locator).catch(() => undefined);
  }

  private async fail(error: OtpFlowError): Promise<never> {
    if (error.code === "OTP_BROWSER_CLOSED") await this.setState("browser_closed", "re_auth_required", error.code);
    else if (error.code === "OTP_NAVIGATION_CHANGED" || error.code === "ELEMENT_PICKER_NAVIGATION_CHANGED") await this.setState("navigation_changed", "re_auth_required", error.code === "OTP_NAVIGATION_CHANGED" ? error.code : "OTP_NAVIGATION_CHANGED");
    else if (error.code === "OTP_TIMEOUT") await this.setState("timed_out", "authenticating", error.code);
    else if (error.code === "OTP_INVALID") await this.setState("invalid_code", "authenticating", error.code);
    else if (error.code === "OTP_EXPIRED") await this.setState("expired_code", "expired", error.code);
    else if (error.code !== "OTP_RESEND_COOLDOWN_ACTIVE") await this.setState("failed", "re_auth_required", error.code);
    throw error;
  }

  public async start(input: { readonly phoneNumber: string; readonly countryCode?: string }): Promise<OtpFlowSnapshot> {
    if (this.state !== "idle") throw new OtpFlowError("OTP_FLOW_STATE_CONFLICT", "The OTP flow has already started");
    let phone = input.phoneNumber;
    let country = input.countryCode ?? "";
    try {
      if (phone.length === 0 || phone.length > 128 || /[\u0000-\u001f\u007f]/.test(phone)) throw new OtpFlowError("OTP_FLOW_STATE_CONFLICT", "The phone number input is invalid");
      if (country.length > 32 || /[\u0000-\u001f\u007f]/.test(country)) throw new OtpFlowError("OTP_FLOW_STATE_CONFLICT", "The country code input is invalid");
      await this.setState("opening_login", "authenticating");
      if (this.options.browser.isClosed()) throw new OtpFlowError("OTP_BROWSER_CLOSED", "The Authentication Browser is closed", true);
      try { await this.options.browser.navigate(this.options.flow.loginUrl, 30_000); }
      catch { throw new OtpFlowError("OTP_NAVIGATION_CHANGED", "The Login Flow could not open its configured login page", true); }
      await this.setState("resolving_elements");
      await this.resolve(this.options.flow.phoneNumberLocator);
      if (this.options.flow.countryCodeLocator !== null) await this.resolve(this.options.flow.countryCodeLocator);
      await this.resolve(this.options.flow.requestOtpLocator);
      await this.setState("entering_phone");
      await this.options.browser.fill(this.options.flow.phoneNumberLocator, phone);
      if (this.options.flow.countryCodeLocator !== null && country.length > 0) await this.options.browser.fill(this.options.flow.countryCodeLocator, country);
      await this.setState("requesting_otp");
      await this.options.browser.click(this.options.flow.requestOtpLocator);
      this.attemptCount = 0;
      this.lastRequestedAtMs = this.clock.nowMs();
      this.expiresAtMs = this.lastRequestedAtMs + this.options.flow.otpTimeoutMs;
      await this.setState("waiting_for_otp", "authenticating", null);
      return this.snapshot();
    } catch (error) {
      const safe = error instanceof OtpFlowError ? error : new OtpFlowError("OTP_FLOW_STATE_CONFLICT", "The OTP flow could not be started safely", true);
      await this.clearOtpFields();
      return this.fail(safe);
    } finally {
      phone = "";
      country = "";
    }
  }

  public async provideOtp(value: string): Promise<OtpFlowSnapshot> {
    this.requireAvailableState("provide");
    let otp = value;
    try {
      if (otp.length === 0 || otp.length > 128 || !/^[A-Za-z0-9]+$/.test(otp)) throw new OtpFlowError("OTP_INVALID", "The supplied OTP format is invalid");
      const expectedLength = this.options.flow.otp.mode === "segmented" ? this.options.flow.otp.locators.length : null;
      if (expectedLength !== null && otp.length !== expectedLength) throw new OtpFlowError("OTP_INVALID", "The supplied OTP length does not match the configured segmented fields");
      if (this.expiresAtMs !== null && this.clock.nowMs() >= this.expiresAtMs) throw new OtpFlowError("OTP_TIMEOUT", "The OTP wait window has expired", true);
      this.attemptCount += 1;
      await this.setState("verifying", "authenticating");
      if (this.options.flow.otp.mode === "single") {
        await this.resolve(this.options.flow.otp.locator);
        await this.options.browser.fill(this.options.flow.otp.locator, otp);
      } else {
        for (const [index, locator] of this.options.flow.otp.locators.entries()) {
          await this.resolve(locator);
          await this.options.browser.fill(locator, otp[index]!);
        }
      }
      if (this.options.flow.otpSubmitLocator !== null) {
        await this.resolve(this.options.flow.otpSubmitLocator);
        await this.options.browser.click(this.options.flow.otpSubmitLocator);
      }
      if (this.options.flow.expiredCodeCondition !== null && await this.options.browser.checkCondition(this.options.flow.expiredCodeCondition)) throw new OtpFlowError("OTP_EXPIRED", "The website reported that the OTP has expired");
      if (this.options.flow.incorrectCodeCondition !== null && await this.options.browser.checkCondition(this.options.flow.incorrectCodeCondition)) throw new OtpFlowError("OTP_INVALID", "The website rejected the OTP");
      if (!await this.options.browser.checkCondition(this.options.flow.successCondition)) throw new OtpFlowError("OTP_INVALID", "The configured Login Flow success condition was not met", true);
      const validation = await this.options.hooks.validateSession();
      if (validation.status !== "valid") throw new OtpFlowError("AUTHENTICATION_SESSION_INVALID", "The authenticated Session did not validate", true);
      await this.clearOtpFields();
      otp = "";
      await this.options.hooks.onAuthenticated();
      this.expiresAtMs = null;
      await this.setState("authenticated", "authenticated", null);
      return this.snapshot();
    } catch (error) {
      await this.clearOtpFields();
      const safe = error instanceof OtpFlowError ? error : new OtpFlowError("OTP_INVALID", "The OTP verification could not be completed safely", true);
      return this.fail(safe);
    } finally {
      otp = "";
    }
  }

  public async resend(): Promise<OtpFlowSnapshot> {
    this.requireAvailableState("resend");
    if (this.options.flow.resendControl === null) throw new OtpFlowError("OTP_RESEND_NOT_CONFIGURED", "The Login Flow does not define a resend control");
    const now = this.clock.nowMs();
    const availableAt = this.lastRequestedAtMs === null ? now : this.lastRequestedAtMs + this.options.flow.resendCooldownMs;
    if (now < availableAt) {
      this.lastErrorCode = "OTP_RESEND_COOLDOWN_ACTIVE";
      throw new OtpFlowError("OTP_RESEND_COOLDOWN_ACTIVE", "The OTP resend cooldown is still active", true);
    }
    try {
      await this.resolve(this.options.flow.resendControl);
      await this.clearOtpFields();
      await this.options.browser.click(this.options.flow.resendControl);
      this.lastRequestedAtMs = this.clock.nowMs();
      this.expiresAtMs = this.lastRequestedAtMs + this.options.flow.otpTimeoutMs;
      await this.setState("waiting_for_otp", "authenticating", null);
      return this.snapshot();
    } catch (error) {
      const safe = error instanceof OtpFlowError ? error : new OtpFlowError("OTP_FLOW_STATE_CONFLICT", "The OTP resend could not be completed safely", true);
      return this.fail(safe);
    }
  }

  public async cancel(): Promise<OtpFlowSnapshot> {
    if (this.state === "authenticated" || this.state === "cancelled") return this.snapshot();
    await this.clearOtpFields();
    await this.setState("cancelled", "re_auth_required", "OTP_CANCELLED");
    return this.snapshot();
  }

  public async handleBrowserClosed(): Promise<OtpFlowSnapshot> {
    if (this.state !== "authenticated" && this.state !== "cancelled") await this.setState("browser_closed", "re_auth_required", "OTP_BROWSER_CLOSED");
    return this.snapshot();
  }
}
