import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertBrowserExecutable,
  assertWithinRoot,
  createRunId,
  describeBrowserExecutable,
  isWithinRoot,
} from "../../src/spike/paths.js";

test("archive containment accepts a child path", () => {
  const root = path.resolve("fixture-root");
  assert.equal(isWithinRoot(root, path.join(root, "archive", "index.html")), true);
  assert.doesNotThrow(() => assertWithinRoot(root, path.join(root, "archive")));
});

test("archive containment rejects sibling and parent paths", () => {
  const root = path.resolve("fixture-root");
  assert.equal(isWithinRoot(root, path.resolve(root, "..", "secret.txt")), false);
  assert.throws(() => assertWithinRoot(root, path.resolve(root, "..", "secret.txt")));
});

test("Run IDs are unique, portable, and phase-labelled", () => {
  const first = createRunId(new Date("2026-07-31T12:30:45.000Z"));
  const second = createRunId(new Date("2026-07-31T12:30:45.000Z"));
  assert.match(first, /^p02-20260731123045-[a-f0-9]{12}$/);
  assert.notEqual(first, second);
  assert.doesNotMatch(first, /[\\/:]/);
});

test("bundled browser detection accepts only an existing contained executable", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "p02-browser-test-"));
  try {
    const executable = path.join(root, "chromium-1", "chrome-win64", "chrome.exe");
    await writeFile(executable, "", { encoding: "utf8", flag: "w" }).catch(async () => {
      const { mkdir } = await import("node:fs/promises");
      await mkdir(path.dirname(executable), { recursive: true });
      await writeFile(executable, "", "utf8");
    });
    assert.doesNotThrow(() => assertBrowserExecutable(root, executable));
    assert.equal(
      describeBrowserExecutable(root, executable, false),
      ".playwright-browsers/chromium-1/chrome-win64/chrome.exe",
    );
    assert.throws(() => assertBrowserExecutable(root, path.resolve(root, "..", "chrome.exe")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

