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

test("completed OKF migration command is a deprecated compatibility wrapper", async () => {
  const { deprecationMessage, run } = await load<{
    deprecationMessage: string;
    run(args?: string[]): Promise<number>;
  }>("tools/okf/migrate.mjs");
  assert.match(deprecationMessage, /migration is complete/);
  assert.equal(await run(["--self-test"]), 2);
});
