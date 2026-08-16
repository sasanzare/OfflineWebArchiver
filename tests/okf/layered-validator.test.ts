import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

interface Diagnostic { layer: string; severity: string; ruleId?: string; code?: string; message: string }
interface Artifact { kind: string; path: string; extension?: string; text?: string; parsed?: unknown }

async function load<T>(relativePath: string): Promise<T> {
  return await import(pathToFileURL(path.resolve(relativePath)).href) as T;
}

test("validator JSON and human output preserve layer identities", async () => {
  const { validateAll } = await load<{ validateAll(root?: string): Promise<{ artifacts: Artifact[]; diagnostics: Diagnostic[]; referenceChecks: unknown[] }> }>("tools/okf/validate-all.mjs");
  const { buildHumanOutput, buildJsonReport } = await load<{
    buildHumanOutput(diagnostics: Diagnostic[], layer?: string): string;
    buildJsonReport(report: { artifacts: Artifact[]; diagnostics: Diagnostic[]; referenceChecks: unknown[]; provenanceChecks?: unknown[] }): { schema_version: string; specification_revision: string; layer_results: Record<string, unknown>; exit_code: number; requested_layers: string[] };
  }>("tools/okf/cli.mjs");
  const report = await validateAll(process.cwd());
  const json = buildJsonReport(report);
  assert.equal(json.schema_version, "3.0.0");
  assert.equal(json.specification_revision, "3fcbb9f828c2f23d109c855ee403c3a4c81f3a96");
  assert.equal(json.exit_code, 0);
  assert.ok(Object.hasOwn(json.layer_results, "official"));
  assert.ok(Object.hasOwn(json.layer_results, "references"));
  assert.ok(Object.hasOwn(json.layer_results, "provenance"));
  assert.match(buildHumanOutput(report.diagnostics), /Official OKF v0\.2 Conformance: PASS/);
  assert.match(buildHumanOutput(report.diagnostics), /OWA Extension Validation: PASS/);
  assert.doesNotMatch(buildHumanOutput(report.diagnostics, "official"), /OWA Extension Validation/);
});

test("frontmatter parser rejects malformed blocks and accepts official CRLF mappings", async () => {
  const { parseFrontmatter } = await load<{ parseFrontmatter(value: string): { error?: string; metadata?: { type: string; verified: { by: string } } } }>("tools/okf/frontmatter.mjs");
  for (const value of ["# no metadata\n", "---\ntype: Workflow\ntype: Data Model\n---\n# Value\n", "---\ntype: [Workflow\n---\n# Value\n"]) assert.notEqual(parseFrontmatter(value).error, undefined);
  const parsed = parseFrontmatter("---\r\ntype: Workflow\r\nverified: { by: human:owner, at: 2026-08-03T10:00:00Z }\r\n---\r\n# Value\r\n");
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.metadata?.type, "Workflow");
  assert.equal(parsed.metadata?.verified.by, "human:owner");
});

test("official structure accepts unknown types and fields but requires type", async () => {
  const { validateOfficial } = await load<{ validateOfficial(artifacts: Artifact[]): Diagnostic[] }>("tools/okf/official.mjs");
  const valid = { kind: "concept", path: "okf/value.md", extension: ".md", text: "---\ntype: Unknown Producer Type\ncustom: value\n---\n# Value\n" };
  const missing = { kind: "concept", path: "okf/missing.md", extension: ".md", text: "---\ntitle: Missing\n---\n# Missing\n" };
  assert.equal(validateOfficial([valid]).length, 0);
  assert.ok(validateOfficial([missing]).some((item) => item.ruleId === "OKF-CONFORMANCE-TYPE-MISSING"));
});

test("official reserved-file rules are separate from Concept rules", async () => {
  const { validateOfficial } = await load<{ validateOfficial(artifacts: Artifact[]): Diagnostic[] }>("tools/okf/official.mjs");
  const root = { kind: "root-index", path: "okf/index.md", extension: ".md", text: "---\nokf_version: \"0.1\"\n---\n# Root\n" };
  const directory = { kind: "directory-index", path: "okf/area/index.md", extension: ".md", text: "---\ntype: Invalid\n---\n# Area\n" };
  const log = { kind: "log", path: "okf/log.md", extension: ".md", text: "# Log\n\n## Today\n" };
  const codes = new Set(validateOfficial([root, directory, log]).map((item) => item.ruleId));
  assert.ok(codes.has("OKF-CONFORMANCE-INDEX-ROOT-FRONTMATTER"));
  assert.ok(codes.has("OKF-CONFORMANCE-INDEX-FRONTMATTER"));
  assert.ok(codes.has("OKF-CONFORMANCE-LOG-DATE-INVALID"));
});

test("OWA policy diagnostics remain quality-layer diagnostics and permit URL sources", async () => {
  const { validatePolicy } = await load<{ validatePolicy(artifacts: Artifact[], root?: string): Diagnostic[] }>("tools/okf/policy.mjs");
  const concept = { kind: "concept", path: "okf/value.md", extension: ".md", text: "---\ntype: Workflow\ntitle: Value\ndescription: Value.\nstatus: stable\nsources:\n  - id: source\n    resource: https://example.com/value\n---\n# Value\n" };
  const diagnostics = validatePolicy([concept], process.cwd());
  assert.equal(diagnostics.some((item) => item.layer === "policy"), false);
  assert.equal(diagnostics.some((item) => item.ruleId === "OWA-QUALITY-RESOURCE"), false);
});

test("production discovery is official-only and independently inventoryable", async () => {
  const { discoverOkf } = await load<{ discoverOkf(root: string): Promise<Artifact[]> }>("tools/okf/discovery.mjs");
  const items = await discoverOkf(process.cwd());
  assert.equal(items.length, 89);
  assert.equal(items.filter((item) => item.kind === "concept").length, 78);
  assert.equal(items.filter((item) => item.kind === "directory-index").length, 9);
  assert.equal(items.filter((item) => item.kind === "root-index").length, 1);
  assert.equal(items.some((item) => item.path.startsWith("okf-extension/")), false);
  assert.equal(items.some((item) => ["unknown-markdown", "transitional-legacy", "unsafe-link"].includes(item.kind)), false);
});

test("production validation is deterministic and separate official mode ignores extension state", async () => {
  const { validateAll } = await load<{ validateAll(root: string, options?: { onlyLayer?: string }): Promise<{ artifacts: Artifact[]; diagnostics: Diagnostic[]; referenceChecks: unknown[] }> }>("tools/okf/validate-all.mjs");
  const first = await validateAll(process.cwd());
  const second = await validateAll(process.cwd());
  assert.deepEqual(first, second);
  assert.equal(first.diagnostics.length, 0);
  const official = await validateAll(process.cwd(), { onlyLayer: "official" });
  assert.equal(official.diagnostics.length, 0);
  assert.equal(official.diagnostics.some((item) => item.layer === "extension"), false);
});

test("CLI rejects an unknown validation layer with usage exit code", async () => {
  const { run } = await load<{ run(args: string[]): Promise<number> }>("tools/okf/cli.mjs");
  assert.equal(await run(["validate", "--layer", "made-up"]), 2);
});
