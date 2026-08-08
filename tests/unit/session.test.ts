import assert from "node:assert/strict";
import test from "node:test";
import {
  SESSION_STORAGE_CAPABILITIES,
  assertSessionTransition,
  createSessionMetadata,
  sessionRequiresReauthentication,
} from "@offline-web-archive/archive-core";
import { CONTRACT_VERSION, createProjectCommand, parseCommandEnvelope, parseResponseEnvelope } from "@offline-web-archive/contracts";

const projectId = "00000000-0000-4000-8000-000000000001";
const sessionId = "00000000-0000-4000-8000-000000000002";
const timestamp = "2026-08-07T12:00:00.000Z";

function metadata() {
  return createSessionMetadata({
    sessionId,
    projectId,
    profileId: "owa-context-profile-1",
    browserProfileVersion: 1,
    sessionFormatVersion: 1,
    storageStateFormatVersion: 1,
    secretRef: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastValidatedAt: null,
    validationResult: "not_validated",
    failureReason: "none",
    state: "ready",
    validationPolicy: { validationUrl: "https://example.com/account", expectedOrigin: "https://example.com", expectedPath: "/account", markerSelector: "#account", markerText: "Signed in" },
    affinity: { version: 1, browserProfileId: "owa-context-profile-1", browserProfileVersion: 1, proxyId: null },
    capabilities: SESSION_STORAGE_CAPABILITIES,
  });
}

test("Session metadata is versioned, project-owned, and fails closed on illegal transitions", () => {
  const value = metadata();
  assert.equal(value.revision, 1);
  assert.equal(sessionRequiresReauthentication(value), false);
  assert.doesNotThrow(() => assertSessionTransition("ready", "login_browser_open"));
  assert.throws(() => assertSessionTransition("ready", "valid"), /cannot transition/);
  assert.throws(() => createSessionMetadata({ ...value, sessionId: "not-a-uuid" }), /Session identifier is invalid/);
  assert.throws(() => createSessionMetadata({ ...value, validationPolicy: { ...value.validationPolicy, expectedOrigin: "https://evil.example" } }), /origin does not match/);
});

test("Session contract exposes only safe metadata and requires explicit destructive confirmations", () => {
  const open = parseCommandEnvelope(createProjectCommand("session.open", {
    projectPath: "/projects/demo",
    loginUrl: "https://example.com/login",
    validationUrl: "https://example.com/account",
    allowedOrigins: ["https://example.com"],
    markerSelector: "#account",
    markerText: "Signed in",
  }, { commandId: "session-command", correlationId: "session-correlation", timestamp }));
  assert.equal(open.commandType, "session.open");
  assert.throws(() => parseCommandEnvelope({ ...open, commandType: "session.delete", payload: { projectPath: "/projects/demo", sessionId, confirmation: "DELETE" } }), /command envelope is invalid/);
  const value = metadata();
  const { secretRef: _secretRef, ...safe } = value;
  const response = parseResponseEnvelope({
    contractVersion: CONTRACT_VERSION,
    commandId: "session-command",
    correlationId: "session-correlation",
    timestamp,
    status: "success",
    result: {
      resultType: "session.metadata",
      action: "get",
      session: { ...safe, requiresReauthentication: false },
      browser: null,
    },
    error: null,
  });
  assert.equal(response.status, "success");
});
