export const INTERACTION_PROFILE_SCHEMA_VERSION = 1 as const;
export const INTERACTION_PLAN_SCHEMA_VERSION = 1 as const;
export const INTERACTION_TRACE_SCHEMA_VERSION = 1 as const;

interface InteractionHardLimits {
  maximumDelayMs: number;
  maximumPointerDurationMs: number;
  maximumScrollStepPx: number;
  maximumScrollDistancePx: number;
  maximumActionsPerPage: number;
  maximumInteractionDurationMs: number;
  maximumScrollSteps: number;
  maximumTabSteps: number;
  maximumPopupsPerPage: number;
  maximumDialogsPerPage: number;
  maximumTypedTextLength: number;
  maximumTargetLength: number;
  maximumTraceEvents: number;
  maximumTraceBytes: number;
  maximumStepTimeoutMs: number;
  maximumPlanSteps: number;
}

export const INTERACTION_HARD_LIMITS: Readonly<InteractionHardLimits> = Object.freeze({
  maximumDelayMs: 10_000,
  maximumPointerDurationMs: 5_000,
  maximumScrollStepPx: 5_000,
  maximumScrollDistancePx: 100_000,
  maximumActionsPerPage: 500,
  maximumInteractionDurationMs: 600_000,
  maximumScrollSteps: 100,
  maximumTabSteps: 100,
  maximumPopupsPerPage: 10,
  maximumDialogsPerPage: 20,
  maximumTypedTextLength: 4_096,
  maximumTargetLength: 512,
  maximumTraceEvents: 500,
  maximumTraceBytes: 262_144,
  maximumStepTimeoutMs: 120_000,
  maximumPlanSteps: 500,
});

export type InteractionMode = "disabled" | "human-paced";
export type InteractionStepType =
  | "focus"
  | "click"
  | "hover"
  | "mouse_move"
  | "type_text"
  | "press_key"
  | "tab_navigation"
  | "incremental_scroll"
  | "wait_for_state"
  | "cookie_banner";
export type InteractionSideEffect = "read-only" | "navigation";
export type InteractionFailurePolicy = "stop" | "skip" | "retry";
export type InteractionTracePolicy = "metadata" | "none";
export type InteractionStatus = "completed" | "skipped" | "failed" | "paused" | "cancelled" | "outcome-uncertain";
export type InteractionFailureCategory = "validation" | "budget" | "timeout" | "cancellation" | "pause" | "browser" | "security" | "target" | "policy" | "unknown";
export type InteractionNavigationOutcome = "none" | "dom-change" | "spa-route" | "full-navigation" | "popup" | "dialog" | "blocked";
export type InteractionRecoveryState = "pending" | "running" | "completed" | "skipped" | "failed" | "interrupted" | "outcome-uncertain";

export class InteractionOperationError extends Error {
  public constructor(
    public readonly code:
      | "INTERACTION_PROFILE_INVALID"
      | "INTERACTION_PLAN_INVALID"
      | "INTERACTION_TARGET_INVALID"
      | "INTERACTION_KEY_INVALID"
      | "INTERACTION_BUDGET_EXCEEDED"
      | "INTERACTION_TIMEOUT"
      | "INTERACTION_CANCELLED"
      | "INTERACTION_PAUSED"
      | "INTERACTION_BROWSER_FAILED"
      | "INTERACTION_TARGET_FAILED"
      | "INTERACTION_SIDE_EFFECT_BLOCKED"
      | "INTERACTION_POPUP_BLOCKED"
      | "INTERACTION_DIALOG_BLOCKED"
      | "INTERACTION_TRACE_LIMIT"
      | "INTERACTION_PERSISTENCE_FAILED",
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "InteractionOperationError";
  }
}

export type InteractionTargetDescriptor =
  | { strategy: "role"; role: string; name?: string; exact?: boolean }
  | { strategy: "label"; text: string; exact?: boolean }
  | { strategy: "placeholder"; text: string; exact?: boolean }
  | { strategy: "test-id"; value: string }
  | { strategy: "css"; selector: string }
  | { strategy: "discovery-ref"; reference: string };

export interface InteractionRetryPolicy {
  maxAttempts: number;
  retryableCategories: readonly InteractionFailureCategory[];
}

export interface InteractionPrecondition {
  kind: "visible" | "enabled" | "attached" | "focused" | "url-origin";
  target?: InteractionTargetDescriptor;
  value?: string;
}

export interface InteractionPostcondition {
  kind: "visible" | "hidden" | "enabled" | "focused" | "url-origin" | "dom-change" | "route-change";
  target?: InteractionTargetDescriptor;
  value?: string;
}

export interface InteractionStepBase {
  stepId: string;
  stepType: InteractionStepType;
  timeoutMs?: number;
  preconditions?: readonly InteractionPrecondition[];
  retryPolicy?: InteractionRetryPolicy;
  failurePolicy?: InteractionFailurePolicy;
  postcondition?: InteractionPostcondition;
  sideEffect: InteractionSideEffect;
  tracePolicy?: InteractionTracePolicy;
  maxExecutions?: number;
}

export type InteractionStep =
  | (InteractionStepBase & { stepType: "focus" | "click" | "hover"; target: InteractionTargetDescriptor; button?: "left" | "middle" | "right"; clickCount?: 1 | 2 })
  | (InteractionStepBase & { stepType: "mouse_move"; x: number; y: number; durationMs?: number })
  | (InteractionStepBase & { stepType: "type_text"; target: InteractionTargetDescriptor; text: string; textCategory?: "non-sensitive" | "ephemeral" })
  | (InteractionStepBase & { stepType: "press_key"; key: string })
  | (InteractionStepBase & { stepType: "tab_navigation"; direction: "forward" | "backward"; steps?: number })
  | (InteractionStepBase & { stepType: "incremental_scroll"; direction?: "down" | "up"; distancePx?: number; steps?: number })
  | (InteractionStepBase & { stepType: "wait_for_state"; target: InteractionTargetDescriptor; state: "visible" | "hidden" | "attached" | "detached" })
  | (InteractionStepBase & { stepType: "cookie_banner"; ruleId: string });

export interface InteractionPlan {
  schemaVersion: typeof INTERACTION_PLAN_SCHEMA_VERSION;
  planId: string;
  approved: boolean;
  approvalReason: string;
  steps: readonly InteractionStep[];
}

export type CookieBannerAction = "accept" | "reject" | "dismiss" | "no_action";

export interface CookieBannerRule {
  ruleId: string;
  bannerTarget: InteractionTargetDescriptor;
  action: CookieBannerAction;
  actionTarget?: InteractionTargetDescriptor;
  maxExecutions: number;
}

export interface DialogPolicy {
  defaultAction: "dismiss" | "accept";
  byType: Readonly<Partial<Record<"alert" | "confirm" | "prompt" | "beforeunload", "dismiss" | "accept">>>;
  maximumHandlingDurationMs: number;
}

export interface PopupPolicy {
  defaultAction: "observe-close" | "allow-in-scope";
  allowedOrigins: readonly string[];
  maximumHandlingDurationMs: number;
}

