import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

interface Diagnostic {
  layer: string;
  severity: string;
  ruleId?: string;
  code?: string;
  file?: string;
  message: string;
}

interface Artifact {
  path: string;
  kind: string;
  extension?: string;
  text?: string;
  parsed?: { metadata?: Record<string, unknown>; body: string; error?: string };
}

const fixture = path.resolve("tests/okf/fixtures/official-valid");

async function load<T>(relativePath: string): Promise<T> {
  return await import(pathToFileURL(path.resolve(relativePath)).href) as T;
}

async function officialModules() {
  const discovery = await load<{ discoverOkf(root: string): Promise<Artifact[]> }>("tools/okf/discovery.mjs");
  const official = await load<{ validateOfficial(artifacts: Artifact[]): Diagnostic[] }>("tools/okf/official.mjs");
  return { discovery, official };
}

async function withOfficialFixture(mutator: (bundle: string, root: string) => Promise<void>, callback: (root: string, bundle: string) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "owa-okf-official-"));
  const bundle = path.join(root, "okf");
  await cp(fixture, bundle, { recursive: true });
  try {
    await mutator(bundle, root);
    await callback(root, bundle);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function officialDiagnostics(mutator: (bundle: string, root: string) => Promise<void>) {
  const { discovery, official } = await officialModules();
  let result: Diagnostic[] = [];
  await withOfficialFixture(mutator, async (root) => {
    result = official.validateOfficial(await discovery.discoverOkf(root));
  });
  return result;
}

async function referenceDiagnostics(mutator: (bundle: string, root: string) => Promise<void>) {
  const { discovery, official } = await officialModules();
  const references = await load<{ validateReferences(artifacts: Artifact[], root: string, options?: { remote?: boolean }): Promise<{ diagnostics: Diagnostic[]; checks: Array<{ status: string }> }> }>("tools/okf/references.mjs");
  let result: Diagnostic[] = [];
  await withOfficialFixture(mutator, async (root) => {
    const artifacts = await discovery.discoverOkf(root);
    official.validateOfficial(artifacts);
    result = (await references.validateReferences(artifacts, root)).diagnostics;
  });
  return result;
}

function assertRule(diagnostics: Diagnostic[], ruleId: string, severity?: string) {
  assert.ok(diagnostics.some((item) => (item.ruleId ?? item.code) === ruleId && (severity === undefined || item.severity === severity)), `${ruleId} was not emitted: ${JSON.stringify(diagnostics)}`);
}

async function extensionFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "owa-okf-extension-"));
  const directories = ["okf-extension", "okf", "docs", "packages", "apps", "tests", "tools", "okf-bootstrap"];
  for (const directory of directories) await cp(path.resolve(directory), path.join(root, directory), { recursive: true });
  for (const file of ["package.json", "package-lock.json", "README.md"]) await cp(path.resolve(file), path.join(root, file));
  return root;
}

test("strict official validator accepts the minimal valid bundle and unknown metadata", async () => {
  const { discovery, official } = await officialModules();
  const root = await mkdtemp(path.join(os.tmpdir(), "owa-okf-valid-"));
  try {
    await cp(fixture, path.join(root, "okf"), { recursive: true });
    const artifacts = await discovery.discoverOkf(root);
    assert.equal(official.validateOfficial(artifacts).length, 0);
    assert.deepEqual(new Set(artifacts.map((item) => item.kind)), new Set(["root-index", "directory-index", "concept", "log"]));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("current official bundle passes strict structural and reference validation", async () => {
  const { discovery, official } = await officialModules();
  const references = await load<{ validateReferences(artifacts: Artifact[], root: string): Promise<{ diagnostics: Diagnostic[]; checks: Array<{ status: string }> }> }>("tools/okf/references.mjs");
  const artifacts = await discovery.discoverOkf(process.cwd());
  assert.equal(official.validateOfficial(artifacts).length, 0);
  const report = await references.validateReferences(artifacts, process.cwd());
  assert.equal(report.diagnostics.filter((item) => item.severity === "error").length, 0);
  assert.equal(report.checks.length, 81);
  assert.ok(report.checks.some((item) => ["locally-verified", "local-check-unavailable", "not-local-repository"].includes(item.status)));
});

test("concept without frontmatter is rejected instead of treated as exempt", async () => {
  assertRule(await officialDiagnostics(async (bundle) => {
    await mkdir(path.join(bundle, "arbitrary"), { recursive: true });
    await writeFile(path.join(bundle, "arbitrary", "example.md"), "# No metadata\n", "utf8");
  }), "OKF-FRONTMATTER-MISSING");
});

test("malformed YAML is rejected with a YAML diagnostic", async () => {
  assertRule(await officialDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "malformed.md"), "---\ntype: [Workflow\n---\n# Broken\n", "utf8");
  }), "OKF-YAML-INVALID");
});

