import { diagnostic } from "./diagnostics.mjs";
import { hasFrontmatter, parseFrontmatter } from "./frontmatter.mjs";

function record(layer, ruleId, message, file, severity = "error", details = {}) {
  return diagnostic(layer, ruleId, message, file, severity, details);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateConcept(artifact) {
  const diagnostics = [];
  const parsed = parseFrontmatter(artifact.text ?? "");
  artifact.parsed = parsed;
  if (parsed.error) {
    diagnostics.push(record("official", hasFrontmatter(artifact.text ?? "") ? "OKF-YAML-INVALID" : "OKF-FRONTMATTER-MISSING", hasFrontmatter(artifact.text ?? "") ? `Concept frontmatter is invalid: ${parsed.error}.` : "Every non-reserved Markdown file must begin with a YAML frontmatter block.", artifact.path, "error", { line: parsed.line, column: parsed.column, suggestion: "Add a top-of-file --- YAML block with a non-empty type field." }));
    return diagnostics;
  }
  if (!isRecord(parsed.metadata)) {
    diagnostics.push(record("official", "OKF-FRONTMATTER-NOT-MAPPING", "Concept frontmatter must parse to a YAML mapping.", artifact.path, "error", { line: 1, column: 1 }));
    return diagnostics;
  }
  if (!Object.hasOwn(parsed.metadata, "type")) {
    diagnostics.push(record("official", "OKF-TYPE-MISSING", "Every Concept frontmatter mapping must contain type.", artifact.path, "error", { suggestion: "Add type: <descriptive type>." }));
  } else if (typeof parsed.metadata.type !== "string") {
    diagnostics.push(record("official", "OKF-TYPE-NOT-STRING", "Concept type must be a string.", artifact.path));
  } else if (parsed.metadata.type.trim() === "") {
    diagnostics.push(record("official", "OKF-TYPE-EMPTY", "Concept type must not be empty or whitespace-only.", artifact.path));
  }
  if (parsed.metadata.type === "Attested Computation" && (typeof parsed.metadata.runtime !== "string" || parsed.metadata.runtime.trim() === "")) {
    diagnostics.push(record("official", "OKF-COMPUTATION-RUNTIME-MISSING", "An Attested Computation must declare a non-empty runtime.", artifact.path));
  }
  return diagnostics;
}

function validateRootIndex(artifact) {
  if (!hasFrontmatter(artifact.text ?? "")) return [];
  const parsed = parseFrontmatter(artifact.text ?? "");
  artifact.parsed = parsed;
  if (parsed.error || !isRecord(parsed.metadata) || Object.keys(parsed.metadata).length !== 1 || parsed.metadata.okf_version !== "0.2") {
    return [record("official", "OKF-INDEX-ROOT-FRONTMATTER", "Root index frontmatter, when present, must contain only okf_version: \"0.2\".", artifact.path, "error", { suggestion: "Use ---\nokf_version: \"0.2\"\n--- or remove root-index frontmatter." })];
  }
  return [];
}

function validateDirectoryIndex(artifact) {
  if (hasFrontmatter(artifact.text ?? "")) return [record("official", "OKF-INDEX-FRONTMATTER", "Directory index files must not contain frontmatter.", artifact.path, "error", { suggestion: "Remove the YAML block from this index." })];
  return [];
}

function validateLog(artifact) {
  const diagnostics = [];
  if (hasFrontmatter(artifact.text ?? "")) diagnostics.push(record("official", "OKF-LOG-FRONTMATTER", "Reserved log files do not use Concept frontmatter.", artifact.path));
  const headings = [...(artifact.text ?? "").matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
  if (headings.length === 0) diagnostics.push(record("official", "OKF-LOG-DATE-MISSING", "A log must contain at least one ISO 8601 date heading (## YYYY-MM-DD).", artifact.path));
  else if (headings.some((heading) => !/^\d{4}-\d{2}-\d{2}$/.test(heading))) diagnostics.push(record("official", "OKF-LOG-DATE-INVALID", "Log date headings must use YYYY-MM-DD.", artifact.path));
  return diagnostics;
}

export function validateOfficial(artifacts) {
  const diagnostics = [];
  for (const artifact of artifacts) {
    if (artifact.kind === "missing-bundle") diagnostics.push(record("official", "OKF-STRUCT-BUNDLE-MISSING", "The official okf/ bundle root does not exist.", artifact.path, "error", { suggestion: "Create the okf directory and its optional root index." }));
    else if (artifact.kind === "invalid-bundle-root") diagnostics.push(record("official", "OKF-STRUCT-BUNDLE-ROOT", "The official okf/ path must be a directory.", artifact.path));
    else if (artifact.kind === "missing-root-index") diagnostics.push(record("official", "OKF-INDEX-ROOT-MISSING", "The configured official bundle requires okf/index.md.", artifact.path, "error", { suggestion: "Add a root index with optional okf_version: \"0.2\" frontmatter." }));
    else if (artifact.kind === "case-collision") diagnostics.push(record("official", "OKF-INDEX-DUPLICATE-CASE", `Case-insensitive duplicate paths are not allowed: ${(artifact.paths ?? []).join(", ")}.`, artifact.path, "error", { suggestion: "Keep one lower-case reserved filename/path." }));
    else if (artifact.kind === "reserved-case") diagnostics.push(record("official", "OKF-INDEX-CASE", "Reserved filenames must use lower-case index.md or log.md exactly.", artifact.path));
    else if (artifact.kind === "unsafe-link") diagnostics.push(record("official", "OKF-STRUCT-UNSAFE-LINK", "Symbolic links and junctions are not followed inside the official bundle.", artifact.path));
    else if (artifact.kind === "markdown-directory") diagnostics.push(record("official", "OKF-STRUCT-MD-DIRECTORY", "A directory whose name ends in .md is not a valid Markdown artifact.", artifact.path));
    else if (artifact.kind === "unknown-artifact") diagnostics.push(record("official", "OKF-STRUCT-UNEXPECTED-ARTIFACT", "Only Markdown files are allowed in the official OKF bundle.", artifact.path));
    else if (artifact.kind === "unreadable" || artifact.kind === "unreadable-directory") diagnostics.push(record("official", "OKF-STRUCT-UNREADABLE", `Official bundle artifact cannot be read: ${artifact.error ?? "unknown read error"}.`, artifact.path));
    else if (artifact.kind === "root-index") diagnostics.push(...validateRootIndex(artifact));
    else if (artifact.kind === "directory-index") diagnostics.push(...validateDirectoryIndex(artifact));
    else if (artifact.kind === "log") diagnostics.push(...validateLog(artifact));
    else if (artifact.kind === "concept") diagnostics.push(...validateConcept(artifact));
  }
  return diagnostics;
}
