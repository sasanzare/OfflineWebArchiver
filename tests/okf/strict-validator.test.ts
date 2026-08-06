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
  const directories = ["okf-extension", "okf", "docs", "packages", "apps", "tests", "tools"];
  for (const directory of directories) await cp(path.resolve(directory), path.join(root, directory), { recursive: true });
  for (const file of ["package.json", "package-lock.json", "README.md"]) await cp(path.resolve(file), path.join(root, file));
  await mkdir(path.join(root, "spikes", "phase-02-feasibility"), { recursive: true });
  await cp(path.resolve("spikes/phase-02-feasibility/README.md"), path.join(root, "spikes", "phase-02-feasibility", "README.md"));
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
  assert.equal(report.checks.length, 87);
  assert.ok(report.checks.some((item) => ["remote-target-not-checked", "remote-target-verified"].includes(item.status)));
});

test("concept without frontmatter is rejected instead of treated as exempt", async () => {
  assertRule(await officialDiagnostics(async (bundle) => {
    await mkdir(path.join(bundle, "arbitrary"), { recursive: true });
    await writeFile(path.join(bundle, "arbitrary", "example.md"), "# No metadata\n", "utf8");
  }), "OKF-CONFORMANCE-FRONTMATTER-MISSING");
});

test("malformed YAML is rejected with a YAML diagnostic", async () => {
  assertRule(await officialDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "malformed.md"), "---\ntype: [Workflow\n---\n# Broken\n", "utf8");
  }), "OKF-CONFORMANCE-YAML-INVALID");
});

test("missing and empty Concept type are rejected", async () => {
  assertRule(await officialDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "missing-type.md"), "---\ntitle: Missing\n---\n# Missing\n", "utf8");
    await writeFile(path.join(bundle, "empty-type.md"), "---\ntype: '  '\n---\n# Empty\n", "utf8");
  }), "OKF-CONFORMANCE-TYPE-MISSING");
  assertRule(await officialDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "empty-type.md"), "---\ntype: '  '\n---\n# Empty\n", "utf8");
  }), "OKF-CONFORMANCE-TYPE-EMPTY");
});

test("invalid existing root indexes are rejected while missing root indexes pass", async () => {
  assertRule(await officialDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "index.md"), "---\nokf_version: '0.1'\n---\n# Invalid\n", "utf8");
  }), "OKF-CONFORMANCE-INDEX-ROOT-FRONTMATTER");
  const diagnostics = await officialDiagnostics(async (bundle) => {
    await rm(path.join(bundle, "index.md"));
  });
  assert.equal(diagnostics.length, 0);
});

test("arbitrary nested Markdown and copied extension documentation are not exempt", async () => {
  const diagnostics = await officialDiagnostics(async (bundle) => {
    await mkdir(path.join(bundle, "nested", "extensions"), { recursive: true });
    await writeFile(path.join(bundle, "nested", "extensions", "copied.md"), "# Copied project documentation\n", "utf8");
  });
  assertRule(diagnostics, "OKF-CONFORMANCE-FRONTMATTER-MISSING");
  assert.equal(diagnostics.some((item) => item.message.includes("exempt")), false);
});

test("a directory named extensions cannot bypass official discovery", async () => {
  const diagnostics = await officialDiagnostics(async (bundle) => {
    await mkdir(path.join(bundle, "extensions"), { recursive: true });
    await writeFile(path.join(bundle, "extensions", "example.md"), "Transitional Legacy Artifact\n", "utf8");
  });
  assertRule(diagnostics, "OKF-CONFORMANCE-FRONTMATTER-MISSING");
});

test("broken local sources and bundle-escaping traversal are rejected", async () => {
  assertRule(await referenceDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "source.md"), "---\ntype: Source\nsources:\n  - resource: references/missing.md\n---\n# Source\n", "utf8");
  }), "OWA-REF-LOCAL-NOT-FOUND");
  assertRule(await referenceDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "source.md"), "---\ntype: Source\nsources:\n  - resource: ../../outside.md\n---\n# Source\n", "utf8");
  }), "OWA-REF-TRAVERSAL");
});