export interface InteractionProfile {
  schemaVersion: typeof INTERACTION_PROFILE_SCHEMA_VERSION;
  profileId: string;
  profileRevisionId: string;
  projectId: string | null;
  enabled: boolean;
  mode: InteractionMode;
  seed: string;
  actionDelayMinMs: number;
  actionDelayMaxMs: number;
  typingDelayMinMs: number;
  typingDelayMaxMs: number;
  pointerMoveDurationMinMs: number;
  pointerMoveDurationMaxMs: number;
  incrementalScroll: boolean;
  scrollStepMinPx: number;
  scrollStepMaxPx: number;
  scrollDelayMinMs: number;
  scrollDelayMaxMs: number;
  maxActionsPerPage: number;
  maxInteractionDurationMs: number;
  maxScrollSteps: number;
  maxTabSteps: number;
  maxPopupsPerPage: number;
  maxDialogsPerPage: number;
  maxTypedTextLength: number;
  maxTargetLength: number;
  maxTraceEvents: number;
  maxTraceBytes: number;
  maxScrollDistancePx: number;
  dialogPolicy: DialogPolicy;
  popupPolicy: PopupPolicy;
  cookieBannerRules: readonly CookieBannerRule[];
}

export interface InteractionValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface InteractionValidationResult<T> {
  valid: boolean;
  value: T | null;
  errors: readonly InteractionValidationIssue[];
}

function issue(code: string, path: string, message: string): InteractionValidationIssue {
  return { code, path, message };
}

interface InteractionInputRecord {
  [key: string]: unknown;
  strategy?: any;
  role?: any;
  name?: any;
  exact?: any;
  text?: any;
  value?: any;
  selector?: any;
  reference?: any;
  min?: any;
  max?: any;
  schemaVersion?: any;
  profileId?: any;
  profileRevisionId?: any;
  projectId?: any;
  seed?: any;
  enabled?: any;
  mode?: any;
  actionDelayMinMs?: any;
  actionDelayMaxMs?: any;
  typingDelayMinMs?: any;
  typingDelayMaxMs?: any;
  pointerMoveDurationMinMs?: any;
  pointerMoveDurationMaxMs?: any;
  incrementalScroll?: any;
  scrollStepMinPx?: any;
  scrollStepMaxPx?: any;
  scrollDelayMinMs?: any;
  scrollDelayMaxMs?: any;
  maxActionsPerPage?: any;
  maxInteractionDurationMs?: any;
  maxScrollSteps?: any;
  maxTabSteps?: any;
  maxPopupsPerPage?: any;
  maxDialogsPerPage?: any;
  maxTypedTextLength?: any;
  maxTargetLength?: any;
  maxTraceEvents?: any;
  maxTraceBytes?: any;
  maxScrollDistancePx?: any;
  dialogPolicy?: any;
  popupPolicy?: any;
  defaultAction?: any;
  byType?: any;
  maximumHandlingDurationMs?: any;
  allowedOrigins?: any;
  cookieBannerRules?: any;
  ruleId?: any;
  bannerTarget?: any;
  action?: any;
  actionTarget?: any;
  maxExecutions?: any;
  maxAttempts?: any;
  retryableCategories?: any;
  kind?: any;
  target?: any;
  planId?: any;
  approvalReason?: any;
  approved?: any;
  steps?: any;
  stepId?: any;
  stepType?: any;
  timeoutMs?: any;
  sideEffect?: any;
  failurePolicy?: any;
  retryPolicy?: any;
  tracePolicy?: any;
  preconditions?: any;
  postcondition?: any;
  state?: any;
  button?: any;
  clickCount?: any;
  x?: any;
  y?: any;
  durationMs?: any;
  textCategory?: any;
  key?: any;
  direction?: any;
  distancePx?: any;
}

function isRecord(value: unknown): value is InteractionInputRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, path: string, maximum: number, errors: InteractionValidationIssue[], required = true): string | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string" || value.length === 0 || value.length > maximum || /[\u0000-\u001f\u007f]/.test(value)) {
    errors.push(issue("INTERACTION_STRING_INVALID", path, `The value must be a bounded string of at most ${maximum} characters without control characters.`));
    return undefined;
  }
  return value;
}

function boundedInteger(value: unknown, path: string, minimum: number, maximum: number, errors: InteractionValidationIssue[], required = true): number | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) {
    errors.push(issue("INTERACTION_INTEGER_INVALID", path, `The value must be an integer between ${minimum} and ${maximum}.`));
    return undefined;
  }
  return value;
}

function validateTarget(value: unknown, path: string, errors: InteractionValidationIssue[], maximum = INTERACTION_HARD_LIMITS.maximumTargetLength): InteractionTargetDescriptor | null {
  if (!isRecord(value) || typeof value.strategy !== "string") {
    errors.push(issue("INTERACTION_TARGET_INVALID", path, "The target descriptor is invalid."));
    return null;
  }
  const strategy = value.strategy;
  if (!["role", "label", "placeholder", "test-id", "css", "discovery-ref"].includes(strategy)) {
    errors.push(issue("INTERACTION_TARGET_STRATEGY_INVALID", `${path}.strategy`, "The target strategy is not approved."));
    return null;
  }
  if (strategy === "role") {
    const role = boundedString(value.role, `${path}.role`, 64, errors);
    const name = boundedString(value.name, `${path}.name`, maximum, errors, false);
    if (role === undefined) return null;
    return { strategy: "role", role, ...(name === undefined ? {} : { name }), ...(typeof value.exact === "boolean" ? { exact: value.exact } : {}) };
  }
  if (strategy === "label" || strategy === "placeholder") {
    const text = boundedString(value.text, `${path}.text`, maximum, errors);
    if (text === undefined) return null;
    return { strategy, text, ...(typeof value.exact === "boolean" ? { exact: value.exact } : {}) };
  }
  if (strategy === "test-id") {
    const id = boundedString(value.value, `${path}.value`, maximum, errors);
    return id === undefined ? null : { strategy, value: id };
  }
  if (strategy === "css") {
    const selector = boundedString(value.selector, `${path}.selector`, maximum, errors);
    if (selector === undefined) return null;
    if (/^javascript\s*:/i.test(selector) || /[{};]/.test(selector)) {
      errors.push(issue("INTERACTION_SELECTOR_UNSAFE", `${path}.selector`, "JavaScript and declaration-like selectors are not allowed."));
      return null;
    }
    return { strategy, selector };
  }
  const reference = boundedString(value.reference, `${path}.reference`, maximum, errors);
  if (reference !== undefined && !/^[A-Za-z0-9._:-]+$/.test(reference)) {
    errors.push(issue("INTERACTION_DISCOVERY_REF_INVALID", `${path}.reference`, "Discovery references must use the approved identifier alphabet."));
    return null;
  }
  return reference === undefined ? null : { strategy: "discovery-ref", reference };
}

function validateDelayPair(value: unknown, path: string, errors: InteractionValidationIssue[], maximum = INTERACTION_HARD_LIMITS.maximumDelayMs): { min: number; max: number } | null {
  if (!isRecord(value)) {
    errors.push(issue("INTERACTION_DELAY_INVALID", path, "A delay range is required."));
    return null;
  }
  const min = boundedInteger(value.min, `${path}.min`, 0, maximum, errors);
  const max = boundedInteger(value.max, `${path}.max`, 0, maximum, errors);
  if (min !== undefined && max !== undefined && min > max) errors.push(issue("INTERACTION_DELAY_ORDER_INVALID", path, "The minimum delay must not exceed the maximum delay."));
  return min === undefined || max === undefined ? null : { min, max };
}

