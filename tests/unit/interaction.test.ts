import assert from "node:assert/strict";
import test from "node:test";
import {
  createHumanPacedInteractionProfile,
  createInteractionBudget,
  createSeededInteractionRandom,
  decideInteractionRecovery,
  InteractionTraceBuilder,
  isSafeInteractionKey,
  parseInteractionPlan,
  redactInteractionTrace,
  resolveDialogAction,
  resolvePopupAction,
  selectInteractionDelay,
  validateInteractionPlan,
  validateInteractionProfile,
} from "@offline-web-archive/archive-core";

const profile = createHumanPacedInteractionProfile({ profileId: "profile-10", profileRevisionId: "revision-10", seed: "deterministic-10" });

function plan(steps: readonly Record<string, unknown>[] = []): Record<string, unknown> {
  return { schemaVersion: 1, planId: "plan-10", approved: true, approvalReason: "approved fixture interaction", steps };
}

function clickStep(target: Record<string, unknown> = { strategy: "role", role: "button", name: "Read-only action" }): Record<string, unknown> {
  return { stepId: "click-1", stepType: "click", sideEffect: "read-only", target, failurePolicy: "stop" };
}

test("Interaction Profile and Plan validation is bounded and fail-closed", () => {
  const profileResult = validateInteractionProfile(profile);
  assert.equal(profileResult.valid, true);
  const validPlan = validateInteractionPlan(plan([
    clickStep(),
    { stepId: "type-1", stepType: "type_text", sideEffect: "read-only", target: { strategy: "label", text: "Search" }, text: "Hello", textCategory: "non-sensitive" },
    { stepId: "key-1", stepType: "press_key", sideEffect: "read-only", key: "Enter" },
    { stepId: "scroll-1", stepType: "incremental_scroll", sideEffect: "read-only", distancePx: 300, steps: 1, direction: "down" },
  ]), profile);
  assert.equal(validPlan.valid, true);
  assert.equal(parseInteractionPlan(validPlan.value, profile).steps.length, 4);

  const unsafe = validateInteractionPlan(plan([clickStep({ strategy: "css", selector: "button[data-x={unsafe}]" })]), profile);
  assert.equal(unsafe.valid, false);
  assert.ok(unsafe.errors.some((entry) => entry.code === "INTERACTION_SELECTOR_UNSAFE"));
  const unapproved = validateInteractionPlan({ ...plan([clickStep()]), approved: false }, profile);
  assert.equal(unapproved.valid, false);
  assert.ok(unapproved.errors.some((entry) => entry.code === "INTERACTION_PLAN_NOT_APPROVED"));
  assert.equal(isSafeInteractionKey("Tab"), true);
  assert.equal(isSafeInteractionKey("Control+Alt+Delete"), false);
});

test("Interaction profiles reject malformed policy values and incomplete Cookie Banner actions", () => {
  const malformed = JSON.parse(JSON.stringify(profile)) as Record<string, any>;
  malformed["dialogPolicy"]["defaultAction"] = "execute";
  malformed["popupPolicy"]["allowedOrigins"] = ["file:///outside"];
  malformed["cookieBannerRules"] = [{ ruleId: "cookie-1", bannerTarget: { strategy: "role", role: "banner" }, action: "accept", maxExecutions: 1 }];
  const result = validateInteractionProfile(malformed);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((entry) => entry.code === "INTERACTION_DIALOG_POLICY_INVALID"));
  assert.ok(result.errors.some((entry) => entry.code === "INTERACTION_POPUP_ORIGIN_INVALID"));
  assert.ok(result.errors.some((entry) => entry.code === "INTERACTION_COOKIE_ACTION_TARGET_REQUIRED"));
});

test("Interaction timing is deterministic and budget limits are enforced", () => {
  const first = createSeededInteractionRandom("same-seed");
  const second = createSeededInteractionRandom("same-seed");
  const firstValues = Array.from({ length: 8 }, () => selectInteractionDelay(10, 20, first));
  const secondValues = Array.from({ length: 8 }, () => selectInteractionDelay(10, 20, second));
  assert.deepEqual(firstValues, secondValues);
  assert.ok(firstValues.every((value) => value >= 10 && value <= 20));

  const limitedProfile = { ...profile, maxActionsPerPage: 1, maxScrollSteps: 1, maxTabSteps: 1 };
  const budget = createInteractionBudget(100);
  budget.consumeAction(limitedProfile);
  assert.throws(() => budget.consumeAction(limitedProfile), /action budget/);
  budget.consumeScrollStep(limitedProfile);
  assert.throws(() => budget.consumeScrollStep(limitedProfile), /scroll-step budget/);
  assert.throws(() => budget.checkDuration({ ...profile, maxInteractionDurationMs: 10 }, 111), /duration budget/);
});

test("Interaction trace redaction, truncation, dialog, popup, and recovery rules are explicit", () => {
  const trace = new InteractionTraceBuilder({ maxEvents: 1, maxBytes: 10_000 });
  const event = {
    sequence: 0, stepId: "step-1", stepType: "click" as const, targetId: "role", startedAt: "2026-08-04T00:00:00.000Z", endedAt: "2026-08-04T00:00:00.000Z", effectiveDelayMs: 0,
    status: "completed" as const, failureCategory: null, failureCode: null, navigationOutcome: "none" as const, domChanged: false, routeChanged: false, popupOutcome: "none" as const, dialogOutcome: "none" as const,
    discoveredUrlCount: 0, inputCategory: "none" as const, characterCount: null, recoveryStatus: "none" as const,
  };
  trace.add(event);
  trace.add({ ...event, sequence: 1 });
  assert.equal(trace.snapshot().events.length, 1);
  assert.equal(trace.snapshot().truncated, true);
  const safe = JSON.stringify(redactInteractionTrace({ typedText: "private value", value: "secret", url: "https://example.com/path?token=secret" }));
  assert.equal(safe.includes("private value"), false);
  assert.equal(safe.includes("secret"), false);
  assert.equal(resolveDialogAction({ defaultAction: "dismiss", byType: { alert: "accept" }, maximumHandlingDurationMs: 1000 }, "alert"), "accept");
  assert.equal(resolvePopupAction({ defaultAction: "allow-in-scope", allowedOrigins: ["https://example.com"], maximumHandlingDurationMs: 1000 }, "https://evil.example"), "close");
  assert.deepEqual(decideInteractionRecovery({ state: "outcome-uncertain", sideEffect: "read-only", outcomeKnown: false, retryable: true }).action, "do-not-replay");
  assert.deepEqual(decideInteractionRecovery({ state: "interrupted", sideEffect: "read-only", outcomeKnown: true, retryable: true }).action, "retry-read-only");
});
