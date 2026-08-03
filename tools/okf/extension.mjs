import { access, lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { diagnostic } from "./diagnostics.mjs";
import { isSafeRepositoryRelative, isWithin, portable } from "./paths.mjs";

export const OKF_STATUSES = new Set([
  "VERIFIED",
  "PLANNED",
  "PARTIAL",
  "UNKNOWN",
  "NEEDS_OWNER_CONFIRMATION",
  "DOCUMENTATION_CODE_CONFLICT",
  "DEPRECATED",
  "BLOCKED",
  "NOT_APPLICABLE",
]);

const registryNames = ["domains", "nodes", "evidence", "relationships", "phases", "decisions", "risks", "changes"];
const pathFields = ["path", "knowledgePath", "recordPath", "reportPath"];

function extDiagnostic(ruleId, message, file, severity = "error", details = {}) {
  return diagnostic("extension", ruleId, message, file, severity, details);
}

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

async function regularFile(root, target) {
  if (!isWithin(root, target)) return false;
  try {
    const item = await lstat(target);
    return item.isFile() && !item.isSymbolicLink();
  } catch {
    return false;
  }
}

async function jsonFiles(directory) {
  const files = [];
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return files; }
  for (const entry of entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await jsonFiles(target));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) files.push(target);
  }
  return files;
}

async function markdownFiles(directory) {
  const files = [];
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return files; }
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(target));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.push(target);
  }
  return files;
}

