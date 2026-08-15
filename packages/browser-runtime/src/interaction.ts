import {
  classifyInteractionFailure,
  createInteractionBudget,
  createRealInteractionTiming,
  createSeededInteractionRandom,
  InteractionOperationError,
  interactionTargetId,
  parseInteractionPlan,
  parseInteractionProfile,
  resolveDialogAction,
  resolvePopupAction,
  selectCookieBannerRule,
  selectInteractionDelay,
  type BrowserContextProfileDescriptor,
  type InteractionExecutionInput,
  type InteractionExecutionResult,
  type InteractionFailureCategory,
  type InteractionNavigationOutcome,
  type InteractionStep,
  type InteractionTargetDescriptor,
} from "@offline-web-archive/archive-core";
import type { BrowserContext, Dialog, Locator, Page } from "playwright-core";

interface PageSnapshot {
  url: string;
  origin: string;
  domSize: number;
  scrollY: number;
  scrollHeight: number;
}

function safeContextProfile(value: BrowserContextProfileDescriptor): BrowserContextProfileDescriptor {
  return {
    version: value.version,
    profileId: value.profileId.slice(0, 128),
    locale: value.locale.slice(0, 64),
    timezoneId: value.timezoneId.slice(0, 64),
    viewport: { width: value.viewport.width, height: value.viewport.height },
    deviceScaleFactor: value.deviceScaleFactor,
    acceptLanguage: value.acceptLanguage.slice(0, 128),
    userAgentPolicy: "fixed",
    headless: value.headless,
    digest: value.digest.slice(0, 128),
  };
}

async function snapshot(page: Page): Promise<PageSnapshot> {
  return page.evaluate(() => ({
    url: window.location.href,
    origin: window.location.origin,
    domSize: document.documentElement?.innerHTML.length ?? 0,
    scrollY: Math.round(window.scrollY),
    scrollHeight: document.documentElement?.scrollHeight ?? 0,
  }));
}

function navigationOutcome(before: PageSnapshot, after: PageSnapshot): InteractionNavigationOutcome {
  if (before.url === after.url) return before.domSize === after.domSize ? "none" : "dom-change";
  return before.origin === after.origin ? "spa-route" : "full-navigation";
}

function escapedAttributeValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function locatorFor(page: Page, target: InteractionTargetDescriptor): Locator {
  switch (target.strategy) {
    case "role":
      return page.getByRole(target.role as Parameters<Page["getByRole"]>[0], { ...(target.name === undefined ? {} : { name: target.name }), ...(target.exact === undefined ? {} : { exact: target.exact }) });
    case "label":
      return page.getByLabel(target.text, { ...(target.exact === undefined ? {} : { exact: target.exact }) });
    case "placeholder":
      return page.getByPlaceholder(target.text, { ...(target.exact === undefined ? {} : { exact: target.exact }) });
    case "test-id":
      return page.getByTestId(target.value);
    case "css":
      return page.locator(target.selector);
    case "discovery-ref":
      return page.locator(`[data-owa-discovery-ref="${escapedAttributeValue(target.reference)}"]`);
  }
}

async function uniqueLocator(page: Page, target: InteractionTargetDescriptor, requireVisible: boolean): Promise<Locator> {
  const locator = locatorFor(page, target);
  const count = await locator.count();
  if (count !== 1) throw new InteractionOperationError("INTERACTION_TARGET_FAILED", "The approved interaction target was not unique", true);
  if (requireVisible && !(await locator.isVisible())) throw new InteractionOperationError("INTERACTION_TARGET_FAILED", "The approved interaction target is not visible", true);
  return locator;
}