test("missing and empty Concept type are rejected", async () => {
  assertRule(await officialDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "missing-type.md"), "---\ntitle: Missing\n---\n# Missing\n", "utf8");
    await writeFile(path.join(bundle, "empty-type.md"), "---\ntype: '  '\n---\n# Empty\n", "utf8");
  }), "OKF-TYPE-MISSING");
  assertRule(await officialDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "empty-type.md"), "---\ntype: '  '\n---\n# Empty\n", "utf8");
  }), "OKF-TYPE-EMPTY");
});

test("invalid and missing root indexes are rejected", async () => {
  assertRule(await officialDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "index.md"), "---\nokf_version: '0.1'\n---\n# Invalid\n", "utf8");
  }), "OKF-INDEX-ROOT-FRONTMATTER");
  assertRule(await officialDiagnostics(async (bundle) => {
    await rm(path.join(bundle, "index.md"));
  }), "OKF-INDEX-ROOT-MISSING");
});

test("arbitrary nested Markdown and copied extension documentation are not exempt", async () => {
  const diagnostics = await officialDiagnostics(async (bundle) => {
    await mkdir(path.join(bundle, "nested", "extensions"), { recursive: true });
    await writeFile(path.join(bundle, "nested", "extensions", "copied.md"), "# Copied project documentation\n", "utf8");
  });
  assertRule(diagnostics, "OKF-FRONTMATTER-MISSING");
  assert.equal(diagnostics.some((item) => item.message.includes("exempt")), false);
});

test("a directory named extensions cannot bypass official discovery", async () => {
  const diagnostics = await officialDiagnostics(async (bundle) => {
    await mkdir(path.join(bundle, "extensions"), { recursive: true });
    await writeFile(path.join(bundle, "extensions", "example.md"), "Transitional Legacy Artifact\n", "utf8");
  });
  assertRule(diagnostics, "OKF-FRONTMATTER-MISSING");
});

test("broken local sources and bundle-escaping traversal are rejected", async () => {
  assertRule(await referenceDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "source.md"), "---\ntype: Source\nsources:\n  - resource: references/missing.md\n---\n# Source\n", "utf8");
  }), "OKF-SOURCE-NOT-FOUND");
  assertRule(await referenceDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "source.md"), "---\ntype: Source\nsources:\n  - resource: ../../outside.md\n---\n# Source\n", "utf8");
  }), "OKF-SOURCE-TRAVERSAL");
});

test("invalid and mutable GitHub blob references are not reported as immutable", async () => {
  const invalid = await referenceDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "source.md"), "---\ntype: Source\nsources:\n  - resource: https://github.com/owner/repo/blob/not-a-sha/file.md\n---\n# Source\n", "utf8");
  });
  assertRule(invalid, "OKF-SOURCE-PERMALINK-NOT-IMMUTABLE");
  const branch = await referenceDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "source.md"), "---\ntype: Source\nsources:\n  - resource: https://github.com/owner/repo/blob/main/file.md\n---\n# Source\n", "utf8");
  });
  assertRule(branch, "OKF-SOURCE-PERMALINK-NOT-IMMUTABLE");
});

test("broken internal Markdown links produce an explicit reference diagnostic", async () => {
  const diagnostics = await referenceDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "links.md"), "---\ntype: Link Test\n---\n# Links\n\n[Missing](missing.md)\n", "utf8");
  });
  assertRule(diagnostics, "OKF-LINK-BROKEN", "warning");
});

test("same-repository immutable permalink and external URL syntax are accepted without network", async () => {
  const references = await load<{ validateReferences(artifacts: Artifact[], root: string): Promise<{ diagnostics: Diagnostic[]; checks: Array<{ status: string }> }> }>("tools/okf/references.mjs");
  const { discovery, official } = await officialModules();
  const artifacts = await discovery.discoverOkf(process.cwd());
  official.validateOfficial(artifacts);
  const current = await references.validateReferences(artifacts, process.cwd());
  assert.equal(current.diagnostics.filter((item) => item.severity === "error").length, 0);
  assert.ok(current.checks.some((item) => ["locally-verified", "local-check-unavailable"].includes(item.status)));
  let externalChecks: Array<{ status: string }> = [];
  await withOfficialFixture(async (bundle) => {
    await writeFile(path.join(bundle, "external.md"), "---\ntype: External\nsources:\n  - resource: https://example.com/reference\n---\n# External\n", "utf8");
  }, async (root) => {
    const items = await discovery.discoverOkf(root);
    official.validateOfficial(items);
    externalChecks = (await references.validateReferences(items, root)).checks;
  });
  assert.ok(externalChecks.some((item) => item["status"] === "syntactically-valid-not-checked"));
});

