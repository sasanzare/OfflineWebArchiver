import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  createHumanPacedInteractionProfile,
  InteractionTraceBuilder,
  type InteractionPlan,
} from "@offline-web-archive/archive-core";
import { createPlaywrightBrowserRuntime } from "@offline-web-archive/browser-runtime";
import { startRenderFixtureServer } from "../support/render-fixture-server.js";

function now(): string {
  return new Date().toISOString();
}

test("real Chromium executes bounded browser-native Interaction steps and emits redacted trace metadata", async () => {
  const fixture = await startRenderFixtureServer();
  const runtime = createPlaywrightBrowserRuntime({ browserRoot: path.resolve(".runtime", "browsers") });
  const profileBase = createHumanPacedInteractionProfile({ profileId: "browser-profile-10", profileRevisionId: "browser-revision-10", seed: "browser-fixture" });
  const profile = {
    ...profileBase,
    actionDelayMinMs: 0,
    actionDelayMaxMs: 0,
    typingDelayMinMs: 0,
    typingDelayMaxMs: 0,
    pointerMoveDurationMinMs: 0,
    pointerMoveDurationMaxMs: 0,
    scrollDelayMinMs: 0,
    scrollDelayMaxMs: 0,
    popupPolicy: { ...profileBase.popupPolicy, defaultAction: "allow-in-scope" as const, allowedOrigins: [fixture.origin] },
    cookieBannerRules: [{
      ruleId: "accept-fixture-cookie",
      bannerTarget: { strategy: "test-id" as const, value: "cookie-banner" },
      action: "accept" as const,
      actionTarget: { strategy: "test-id" as const, value: "cookie-accept" },
      maxExecutions: 1,
    }],
  };
  const plan: InteractionPlan = {
    schemaVersion: 1,
    planId: "browser-plan-10",
    approved: true,
    approvalReason: "approved browser fixture",
    steps: [
      { stepId: "focus", stepType: "focus", sideEffect: "read-only", target: { strategy: "label", text: "Search", exact: true } },
      { stepId: "type", stepType: "type_text", sideEffect: "read-only", target: { strategy: "label", text: "Search", exact: true }, text: "phase10", textCategory: "ephemeral" },
      { stepId: "move", stepType: "mouse_move", sideEffect: "read-only", x: 320, y: 240 },
      { stepId: "hover", stepType: "hover", sideEffect: "read-only", target: { strategy: "test-id", value: "hover-target" } },
      { stepId: "click", stepType: "click", sideEffect: "read-only", target: { strategy: "role", role: "button", name: "Read-only action", exact: true }, postcondition: { kind: "visible", target: { strategy: "test-id", value: "status" } } },
      { stepId: "tabs", stepType: "tab_navigation", sideEffect: "read-only", direction: "forward", steps: 1 },
      { stepId: "scroll", stepType: "incremental_scroll", sideEffect: "read-only", direction: "down", distancePx: 600, steps: 2 },
      { stepId: "cookie", stepType: "cookie_banner", sideEffect: "read-only", ruleId: "accept-fixture-cookie", postcondition: { kind: "hidden", target: { strategy: "test-id", value: "cookie-banner" } } },
      { stepId: "dialog", stepType: "click", sideEffect: "read-only", target: { strategy: "test-id", value: "dialog" } },
      { stepId: "confirm", stepType: "click", sideEffect: "read-only", target: { strategy: "test-id", value: "confirm" } },
      { stepId: "prompt", stepType: "click", sideEffect: "read-only", target: { strategy: "test-id", value: "prompt" } },
      { stepId: "popup", stepType: "click", sideEffect: "read-only", target: { strategy: "test-id", value: "popup" } },
    ],
  };
  const timing = { nowMs: () => Date.now(), sleep: async () => undefined };
  try {
    const page = await runtime.createPageSession("interaction-browser-job", {
      testMode: true,
      allowedFixtureOrigins: [fixture.origin],
      maxEvidenceEntries: 20,
      async authorizeUrl(url: string) { return { allowed: new URL(url).origin === fixture.origin, reasonCode: "TEST_FIXTURE", safeUrl: url, resolvedAddresses: ["127.0.0.1"] }; },
    });
    await page.navigate(fixture.url("interaction"), 2_000);
    const executeInteractionPlan = page.executeInteractionPlan;
    const getContextProfile = page.getContextProfile;
    assert.ok(executeInteractionPlan !== undefined && getContextProfile !== undefined);
    const result = await executeInteractionPlan.call(page, {
      profile,
      plan,
      timing,
      signal: new AbortController().signal,
      now,
      trace: new InteractionTraceBuilder({ maxEvents: 100, maxBytes: 64_000 }),
      projectId: "00000000-0000-4000-8000-000000000701",
      runId: "00000000-0000-4000-8000-000000000702",
      jobId: "00000000-0000-4000-8000-000000000703",
      ownerId: "interaction-browser-test",
      fencingGeneration: 1,
      traceId: "00000000-0000-4000-8000-000000000704",
      contextProfile: getContextProfile.call(page),
      authorizeUrl: async (url) => new URL(url).origin === fixture.origin,
    });
    assert.equal(result.status, "completed");
    assert.equal(result.completedStepCount, plan.steps.length);
    assert.equal(result.trace.status, "completed");
    assert.ok(result.trace.events.some((event) => event.stepType === "type_text" && event.inputCategory === "ephemeral" && event.characterCount === 7));
    assert.ok(result.trace.events.filter((event) => event.stepType === "dialog" && event.dialogOutcome === "dismissed").length >= 3);
    assert.ok(result.trace.events.some((event) => event.stepType === "popup" && event.popupOutcome === "allowed"));
    assert.equal(JSON.stringify(result.trace).includes("phase10"), false);
    assert.match(await page.extractHtml(), /Clicked through Playwright/);

    const blockedPopup = await executeInteractionPlan.call(page, {
      profile: { ...profile, popupPolicy: { ...profile.popupPolicy, defaultAction: "observe-close" as const, allowedOrigins: [] } },
      plan: {
        schemaVersion: 1,
        planId: "browser-blocked-popup-plan",
        approved: true,
        approvalReason: "blocked same-origin popup fixture",
        steps: [{ stepId: "blocked-popup", stepType: "click", sideEffect: "read-only", target: { strategy: "test-id", value: "blocked-popup" } }],
      },
      timing,
      signal: new AbortController().signal,
      now,
      trace: new InteractionTraceBuilder({ maxEvents: 20, maxBytes: 16_000 }),
      projectId: "00000000-0000-4000-8000-000000000701",
      runId: "00000000-0000-4000-8000-000000000702",
      jobId: "00000000-0000-4000-8000-000000000703",
      ownerId: "interaction-browser-test",
      fencingGeneration: 1,
      traceId: "00000000-0000-4000-8000-000000000709",
      contextProfile: getContextProfile.call(page),
      authorizeUrl: async (url) => new URL(url).origin === fixture.origin,
    });
    assert.equal(blockedPopup.status, "completed");
    assert.ok(blockedPopup.trace.events.some((event) => event.stepType === "popup" && event.popupOutcome === "blocked"));
    await page.close();
  } finally {
    await runtime.close();
    await fixture.close();
  }
});