async function assertPreconditions(page: Page, step: InteractionStep): Promise<void> {
  for (const precondition of step.preconditions ?? []) {
    if (precondition.kind === "url-origin") {
      if (precondition.value === undefined || new URL(page.url()).origin !== precondition.value) throw new InteractionOperationError("INTERACTION_TARGET_FAILED", "The interaction URL precondition was not satisfied");
      continue;
    }
    if (precondition.target === undefined) throw new InteractionOperationError("INTERACTION_TARGET_FAILED", "The interaction precondition has no target");
    const locator = await uniqueLocator(page, precondition.target, false);
    if (precondition.kind === "visible" && !(await locator.isVisible())) throw new InteractionOperationError("INTERACTION_TARGET_FAILED", "The interaction visibility precondition was not satisfied");
    if (precondition.kind === "enabled" && !(await locator.isEnabled())) throw new InteractionOperationError("INTERACTION_TARGET_FAILED", "The interaction enabled precondition was not satisfied");
    if (precondition.kind === "focused" && !(await locator.evaluate((element) => element === document.activeElement))) throw new InteractionOperationError("INTERACTION_TARGET_FAILED", "The interaction focus precondition was not satisfied");
  }
}

async function assertPostcondition(page: Page, step: InteractionStep): Promise<void> {
  const postcondition = step.postcondition;
  if (postcondition === undefined) return;
  if (postcondition.kind === "url-origin") {
    if (postcondition.value === undefined || new URL(page.url()).origin !== postcondition.value) throw new InteractionOperationError("INTERACTION_TARGET_FAILED", "The interaction URL postcondition was not satisfied");
    return;
  }
  if (postcondition.kind === "dom-change" || postcondition.kind === "route-change") return;
  if (postcondition.target === undefined) throw new InteractionOperationError("INTERACTION_TARGET_FAILED", "The interaction postcondition has no target");
  const locator = locatorFor(page, postcondition.target);
  const count = await locator.count();
  if (postcondition.kind === "visible" && (count !== 1 || !(await locator.isVisible()))) throw new InteractionOperationError("INTERACTION_TARGET_FAILED", "The interaction visible postcondition was not satisfied");
  if (postcondition.kind === "hidden" && count === 1 && await locator.isVisible()) throw new InteractionOperationError("INTERACTION_TARGET_FAILED", "The interaction hidden postcondition was not satisfied");
  if (postcondition.kind === "enabled" && (count !== 1 || !(await locator.isEnabled()))) throw new InteractionOperationError("INTERACTION_TARGET_FAILED", "The interaction enabled postcondition was not satisfied");
  if (postcondition.kind === "focused" && (count !== 1 || !(await locator.evaluate((element) => element === document.activeElement)))) throw new InteractionOperationError("INTERACTION_TARGET_FAILED", "The interaction focus postcondition was not satisfied");
}

async function assertReadOnlyClickTarget(locator: Locator): Promise<void> {
  const metadata = await locator.evaluate((element) => ({
    tagName: element.tagName,
    type: element.getAttribute("type"),
    href: element.getAttribute("href"),
    explicit: element.getAttribute("data-owa-read-only") === "true" || element.getAttribute("data-owa-interaction") === "navigation",
  }));
  if (metadata.type?.toLowerCase() === "submit" || metadata.tagName === "FORM") throw new InteractionOperationError("INTERACTION_SIDE_EFFECT_BLOCKED", "Form submission is not an approved Phase 10 interaction");
  if (metadata.tagName !== "A" && !metadata.explicit) throw new InteractionOperationError("INTERACTION_SIDE_EFFECT_BLOCKED", "The clicked element does not carry an explicit read-only interaction marker");
  if (metadata.href !== null && /^javascript:/i.test(metadata.href)) throw new InteractionOperationError("INTERACTION_SIDE_EFFECT_BLOCKED", "JavaScript navigation is not an approved interaction");
}

async function waitForState(locator: Locator, state: "visible" | "hidden" | "attached" | "detached", timeoutMs: number): Promise<void> {
  await locator.waitFor({ state, timeout: timeoutMs });
}

function statusFromFailure(error: unknown): { status: "failed" | "paused" | "cancelled" | "outcome-uncertain"; category: InteractionFailureCategory; code: string } {
  const failure = classifyInteractionFailure(error);
  if (failure.category === "pause") return { status: "paused", category: failure.category, code: failure.code };
  if (failure.category === "cancellation") return { status: "cancelled", category: failure.category, code: failure.code };
  if (failure.code === "INTERACTION_BROWSER_FAILED") return { status: "outcome-uncertain", category: failure.category, code: failure.code };
  return { status: "failed", category: failure.category, code: failure.code };
}

