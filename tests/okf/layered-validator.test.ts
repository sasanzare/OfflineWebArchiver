import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

interface Diagnostic {
  code: string;
  layer: string;
  severity: string;
}

interface Artifact {
  kind: string;
  path: string;
  extension?: string;
  text?: string;
}

async function load<T>(relativePath: string): Promise<T> {
  return await import(pathToFileURL(path.resolve(relativePath)).href) as T;
}

test("validator reporting supports JSON metadata and layer-filtered human output", async () => {
  const { validateAll } = await load<{ validateAll(root?: string): Promise<{ artifacts: Artifact[]; diagnostics: Diagnostic[] }> }>("tools/okf/validate-all.mjs");
  const { buildHumanOutput, buildJsonReport } = await load<{
    buildHumanOutput(diagnostics: Diagnostic[], layer?: string): string;
    buildJsonReport(report: { artifacts: Artifact[]; diagnostics: Diagnostic[] }, diagnostics?: Diagnostic[]): { schemaVersion: string; okfVersion: string; result: string; exitCode: number };
  }>("tools/okf/cli.mjs");
  const report = await validateAll(process.cwd());
  const json = buildJsonReport(report);
  assert.equal(json.schemaVersion, "1.0.0");
  assert.equal(json.okfVersion, "0.2");
  assert.equal(json.result, "pass");
  assert.equal(json.exitCode, 0);
  const official = buildHumanOutput(report.diagnostics, "official");
  assert.match(official, /official: 0 error/);
  assert.doesNotMatch(official, /policy:/);
});

test("validator modules reject malformed frontmatter without execution", async () => {
  const { parseFrontmatter } = await load<{ parseFrontmatter(value: string): { error?: string } }>("tools/okf/frontmatter.mjs");
  const values = [
    "# no metadata\n",
    "---\ntype: Workflow\ntype: Data Model\n---\n# Value\n",
    "---\ntype: [Workflow\n---\n# Value\n",
  ];
  assert.ok(values.every((value) => parseFrontmatter(value).error !== undefined));
});

test("frontmatter parser accepts CRLF and official inline mapping forms", async () => {
  const { parseFrontmatter } = await load<{ parseFrontmatter(value: string): { error?: string; metadata: { type: string; verified: { by: string } } } }>("tools/okf/frontmatter.mjs");
  const parsed = parseFrontmatter("---\r\ntype: Workflow\r\nverified: { by: human:owner, at: 2026-08-03T10:00:00Z }\r\n---\r\n# Value\r\n");
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.metadata.type, "Workflow");
  assert.equal(parsed.metadata.verified.by, "human:owner");
});

test("official validator keeps permissive fields separate from mandatory rules", async () => {
  const { validateOfficial } = await load<{ validateOfficial(artifacts: Artifact[]): Diagnostic[] }>("tools/okf/official.mjs");
  const valid = { kind: "concept", path: "okf/value.md", text: "---\ntype: Unknown Producer Type\ncustom: value\n---\n# Value\n" };
  const missing = { kind: "concept", path: "okf/missing.md", text: "---\ntitle: Missing\n---\n# Missing\n" };
  assert.equal(validateOfficial([valid]).length, 0);
  assert.ok(validateOfficial([missing]).some((item) => item.code === "OKF-OFFICIAL-002"));
});

test("official YAML parsing accepts aliases while repository policy rejects them", async () => {
  const { validateOfficial } = await load<{ validateOfficial(artifacts: Artifact[]): Diagnostic[] }>("tools/okf/official.mjs");
  const { validatePolicy } = await load<{ validatePolicy(artifacts: Artifact[], root?: string): Diagnostic[] }>("tools/okf/policy.mjs");
  const concept = { kind: "concept", path: "okf/alias.md", extension: ".md", text: "---\ntype: Workflow\ntitle: Alias\ndescription: Alias.\ntags: &tags [alias]\nstatus: stable\nowa:\n  legacy_ids: *tags\n---\n# Alias\n" };
  assert.equal(validateOfficial([concept]).length, 0);
  assert.ok(validatePolicy([concept]).some((item) => item.code === "OKF-POLICY-026"));
});

