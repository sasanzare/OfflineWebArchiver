import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

test("OKF validator passes canonical data and its negative policy probes", () => {
  const executable = path.resolve("tools/okf/validate.mjs");
  const result = spawnSync(process.execPath, [executable, "--self-test"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /negative policy self-tests passed/);
  assert.match(result.stdout, /zero orphaned critical requirements/);
});

test("OKF migration blocks every modeled absent prerequisite", () => {
  const executable = path.resolve("tools/okf/migrate.mjs");
  const result = spawnSync(process.execPath, [executable, "--self-test"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /12 absent-input cases/);
});