export interface PlaywrightInteractionHandlers {
  setDialogHandler(handler: (dialog: Dialog) => Promise<void>): void;
  setPopupHandler(handler: (popup: Page) => Promise<void>): void;
  prepareForPotentialPopup?(timeoutMs: number): void;
  waitForHandlers?(): Promise<void>;
  clearHandlers(): void;
  isCrashed(): boolean;
}

export async function executePlaywrightInteractionPlan(
  page: Page,
  handlers: PlaywrightInteractionHandlers,
  input: InteractionExecutionInput,
): Promise<InteractionExecutionResult> {
  const profile = parseInteractionProfile(input.profile);
  const plan = parseInteractionPlan(input.plan, profile);
  const timing = input.timing ?? createRealInteractionTiming();
  const random = createSeededInteractionRandom(profile.seed);
  const budget = createInteractionBudget(timing.nowMs());
  const contextProfile = safeContextProfile(input.contextProfile);
  let completedStepCount = 0;
  let status: InteractionExecutionResult["status"] = profile.enabled ? "completed" : "skipped";
  let failureCategory: InteractionFailureCategory | null = null;
  let failureCode: string | null = null;
  let lastNavigationOutcome: InteractionNavigationOutcome = "none";
  let discoveredUrlCount = 0;
  let dialogOutcome: "none" | "dismissed" | "accepted" | "blocked" = "none";
  let popupOutcome: "none" | "observed-closed" | "allowed" | "blocked" = "none";
  let externalFailure: unknown = null;

  const addEvent = (inputEvent: {
    stepId: string | null;
    stepType: InteractionExecutionResult["trace"]["events"][number]["stepType"];
    targetId?: string | null;
    startedAt: string;
    endedAt?: string;
    effectiveDelayMs?: number;
    status: InteractionExecutionResult["trace"]["events"][number]["status"];
    failureCategory?: InteractionFailureCategory | null;
    failureCode?: string | null;
    navigationOutcome?: InteractionNavigationOutcome;
    domChanged?: boolean;
    routeChanged?: boolean;
    popupOutcome?: "none" | "observed-closed" | "allowed" | "blocked";
    dialogOutcome?: "none" | "dismissed" | "accepted" | "blocked";
    inputCategory?: "none" | "non-sensitive" | "ephemeral";
    characterCount?: number | null;
    recoveryStatus?: "none" | "interrupted" | "uncertain";
  }): void => input.trace.add({
    sequence: input.trace.snapshot().events.length,
    stepId: inputEvent.stepId,
    stepType: inputEvent.stepType,
    targetId: inputEvent.targetId ?? null,
    startedAt: inputEvent.startedAt,
    endedAt: inputEvent.endedAt ?? input.now(),
    effectiveDelayMs: inputEvent.effectiveDelayMs ?? 0,
    status: inputEvent.status,
    failureCategory: inputEvent.failureCategory ?? null,
    failureCode: inputEvent.failureCode ?? null,
    navigationOutcome: inputEvent.navigationOutcome ?? "none",
    domChanged: inputEvent.domChanged ?? false,
    routeChanged: inputEvent.routeChanged ?? false,
    popupOutcome: inputEvent.popupOutcome ?? "none",
    dialogOutcome: inputEvent.dialogOutcome ?? "none",
    discoveredUrlCount: 0,
    inputCategory: inputEvent.inputCategory ?? "none",
    characterCount: inputEvent.characterCount ?? null,
    recoveryStatus: inputEvent.recoveryStatus ?? "none",
  });

  const onDialog = async (dialog: Dialog): Promise<void> => {
    const startedAt = input.now();
    try {
      budget.consumeDialog(profile);
      const action = resolveDialogAction(profile.dialogPolicy, dialog.type() as "alert" | "confirm" | "prompt" | "beforeunload");
      if (action === "accept") await dialog.accept();
      else await dialog.dismiss();
      dialogOutcome = action === "accept" ? "accepted" : "dismissed";
      addEvent({ stepId: null, stepType: "dialog", startedAt, status: "completed", dialogOutcome, effectiveDelayMs: 0 });
    } catch (error) {
      await dialog.dismiss().catch(() => undefined);
      dialogOutcome = "blocked";
      externalFailure = error;
      const failure = classifyInteractionFailure(error);
      addEvent({ stepId: null, stepType: "dialog", startedAt, status: "blocked", dialogOutcome, failureCategory: failure.category, failureCode: failure.code });
    }
  };
  const onPopup = async (popup: Page): Promise<void> => {
    const startedAt = input.now();
    try {
      budget.consumePopup(profile);
      if (popup.url() === "about:blank") {
        await popup.waitForURL((url) => url.href !== "about:blank", { timeout: profile.popupPolicy.maximumHandlingDurationMs }).catch(() => undefined);
      }
      const popupUrl = popup.url();
      const origin = (() => { try { return new URL(popupUrl).origin; } catch { return "invalid-origin"; } })();
      const policyAction = resolvePopupAction(profile.popupPolicy, origin);
      const authorized = input.authorizeUrl === undefined ? policyAction === "allow" : await input.authorizeUrl(popupUrl);
      if (!authorized || policyAction === "close") {
        await popup.close().catch(() => undefined);
        popupOutcome = "blocked";
        addEvent({ stepId: null, stepType: "popup", startedAt, status: "blocked", popupOutcome, navigationOutcome: "blocked" });
        return;
      }
      await popup.close().catch(() => undefined);
      popupOutcome = "allowed";
      addEvent({ stepId: null, stepType: "popup", startedAt, status: "completed", popupOutcome, navigationOutcome: "popup" });
    } catch (error) {
      await popup.close().catch(() => undefined);
      popupOutcome = "blocked";
      externalFailure = error;
      const failure = classifyInteractionFailure(error);
      addEvent({ stepId: null, stepType: "popup", startedAt, status: "blocked", popupOutcome, failureCategory: failure.category, failureCode: failure.code, navigationOutcome: "blocked" });
    }
  };

  handlers.setDialogHandler(onDialog);
  handlers.setPopupHandler(onPopup);
  try {
    addEvent({ stepId: null, stepType: "context", startedAt: input.now(), status: profile.enabled ? "completed" : "skipped" });
    if (!profile.enabled) {
      const snapshot = input.trace.snapshot();
      return { trace: { schemaVersion: 1, traceId: input.traceId, projectId: input.projectId, runId: input.runId, jobId: input.jobId, ownerId: input.ownerId ?? null, fencingGeneration: input.fencingGeneration, profileId: profile.profileId, profileRevisionId: profile.profileRevisionId, contextProfileId: contextProfile.profileId, createdAt: input.now(), completedAt: input.now(), status: "skipped", events: snapshot.events, truncated: snapshot.truncated, serializedBytes: snapshot.serializedBytes }, completedStepCount: 0, status: "skipped", failureCategory: null, failureCode: null, navigationOutcome: "none", discoveredUrlCount: 0, contextProfile };
    }
    for (const [index, step] of plan.steps.entries()) {
      if (input.signal.aborted) throw new InteractionOperationError("INTERACTION_CANCELLED", "The interaction was cancelled", true);
      if (handlers.isCrashed()) throw new InteractionOperationError("INTERACTION_BROWSER_FAILED", "The browser Page crashed during interaction", true);
      budget.checkDuration(profile, timing.nowMs());
      if (await input.shouldPause?.()) throw new InteractionOperationError("INTERACTION_PAUSED", "The Run requested a cooperative interaction pause", true);
      const delayMs = index === 0 ? 0 : selectInteractionDelay(profile.actionDelayMinMs, profile.actionDelayMaxMs, random);
      await timing.sleep(delayMs, input.signal);
      budget.checkDuration(profile, timing.nowMs());
      await assertPreconditions(page, step);
      const startedAt = input.now();
      const before = await snapshot(page);
      let attempt = 0;
      let completed = false;
      let lastError: unknown = null;
      while (!completed && attempt < (step.retryPolicy?.maxAttempts ?? 1)) {
        attempt += 1;
        try {
          if (step.stepType === "click") handlers.prepareForPotentialPopup?.(Math.min(profile.popupPolicy.maximumHandlingDurationMs, 500));
          await executeStep(page, profile, budget, random, timing, input.signal, step);
          await handlers.waitForHandlers?.();
          await assertPostcondition(page, step);
          completed = true;
        } catch (error) {
          lastError = error;
          const failure = classifyInteractionFailure(error);
          const canRetry = (step.failurePolicy === "retry" || (step.retryPolicy?.retryableCategories ?? []).includes(failure.category)) && attempt < (step.retryPolicy?.maxAttempts ?? 1);
          if (!canRetry) break;
          await timing.sleep(selectInteractionDelay(profile.actionDelayMinMs, profile.actionDelayMaxMs, random), input.signal);
        }
      }
      if (!completed) {
        const failure = classifyInteractionFailure(lastError);
        const skipped = step.failurePolicy === "skip";
        addEvent({ stepId: step.stepId, stepType: step.stepType, targetId: interactionTargetId("target" in step ? step.target : null), startedAt, effectiveDelayMs: delayMs, status: skipped ? "skipped" : failure.category === "pause" ? "paused" : failure.category === "cancellation" ? "cancelled" : "failed", failureCategory: failure.category, failureCode: failure.code, recoveryStatus: failure.category === "pause" ? "interrupted" : failure.category === "browser" ? "uncertain" : "none" });
        if (skipped) continue;
        throw lastError ?? new InteractionOperationError("INTERACTION_TARGET_FAILED", "The interaction step failed");
      }
      const after = await snapshot(page);
      const outcome = navigationOutcome(before, after);
      if (outcome !== "none") { lastNavigationOutcome = outcome; if (outcome === "spa-route" || outcome === "full-navigation") discoveredUrlCount += 1; }
      if (input.authorizeUrl !== undefined && before.url !== after.url && !(await input.authorizeUrl(after.url))) throw new InteractionOperationError("INTERACTION_SIDE_EFFECT_BLOCKED", "The resulting navigation was outside the approved scope");
      addEvent({ stepId: step.stepId, stepType: step.stepType, targetId: interactionTargetId("target" in step ? step.target : null), startedAt, effectiveDelayMs: delayMs, status: "completed", navigationOutcome: outcome, domChanged: before.domSize !== after.domSize, routeChanged: outcome === "spa-route", inputCategory: step.stepType === "type_text" ? (step.textCategory ?? "non-sensitive") : "none", characterCount: step.stepType === "type_text" ? step.text.length : null, popupOutcome, dialogOutcome });
      completedStepCount += 1;
      if (externalFailure !== null) throw externalFailure;
      budget.checkDuration(profile, timing.nowMs());
    }
  } catch (error) {
    const failure = statusFromFailure(error);
    status = failure.status;
    failureCategory = failure.category;
    failureCode = failure.code;
    if (failure.status === "outcome-uncertain") addEvent({ stepId: null, stepType: "plan", startedAt: input.now(), status: "failed", failureCategory: failure.category, failureCode: failure.code, recoveryStatus: "uncertain" });
    else if (failure.status === "paused") addEvent({ stepId: null, stepType: "plan", startedAt: input.now(), status: "paused", failureCategory: failure.category, failureCode: failure.code, recoveryStatus: "interrupted" });
    else addEvent({ stepId: null, stepType: "plan", startedAt: input.now(), status: failure.status === "cancelled" ? "cancelled" : "failed", failureCategory: failure.category, failureCode: failure.code });
  } finally {
    await handlers.waitForHandlers?.();
    handlers.clearHandlers();
  }
  const traceSnapshot = input.trace.snapshot();
  const traceStatus = status;
  return {
    trace: { schemaVersion: 1, traceId: input.traceId, projectId: input.projectId, runId: input.runId, jobId: input.jobId, ownerId: input.ownerId ?? null, fencingGeneration: input.fencingGeneration, profileId: profile.profileId, profileRevisionId: profile.profileRevisionId, contextProfileId: contextProfile.profileId, createdAt: input.now(), completedAt: traceStatus === "completed" || traceStatus === "skipped" ? input.now() : null, status: traceStatus, events: traceSnapshot.events, truncated: traceSnapshot.truncated, serializedBytes: traceSnapshot.serializedBytes },
    completedStepCount, status, failureCategory, failureCode, navigationOutcome: lastNavigationOutcome, discoveredUrlCount, contextProfile,
  };
}