test("Interaction executor blocks an unmarked button before browser side effect", async () => {
  const fixture = await startRenderFixtureServer();
  const runtime = createPlaywrightBrowserRuntime({ browserRoot: path.resolve(".runtime", "browsers") });
  const profileBase = createHumanPacedInteractionProfile({ profileId: "blocked-profile-10", profileRevisionId: "blocked-revision-10", seed: "blocked-fixture" });
  const profile = { ...profileBase, actionDelayMinMs: 0, actionDelayMaxMs: 0 };
  try {
    const page = await runtime.createPageSession("interaction-blocked-job", {
      testMode: true,
      allowedFixtureOrigins: [fixture.origin],
      maxEvidenceEntries: 20,
      async authorizeUrl(url: string) { return { allowed: new URL(url).origin === fixture.origin, reasonCode: "TEST_FIXTURE", safeUrl: url, resolvedAddresses: ["127.0.0.1"] }; },
    });
    await page.navigate(fixture.url("interaction"), 2_000);
    const executeInteractionPlan = page.executeInteractionPlan;
    const getContextProfile = page.getContextProfile;
    assert.ok(executeInteractionPlan !== undefined && getContextProfile !== undefined);
    const result = await executeInteractionPlan.call(page, {
      profile,
      plan: {
        schemaVersion: 1,
        planId: "blocked-plan",
        approved: true,
        approvalReason: "blocked fixture",
        steps: [{ stepId: "bad-click", stepType: "click", sideEffect: "read-only", target: { strategy: "css", selector: "#status" } }],
      },
      signal: new AbortController().signal,
      now,
      trace: new InteractionTraceBuilder({ maxEvents: 20, maxBytes: 16_000 }),
      projectId: "00000000-0000-4000-8000-000000000705",
      runId: "00000000-0000-4000-8000-000000000706",
      jobId: "00000000-0000-4000-8000-000000000707",
      fencingGeneration: 1,
      traceId: "00000000-0000-4000-8000-000000000708",
      contextProfile: getContextProfile.call(page),
    });
    assert.equal(result.status, "failed");
    assert.equal(result.failureCode, "INTERACTION_SIDE_EFFECT_BLOCKED");
    await page.close();
  } finally {
    await runtime.close();
    await fixture.close();
  }
});