test("official optional metadata structures and Attested Computation runtime are enforced", async () => {
  const { validateOfficial } = await load<{ validateOfficial(artifacts: Artifact[]): Diagnostic[] }>("tools/okf/official.mjs");
  const items = [
    { kind: "concept", path: "okf/generated.md", text: "---\ntype: Workflow\ngenerated: []\n---\n# Generated\n" },
    { kind: "concept", path: "okf/source.md", text: "---\ntype: Workflow\nsources: []\n---\n# Source\n" },
    { kind: "concept", path: "okf/computation.md", text: "---\ntype: Attested Computation\n---\n# Computation\n" },
  ];
  const codes = new Set(validateOfficial(items).map((item) => item.code));
  assert.ok(["OKF-OFFICIAL-003", "OKF-OFFICIAL-005", "OKF-OFFICIAL-008"].every((code) => codes.has(code)));
});

test("official fixtures exercise every active official diagnostic", async () => {
  const { validateOfficial } = await load<{ validateOfficial(artifacts: Artifact[]): Diagnostic[] }>("tools/okf/official.mjs");
  const items = [
    { kind: "concept", path: "okf/malformed.md", text: "---\ntype: [Workflow\n---\n# Malformed\n" },
    { kind: "concept", path: "okf/type.md", text: "---\ntitle: Type\n---\n# Type\n" },
    { kind: "concept", path: "okf/generated.md", text: "---\ntype: Workflow\ngenerated: []\n---\n# Generated\n" },
    { kind: "concept", path: "okf/verified.md", text: "---\ntype: Workflow\nverified: []\n---\n# Verified\n" },
    { kind: "concept", path: "okf/sources.md", text: "---\ntype: Workflow\nsources: []\n---\n# Sources\n" },
    { kind: "concept", path: "okf/status.md", text: "---\ntype: Workflow\nstatus: invalid\n---\n# Status\n" },
    { kind: "concept", path: "okf/stale.md", text: "---\ntype: Workflow\nstale_after: soon\n---\n# Stale\n" },
    { kind: "concept", path: "okf/computation.md", text: "---\ntype: Attested Computation\n---\n# Computation\n" },
    { kind: "root-index", path: "okf/index.md", text: "---\nokf_version: \"0.1\"\n---\n# Root\n" },
    { kind: "directory-index", path: "okf/area/index.md", text: "---\ntype: Invalid\n---\n# Area\n" },
    { kind: "log", path: "okf/log.md", text: "# Log\n\n## Today\n" },
    { kind: "unknown-markdown", path: "okf/unknown.md", text: "# Unknown\n" },
  ];
  const codes = new Set(validateOfficial(items).map((item) => item.code));
  const expected = ["001", "002", "003", "004", "005", "006", "007", "008", "010", "011", "012", "013"].map((suffix) => `OKF-OFFICIAL-${suffix}`);
  assert.ok(expected.every((code) => codes.has(code)), [...codes].join(", "));
});

test("root index optional official metadata remains distinct from repository policy", async () => {
  const { validateOfficial } = await load<{ validateOfficial(artifacts: Artifact[]): Diagnostic[] }>("tools/okf/official.mjs");
  const { validatePolicy } = await load<{ validatePolicy(artifacts: Artifact[], root?: string): Diagnostic[] }>("tools/okf/policy.mjs");
  const root = { kind: "root-index", path: "okf/index.md", extension: ".md", text: "# Root\n" };
  assert.equal(validateOfficial([root]).length, 0);
  assert.ok(validatePolicy([root]).some((item) => item.code === "OKF-POLICY-020"));
});

test("repository policy detects missing H1, unsafe sources, and unknown fields", async () => {
  const { validateOfficial } = await load<{ validateOfficial(artifacts: Artifact[]): Diagnostic[] }>("tools/okf/official.mjs");
  const { validatePolicy } = await load<{ validatePolicy(artifacts: Artifact[], root?: string): Diagnostic[] }>("tools/okf/policy.mjs");
  const root = { kind: "root-index", path: "okf/index.md", extension: ".md", text: "---\nokf_version: \"0.2\"\n---\n# Root\n" };
  const concept = { kind: "concept", path: "okf/value.md", extension: ".md", text: "---\ntype: Workflow\ntitle: Value\ndescription: Value.\nstatus: stable\nsources:\n  - id: Bad_ID\n    resource: C:/private.txt\n    extra: value\n---\nBody\n" };
  validateOfficial([concept]);
  const codes = new Set(validatePolicy([root, concept]).map((item) => item.code));
  assert.ok(["OKF-POLICY-009", "OKF-POLICY-021", "OKF-POLICY-023", "OKF-POLICY-024"].every((code) => codes.has(code)));
});

