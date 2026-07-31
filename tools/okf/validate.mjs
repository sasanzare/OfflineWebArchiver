import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { repositoryRoot } from "../build/typescript.mjs";

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

const registryNames = [
  "domains",
  "nodes",
  "evidence",
  "relationships",
  "phases",
  "decisions",
  "risks",
  "changes",
];

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function jsonFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await jsonFiles(target)));
    if (entry.isFile() && entry.name.endsWith(".json")) files.push(target);
  }
  return files;
}

async function markdownAuthorityIds(root) {
  const authorities = [
    "docs/product/PROJECT_SCOPE.md",
    "docs/product/ACCEPTANCE_MATRIX.md",
    "docs/project/RISK_REGISTER.md",
    "docs/project/OPEN_DECISIONS.md",
    "okf-bootstrap/OPEN_QUESTIONS.md",
  ];
  const text = (await Promise.all(authorities.map((name) => readFile(path.join(root, name), "utf8")))).join("\n");
  return {
    requirements: new Set(text.match(/\b(?:FR|NFR)-[A-Z]+-\d{3}\b/g) ?? []),
    acceptance: new Set(text.match(/\bAC-[A-Z0-9]+-\d{3}\b/g) ?? []),
    risks: new Set(text.match(/\b(?:R-\d{3}|RISK-[A-Z]+-\d{3})\b/g) ?? []),
    decisions: new Set(text.match(/\b(?:OKF-OD|OD)-\d{3}\b/g) ?? []),
  };
}

function isSafeRelative(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !path.isAbsolute(value) &&
    !/^[A-Za-z]:[\\/]/.test(value) &&
    !value.split(/[\\/]/).includes("..")
  );
}

function requireString(item, field, location, errors) {
  if (typeof item[field] !== "string" || item[field].length === 0) {
    errors.push(`${location}: missing required string '${field}'`);
  }
}

function checkMappings(item, location, authorities, errors) {
  const mappings = [
    ["requirementIds", authorities.requirements, "requirement"],
    ["acceptanceIds", authorities.acceptance, "acceptance"],
    ["riskIds", authorities.risks, "risk"],
    ["decisionIds", authorities.decisions, "decision"],
  ];
  for (const [field, known, label] of mappings) {
    const values = item[field];
    if (values === undefined) continue;
    if (!Array.isArray(values)) {
      errors.push(`${location}: '${field}' must be an array`);
      continue;
    }
    for (const value of values) {
      if (!known.has(value)) errors.push(`${location}: unknown ${label} ID '${value}'`);
    }
  }
}

function verifiedNodeHasEvidence(item) {
  return item.status !== "VERIFIED" || (Array.isArray(item.evidenceIds) && item.evidenceIds.length > 0);
}