async function executeStep(
  page: Page,
  profile: InteractionExecutionInput["profile"],
  budget: ReturnType<typeof createInteractionBudget>,
  random: ReturnType<typeof createSeededInteractionRandom>,
  timing: ReturnType<typeof createRealInteractionTiming>,
  signal: AbortSignal,
  step: InteractionStep,
): Promise<void> {
  if (signal.aborted) throw new InteractionOperationError("INTERACTION_CANCELLED", "The interaction was cancelled", true);
  const timeoutMs = step.timeoutMs ?? Math.min(30_000, profile.maxInteractionDurationMs);
  if (step.stepType === "mouse_move") {
    const duration = step.durationMs ?? selectInteractionDelay(profile.pointerMoveDurationMinMs, profile.pointerMoveDurationMaxMs, random);
    await page.mouse.move(step.x, step.y, { steps: Math.max(1, Math.ceil(duration / 16)) });
    return;
  }
  if (step.stepType === "press_key") { await page.keyboard.press(step.key); return; }
  if (step.stepType === "tab_navigation") {
    const steps = step.steps ?? 1;
    for (let index = 0; index < steps; index += 1) {
      budget.consumeTabStep(profile);
      await page.keyboard.press(step.direction === "backward" ? "Shift+Tab" : "Tab");
      await timing.sleep(selectInteractionDelay(profile.actionDelayMinMs, profile.actionDelayMaxMs, random), signal);
    }
    return;
  }
  if (step.stepType === "incremental_scroll") {
    let remaining = step.distancePx ?? profile.scrollStepMaxPx;
    const steps = step.steps ?? 1;
    let previousY = (await snapshot(page)).scrollY;
    for (let index = 0; index < steps && remaining > 0; index += 1) {
      budget.consumeScrollStep(profile);
      const amount = Math.min(remaining, selectInteractionDelay(profile.scrollStepMinPx, profile.scrollStepMaxPx, random));
      await page.mouse.wheel(0, (step.direction ?? "down") === "up" ? -amount : amount);
      remaining -= amount;
      await timing.sleep(selectInteractionDelay(profile.scrollDelayMinMs, profile.scrollDelayMaxMs, random), signal);
      const current = await snapshot(page);
      if (current.scrollY === previousY && current.scrollHeight <= current.scrollY + 1) break;
      previousY = current.scrollY;
    }
    return;
  }
  if (step.stepType === "cookie_banner") {
    const rule = selectCookieBannerRule(profile.cookieBannerRules, step.ruleId);
    if (rule === null || rule.action === "no_action") return;
    const banner = await uniqueLocator(page, rule.bannerTarget, true);
    if (rule.actionTarget === undefined) throw new InteractionOperationError("INTERACTION_SIDE_EFFECT_BLOCKED", "The configured Cookie Banner rule has no explicit action target");
    const action = await uniqueLocator(page, rule.actionTarget, true);
    await assertReadOnlyClickTarget(action);
    await action.click({ timeout: timeoutMs, button: "left", clickCount: 1 });
    return;
  }
  const target = await uniqueLocator(page, step.target, step.stepType !== "wait_for_state");
  if (step.stepType === "wait_for_state") { await waitForState(target, step.state, timeoutMs); return; }
  if (step.stepType === "focus") { await target.focus({ timeout: timeoutMs }); return; }
  if (step.stepType === "hover") { await target.hover({ timeout: timeoutMs }); return; }
  if (step.stepType === "click") { await assertReadOnlyClickTarget(target); await target.click({ timeout: timeoutMs, ...(step.button === undefined ? {} : { button: step.button }), ...(step.clickCount === undefined ? {} : { clickCount: step.clickCount }) }); return; }
  if (step.stepType === "type_text") {
    await target.focus({ timeout: timeoutMs });
    for (const character of step.text) {
      if (signal.aborted) throw new InteractionOperationError("INTERACTION_CANCELLED", "The interaction was cancelled while typing", true);
      await page.keyboard.type(character, { delay: selectInteractionDelay(profile.typingDelayMinMs, profile.typingDelayMaxMs, random) });
    }
  }
}