function validateProfileShape(value: unknown): InteractionValidationResult<InteractionProfile> {
  const errors: InteractionValidationIssue[] = [];
  if (!isRecord(value)) return { valid: false, value: null, errors: [issue("INTERACTION_PROFILE_INVALID", "profile", "An interaction profile object is required.")] };
  if (value.schemaVersion !== INTERACTION_PROFILE_SCHEMA_VERSION) errors.push(issue("INTERACTION_PROFILE_VERSION_UNSUPPORTED", "schemaVersion", "The interaction profile schema version is unsupported."));
  const profileId = boundedString(value.profileId, "profileId", 128, errors);
  const profileRevisionId = boundedString(value.profileRevisionId, "profileRevisionId", 128, errors);
  const projectId = value.projectId === null ? null : boundedString(value.projectId, "projectId", 128, errors);
  const seed = boundedString(value.seed, "seed", 128, errors);
  if (typeof value.enabled !== "boolean") errors.push(issue("INTERACTION_BOOLEAN_INVALID", "enabled", "Enabled must be boolean."));
  if (value.mode !== "disabled" && value.mode !== "human-paced") errors.push(issue("INTERACTION_MODE_INVALID", "mode", "Mode must be disabled or human-paced."));
  const action = validateDelayPair({ min: value.actionDelayMinMs, max: value.actionDelayMaxMs }, "actionDelay", errors);
  const typing = validateDelayPair({ min: value.typingDelayMinMs, max: value.typingDelayMaxMs }, "typingDelay", errors);
  const pointer = validateDelayPair({ min: value.pointerMoveDurationMinMs, max: value.pointerMoveDurationMaxMs }, "pointerMoveDuration", errors, INTERACTION_HARD_LIMITS.maximumPointerDurationMs);
  const scroll = validateDelayPair({ min: value.scrollStepMinPx, max: value.scrollStepMaxPx }, "scrollStep", errors, INTERACTION_HARD_LIMITS.maximumScrollStepPx);
  const scrollDelay = validateDelayPair({ min: value.scrollDelayMinMs, max: value.scrollDelayMaxMs }, "scrollDelay", errors);
  const maxActions = boundedInteger(value.maxActionsPerPage, "maxActionsPerPage", 0, INTERACTION_HARD_LIMITS.maximumActionsPerPage, errors);
  const maxDuration = boundedInteger(value.maxInteractionDurationMs, "maxInteractionDurationMs", 0, INTERACTION_HARD_LIMITS.maximumInteractionDurationMs, errors);
  const maxScrollSteps = boundedInteger(value.maxScrollSteps, "maxScrollSteps", 0, INTERACTION_HARD_LIMITS.maximumScrollSteps, errors);
  const maxTabSteps = boundedInteger(value.maxTabSteps, "maxTabSteps", 0, INTERACTION_HARD_LIMITS.maximumTabSteps, errors);
  const maxPopups = boundedInteger(value.maxPopupsPerPage, "maxPopupsPerPage", 0, INTERACTION_HARD_LIMITS.maximumPopupsPerPage, errors);
  const maxDialogs = boundedInteger(value.maxDialogsPerPage, "maxDialogsPerPage", 0, INTERACTION_HARD_LIMITS.maximumDialogsPerPage, errors);
  const maxTypedText = boundedInteger(value.maxTypedTextLength, "maxTypedTextLength", 0, INTERACTION_HARD_LIMITS.maximumTypedTextLength, errors);
  const maxTarget = boundedInteger(value.maxTargetLength, "maxTargetLength", 1, INTERACTION_HARD_LIMITS.maximumTargetLength, errors);
  const maxTraceEvents = boundedInteger(value.maxTraceEvents, "maxTraceEvents", 1, INTERACTION_HARD_LIMITS.maximumTraceEvents, errors);
  const maxTraceBytes = boundedInteger(value.maxTraceBytes, "maxTraceBytes", 1, INTERACTION_HARD_LIMITS.maximumTraceBytes, errors);
  const maxScrollDistance = boundedInteger(value.maxScrollDistancePx, "maxScrollDistancePx", 0, INTERACTION_HARD_LIMITS.maximumScrollDistancePx, errors);
  if (typeof value.incrementalScroll !== "boolean") errors.push(issue("INTERACTION_BOOLEAN_INVALID", "incrementalScroll", "Incremental scrolling must be boolean."));
  const rawDialogPolicy = isRecord(value.dialogPolicy) ? value.dialogPolicy : null;
  const rawDialogByType = rawDialogPolicy !== null && isRecord(rawDialogPolicy.byType) ? rawDialogPolicy.byType : null;
  if (rawDialogPolicy === null) errors.push(issue("INTERACTION_DIALOG_POLICY_INVALID", "dialogPolicy", "Dialog policy is required."));
  if (rawDialogPolicy !== null && rawDialogPolicy.defaultAction !== "dismiss" && rawDialogPolicy.defaultAction !== "accept") errors.push(issue("INTERACTION_DIALOG_POLICY_INVALID", "dialogPolicy.defaultAction", "Dialog default action is invalid."));
  if (rawDialogPolicy !== null && rawDialogByType === null) errors.push(issue("INTERACTION_DIALOG_POLICY_INVALID", "dialogPolicy.byType", "Dialog type policy must be an object."));
  const dialogByType: Partial<Record<"alert" | "confirm" | "prompt" | "beforeunload", "dismiss" | "accept">> = {};
  if (rawDialogByType !== null) for (const [key, actionValue] of Object.entries(rawDialogByType)) {
    if (!["alert", "confirm", "prompt", "beforeunload"].includes(key) || (actionValue !== "accept" && actionValue !== "dismiss")) errors.push(issue("INTERACTION_DIALOG_POLICY_INVALID", `dialogPolicy.byType.${key}`, "Dialog type action is invalid."));
    else dialogByType[key as keyof DialogPolicy["byType"]] = actionValue;
  }
  const dialogMaximum = rawDialogPolicy === null ? undefined : boundedInteger(rawDialogPolicy.maximumHandlingDurationMs, "dialogPolicy.maximumHandlingDurationMs", 1, 30_000, errors);
  const rawPopupPolicy = isRecord(value.popupPolicy) ? value.popupPolicy : null;
  if (rawPopupPolicy === null) errors.push(issue("INTERACTION_POPUP_POLICY_INVALID", "popupPolicy", "Popup policy is required."));
  if (rawPopupPolicy !== null && rawPopupPolicy.defaultAction !== "observe-close" && rawPopupPolicy.defaultAction !== "allow-in-scope") errors.push(issue("INTERACTION_POPUP_POLICY_INVALID", "popupPolicy.defaultAction", "Popup default action is invalid."));
  const allowedOrigins: string[] = [];
  if (rawPopupPolicy !== null && !Array.isArray(rawPopupPolicy.allowedOrigins)) errors.push(issue("INTERACTION_POPUP_POLICY_INVALID", "popupPolicy.allowedOrigins", "Popup allowed origins must be an array."));
  if (rawPopupPolicy !== null && Array.isArray(rawPopupPolicy.allowedOrigins)) rawPopupPolicy.allowedOrigins.forEach((origin: unknown, index: number) => {
    if (typeof origin !== "string" || origin.length === 0 || origin.length > 256 || !/^https?:\/\/[^/?#]+$/.test(origin)) errors.push(issue("INTERACTION_POPUP_ORIGIN_INVALID", `popupPolicy.allowedOrigins.${index}`, "Popup origins must be bounded HTTP(S) origins."));
    else allowedOrigins.push(origin);
  });
  const popupMaximum = rawPopupPolicy === null ? undefined : boundedInteger(rawPopupPolicy.maximumHandlingDurationMs, "popupPolicy.maximumHandlingDurationMs", 1, 30_000, errors);
  const dialogPolicy: DialogPolicy = {
    defaultAction: rawDialogPolicy?.defaultAction === "accept" ? "accept" : "dismiss",
    byType: dialogByType,
    maximumHandlingDurationMs: dialogMaximum ?? 2_000,
  };
  const popupPolicy: PopupPolicy = {
    defaultAction: rawPopupPolicy?.defaultAction === "allow-in-scope" ? "allow-in-scope" : "observe-close",
    allowedOrigins,
    maximumHandlingDurationMs: popupMaximum ?? 2_000,
  };
  const rules: CookieBannerRule[] = [];
  if (!Array.isArray(value.cookieBannerRules) || value.cookieBannerRules.length > 50) errors.push(issue("INTERACTION_COOKIE_RULES_INVALID", "cookieBannerRules", "Cookie Banner rules must be a bounded array."));
  else value.cookieBannerRules.forEach((rawRule, index) => {
    if (!isRecord(rawRule)) { errors.push(issue("INTERACTION_COOKIE_RULE_INVALID", `cookieBannerRules.${index}`, "Cookie Banner rule is invalid.")); return; }
    const ruleId = boundedString(rawRule.ruleId, `cookieBannerRules.${index}.ruleId`, 80, errors);
    const bannerTarget = validateTarget(rawRule.bannerTarget, `cookieBannerRules.${index}.bannerTarget`, errors, maxTarget ?? INTERACTION_HARD_LIMITS.maximumTargetLength);
    const actionValue = rawRule.action;
    if (actionValue !== "accept" && actionValue !== "reject" && actionValue !== "dismiss" && actionValue !== "no_action") errors.push(issue("INTERACTION_COOKIE_ACTION_INVALID", `cookieBannerRules.${index}.action`, "Cookie Banner action is not approved."));
    const actionTarget = rawRule.actionTarget === undefined ? undefined : validateTarget(rawRule.actionTarget, `cookieBannerRules.${index}.actionTarget`, errors, maxTarget ?? INTERACTION_HARD_LIMITS.maximumTargetLength);
    if (["accept", "reject", "dismiss"].includes(String(actionValue)) && (actionTarget === undefined || actionTarget === null)) errors.push(issue("INTERACTION_COOKIE_ACTION_TARGET_REQUIRED", `cookieBannerRules.${index}.actionTarget`, "An explicit Cookie Banner action target is required."));
    const maxExecutions = boundedInteger(rawRule.maxExecutions, `cookieBannerRules.${index}.maxExecutions`, 1, 3, errors);
    if (ruleId !== undefined && bannerTarget !== null && maxExecutions !== undefined && ["accept", "reject", "dismiss", "no_action"].includes(String(actionValue)) && (actionValue === "no_action" || actionTarget !== undefined && actionTarget !== null)) rules.push({ ruleId, bannerTarget, action: actionValue as CookieBannerAction, ...(actionTarget === undefined || actionTarget === null ? {} : { actionTarget }), maxExecutions });
  });
  if (new Set(rules.map((rule) => rule.ruleId)).size !== rules.length) errors.push(issue("INTERACTION_COOKIE_RULE_DUPLICATE", "cookieBannerRules", "Cookie Banner rule IDs must be unique."));
  if (["human-paced", "disabled"].includes(String(value.mode)) && value.enabled === true && value.mode === "disabled") errors.push(issue("INTERACTION_MODE_CONFLICT", "mode", "An enabled profile must use human-paced mode."));
  if (errors.length > 0 || profileId === undefined || profileRevisionId === undefined || seed === undefined || action === null || typing === null || pointer === null || scroll === null || scrollDelay === null || maxActions === undefined || maxDuration === undefined || maxScrollSteps === undefined || maxTabSteps === undefined || maxPopups === undefined || maxDialogs === undefined || maxTypedText === undefined || maxTarget === undefined || maxTraceEvents === undefined || maxTraceBytes === undefined || maxScrollDistance === undefined) return { valid: false, value: null, errors };
  return {
    valid: true,
    errors: [],
    value: {
      schemaVersion: INTERACTION_PROFILE_SCHEMA_VERSION, profileId, profileRevisionId, projectId: projectId ?? null,
      enabled: value.enabled as boolean, mode: value.mode as InteractionMode, seed,
      actionDelayMinMs: action.min, actionDelayMaxMs: action.max, typingDelayMinMs: typing.min, typingDelayMaxMs: typing.max,
      pointerMoveDurationMinMs: pointer.min, pointerMoveDurationMaxMs: pointer.max, incrementalScroll: value.incrementalScroll as boolean,
      scrollStepMinPx: scroll.min, scrollStepMaxPx: scroll.max, scrollDelayMinMs: scrollDelay.min, scrollDelayMaxMs: scrollDelay.max,
      maxActionsPerPage: maxActions, maxInteractionDurationMs: maxDuration, maxScrollSteps, maxTabSteps, maxPopupsPerPage: maxPopups,
      maxDialogsPerPage: maxDialogs, maxTypedTextLength: maxTypedText, maxTargetLength: maxTarget, maxTraceEvents, maxTraceBytes,
      maxScrollDistancePx: maxScrollDistance, dialogPolicy, popupPolicy, cookieBannerRules: rules,
    },
  };
}

export function validateInteractionProfile(value: unknown): InteractionValidationResult<InteractionProfile> {
  return validateProfileShape(value);
}

export function parseInteractionProfile(value: unknown): InteractionProfile {
  const result = validateInteractionProfile(value);
  if (!result.valid || result.value === null) throw new InteractionOperationError("INTERACTION_PROFILE_INVALID", "The Interaction Profile is invalid.");
  return result.value;
}

export function createDisabledInteractionProfile(input: { profileId?: string; profileRevisionId?: string; projectId?: string | null } = {}): InteractionProfile {
  return {
    schemaVersion: INTERACTION_PROFILE_SCHEMA_VERSION, profileId: input.profileId ?? "disabled-default", profileRevisionId: input.profileRevisionId ?? "disabled-default", projectId: input.projectId ?? null,
    enabled: false, mode: "disabled", seed: "disabled-default", actionDelayMinMs: 0, actionDelayMaxMs: 0, typingDelayMinMs: 0, typingDelayMaxMs: 0,
    pointerMoveDurationMinMs: 0, pointerMoveDurationMaxMs: 0, incrementalScroll: false, scrollStepMinPx: 0, scrollStepMaxPx: 0, scrollDelayMinMs: 0, scrollDelayMaxMs: 0,
    maxActionsPerPage: 0, maxInteractionDurationMs: 0, maxScrollSteps: 0, maxTabSteps: 0, maxPopupsPerPage: 0, maxDialogsPerPage: 0,
    maxTypedTextLength: 0, maxTargetLength: INTERACTION_HARD_LIMITS.maximumTargetLength, maxTraceEvents: 1, maxTraceBytes: 8_192, maxScrollDistancePx: 0,
    dialogPolicy: { defaultAction: "dismiss", byType: {}, maximumHandlingDurationMs: 1_000 }, popupPolicy: { defaultAction: "observe-close", allowedOrigins: [], maximumHandlingDurationMs: 1_000 }, cookieBannerRules: [],
  };
}

export function createHumanPacedInteractionProfile(input: { profileId: string; profileRevisionId: string; projectId?: string | null; seed?: string }): InteractionProfile {
  const value: InteractionProfile = {
    schemaVersion: INTERACTION_PROFILE_SCHEMA_VERSION, profileId: input.profileId, profileRevisionId: input.profileRevisionId, projectId: input.projectId ?? null,
    enabled: true, mode: "human-paced", seed: input.seed ?? "phase-10-default", actionDelayMinMs: 400, actionDelayMaxMs: 1_200, typingDelayMinMs: 70, typingDelayMaxMs: 180,
    pointerMoveDurationMinMs: 80, pointerMoveDurationMaxMs: 350, incrementalScroll: true, scrollStepMinPx: 240, scrollStepMaxPx: 720, scrollDelayMinMs: 250, scrollDelayMaxMs: 900,
    maxActionsPerPage: 50, maxInteractionDurationMs: 120_000, maxScrollSteps: 30, maxTabSteps: 30, maxPopupsPerPage: 3, maxDialogsPerPage: 5,
    maxTypedTextLength: 2_048, maxTargetLength: 512, maxTraceEvents: 250, maxTraceBytes: 128_000, maxScrollDistancePx: 20_000,
    dialogPolicy: { defaultAction: "dismiss", byType: {}, maximumHandlingDurationMs: 2_000 }, popupPolicy: { defaultAction: "observe-close", allowedOrigins: [], maximumHandlingDurationMs: 2_000 }, cookieBannerRules: [],
  };
  return parseInteractionProfile(value);
}

function validateRetryPolicy(value: unknown, path: string, errors: InteractionValidationIssue[]): InteractionRetryPolicy {
  if (!isRecord(value)) return { maxAttempts: 1, retryableCategories: [] };
  const maxAttempts = boundedInteger(value.maxAttempts, `${path}.maxAttempts`, 1, 3, errors) ?? 1;
  const allowed = new Set<InteractionFailureCategory>(["timeout", "browser", "target", "unknown"]);
  const retryableCategories = Array.isArray(value.retryableCategories) ? value.retryableCategories.filter((entry): entry is InteractionFailureCategory => typeof entry === "string" && allowed.has(entry as InteractionFailureCategory)) : [];
  return { maxAttempts, retryableCategories };
}

function validatePreconditions(value: unknown, path: string, errors: InteractionValidationIssue[], maxTarget: number): readonly InteractionPrecondition[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 10) { errors.push(issue("INTERACTION_PRECONDITIONS_INVALID", path, "Preconditions must be a bounded array.")); return []; }
  return value.flatMap((raw, index): InteractionPrecondition[] => {
    if (!isRecord(raw) || !["visible", "enabled", "attached", "focused", "url-origin"].includes(String(raw.kind))) { errors.push(issue("INTERACTION_PRECONDITION_INVALID", `${path}.${index}`, "Precondition is invalid.")); return []; }
    const kind = raw.kind as InteractionPrecondition["kind"];
    if (kind === "url-origin") {
      const valueText = boundedString(raw.value, `${path}.${index}.value`, maxTarget, errors);
      return valueText === undefined ? [] : [{ kind, value: valueText }];
    }
    const target = validateTarget(raw.target, `${path}.${index}.target`, errors, maxTarget);
    return target === null ? [] : [{ kind, target }];
  });
}

function validatePostcondition(value: unknown, path: string, errors: InteractionValidationIssue[], maxTarget: number): InteractionPostcondition | null {
  if (!isRecord(value) || !["visible", "hidden", "enabled", "focused", "url-origin", "dom-change", "route-change"].includes(String(value.kind))) {
    errors.push(issue("INTERACTION_POSTCONDITION_INVALID", path, "Postcondition is invalid."));
    return null;
  }
  const kind = value.kind as InteractionPostcondition["kind"];
  if (kind === "url-origin") {
    const origin = boundedString(value.value, `${path}.value`, maxTarget, errors);
    return origin === undefined ? null : { kind, value: origin };
  }
  if (kind === "dom-change" || kind === "route-change") return { kind };
  const target = validateTarget(value.target, `${path}.target`, errors, maxTarget);
  return target === null ? null : { kind, target };
}

export function validateInteractionPlan(value: unknown, profile: InteractionProfile): InteractionValidationResult<InteractionPlan> {
  const errors: InteractionValidationIssue[] = [];
  if (!isRecord(value)) return { valid: false, value: null, errors: [issue("INTERACTION_PLAN_INVALID", "plan", "An interaction plan object is required.")] };
  if (value.schemaVersion !== INTERACTION_PLAN_SCHEMA_VERSION) errors.push(issue("INTERACTION_PLAN_VERSION_UNSUPPORTED", "schemaVersion", "The interaction plan schema version is unsupported."));
  const planId = boundedString(value.planId, "planId", 128, errors);
  const approvalReason = boundedString(value.approvalReason, "approvalReason", 256, errors);
  if (value.approved !== true) errors.push(issue("INTERACTION_PLAN_NOT_APPROVED", "approved", "Only explicitly approved interaction plans may execute."));
  if (!Array.isArray(value.steps) || value.steps.length > Math.min(profile.maxActionsPerPage, INTERACTION_HARD_LIMITS.maximumPlanSteps)) errors.push(issue("INTERACTION_PLAN_STEPS_INVALID", "steps", "The interaction plan exceeds its configured action bound."));
  const steps: InteractionStep[] = [];
  const stepIds = new Set<string>();
  if (Array.isArray(value.steps)) value.steps.forEach((rawStep, index) => {
    if (!isRecord(rawStep)) { errors.push(issue("INTERACTION_STEP_INVALID", `steps.${index}`, "Interaction step is invalid.")); return; }
    const stepId = boundedString(rawStep.stepId, `steps.${index}.stepId`, 80, errors);
    const stepType = rawStep.stepType;
    if (stepId !== undefined && stepIds.has(stepId)) errors.push(issue("INTERACTION_STEP_DUPLICATE", `steps.${index}.stepId`, "Step identifiers must be unique."));
    if (stepId !== undefined) stepIds.add(stepId);
    if (!(["focus", "click", "hover", "mouse_move", "type_text", "press_key", "tab_navigation", "incremental_scroll", "wait_for_state", "cookie_banner"] as readonly string[]).includes(String(stepType))) { errors.push(issue("INTERACTION_STEP_TYPE_INVALID", `steps.${index}.stepType`, "The step type is not approved.")); return; }
    const timeoutMs = boundedInteger(rawStep.timeoutMs, `steps.${index}.timeoutMs`, 1, Math.min(profile.maxInteractionDurationMs, INTERACTION_HARD_LIMITS.maximumStepTimeoutMs), errors, false) ?? Math.min(30_000, profile.maxInteractionDurationMs);
    const sideEffect = rawStep.sideEffect;
    if (sideEffect !== "read-only" && sideEffect !== "navigation") errors.push(issue("INTERACTION_SIDE_EFFECT_INVALID", `steps.${index}.sideEffect`, "Only read-only or navigation side effects are allowed."));
    const failurePolicy = ["stop", "skip", "retry"].includes(String(rawStep.failurePolicy)) ? rawStep.failurePolicy as InteractionFailurePolicy : "stop";
    const tracePolicy = rawStep.tracePolicy === "none" ? "none" : "metadata";
    const maxExecutions = boundedInteger(rawStep.maxExecutions, `steps.${index}.maxExecutions`, 1, 3, errors, false) ?? 1;
    const postcondition = rawStep.postcondition === undefined ? undefined : validatePostcondition(rawStep.postcondition, `steps.${index}.postcondition`, errors, profile.maxTargetLength);
    const base: InteractionStepBase = { stepId: stepId ?? `invalid-${index}`, stepType: stepType as InteractionStepType, timeoutMs, preconditions: validatePreconditions(rawStep.preconditions, `steps.${index}.preconditions`, errors, profile.maxTargetLength), retryPolicy: validateRetryPolicy(rawStep.retryPolicy, `steps.${index}.retryPolicy`, errors), failurePolicy: failurePolicy as InteractionFailurePolicy, ...(postcondition === undefined || postcondition === null ? {} : { postcondition }), sideEffect: sideEffect as InteractionSideEffect, tracePolicy: tracePolicy as InteractionTracePolicy, maxExecutions };
    if (["focus", "click", "hover", "wait_for_state"].includes(String(stepType))) {
      const target = validateTarget(rawStep.target, `steps.${index}.target`, errors, profile.maxTargetLength);
      if (target === null) return;
      if (stepType === "wait_for_state") {
        if (!["visible", "hidden", "attached", "detached"].includes(String(rawStep.state))) errors.push(issue("INTERACTION_STATE_INVALID", `steps.${index}.state`, "Wait state is invalid."));
        else steps.push({ ...base, stepType: "wait_for_state", target, state: rawStep.state as "visible" | "hidden" | "attached" | "detached" });
      } else if (stepType === "click") {
        if (rawStep.button !== undefined && !["left", "middle", "right"].includes(String(rawStep.button))) errors.push(issue("INTERACTION_BUTTON_INVALID", `steps.${index}.button`, "Mouse button is invalid."));
        if (rawStep.clickCount !== undefined && rawStep.clickCount !== 1 && rawStep.clickCount !== 2) errors.push(issue("INTERACTION_CLICK_COUNT_INVALID", `steps.${index}.clickCount`, "Click count is invalid."));
        steps.push({ ...base, stepType: "click", target, ...(rawStep.button === undefined ? {} : { button: rawStep.button as "left" | "middle" | "right" }), ...(rawStep.clickCount === undefined ? {} : { clickCount: rawStep.clickCount as 1 | 2 }) });
      } else steps.push({ ...base, stepType: stepType as "focus" | "hover", target });
    } else if (stepType === "mouse_move") {
      const x = boundedInteger(rawStep.x, `steps.${index}.x`, 0, 16_384, errors);
      const y = boundedInteger(rawStep.y, `steps.${index}.y`, 0, 16_384, errors);
      const durationMs = boundedInteger(rawStep.durationMs, `steps.${index}.durationMs`, 0, INTERACTION_HARD_LIMITS.maximumPointerDurationMs, errors, false);
      if (x !== undefined && y !== undefined) steps.push({ ...base, stepType: "mouse_move", x, y, ...(durationMs === undefined ? {} : { durationMs }) });
    } else if (stepType === "type_text") {
      const target = validateTarget(rawStep.target, `steps.${index}.target`, errors, profile.maxTargetLength);
      const text = boundedString(rawStep.text, `steps.${index}.text`, profile.maxTypedTextLength, errors);
      if (text !== undefined && text.length > profile.maxTypedTextLength) errors.push(issue("INTERACTION_TEXT_LIMIT", `steps.${index}.text`, "Typed text exceeds the profile limit."));
      if (target !== null && text !== undefined) steps.push({ ...base, stepType: "type_text", target, text, textCategory: rawStep.textCategory === "ephemeral" ? "ephemeral" : "non-sensitive" });
    } else if (stepType === "press_key") {
      const key = boundedString(rawStep.key, `steps.${index}.key`, 40, errors);
      if (key !== undefined && !isSafeInteractionKey(key)) errors.push(issue("INTERACTION_KEY_INVALID", `steps.${index}.key`, "The key or key combination is not approved."));
      if (key !== undefined && isSafeInteractionKey(key)) steps.push({ ...base, stepType: "press_key", key });
    } else if (stepType === "tab_navigation") {
      const tabSteps = boundedInteger(rawStep.steps, `steps.${index}.steps`, 1, Math.min(profile.maxTabSteps, INTERACTION_HARD_LIMITS.maximumTabSteps), errors, false) ?? 1;
      if (tabSteps > profile.maxTabSteps) errors.push(issue("INTERACTION_TAB_LIMIT", `steps.${index}.steps`, "Tab navigation exceeds the profile limit."));
      if (rawStep.direction !== "forward" && rawStep.direction !== "backward") errors.push(issue("INTERACTION_TAB_DIRECTION_INVALID", `steps.${index}.direction`, "Tab direction is invalid."));
      else steps.push({ ...base, stepType: "tab_navigation", direction: rawStep.direction, steps: tabSteps });
    } else if (stepType === "incremental_scroll") {
      const distancePx = boundedInteger(rawStep.distancePx, `steps.${index}.distancePx`, 0, profile.maxScrollDistancePx, errors, false) ?? profile.scrollStepMaxPx;
      const scrollSteps = boundedInteger(rawStep.steps, `steps.${index}.steps`, 1, Math.min(profile.maxScrollSteps, INTERACTION_HARD_LIMITS.maximumScrollSteps), errors, false) ?? 1;
      if (!profile.incrementalScroll) errors.push(issue("INTERACTION_SCROLL_DISABLED", `steps.${index}`, "Incremental scrolling is disabled by the profile."));
      if (distancePx > profile.maxScrollDistancePx) errors.push(issue("INTERACTION_SCROLL_DISTANCE_LIMIT", `steps.${index}.distancePx`, "Scroll distance exceeds the profile limit."));
      if (scrollSteps > profile.maxScrollSteps) errors.push(issue("INTERACTION_SCROLL_LIMIT", `steps.${index}.steps`, "Scroll steps exceed the profile limit."));
      if (rawStep.direction !== undefined && rawStep.direction !== "down" && rawStep.direction !== "up") errors.push(issue("INTERACTION_SCROLL_DIRECTION_INVALID", `steps.${index}.direction`, "Scroll direction is invalid."));
      else steps.push({ ...base, stepType: "incremental_scroll", direction: rawStep.direction ?? "down", distancePx, steps: scrollSteps });
    } else {
      const ruleId = boundedString(rawStep.ruleId, `steps.${index}.ruleId`, 80, errors);
      if (ruleId !== undefined) {
        const rule = selectCookieBannerRule(profile.cookieBannerRules, ruleId);
        if (rule === null) errors.push(issue("INTERACTION_COOKIE_RULE_NOT_FOUND", `steps.${index}.ruleId`, "The Cookie Banner rule is not explicitly configured."));
        else steps.push({ ...base, stepType: "cookie_banner", ruleId });
      }
    }
  });
  if (errors.length > 0 || planId === undefined || approvalReason === undefined) return { valid: false, value: null, errors };
  return { valid: true, value: { schemaVersion: INTERACTION_PLAN_SCHEMA_VERSION, planId, approved: true, approvalReason, steps }, errors: [] };
}

export function parseInteractionPlan(value: unknown, profile: InteractionProfile): InteractionPlan {
  const result = validateInteractionPlan(value, profile);
  if (!result.valid || result.value === null) throw new InteractionOperationError("INTERACTION_PLAN_INVALID", "The Interaction Plan is invalid.");
  return result.value;
}

export function isSafeInteractionKey(value: string): boolean {
  return /^(?:Tab|Shift\+Tab|Enter|Escape|Space|Backspace|Delete|Home|End|PageUp|PageDown|Arrow(?:Up|Down|Left|Right)|Control\+[A-Za-z0-9]|Alt\+[A-Za-z0-9]|Meta\+[A-Za-z0-9]|Control\+A|Control\+C|Control\+V|Control\+X|Control\+Z)$/i.test(value);
}

export interface InteractionRandomSource {
  next(): number;
}

export function createSeededInteractionRandom(seed: string): InteractionRandomSource {
  let state = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) state = Math.imul(state ^ seed.charCodeAt(index), 16_777_619) >>> 0;
  return {
    next(): number {
      state = (state + 1_835_929) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1) >>> 0;
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
    },
  };
}