test("GitHub branch URLs pass references but fail OWA provenance", async () => {
  const invalid = await referenceDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "source.md"), "---\ntype: Source\nsources:\n  - resource: https://github.com/owner/repo/blob/not-a-sha/file.md\n---\n# Source\n", "utf8");
  });
  assert.equal(invalid.some((item) => item.severity === "error"), false);
  const branch = await referenceDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "source.md"), "---\ntype: Source\nsources:\n  - resource: https://github.com/owner/repo/blob/main/file.md\n---\n# Source\n", "utf8");
  });
  assert.equal(branch.some((item) => item.severity === "error"), false);
  const provenance = await load<{ validateProvenance(artifacts: Artifact[], root: string): Promise<{ diagnostics: Diagnostic[] }> }>("tools/okf/provenance.mjs");
  const { discovery } = await officialModules();
  const root = await mkdtemp(path.join(os.tmpdir(), "owa-okf-provenance-"));
  try {
    await cp(fixture, path.join(root, "okf"), { recursive: true });
    await writeFile(path.join(root, "okf", "source.md"), "---\ntype: Source\nsources:\n  - resource: https://github.com/owner/repo/blob/main/file.md\n---\n# Source\n", "utf8");
    const report = await provenance.validateProvenance(await discovery.discoverOkf(root), root);
    assertRule(report.diagnostics, "OWA-PROVENANCE-MUTABLE-GITHUB-URL");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("broken internal Markdown links produce an explicit reference diagnostic", async () => {
  const diagnostics = await referenceDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "links.md"), "---\ntype: Link Test\n---\n# Links\n\n[Missing](missing.md)\n", "utf8");
  });
  assertRule(diagnostics, "OWA-REF-LINK-BROKEN", "warning");
});

test("same-repository immutable permalink and external URL syntax are accepted without network", async () => {
  const references = await load<{ validateReferences(artifacts: Artifact[], root: string): Promise<{ diagnostics: Diagnostic[]; checks: Array<{ status: string }> }> }>("tools/okf/references.mjs");
  const { discovery, official } = await officialModules();
  const artifacts = await discovery.discoverOkf(process.cwd());
  official.validateOfficial(artifacts);
  const current = await references.validateReferences(artifacts, process.cwd());
  assert.equal(current.diagnostics.filter((item) => item.severity === "error").length, 0);
  assert.ok(current.checks.some((item) => item.status === "remote-target-not-checked"));
  let externalChecks: Array<{ status: string }> = [];
  await withOfficialFixture(async (bundle) => {
    await writeFile(path.join(bundle, "external.md"), "---\ntype: External\nsources:\n  - resource: https://example.com/reference\n---\n# External\n", "utf8");
  }, async (root) => {
    const items = await discovery.discoverOkf(root);
    official.validateOfficial(items);
    externalChecks = (await references.validateReferences(items, root)).checks;
  });
  assert.ok(externalChecks.some((item) => item["status"] === "remote-target-not-checked"));
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
  assert.equal(artifacts.length, 53);
  assert.equal(artifacts.some((item) => item.path.startsWith("okf-extension/")), false);
  assert.equal(artifacts.filter((item) => item.kind === "concept").length, 43);
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
  const validateAll = async () => ({ artifacts: [], referenceChecks: [], diagnostics: [{ layer: "references", severity: "warning", ruleId: "OWA-REF-LINK-BROKEN", code: "OWA-REF-LINK-BROKEN", message: "fixture warning" }] });
  assert.equal(await run(["validate", "--layer", "references"], { validateAll }), 0);
  assert.equal(await run(["validate", "--layer", "references", "--warnings-as-errors"], { validateAll }), 1);
});

test("unexpected validator exceptions become non-zero internal diagnostics", async () => {
  const { run } = await load<{ run(args: string[], dependencies?: { validateAll: () => Promise<never> }): Promise<number> }>("tools/okf/cli.mjs");
  assert.equal(await run(["validate", "--format", "json"], { validateAll: async () => { throw new Error("injected fixture failure"); } }), 3);
});

