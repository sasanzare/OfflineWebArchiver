import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

async function load<T>(relativePath: string): Promise<T> {
  return await import(pathToFileURL(path.resolve(relativePath)).href) as T;
}

test("OKF validator passes canonical data and its negative path probes", async () => {
  const { isSafeRelative, validateOkf } = await load<{
    isSafeRelative(value: string): boolean;
    validateOkf(root?: string): Promise<string[]>;
  }>("tools/okf/validate.mjs");
  assert.deepEqual(await validateOkf(process.cwd()), []);
  assert.equal(isSafeRelative("C:\\private\\evidence.txt"), false);
  assert.equal(isSafeRelative("../outside.txt"), false);
  assert.equal(isSafeRelative("okf/history/phase-08.md"), true);
});

test("OKF migration blocks every modeled absent prerequisite", async () => {
  const { migrationPrerequisites, missingPrerequisites, migrationSelfTest } = await load<{
    migrationPrerequisites: string[];
    missingPrerequisites(available: Set<string>): string[];
    migrationSelfTest(): number;
  }>("tools/okf/migrate.mjs");
  assert.equal(migrationSelfTest(), 12);
  for (const omitted of migrationPrerequisites) {
    const available = new Set(migrationPrerequisites.filter((source) => source !== omitted));
    assert.ok(missingPrerequisites(available).includes(omitted));
  }
});
