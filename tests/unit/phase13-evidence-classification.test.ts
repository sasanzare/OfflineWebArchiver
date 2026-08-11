import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

interface EvidenceCommand {
  exitCode: number | null;
  stdoutSafe?: string;
  stderrSafe?: string;
  spawnErrorSafe?: string | null;
  testResult?: { failed?: number | null } | null;
}

interface RuntimeInspection {
  browser: { valid: boolean };
  electron: { executablePresent: boolean; versionMatches: boolean };
}

async function load<T>(relativePath: string): Promise<T> {
  return await import(pathToFileURL(path.resolve(relativePath)).href) as T;
}

const { classifyDesktopStatus } = await load<{
  classifyDesktopStatus(command: EvidenceCommand, runtime: RuntimeInspection): string;
}>("tools/testing/run-phase13-evidence.mjs");

test("missing required native runtime is classified as environment blocked", () => {
  assert.equal(classifyDesktopStatus(
    { exitCode: 1, testResult: { failed: 1 } },
    { browser: { valid: false }, electron: { executablePresent: true, versionMatches: true } },
  ), "ENVIRONMENT_BLOCKED");

  assert.equal(classifyDesktopStatus(
    { exitCode: 1, testResult: { failed: 1 } },
    { browser: { valid: true }, electron: { executablePresent: false, versionMatches: false } },
  ), "ENVIRONMENT_BLOCKED");
});

test("a valid runtime with an application assertion failure is product failure", () => {
  assert.equal(classifyDesktopStatus(
    { exitCode: 1, stdoutSafe: "ARCHITECTURE_SMOKE={status:failed}", testResult: { failed: 1 } },
    { browser: { valid: true }, electron: { executablePresent: true, versionMatches: true } },
  ), "PRODUCT_FAIL");
});

test("runtime blockers reported on stdout remain environment failures", () => {
  assert.equal(classifyDesktopStatus(
    { exitCode: 1, stdoutSafe: "BROWSER_INSTALLATION_MISSING", testResult: { failed: 1 } },
    { browser: { valid: true }, electron: { executablePresent: true, versionMatches: true } },
  ), "ENVIRONMENT_BLOCKED");
});

test("an unassessable Desktop command is test-infrastructure failure", () => {
  assert.equal(classifyDesktopStatus(
    { exitCode: null, testResult: null, spawnErrorSafe: "test harness unavailable" },
    { browser: { valid: true }, electron: { executablePresent: true, versionMatches: true } },
  ), "TEST_INFRA_FAILURE");
});