export function selectInteractionDelay(minimum: number, maximum: number, random: InteractionRandomSource): number {
  if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum < 0 || minimum > maximum) throw new InteractionOperationError("INTERACTION_PROFILE_INVALID", "The interaction delay range is invalid.");
  return minimum + Math.floor(random.next() * (maximum - minimum + 1));
}

export interface InteractionTimingPort {
  nowMs(): number;
  sleep(milliseconds: number, signal: AbortSignal): Promise<void>;
}

export function createRealInteractionTiming(): InteractionTimingPort {
  return {
    nowMs: () => Date.now(),
    sleep: (milliseconds, signal) => new Promise((resolve, reject) => {
      if (signal.aborted) { reject(new InteractionOperationError("INTERACTION_CANCELLED", "The interaction was cancelled during a delay", true)); return; }
      let timer: ReturnType<typeof setTimeout> | undefined;
      const onAbort = () => { if (timer !== undefined) clearTimeout(timer); signal.removeEventListener("abort", onAbort); reject(new InteractionOperationError("INTERACTION_CANCELLED", "The interaction was cancelled during a delay", true)); };
      timer = setTimeout(() => { signal.removeEventListener("abort", onAbort); resolve(); }, milliseconds);
      signal.addEventListener("abort", onAbort, { once: true });
    }),
  };
}

