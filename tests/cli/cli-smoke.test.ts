import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
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

test("built CLI executes every Product Phase 4 Project operation", () => {
  const root = mkdtempSync(path.join(tmpdir(), "owa-cli-"));
  const project = path.join(root, "project");
  const archive = path.join(root, "project.zip");
  const imported = path.join(root, "imported");
  try {
    const help = run(["--help"]);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /project create/);
    assert.equal(run(["--version"]).stdout.trim(), "0.4.0");
    const describe = run(["system", "describe", "--json"]);
    assert.equal(describe.status, 0, describe.stderr);
    assert.equal(JSON.parse(describe.stdout).result.coreStatus, "project-foundation-ready");
    const create = run(["project", "create", project, "--name", "CLI Project", "--slug", "cli-project", "--json"]);
    assert.equal(create.status, 0, create.stderr);
    const projectId = JSON.parse(create.stdout).result.project.projectId;
    const validate = run(["project", "validate", project, "--json"]);
    assert.equal(validate.status, 0, validate.stderr);
    assert.equal(JSON.parse(validate.stdout).result.report.valid, true);
    const open = run(["project", "open", project, "--json"]);
    assert.equal(open.status, 0, open.stderr);
    const info = run(["project", "info", project, "--json"]);
    assert.equal(info.status, 0, info.stderr);
    assert.equal(JSON.parse(info.stdout).result.compatibility.compatible, true);
    const exported = run(["project", "export", project, archive, "--json"]);
    assert.equal(exported.status, 0, exported.stderr);
    const importedResult = run(["project", "import", archive, imported, "--json"]);
    assert.equal(importedResult.status, 0, importedResult.stderr);
    assert.equal(JSON.parse(importedResult.stdout).result.import.project.projectId, projectId);
    const importedValidation = run(["project", "validate", imported, "--json"]);
    assert.equal(importedValidation.status, 0, importedValidation.stderr);
    assert.equal(run(["crawl"]).status, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