test("repository fixtures exercise every active policy and format diagnostic", async () => {
  const { validateOfficial } = await load<{ validateOfficial(artifacts: Artifact[]): Diagnostic[] }>("tools/okf/official.mjs");
  const { validatePolicy } = await load<{ validatePolicy(artifacts: Artifact[], root?: string): Diagnostic[] }>("tools/okf/policy.mjs");
  const root = { kind: "root-index", path: "okf/index.md", extension: ".md", text: "# Root\n" };
  const concept = (name: string, metadata: string, body = `# ${name}\n`): Artifact => ({ kind: "concept", path: `okf/${name}.md`, extension: ".md", text: `---\n${metadata}\n---\n${body}` });
  const items = [
    concept("Unknown", "type: Unknown\ntitle: Unknown\ndescription: Unknown.\nstatus: stable"),
    concept("Required", "type: Workflow\ntitle: Required\ndescription: \nstatus: stable"),
    concept("Status", "type: Workflow\ntitle: Status\ndescription: Status.\nstatus: invalid"),
    concept("Field", "type: Workflow\ntitle: Field\ndescription: Field.\nstatus: stable\nextra: value"),
    concept("Mismatch", "type: Workflow\ntitle: Different\ndescription: Mismatch.\nstatus: stable"),
    concept("Tags", "type: Workflow\ntitle: Tags\ndescription: Tags.\ntags: [Bad_Tag]\nstatus: stable"),
    concept("SourceArray", "type: Workflow\ntitle: SourceArray\ndescription: Source.\nstatus: stable\nsources: invalid"),
    concept("SourceMissing", "type: Workflow\ntitle: SourceMissing\ndescription: Source.\nstatus: stable\nsources:\n  - id: source"),
    concept("SourceUnsafe", "type: Workflow\ntitle: SourceUnsafe\ndescription: Source.\nstatus: stable\nsources:\n  - id: source\n    resource: C:/private.txt"),
    concept("SourceDuplicate", "type: Workflow\ntitle: SourceDuplicate\ndescription: Source.\nstatus: stable\nsources:\n  - id: source\n    resource: package.json\n  - id: source\n    resource: package.json"),
    concept("Stale", "type: Workflow\ntitle: Stale\ndescription: Stale.\nstatus: stable\nstale_after: soon"),
    concept("OwaObject", "type: Workflow\ntitle: OwaObject\ndescription: Owa.\nstatus: stable\nowa: []"),
    concept("OwaField", "type: Workflow\ntitle: OwaField\ndescription: Owa.\nstatus: stable\nowa:\n  unknown: value"),
    concept("Security", "type: Security Control\ntitle: Security\ndescription: Security.\nstatus: stable\nsources:\n  - id: source\n    resource: package.json"),
    concept("Requirement", "type: Product Requirement\ntitle: Requirement\ndescription: Requirement.\nstatus: stable"),
    concept("Resource", "type: Workflow\ntitle: Resource\ndescription: Resource.\nresource: C:/private.txt\nstatus: stable"),
    concept("Generated", "type: Workflow\ntitle: Generated\ndescription: Generated.\nstatus: stable\ngenerated: { by: invalid, at: invalid }"),
    concept("Verified", "type: Workflow\ntitle: Verified\ndescription: Verified.\nstatus: stable\nverified: { by: invalid, at: invalid }"),
    concept("Deprecated", "type: Workflow\ntitle: Deprecated\ndescription: Deprecated.\nstatus: deprecated"),
    concept("NoH1", "type: Workflow\ntitle: NoH1\ndescription: No H1.\nstatus: stable", "Body\n"),
    concept("MissingPath", "type: Workflow\ntitle: MissingPath\ndescription: Missing path.\nstatus: stable\nsources:\n  - id: missing-path\n    resource: missing/path.md"),
    concept("SourceField", "type: Workflow\ntitle: SourceField\ndescription: Source.\nstatus: stable\nsources:\n  - id: source\n    resource: package.json\n    extra: value"),
    concept("SourceId", "type: Workflow\ntitle: SourceId\ndescription: Source.\nstatus: stable\nsources:\n  - id: Bad_ID\n    resource: package.json"),
    concept("OwaIds", "type: Workflow\ntitle: OwaIds\ndescription: Owa.\nstatus: stable\nowa:\n  evidence_ids: [ID-1, ID-1]"),
    concept("Format", "status: stable\ntype: Workflow\ntitle: Format\ndescription: Format.  "),
    concept("YamlProfile", "type: Workflow\ntitle: YamlProfile\ndescription: YAML profile.\ntags: &tags [yaml]\nstatus: stable"),
  ];
  validateOfficial(items);
  const codes = new Set(validatePolicy([root, ...items], process.cwd()).map((item) => item.code));
  const expected = Array.from({ length: 26 }, (_, index) => `OKF-POLICY-${String(index + 1).padStart(3, "0")}`);
  assert.ok(expected.every((code) => codes.has(code)), expected.filter((code) => !codes.has(code)).join(", "));
  assert.ok(codes.has("OKF-FORMAT-001"));
  assert.ok(codes.has("OKF-FORMAT-002"));
});