async function readJson(root, target, diagnostics, ruleId = "OWA-EXT-JSON-INVALID") {
  try {
    return JSON.parse(await readFile(target, "utf8"));
  } catch (error) {
    diagnostics.push(extDiagnostic(ruleId, `JSON is invalid or unreadable: ${error instanceof Error ? error.message : "unknown JSON error"}.`, portable(root, target)));
    return undefined;
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function checkRequiredString(value, field, location, diagnostics) {
  if (typeof value?.[field] !== "string" || value[field].trim() === "") diagnostics.push(extDiagnostic("OWA-EXT-REGISTRY-FIELD", `${location}: required field '${field}' must be a non-empty string.`, location));
}

function collectRefs(value, refs = []) {
  if (Array.isArray(value)) for (const item of value) collectRefs(item, refs);
  else if (isRecord(value)) for (const [key, item] of Object.entries(value)) {
    if (key === "$ref" && typeof item === "string") refs.push(item);
    else collectRefs(item, refs);
  }
  return refs;
}

function resolvePointer(document, fragment) {
  if (fragment === "" || fragment === "#") return true;
  if (!fragment.startsWith("#/")) return false;
  let value = document;
  for (const token of fragment.slice(2).split("/").map((item) => item.replaceAll("~1", "/").replaceAll("~0", "~"))) {
    if (!isRecord(value) || !Object.hasOwn(value, token)) return false;
    value = value[token];
  }
  return true;
}

function validateManifestShape(manifest, file, diagnostics) {
  if (!isRecord(manifest)) {
    diagnostics.push(extDiagnostic("OWA-EXT-MANIFEST-SCHEMA", "Extension manifest must be a JSON object.", file));
    return;
  }
  const allowed = new Set(["$schema", "schemaVersion", "extensionVersion", "okfVersion", "product", "status", "activatedPhase", "activatedAt", "authority", "bootstrapHistory", "registries"]);
  for (const key of Object.keys(manifest)) if (!allowed.has(key)) diagnostics.push(extDiagnostic("OWA-EXT-MANIFEST-SCHEMA", `Extension manifest contains unsupported property '${key}'.`, file));
  for (const field of ["schemaVersion", "extensionVersion", "okfVersion", "product", "status", "activatedPhase", "registries"]) if (!Object.hasOwn(manifest, field)) diagnostics.push(extDiagnostic("OWA-EXT-MANIFEST-SCHEMA", `Extension manifest is missing required property '${field}'.`, file));
  if (manifest.schemaVersion !== "1.0.0") diagnostics.push(extDiagnostic("OWA-EXT-MANIFEST-SCHEMA", "manifest.schemaVersion must be 1.0.0.", file));
  if (manifest.extensionVersion !== "1.0.0") diagnostics.push(extDiagnostic("OWA-EXT-MANIFEST-SCHEMA", "manifest.extensionVersion must be 1.0.0.", file));
  if (manifest.okfVersion !== "0.2") diagnostics.push(extDiagnostic("OWA-EXT-MANIFEST-SCHEMA", "manifest.okfVersion must be 0.2.", file));
  if (typeof manifest.product !== "string" || manifest.product.trim() === "") diagnostics.push(extDiagnostic("OWA-EXT-MANIFEST-SCHEMA", "manifest.product must be a non-empty string.", file));
  if (!OKF_STATUSES.has(manifest.status)) diagnostics.push(extDiagnostic("OWA-EXT-MANIFEST-SCHEMA", `manifest.status '${manifest.status}' is not supported.`, file));
  if (!Number.isInteger(manifest.activatedPhase) || manifest.activatedPhase !== 8) diagnostics.push(extDiagnostic("OWA-EXT-MANIFEST-SCHEMA", "manifest.activatedPhase must be the integer 8.", file));
  if (!isRecord(manifest.registries)) diagnostics.push(extDiagnostic("OWA-EXT-MANIFEST-SCHEMA", "manifest.registries must be an object.", file));
}

async function authorityIds(root, diagnostics) {
  const authorities = [
    ["docs/product/PROJECT_SCOPE.md", "requirements", /\b(?:FR|NFR)-[A-Z]+-\d{3}\b/g],
    ["docs/product/ACCEPTANCE_MATRIX.md", "acceptance", /\bAC-[A-Z0-9]+-\d{3}\b/g],
    ["docs/project/RISK_REGISTER.md", "risks", /\b(?:R-\d{3}|RISK-[A-Z]+-\d{3})\b/g],
    ["docs/project/OPEN_DECISIONS.md", "decisions", /\b(?:OKF-OD|OD)-\d{3}\b/g],
  ];
  const result = { requirements: new Set(), acceptance: new Set(), risks: new Set(), decisions: new Set() };
  for (const [relative, key, pattern] of authorities) {
    const target = path.join(root, relative);
    try {
      const text = await readFile(target, "utf8");
      for (const match of text.matchAll(pattern)) result[key].add(match[0]);
    } catch {
      diagnostics.push(extDiagnostic("OWA-EXT-AUTHORITY-MISSING", `Authority document is missing or unreadable: '${relative}'.`, relative));
    }
  }
  return result;
}

function checkMappings(item, location, authorities, diagnostics) {
  for (const [field, known, label] of [["requirementIds", authorities.requirements, "requirement"], ["acceptanceIds", authorities.acceptance, "acceptance"], ["riskIds", authorities.risks, "risk"], ["decisionIds", authorities.decisions, "decision"]]) {
    if (item[field] === undefined) continue;
    if (!Array.isArray(item[field])) {
      diagnostics.push(extDiagnostic("OWA-EXT-MAPPING-INVALID", `${location}: '${field}' must be an array.`, location));
      continue;
    }
    for (const value of item[field]) if (!known.has(value)) diagnostics.push(extDiagnostic("OWA-EXT-MAPPING-BROKEN", `${location}: unknown ${label} ID '${value}'.`, location));
  }
}

function checkRegistryItem(item, location, globalIds, authorities, diagnostics) {
  if (!isRecord(item)) {
    diagnostics.push(extDiagnostic("OWA-EXT-REGISTRY-ITEM", `${location}: registry item must be an object.`, location));
    return;
  }
  for (const field of ["id", "name", "status"]) checkRequiredString(item, field, location, diagnostics);
  if (typeof item.status === "string" && !OKF_STATUSES.has(item.status)) diagnostics.push(extDiagnostic("OWA-EXT-REGISTRY-STATUS", `${location}: unsupported status '${item.status}'.`, location));
  if (typeof item.id === "string") {
    if (globalIds.has(item.id)) diagnostics.push(extDiagnostic("OWA-EXT-REGISTRY-DUPLICATE-ID", `${location}: duplicate ID '${item.id}', first found at ${globalIds.get(item.id)}.`, location));
    else globalIds.set(item.id, location);
  }
  checkMappings(item, location, authorities, diagnostics);
}

async function validateRegistryPath(root, item, location, diagnostics) {
  for (const field of pathFields) {
    if (item[field] === undefined) continue;
    const value = item[field];
    const fieldLocation = `${location}.${field}`;
    if (!isSafeRepositoryRelative(value)) {
      diagnostics.push(extDiagnostic("OWA-EXT-PATH-UNSAFE", `${fieldLocation}: path must be repository-relative and traversal-free.`, fieldLocation));
      continue;
    }
    const target = path.resolve(root, value);
    if (!isWithin(root, target) || !(await regularFile(root, target))) diagnostics.push(extDiagnostic("OWA-EXT-PATH-NOT-FOUND", `${fieldLocation}: referenced repository file does not exist: '${value}'.`, fieldLocation, "error", { suggestion: "Update the registry reference to an existing regular file." }));
  }
}

function validateSchemaDocuments(root, documents, diagnostics) {
  for (const [file, schema] of documents) {
    if (!isRecord(schema)) {
      diagnostics.push(extDiagnostic("OWA-EXT-SCHEMA-INVALID", "Schema document must be a JSON object.", portable(root, file)));
      continue;
    }
    for (const reference of collectRefs(schema)) {
      if (/^(?:https?:|urn:)/i.test(reference)) continue;
      const [filePart, fragment = ""] = reference.split("#", 2);
      const target = filePart === "" ? file : path.resolve(path.dirname(file), filePart);
      const targetSchema = documents.get(target);
      if (targetSchema === undefined) diagnostics.push(extDiagnostic("OWA-EXT-SCHEMA-REF-BROKEN", `Unresolved local schema reference '${reference}'.`, portable(root, file)));
      else if (!resolvePointer(targetSchema, fragment === "" ? "" : `#${fragment}`)) diagnostics.push(extDiagnostic("OWA-EXT-SCHEMA-REF-BROKEN", `Unresolved local schema fragment '${reference}'.`, portable(root, file)));
    }
  }
}

async function checkMarkdownLinks(root, files, diagnostics) {
  const paths = new Set(files.map((file) => portable(root, file)));
  for (const file of files) {
    let text;
    try { text = await readFile(file, "utf8"); } catch { continue; }
    for (const match of text.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/g)) {
      const raw = match[1].split("#", 1)[0].trim();
      if (!raw || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(raw)) continue;
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(portable(root, file)), raw.replaceAll("\\", "/")));
      if (!paths.has(target) && !paths.has(`${target.replace(/\/$/, "")}/index.md`)) diagnostics.push(extDiagnostic("OWA-EXT-LINK-BROKEN", `Extension Markdown link '${raw}' has no target.`, portable(root, file)));
    }
  }
}