export interface InteractionBudget {
  readonly startedAtMs: number;
  actions: number;
  scrollSteps: number;
  tabSteps: number;
  popups: number;
  dialogs: number;
  consumeAction(profile: InteractionProfile): void;
  consumeScrollStep(profile: InteractionProfile): void;
  consumeTabStep(profile: InteractionProfile): void;
  consumePopup(profile: InteractionProfile): void;
  consumeDialog(profile: InteractionProfile): void;
  checkDuration(profile: InteractionProfile, nowMs: number): void;
}

export function createInteractionBudget(startedAtMs: number): InteractionBudget {
  const budget: InteractionBudget = {
    startedAtMs, actions: 0, scrollSteps: 0, tabSteps: 0, popups: 0, dialogs: 0,
    consumeAction(profile) { if (++budget.actions > profile.maxActionsPerPage) throw new InteractionOperationError("INTERACTION_BUDGET_EXCEEDED", "The interaction action budget was exhausted"); },
    consumeScrollStep(profile) { if (++budget.scrollSteps > profile.maxScrollSteps) throw new InteractionOperationError("INTERACTION_BUDGET_EXCEEDED", "The interaction scroll-step budget was exhausted"); },
    consumeTabStep(profile) { if (++budget.tabSteps > profile.maxTabSteps) throw new InteractionOperationError("INTERACTION_BUDGET_EXCEEDED", "The interaction Tab budget was exhausted"); },
    consumePopup(profile) { if (++budget.popups > profile.maxPopupsPerPage) throw new InteractionOperationError("INTERACTION_BUDGET_EXCEEDED", "The interaction Popup budget was exhausted"); },
    consumeDialog(profile) { if (++budget.dialogs > profile.maxDialogsPerPage) throw new InteractionOperationError("INTERACTION_BUDGET_EXCEEDED", "The interaction Dialog budget was exhausted"); },
    checkDuration(profile, nowMs) { if (nowMs - budget.startedAtMs > profile.maxInteractionDurationMs) throw new InteractionOperationError("INTERACTION_TIMEOUT", "The interaction duration budget was exhausted", true); },
  };
  return budget;
}