test("quality validator detects broken links and unreachable Concepts", async () => {
  const { validateQuality } = await load<{ validateQuality(artifacts: Artifact[], root: string): Diagnostic[] }>("tools/okf/policy.mjs");
  const items = [
    { kind: "root-index", path: "okf/index.md", extension: ".md", text: "# Root\n\n- [Known](known.md)\n" },
    { kind: "concept", path: "okf/known.md", extension: ".md", text: "[Missing](missing.md)" },
    { kind: "concept", path: "okf/orphan.md", extension: ".md", text: "# Orphan\n" },
  ];
  const codes = new Set(validateQuality(items, process.cwd()).map((item) => item.code));
  assert.ok(codes.has("OKF-QUALITY-001"));
  assert.ok(codes.has("OKF-QUALITY-002"));
});

test("portable path policy rejects Windows, POSIX, UNC, and traversal paths", async () => {
  const { isSafeRelative } = await load<{ isSafeRelative(value: string): boolean }>("tools/okf/validate.mjs");
  const invalid = ["C:/private.txt", "/private.txt", "\\\\server\\share", "../outside.txt"];
  assert.ok(invalid.every((value) => !isSafeRelative(value)));
  assert.ok(isSafeRelative("okf/history/phase-08.md"));
});

test("artifact safety rejects symlinks and unknown non-Markdown files", async () => {
  const { validateArtifactSafety, wrapExtensionErrors } = await load<{ validateArtifactSafety(artifacts: Artifact[]): Diagnostic[]; wrapExtensionErrors(messages: string[]): Diagnostic[] }>("tools/okf/validate-all.mjs");
  const codes = new Set([...wrapExtensionErrors(["invalid extension"]), ...validateArtifactSafety([
    { kind: "unsafe-symlink", path: "okf/link.md" },
    { kind: "unknown-artifact", path: "okf/value.bin" },
  ])].map((item) => item.code));
  assert.ok(codes.has("OKF-EXT-001"));
  assert.ok(codes.has("OKF-EXT-002"));
  assert.ok(codes.has("OKF-EXT-003"));
});

test("production discovery reconciles every retained artifact with no unknowns", async () => {
  const { discoverOkf } = await load<{ discoverOkf(root: string): Promise<Artifact[]> }>("tools/okf/discovery.mjs");
  const items = await discoverOkf(process.cwd());
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
  const expected = new Map([
    ["concept", 40],
    ["directory-index", 9],
    ["root-index", 1],
  ]);
  assert.equal(items.length, 50);
  for (const [kind, count] of expected) assert.equal(counts.get(kind), count, kind);
  assert.equal(items.some((item) => item.path.startsWith("okf-extension/")), false);
  assert.ok(items.every((item) => !["unknown-markdown", "unknown-artifact", "unsafe-symlink", "transitional-legacy"].includes(item.kind)));
});

test("production validation is deterministic and all layers are clean", async () => {
  const { validateAll } = await load<{ validateAll(root: string): Promise<{ artifacts: Artifact[]; diagnostics: Diagnostic[] }> }>("tools/okf/validate-all.mjs");
  const first = await validateAll(process.cwd());
  const second = await validateAll(process.cwd());
  assert.equal(first.diagnostics.length, 0);
  assert.deepEqual(first, second);
});

test("CLI rejects an unknown validation layer with usage exit code", async () => {
  const { run } = await load<{ run(args: string[]): Promise<number> }>("tools/okf/cli.mjs");
  assert.equal(await run(["validate", "--layer", "made-up"]), 2);
});
