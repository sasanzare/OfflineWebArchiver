import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

const executable = path.resolve("apps/cli/dist/index.js");

function run(arguments_: readonly string[]) {
  return spawnSync(process.execPath, [executable, ...arguments_], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, OWAB_LOG_LEVEL: "error" },
  });
}

test("built CLI exposes help, version, human, JSON, and usage-error paths", () => {
  const help = run(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage:/);
  const version = run(["--version"]);
  assert.equal(version.status, 0);
  assert.equal(version.stdout.trim(), "0.3.0");
  const human = run(["system", "describe"]);
  assert.equal(human.status, 0);
  assert.match(human.stdout, /Core status: architecture-ready/);
  const json = run(["system", "describe", "--json"]);
  assert.equal(json.status, 0);
  assert.equal(JSON.parse(json.stdout).status, "success");
  const invalid = run(["crawl"]);
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /Unknown command/);
});