export interface InteractionTraceEvent {
  sequence: number;
  stepId: string | null;
  stepType: InteractionStepType | "dialog" | "popup" | "context" | "plan";
  targetId: string | null;
  startedAt: string;
  endedAt: string;
  effectiveDelayMs: number;
  status: "started" | "completed" | "skipped" | "failed" | "paused" | "cancelled" | "blocked";
  failureCategory: InteractionFailureCategory | null;
  failureCode: string | null;
  navigationOutcome: InteractionNavigationOutcome;
  domChanged: boolean;
  routeChanged: boolean;
  popupOutcome: "none" | "observed-closed" | "allowed" | "blocked";
  dialogOutcome: "none" | "dismissed" | "accepted" | "blocked";
  discoveredUrlCount: number;
  inputCategory: "none" | "non-sensitive" | "ephemeral";
  characterCount: number | null;
  recoveryStatus: "none" | "interrupted" | "uncertain";
}

export interface InteractionTrace {
  schemaVersion: typeof INTERACTION_TRACE_SCHEMA_VERSION;
  traceId: string;
  projectId: string;
  runId: string;
  jobId: string;
  ownerId: string | null;
  fencingGeneration: number;
  profileId: string;
  profileRevisionId: string;
  contextProfileId: string | null;
  createdAt: string;
  completedAt: string | null;
  status: InteractionStatus;
  events: readonly InteractionTraceEvent[];
  truncated: boolean;
  serializedBytes: number;
}