test("JSON output is machine-readable and unknown CLI arguments fail predictably", async () => {
  const { buildJsonReport, run } = await load<{
    buildJsonReport(report: { artifacts: Artifact[]; diagnostics: Diagnostic[]; referenceChecks: unknown[] }, diagnostics?: Diagnostic[], options?: { warningsAsErrors?: boolean }): Record<string, unknown>;
    run(args: string[], dependencies?: { validateAll: () => Promise<{ artifacts: Artifact[]; diagnostics: Diagnostic[]; referenceChecks: unknown[] }> }): Promise<number>;
  }>("tools/okf/cli.mjs");
  const report = buildJsonReport({ artifacts: [], diagnostics: [], referenceChecks: [] });
  assert.equal(report["result"], "pass");
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(report)));
  assert.equal(await run(["validate", "--made-up"]), 2);
});

test("optional root and directory indexes plus optional logs do not block official conformance", async () => {
  const { validateAll } = await load<{ validateAll(root: string, options?: { onlyLayer?: string }): Promise<{ diagnostics: Diagnostic[] }> }>("tools/okf/validate-all.mjs");
  const root = await mkdtemp(path.join(os.tmpdir(), "owa-okf-optional-files-"));
  try {
    await cp(fixture, path.join(root, "okf"), { recursive: true });
    await rm(path.join(root, "okf", "index.md"));
    await rm(path.join(root, "okf", "area", "index.md"));
    await rm(path.join(root, "okf", "log.md"));
    const report = await validateAll(root, { onlyLayer: "official" });
    assert.equal(report.diagnostics.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("existing valid directory indexes and logs pass, while malformed reserved files fail", async () => {
  const validDirectory = await officialDiagnostics(async () => {});
  assert.equal(validDirectory.length, 0);
  assertRule(await officialDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "area", "index.md"), "---\ntype: Not a Concept\n---\n# Area\n", "utf8");
  }), "OKF-CONFORMANCE-INDEX-FRONTMATTER");
  assertRule(await officialDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "log.md"), "# Log\n\n## Not a date\n", "utf8");
  }), "OKF-CONFORMANCE-LOG-DATE-INVALID");
});

test("root indexes reject Concept frontmatter but accept an omitted frontmatter block", async () => {
  assertRule(await officialDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "index.md"), "---\ntype: Index Concept\n---\n# Root\n", "utf8");
  }), "OKF-CONFORMANCE-INDEX-ROOT-FRONTMATTER");
  const diagnostics = await officialDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "index.md"), "# Root without metadata\n", "utf8");
  });
  assert.equal(diagnostics.length, 0);
});

test("unknown types, custom fields, owa metadata, and absent optional metadata pass official conformance", async () => {
  const diagnostics = await officialDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "minimal.md"), "---\ntype: Producer Defined Type\nowa:\n  implementation_status: active\ncustom_key: preserved\n---\n# Minimal\n", "utf8");
  });
  assert.equal(diagnostics.length, 0);
});

test("broken Markdown links are warnings in references and do not affect official conformance", async () => {
  const { discovery, official } = await officialModules();
  const references = await load<{ validateReferences(artifacts: Artifact[], root: string): Promise<{ diagnostics: Diagnostic[] }> }>("tools/okf/references.mjs");
  await withOfficialFixture(async (bundle) => {
    await writeFile(path.join(bundle, "links.md"), "---\ntype: Link Test\n---\n# Links\n\n[Missing](missing.md)\n", "utf8");
  }, async (root) => {
    const artifacts = await discovery.discoverOkf(root);
    assert.equal(official.validateOfficial(artifacts).length, 0);
    assertRule((await references.validateReferences(artifacts, root)).diagnostics, "OWA-REF-LINK-BROKEN", "warning");
  });
});

test("absolute HTTPS and mutable GitHub URLs are structurally valid official source values", async () => {
  const diagnostics = await officialDiagnostics(async (bundle) => {
    await writeFile(path.join(bundle, "urls.md"), "---\ntype: Source Test\nsources:\n  - resource: https://example.com/reference\n  - resource: https://github.com/example/project/blob/main/docs/source.md\n---\n# URLs\n", "utf8");
  });
  assert.equal(diagnostics.length, 0);
});

