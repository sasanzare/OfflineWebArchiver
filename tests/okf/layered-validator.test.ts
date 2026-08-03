import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
test("validator CLI supports human, JSON, and layer-filtered reporting", () => {
  const executable = path.resolve("tools/okf/cli.mjs");
  const json = spawnSync(process.execPath, [executable, "validate", "--format", "json"], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(json.status, 0, json.stderr);
  const report = JSON.parse(json.stdout) as { diagnostics: Array<{ layer: string }> };
  assert.ok(Array.isArray(report.diagnostics));
  const official = spawnSync(process.execPath, [executable, "validate", "--layer", "official"], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(official.status, 0, official.stderr);
  assert.match(official.stdout, /official: 0 error/);
});

test("validator modules reject malformed frontmatter without execution", () => {
  const script = "const modulePath = './tools/okf/frontmatter.' + 'mjs'; const { parseFrontmatter } = await import(modulePath); const values=['# no metadata\\n','---\\ntype: Workflow\\ntype: Data Model\\n---\\n# Value\\n','---\\ntype: [Workflow\\n---\\n# Value\\n']; if (values.some((value) => !parseFrontmatter(value).error)) process.exit(1);";
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