export function interactionTargetId(target: InteractionTargetDescriptor | null | undefined): string | null {
  if (target === undefined || target === null) return null;
  return target.strategy;
}

export class InteractionTraceBuilder {
  private readonly events: InteractionTraceEvent[] = [];
  private truncated = false;
  public constructor(private readonly limits: { maxEvents: number; maxBytes: number }) {}
  public add(event: InteractionTraceEvent): void {
    if (this.truncated) return;
    const next = [...this.events, event];
    const bytes = JSON.stringify(next).length;
    if (next.length > this.limits.maxEvents || bytes > this.limits.maxBytes) { this.truncated = true; return; }
    this.events.push(event);
  }
  public snapshot(): { events: readonly InteractionTraceEvent[]; truncated: boolean; serializedBytes: number } {
    const serializedBytes = JSON.stringify(this.events).length;
    return { events: [...this.events], truncated: this.truncated, serializedBytes };
  }
}

export function redactInteractionTrace(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactInteractionTrace);
  if (!isRecord(value)) return typeof value === "string" ? value.replace(/(?:https?:\/\/[^\s?#]+)(?:\?[^\s#]*)?(?:#[^\s]*)?/gi, (url) => redactSafeInteractionUrl(url)).slice(0, 800) : value;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (/(?:text|password|otp|telephone|phone|cookie|token|authorization|secret|prompt|header|body|value)/i.test(key) && key !== "characterCount" && key !== "inputCategory") output[key] = "[redacted]";
    else output[key] = redactInteractionTrace(child);
  }
  return output;
}

function redactSafeInteractionUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.search = url.search === "" ? "" : "?[redacted]";
    url.hash = "";
    return url.toString();
  } catch { return "[redacted-url]"; }
}