test("full-SHA external GitHub permalinks pass provenance syntax without network", async () => {
  const provenance = await load<{ validateProvenance(artifacts: Artifact[], root: string, options?: { verifySameRepositoryPermalink?: (root: string, target: Record<string, unknown>) => Promise<{ status: string }> }): Promise<{ diagnostics: Diagnostic[]; checks: Array<{ status: string; classification: string }> }> }>("tools/okf/provenance.mjs");
  await withOfficialFixture(async (bundle) => {
    await writeFile(path.join(bundle, "source.md"), "---\ntype: Source\nsources:\n  - resource: https://github.com/example/project/blob/0123456789abcdef0123456789abcdef01234567/docs/source.md\n---\n# Source\n", "utf8");
  }, async (root) => {
    const { discovery } = await officialModules();
    const report = await provenance.validateProvenance(await discovery.discoverOkf(root), root, {
      verifySameRepositoryPermalink: async () => ({ status: "not-local-repository" }),
    });
    assert.equal(report.diagnostics.length, 0);
    assert.ok(report.checks.some((item) => item.classification === "github-permalink" && item.status === "not-local-repository"));
  });
});

test("same-repository provenance checks classify missing commits and paths with stable OWA rules", async () => {
  const provenance = await load<{ validateProvenance(artifacts: Artifact[], root: string, options?: { verifySameRepositoryPermalink?: (root: string, target: Record<string, unknown>) => Promise<{ status: string }> }): Promise<{ diagnostics: Diagnostic[] }> }>("tools/okf/provenance.mjs");
  await withOfficialFixture(async (bundle) => {
    await writeFile(path.join(bundle, "source.md"), "---\ntype: Source\nsources:\n  - resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0123456789abcdef0123456789abcdef01234567/docs/source.md\n---\n# Source\n", "utf8");
  }, async (root) => {
    const { discovery } = await officialModules();
    const artifacts = await discovery.discoverOkf(root);
    assertRule((await provenance.validateProvenance(artifacts, root, { verifySameRepositoryPermalink: async () => ({ status: "commit-not-present-locally" }) })).diagnostics, "OWA-PROVENANCE-COMMIT-NOT-FOUND");
    assertRule((await provenance.validateProvenance(artifacts, root, { verifySameRepositoryPermalink: async () => ({ status: "path-not-found-locally" }) })).diagnostics, "OWA-PROVENANCE-PATH-NOT-IN-COMMIT");
  });
});

test("source values are classified as paths, bundle-relative paths, scope descriptors, or local absolute paths", async () => {
  const { classifyResource } = await load<{ classifyResource(value: string): { kind: string } }>("tools/okf/references.mjs");
  assert.equal(classifyResource("docs/source.md").kind, "relative-path");
  assert.equal(classifyResource("/references/source.md").kind, "bundle-relative-path");
  assert.equal(classifyResource("all queries in BigQuery project X").kind, "scope-descriptor");
  assert.equal(classifyResource("C:\\Users\\developer\\source.md").kind, "filesystem-absolute-path");
  assert.equal(classifyResource("/home/developer/source.md").kind, "filesystem-absolute-path");
});

test("scope descriptors do not trigger local file resolution", async () => {
  const { discovery, official } = await officialModules();
  const references = await load<{ validateReferences(artifacts: Artifact[], root: string): Promise<{ diagnostics: Diagnostic[]; checks: Array<{ status: string }> }> }>("tools/okf/references.mjs");
  await withOfficialFixture(async (bundle) => {
    await writeFile(path.join(bundle, "scope.md"), "---\ntype: Scope\nsources:\n  - resource: all queries in BigQuery project X\n---\n# Scope\n", "utf8");
  }, async (root) => {
    const artifacts = await discovery.discoverOkf(root);
    assert.equal(official.validateOfficial(artifacts).length, 0);
    const report = await references.validateReferences(artifacts, root);
    assert.equal(report.diagnostics.some((item) => item.ruleId === "OWA-REF-LOCAL-NOT-FOUND"), false);
    assert.ok(report.checks.some((item) => item.status === "scope-descriptor"));
  });
});

