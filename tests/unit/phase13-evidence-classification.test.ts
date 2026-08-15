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

interface BrowserCommand {
  id: string;
  exitCode: number | null;
  stdoutSafe?: string;
  stderrSafe?: string;
  spawnErrorSafe?: string | null;
  testResult?: { subtests?: Array<{ name: string; status: string }> } | null;
}

async function load<T>(relativePath: string): Promise<T> {
  return await import(pathToFileURL(path.resolve(relativePath)).href) as T;
}

const { classifyDesktopStatus, classifyBrowserAcceptanceStatus, classifyWindowsRelease, normalizeWindowsUpdateBuildRevision } = await load<{
  classifyDesktopStatus(command: EvidenceCommand, runtime: RuntimeInspection): string;
  classifyBrowserAcceptanceStatus(id: string, commands: BrowserCommand[], runtime: RuntimeInspection, sourceAcceptanceEligible: boolean): { status: string; reason: string };
  classifyWindowsRelease(metadata?: { productName?: string; currentBuildNumber?: string }, kernelRelease?: string): string;
  normalizeWindowsUpdateBuildRevision(value: unknown): string | null;
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

test("browser assertion output mentioning network is not an environment blocker", () => {
  const result = classifyBrowserAcceptanceStatus(
    "AC-P13-012",
    [
      { id: "browser-verify", exitCode: 0 },
      {
        id: "browser-runtime-focused",
        exitCode: 1,
        stdoutSafe: "✔ Browser Runtime blocks non-GET requests before network dispatch\nAssertionError: fixture assertion failed",
        testResult: { subtests: [{ name: "Service Worker policy blocks by default and allows only explicit registration", status: "failed" }] },
      },
    ],
    { browser: { valid: true }, electron: { executablePresent: true, versionMatches: true } },
    true,
  );
  assert.equal(result.status, "PRODUCT_FAIL");
});

test("Windows release classification uses authoritative product metadata", () => {
  assert.equal(classifyWindowsRelease({ productName: "Windows 11 Pro", currentBuildNumber: "26200" }, "10.0.26200"), "windows-11");
  assert.equal(classifyWindowsRelease({ productName: "Windows 10 Home", currentBuildNumber: "26200" }, "10.0.26200"), "windows-11");
  assert.equal(classifyWindowsRelease({ productName: "Windows 10 Pro", currentBuildNumber: "19045" }, "10.0.19045"), "windows-10");
});

test("Windows registry UBR is normalized from hexadecimal to decimal", () => {
  assert.equal(normalizeWindowsUpdateBuildRevision("0x22ab"), "8875");
  assert.equal(normalizeWindowsUpdateBuildRevision("8875"), "8875");
  assert.equal(normalizeWindowsUpdateBuildRevision(undefined), null);
});