export function selectCookieBannerRule(rules: readonly CookieBannerRule[], ruleId?: string): CookieBannerRule | null {
  if (ruleId === undefined) return null;
  return rules.find((rule) => rule.ruleId === ruleId) ?? null;
}

export function resolveDialogAction(policy: DialogPolicy, type: "alert" | "confirm" | "prompt" | "beforeunload"): "dismiss" | "accept" {
  return policy.byType[type] ?? policy.defaultAction;
}

export function resolvePopupAction(policy: PopupPolicy, origin: string): "close" | "allow" {
  if (policy.defaultAction !== "allow-in-scope") return "close";
  return policy.allowedOrigins.includes(origin) ? "allow" : "close";
}

export interface InteractionRecoveryDecision {
  state: InteractionRecoveryState;
  action: "retry-read-only" | "do-not-replay" | "resume-at-checkpoint" | "mark-completed" | "mark-failed" | "mark-interrupted";
  reasonCode: string;
}

export function decideInteractionRecovery(input: { state: InteractionRecoveryState; sideEffect: InteractionSideEffect; outcomeKnown: boolean; retryable: boolean }): InteractionRecoveryDecision {
  if (input.state === "completed" && input.outcomeKnown) return { state: input.state, action: "mark-completed", reasonCode: "INTERACTION_COMPLETED" };
  if (input.state === "outcome-uncertain" || !input.outcomeKnown) return { state: "outcome-uncertain", action: "do-not-replay", reasonCode: "INTERACTION_OUTCOME_UNCERTAIN" };
  if (input.state === "interrupted") return input.sideEffect === "read-only" && input.retryable
    ? { state: input.state, action: "retry-read-only", reasonCode: "INTERACTION_READ_ONLY_RETRY" }
    : { state: input.state, action: "mark-interrupted", reasonCode: "INTERACTION_INTERRUPTED" };
  if (input.state === "failed" && input.sideEffect === "read-only" && input.retryable) return { state: input.state, action: "retry-read-only", reasonCode: "INTERACTION_READ_ONLY_RETRY" };
  return { state: input.state, action: "mark-failed", reasonCode: "INTERACTION_FAILED" };
}

export function classifyInteractionFailure(error: unknown): { category: InteractionFailureCategory; code: string; retryable: boolean; safeMessage: string } {
  if (error instanceof InteractionOperationError) {
    const category: InteractionFailureCategory = error.code.includes("BUDGET") ? "budget" : error.code.includes("TIMEOUT") ? "timeout" : error.code.includes("CANCELLED") ? "cancellation" : error.code.includes("PAUSED") ? "pause" : error.code.includes("BROWSER") ? "browser" : error.code.includes("BLOCKED") ? "security" : error.code.includes("TARGET") ? "target" : error.code.includes("PROFILE") || error.code.includes("PLAN") || error.code.includes("KEY") ? "validation" : "unknown";
    return { category, code: error.code, retryable: error.retryable, safeMessage: error.message.slice(0, 800) };
  }
  return { category: "unknown", code: "INTERACTION_UNEXPECTED_FAILURE", retryable: true, safeMessage: "The browser interaction failed unexpectedly." };
}

export interface BrowserContextProfileDescriptor {
  version: number;
  profileId: string;
  locale: string;
  timezoneId: string;
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  acceptLanguage: string;
  userAgentPolicy: "fixed";
  headless: boolean;
  digest: string;
}

export interface InteractionExecutionInput {
  profile: InteractionProfile;
  plan: InteractionPlan;
  timing?: InteractionTimingPort;
  signal: AbortSignal;
  now(): string;
  trace: InteractionTraceBuilder;
  projectId: string;
  runId: string;
  jobId: string;
  ownerId?: string | null;
  fencingGeneration: number;
  traceId: string;
  contextProfile: BrowserContextProfileDescriptor;
  shouldPause?: () => Promise<boolean>;
  authorizeUrl?: (url: string) => Promise<boolean>;
}

export interface InteractionExecutionResult {
  trace: InteractionTrace;
  completedStepCount: number;
  status: InteractionStatus;
  failureCategory: InteractionFailureCategory | null;
  failureCode: string | null;
  navigationOutcome: InteractionNavigationOutcome;
  discoveredUrlCount: number;
  contextProfile: BrowserContextProfileDescriptor;
}

export interface InteractionProfileRepositoryPort {
  getInteractionProfile(input: { projectId: string }): Promise<InteractionProfile>;
  saveInteractionProfile(input: { projectId: string; profile: InteractionProfile; operationId: string }): Promise<InteractionProfile>;
}

export interface InteractionTraceRepositoryPort {
  saveInteractionTrace(input: { projectId: string; runId: string; jobId: string; leaseToken: string; fencingGeneration: number; ownerId: string; operationId: string; trace: InteractionTrace }): Promise<InteractionTrace>;
  getInteractionTrace(input: { projectId: string; runId: string; jobId: string; traceId: string }): Promise<InteractionTrace>;
  listInteractionTraces(input: { projectId: string; runId: string; jobId: string; limit: number }): Promise<readonly InteractionTrace[]>;
}

export interface InteractionBrowserSession {
  executeInteractionPlan(input: InteractionExecutionInput): Promise<InteractionExecutionResult>;
  getContextProfile(): BrowserContextProfileDescriptor;
}