test("extension manifest schema violations are isolated to the OWA extension layer", async () => {
  const extension = await load<{ validateExtension(root: string): Promise<{ diagnostics: Diagnostic[] }> }>("tools/okf/extension.mjs");
  const root = await extensionFixture();
  try {
    const file = path.join(root, "okf-extension", "manifest.json");
    const manifest = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
    manifest["status"] = "INVALID";
    await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    const report = await extension.validateExtension(root);
    assertRule(report.diagnostics, "OWA-EXT-MANIFEST-SCHEMA");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("registry references to removed files are rejected by extension validation", async () => {
  const extension = await load<{ validateExtension(root: string): Promise<{ diagnostics: Diagnostic[] }> }>("tools/okf/extension.mjs");
  const root = await extensionFixture();
  try {
    const file = path.join(root, "okf-extension", "registry", "decisions.json");
    const registry = JSON.parse(await readFile(file, "utf8")) as { items: Array<Record<string, unknown>> };
    const item = registry.items.find((entry) => typeof entry["recordPath"] === "string");
    assert.ok(item);
    item["recordPath"] = "docs/removed/registry-target.md";
    await writeFile(file, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
    const report = await extension.validateExtension(root);
    assertRule(report.diagnostics, "OWA-EXT-PATH-NOT-FOUND");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("extension Markdown remains outside official Concept discovery", async () => {
  const { discovery } = await officialModules();
  const artifacts = await discovery.discoverOkf(process.cwd());
  assert.equal(artifacts.length, 50);
  assert.equal(artifacts.some((item) => item.path.startsWith("okf-extension/")), false);
  assert.equal(artifacts.filter((item) => item.kind === "concept").length, 40);
});

test("official validation succeeds independently when extension validation is not requested", async () => {
  const { validateAll } = await load<{ validateAll(root: string, options?: { onlyLayer?: string }): Promise<{ diagnostics: Diagnostic[] }> }>("tools/okf/validate-all.mjs");
  const root = await mkdtemp(path.join(os.tmpdir(), "owa-okf-independent-"));
  try {
    await cp(fixture, path.join(root, "okf"), { recursive: true });
    const report = await validateAll(root, { onlyLayer: "official" });
    assert.equal(report.diagnostics.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("warning-only validation passes by default and strict warnings fail", async () => {
  const { run } = await load<{ run(args: string[], dependencies?: { validateAll: () => Promise<{ artifacts: Artifact[]; referenceChecks: unknown[]; diagnostics: Diagnostic[] }> }): Promise<number> }>("tools/okf/cli.mjs");
  const validateAll = async () => ({ artifacts: [], referenceChecks: [], diagnostics: [{ layer: "references", severity: "warning", ruleId: "OKF-LINK-BROKEN", code: "OKF-LINK-BROKEN", message: "fixture warning" }] });
  assert.equal(await run(["validate", "--layer", "references"], { validateAll }), 0);
  assert.equal(await run(["validate", "--layer", "references", "--strict-warnings"], { validateAll }), 1);
});

test("unexpected validator exceptions become non-zero internal diagnostics", async () => {
  const { run } = await load<{ run(args: string[], dependencies?: { validateAll: () => Promise<never> }): Promise<number> }>("tools/okf/cli.mjs");
  assert.equal(await run(["validate", "--format", "json"], { validateAll: async () => { throw new Error("injected fixture failure"); } }), 1);
});

test("JSON output is machine-readable and unknown CLI arguments fail predictably", async () => {
  const { buildJsonReport, run } = await load<{
    buildJsonReport(report: { artifacts: Artifact[]; diagnostics: Diagnostic[]; referenceChecks: unknown[] }, diagnostics?: Diagnostic[], options?: { strictWarnings?: boolean }): Record<string, unknown>;
    run(args: string[], dependencies?: { validateAll: () => Promise<{ artifacts: Artifact[]; diagnostics: Diagnostic[]; referenceChecks: unknown[] }> }): Promise<number>;
  }>("tools/okf/cli.mjs");
  const report = buildJsonReport({ artifacts: [], diagnostics: [], referenceChecks: [] });
  assert.equal(report["result"], "pass");
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(report)));
  assert.equal(await run(["validate", "--made-up"]), 2);
});