export async function validateOkf(root = repositoryRoot) {
  const errors = [];
  const okfRoot = path.join(root, "okf");
  for (const file of await jsonFiles(okfRoot)) {
    try {
      JSON.parse(await readFile(file, "utf8"));
    } catch (error) {
      errors.push(`${path.relative(root, file).split(path.sep).join("/")}: invalid JSON (${error instanceof Error ? error.message : "unknown error"})`);
    }
  }
  const manifestPath = path.join(okfRoot, "manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    errors.push(`okf/manifest.json: invalid or unreadable JSON (${error instanceof Error ? error.message : "unknown error"})`);
    return errors;
  }
  for (const field of ["schemaVersion", "frameworkVersion", "status", "activatedPhase", "registries"]) {
    if (manifest[field] === undefined) errors.push(`okf/manifest.json: missing required field '${field}'`);
  }
  if (!OKF_STATUSES.has(manifest.status)) errors.push(`okf/manifest.json: unknown status '${manifest.status}'`);
  if (typeof manifest.product !== "string" || manifest.product.length === 0) errors.push("okf/manifest.json: missing required product string");
  if (manifest.activatedPhase !== 4) errors.push("okf/manifest.json: activatedPhase must be 4");

  const authorities = await markdownAuthorityIds(root);
  const registries = new Map();
  const globalIds = new Map();
  for (const name of registryNames) {
    const registryPath = path.join(okfRoot, "registry", `${name}.json`);
    let registry;
    try {
      registry = JSON.parse(await readFile(registryPath, "utf8"));
    } catch (error) {
      errors.push(`okf/registry/${name}.json: invalid or unreadable JSON (${error instanceof Error ? error.message : "unknown error"})`);
      continue;
    }
    if (registry.schemaVersion !== "1.0.0") errors.push(`okf/registry/${name}.json: unsupported schemaVersion`);
    if (!Array.isArray(registry.items)) {
      errors.push(`okf/registry/${name}.json: missing required items array`);
      continue;
    }
    registries.set(name, registry.items);
    for (const [index, item] of registry.items.entries()) {
      const location = `okf/registry/${name}.json items[${index}]`;
      requireString(item, "id", location, errors);
      requireString(item, "name", location, errors);
      requireString(item, "status", location, errors);
      if (!OKF_STATUSES.has(item.status)) errors.push(`${location}: unknown status '${item.status}'`);
      if (typeof item.id === "string") {
        if (globalIds.has(item.id)) errors.push(`${location}: duplicate ID '${item.id}', first found in ${globalIds.get(item.id)}`);
        else globalIds.set(item.id, location);
      }
      checkMappings(item, location, authorities, errors);
    }
  }

  const pathFields = ["path", "knowledgePath", "recordPath", "reportPath"];
  for (const [name, items] of registries) {
    for (const [index, item] of items.entries()) {
      for (const field of pathFields) {
        if (item[field] === undefined) continue;
        const location = `okf/registry/${name}.json items[${index}].${field}`;
        if (!isSafeRelative(item[field])) errors.push(`${location}: path must be repository-relative without parent traversal`);
        else if (!(await exists(path.join(root, item[field])))) errors.push(`${location}: broken repository path '${item[field]}'`);
      }
    }
  }

  const evidence = new Map((registries.get("evidence") ?? []).map((item) => [item.id, item]));
  for (const item of registries.get("nodes") ?? []) {
    if (item.status === "VERIFIED") {
      if (!verifiedNodeHasEvidence(item)) errors.push(`${item.id}: VERIFIED node has no evidence`);
      for (const evidenceId of item.evidenceIds ?? []) {
        if (!evidence.has(evidenceId)) errors.push(`${item.id}: broken evidence reference '${evidenceId}'`);
      }
    }
  }

  const referenceIds = new Set([
    ...globalIds.keys(),
    ...authorities.requirements,
    ...authorities.acceptance,
    ...authorities.risks,
    ...authorities.decisions,
  ]);
  for (const item of registries.get("relationships") ?? []) {
    for (const field of ["sourceId", "targetId"]) {
      if (!referenceIds.has(item[field])) errors.push(`${item.id}: broken relationship ${field} '${item[field]}'`);
    }
  }

  const phaseNumbers = new Set();
  for (const item of registries.get("phases") ?? []) {
    if (!Number.isInteger(item.phaseNumber) || item.phaseNumber < 1 || item.phaseNumber > 25) {
      errors.push(`${item.id}: invalid phase number '${item.phaseNumber}'`);
    } else phaseNumbers.add(item.phaseNumber);
  }
  for (const required of [1, 2, 3, 4]) {
    if (!phaseNumbers.has(required)) errors.push(`Missing canonical phase record for Product Phase ${required}`);
  }
  if (!(registries.get("changes") ?? []).some((item) => item.id === "OKF-CHG-P03-001")) {
    errors.push("Missing Product Phase 3 change record OKF-CHG-P03-001");
  }
  if (!(registries.get("changes") ?? []).some((item) => item.id === "OKF-CHG-P04-001")) {
    errors.push("Missing Product Phase 4 change record OKF-CHG-P04-001");
  }

  const criticalRequirements = [
    "NFR-MAINT-001",
    "NFR-TEST-001",
    "NFR-KNOW-001",
    "NFR-KNOW-002",
    "NFR-KNOW-003",
    "NFR-KNOW-004",
    "FR-PROJECT-001",
    "FR-PROJECT-002",
    "FR-PROJECT-003",
    "FR-PROJECT-004",
    "NFR-REL-002",
    "NFR-PORT-002",
  ];
  const mappedRequirements = new Set();
  for (const items of registries.values()) {
    for (const item of items) {
      for (const requirementId of item.requirementIds ?? []) mappedRequirements.add(requirementId);
    }
  }
  for (const requirementId of criticalRequirements) {
    if (!authorities.requirements.has(requirementId)) errors.push(`Critical requirement authority missing '${requirementId}'`);
    else if (!mappedRequirements.has(requirementId)) errors.push(`Orphaned critical requirement '${requirementId}'`);
  }

  for (const required of [
    "okf/validation/schemas/manifest.schema.json",
    "okf/validation/schemas/registry.schema.json",
    "okf/validation/rules/SEMANTIC_RULES.md",
    "okf/validation/reports/PHASE_03_OKF_MIGRATION_REPORT.md",
    "okf/phases/phase-01/PHASE_01_RECORD.md",
    "okf/phases/phase-02/PHASE_02_RECORD.md",
    "okf/phases/phase-03/PHASE_03_ARCHITECTURE_RECORD.md",
    "okf/phases/phase-04/PHASE_04_PROJECT_FORMAT_RECORD.md",
  ]) {
    if (!(await exists(path.join(root, required)))) errors.push(`Missing canonical OKF artifact '${required}'`);
  }
  return errors;
}

async function selfTest() {
  const probes = [
    ["C:\\private\\evidence.txt", false],
    ["../outside.txt", false],
    ["okf/README.md", true],
  ];
  const failed = probes.filter(([value, expected]) => isSafeRelative(value) !== expected);
  if (failed.length > 0) throw new Error("OKF path-policy self-test failed");
  if (OKF_STATUSES.has("PASSED")) throw new Error("OKF status-policy self-test failed");
  if (verifiedNodeHasEvidence({ status: "VERIFIED", evidenceIds: [] })) throw new Error("OKF planned-only/verified-evidence self-test failed");
  process.stdout.write("OKF validator negative policy self-tests passed.\n");
}

async function main() {
  if (process.argv.includes("--self-test")) await selfTest();
  const errors = await validateOkf();
  if (errors.length > 0) {
    process.stderr.write(`OKF validation failed with ${errors.length} actionable error(s):\n- ${errors.join("\n- ")}\n`);
    process.exitCode = 1;
    return;
  }
  const jsonCount = (await readdir(path.join(repositoryRoot, "okf", "registry"))).filter((name) => name.endsWith(".json")).length;
  process.stdout.write(`Canonical OKF validation passed: ${jsonCount} registries, zero orphaned critical requirements, zero broken references.\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