export async function validateExtension(root) {
  const repositoryRoot = path.resolve(root);
  const extensionRoot = path.join(repositoryRoot, "okf-extension");
  const diagnostics = [];
  if (!(await exists(extensionRoot))) return { diagnostics: [extDiagnostic("OWA-EXT-ROOT-MISSING", "The okf-extension/ root does not exist.", "okf-extension")], registries: [] };
  const manifestPath = path.join(extensionRoot, "manifest.json");
  const manifest = await readJson(repositoryRoot, manifestPath, diagnostics, "OWA-EXT-MANIFEST-INVALID");
  if (manifest === undefined) return { diagnostics, registries: [] };
  validateManifestShape(manifest, "okf-extension/manifest.json", diagnostics);

  const schemaFiles = [path.join(extensionRoot, "validation", "schemas", "manifest.schema.json"), path.join(extensionRoot, "validation", "schemas", "registry.schema.json")];
  const schemaDocuments = new Map();
  for (const file of schemaFiles) {
    const schema = await readJson(repositoryRoot, file, diagnostics, "OWA-EXT-SCHEMA-INVALID");
    if (schema !== undefined) schemaDocuments.set(file, schema);
  }
  validateSchemaDocuments(repositoryRoot, schemaDocuments, diagnostics);
  if (manifest.$schema !== undefined && (!isSafeRepositoryRelative(manifest.$schema) || !(await regularFile(repositoryRoot, path.resolve(extensionRoot, manifest.$schema))))) diagnostics.push(extDiagnostic("OWA-EXT-MANIFEST-SCHEMA-REF", "manifest.$schema must resolve to a regular file inside okf-extension/.", "okf-extension/manifest.json"));
  for (const file of await jsonFiles(extensionRoot)) {
    if (file === manifestPath || schemaFiles.includes(file) || file.startsWith(path.join(extensionRoot, "registry") + path.sep)) continue;
    await readJson(repositoryRoot, file, diagnostics);
  }

  const authorities = await authorityIds(repositoryRoot, diagnostics);
  const registries = new Map();
  const globalIds = new Map();
  for (const name of registryNames) {
    const expected = `okf-extension/registry/${name}.json`;
    const configured = manifest.registries?.[name];
    if (configured !== expected) diagnostics.push(extDiagnostic("OWA-EXT-MANIFEST-REGISTRY", `manifest.registries.${name} must equal '${expected}'.`, "okf-extension/manifest.json"));
    const registryPath = path.join(extensionRoot, "registry", `${name}.json`);
    const registry = await readJson(repositoryRoot, registryPath);
    if (registry === undefined) continue;
    if (!isRecord(registry) || registry.schemaVersion !== "1.0.0" || !Array.isArray(registry.items)) {
      diagnostics.push(extDiagnostic("OWA-EXT-REGISTRY-SCHEMA", `Registry '${name}' must contain schemaVersion 1.0.0 and an items array.`, portable(repositoryRoot, registryPath)));
      continue;
    }
    registries.set(name, registry.items);
    for (const [index, item] of registry.items.entries()) checkRegistryItem(item, `okf-extension/registry/${name}.json items[${index}]`, globalIds, authorities, diagnostics);
  }
  if (isRecord(manifest.registries)) for (const key of Object.keys(manifest.registries)) if (!registryNames.includes(key)) diagnostics.push(extDiagnostic("OWA-EXT-MANIFEST-REGISTRY", `manifest.registries contains unknown registry '${key}'.`, "okf-extension/manifest.json"));

  for (const [name, items] of registries) for (const [index, item] of items.entries()) if (isRecord(item)) await validateRegistryPath(repositoryRoot, item, `okf-extension/registry/${name}.json items[${index}]`, diagnostics);
  const evidence = new Map((registries.get("evidence") ?? []).filter(isRecord).map((item) => [item.id, item]));
  for (const item of registries.get("nodes") ?? []) {
    if (!isRecord(item)) continue;
    if (item.status === "VERIFIED" && (!Array.isArray(item.evidenceIds) || item.evidenceIds.length === 0)) diagnostics.push(extDiagnostic("OWA-EXT-VERIFIED-WITHOUT-EVIDENCE", `${item.id}: VERIFIED node has no evidenceIds.`, "okf-extension/registry/nodes.json"));
    for (const evidenceId of item.evidenceIds ?? []) if (!evidence.has(evidenceId)) diagnostics.push(extDiagnostic("OWA-EXT-EVIDENCE-REF-BROKEN", `${item.id}: broken evidence reference '${evidenceId}'.`, "okf-extension/registry/nodes.json"));
  }
  const officialMarkdown = await markdownFiles(path.join(repositoryRoot, "okf"));
  const officialText = [];
  for (const file of officialMarkdown) try { officialText.push(await readFile(file, "utf8")); } catch {}
  const referencedEvidence = new Set();
  for (const item of registries.get("nodes") ?? []) for (const id of item?.evidenceIds ?? []) referencedEvidence.add(id);
  for (const item of registries.get("relationships") ?? []) {
    if (evidence.has(item?.sourceId)) referencedEvidence.add(item.sourceId);
    if (evidence.has(item?.targetId)) referencedEvidence.add(item.targetId);
  }
  for (const id of evidence.keys()) if (officialText.some((text) => text.includes(id))) referencedEvidence.add(id);
  for (const id of evidence.keys()) if (!referencedEvidence.has(id)) diagnostics.push(extDiagnostic("OWA-EXT-EVIDENCE-ORPHAN", `${id}: evidence record has no node, relationship, or official Concept reference.`, "okf-extension/registry/evidence.json"));

  const referenceIds = new Set([...globalIds.keys(), ...authorities.requirements, ...authorities.acceptance, ...authorities.risks, ...authorities.decisions]);
  for (const item of registries.get("relationships") ?? []) if (isRecord(item)) for (const field of ["sourceId", "targetId"]) if (!referenceIds.has(item[field])) diagnostics.push(extDiagnostic("OWA-EXT-RELATIONSHIP-REF-BROKEN", `${item.id}: broken relationship ${field} '${item[field]}'.`, "okf-extension/registry/relationships.json"));

  const phaseNumbers = new Set();
  for (const item of registries.get("phases") ?? []) if (isRecord(item)) {
    if (!Number.isInteger(item.phaseNumber) || item.phaseNumber < 1 || item.phaseNumber > 25) diagnostics.push(extDiagnostic("OWA-EXT-PHASE-NUMBER", `${item.id}: invalid phase number '${item.phaseNumber}'.`, "okf-extension/registry/phases.json"));
    else phaseNumbers.add(item.phaseNumber);
  }
  for (const required of [1, 2, 3, 4, 5, 6, 7, 8]) if (!phaseNumbers.has(required)) diagnostics.push(extDiagnostic("OWA-EXT-PHASE-MISSING", `Missing canonical phase record for Product Phase ${required}.`, "okf-extension/registry/phases.json"));
  for (const required of ["OKF-CHG-P03-001", "OKF-CHG-P04-001", "OKF-CHG-P05-001", "OKF-CHG-P06-001", "OKF-CHG-P07-001", "OKF-CHG-P08-001"]) if (!(registries.get("changes") ?? []).some((item) => item?.id === required)) diagnostics.push(extDiagnostic("OWA-EXT-CHANGE-MISSING", `Missing required change record '${required}'.`, "okf-extension/registry/changes.json"));

  const criticalRequirements = ["NFR-MAINT-001", "NFR-TEST-001", "NFR-KNOW-001", "NFR-KNOW-002", "NFR-KNOW-003", "NFR-KNOW-004", "FR-PROJECT-001", "FR-PROJECT-002", "FR-PROJECT-003", "FR-PROJECT-004", "NFR-REL-002", "NFR-PORT-002", "FR-AUTHZ-001", "FR-SCOPE-001", "FR-SCOPE-002", "FR-SCOPE-003", "FR-RECOVERY-001"];
  const mappedRequirements = new Set();
  for (const items of registries.values()) for (const item of items) for (const requirementId of item?.requirementIds ?? []) mappedRequirements.add(requirementId);
  for (const requirementId of criticalRequirements) {
    if (!authorities.requirements.has(requirementId)) diagnostics.push(extDiagnostic("OWA-EXT-AUTHORITY-ID-MISSING", `Critical requirement authority is missing '${requirementId}'.`, "docs/product/PROJECT_SCOPE.md"));
    else if (!mappedRequirements.has(requirementId)) diagnostics.push(extDiagnostic("OWA-EXT-REQUIREMENT-ORPHAN", `Critical requirement '${requirementId}' is not mapped by an extension registry item.`, "okf-extension/registry"));
  }
  for (const required of ["okf-extension/validation/schemas/manifest.schema.json", "okf-extension/validation/schemas/registry.schema.json", "okf-extension/validation/rules/semantic-rules.md", "okf-extension/validation/reports/phase-03-migration-report.md", "okf/history/phase-01.md", "okf/history/phase-02.md", "okf/history/phase-03.md", "okf/history/phase-04.md", "okf/history/phase-05.md", "okf/history/phase-06.md", "okf/history/phase-07.md", "okf/history/phase-08.md"]) if (!(await regularFile(repositoryRoot, path.join(repositoryRoot, required)))) diagnostics.push(extDiagnostic("OWA-EXT-CANONICAL-ARTIFACT-MISSING", `Missing canonical extension artifact '${required}'.`, required));
  await checkMarkdownLinks(repositoryRoot, await markdownFiles(extensionRoot), diagnostics);
  return { diagnostics, registries: [...registries.keys()] };
}