test("developer-local absolute paths fail only OWA provenance", async () => {
  const { discovery, official } = await officialModules();
  const references = await load<{ validateReferences(artifacts: Artifact[], root: string): Promise<{ diagnostics: Diagnostic[] }> }>("tools/okf/references.mjs");
  const provenance = await load<{ validateProvenance(artifacts: Artifact[], root: string): Promise<{ diagnostics: Diagnostic[] }> }>("tools/okf/provenance.mjs");
  await withOfficialFixture(async (bundle) => {
    await writeFile(path.join(bundle, "local.md"), "---\ntype: Local\nsources:\n  - resource: C:\\\\Users\\\\developer\\\\source.md\n  - resource: /home/developer/source.md\n---\n# Local\n", "utf8");
  }, async (root) => {
    const artifacts = await discovery.discoverOkf(root);
    assert.equal(official.validateOfficial(artifacts).length, 0);
    assert.equal((await references.validateReferences(artifacts, root)).diagnostics.length, 0);
    const diagnostics = (await provenance.validateProvenance(artifacts, root)).diagnostics;
    assert.equal(diagnostics.filter((item) => item.ruleId === "OWA-PROVENANCE-LOCAL-ABSOLUTE-PATH").length, 2);
  });
});

test("remote rate-limit and timeout states are deterministic and optional", async () => {
  const { checkRemote } = await load<{ checkRemote(url: string): Promise<{ status: string }> }>("tools/okf/references.mjs");
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(null, { status: 429 });
    assert.deepEqual(await checkRemote("https://example.com/rate-limited"), { status: "remote-target-not-checked", statusCode: 429 });
    globalThis.fetch = (async () => { const error = new Error("timeout"); error.name = "AbortError"; throw error; }) as typeof fetch;
    assert.deepEqual(await checkRemote("https://example.com/timeout"), { status: "remote-check-timeout" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("official, provenance, quality, and extension results remain isolated in combined output", async () => {
  const { buildHumanOutput, buildJsonReport } = await load<{
    buildHumanOutput(diagnostics: Diagnostic[], layer?: string): string;
    buildJsonReport(report: { artifacts: Artifact[]; diagnostics: Diagnostic[]; referenceChecks: unknown[]; provenanceChecks?: unknown[] }, diagnostics?: Diagnostic[], options?: { warningsAsErrors?: boolean }): Record<string, unknown>;
  }>("tools/okf/cli.mjs");
  const { validateAll } = await load<{ validateAll(root: string): Promise<{ artifacts: Artifact[]; diagnostics: Diagnostic[]; referenceChecks: unknown[]; provenanceChecks: unknown[] }> }>("tools/okf/validate-all.mjs");
  const root = await extensionFixture();
  try {
    await writeFile(path.join(root, "okf", "policy.md"), "---\ntype: Producer Type\n---\n# Policy\n", "utf8");
    await writeFile(path.join(root, "okf", "mutable.md"), "---\ntype: Source\nsources:\n  - resource: https://github.com/example/project/blob/main/docs/source.md\n---\n# Mutable\n", "utf8");
    const report = await validateAll(root);
    const json = buildJsonReport(report);
    const layerResults = json["layer_results"] as Record<string, { result: string }>;
    assert.equal(layerResults["official"]?.result, "pass");
    assert.equal(layerResults["provenance"]?.result, "fail");
    assert.equal(layerResults["quality"]?.result, "fail");
    assert.match(buildHumanOutput(report.diagnostics), /Official OKF v0\.2 Conformance: PASS/);
    assert.doesNotMatch(buildHumanOutput(report.diagnostics), /Official OKF v0\.2 Conformance: FAIL/);
    const serialized = JSON.stringify(json);
    assert.doesNotMatch(serialized, /[A-Za-z]:\\\\(?:Users|home|workspace)\\\\/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("current normalized sources remain provenance-valid without required network access", async () => {
  const provenance = await load<{ validateProvenance(artifacts: Artifact[], root: string): Promise<{ diagnostics: Diagnostic[]; checks: Array<{ classification: string }> }> }>("tools/okf/provenance.mjs");
  const { discovery } = await officialModules();
  const artifacts = await discovery.discoverOkf(process.cwd());
  const report = await provenance.validateProvenance(artifacts, process.cwd());
  assert.equal(report.diagnostics.length, 0);
  assert.equal(report.checks.length, 87);
  assert.equal(report.checks.every((item) => item.classification === "github-permalink"), true);
});
