import path from "node:path";
import { diagnostic } from "./diagnostics.mjs";
import { frontmatterSource, hasFrontmatter, parseFrontmatter } from "./frontmatter.mjs";
import { isFilesystemAbsolute } from "./paths.mjs";

const types = new Set(["Project Overview", "Product Requirement", "Architecture Overview", "Architecture Component", "Architecture Decision", "Workflow", "Data Model", "Security Control", "Operational Runbook", "Recovery Procedure", "Test Strategy", "Quality Policy", "Phase Record", "Reference"]);
const statuses = new Set(["draft", "stable", "deprecated"]);
const topLevel = ["type", "title", "description", "resource", "tags", "status", "generated", "verified", "sources", "usage_window", "stale_after", "owa"];
const owa = new Set(["implementation_status", "verification_status", "governance_status", "requirement_ids", "acceptance_ids", "decision_ids", "risk_ids", "evidence_ids", "legacy_ids"]);
const actor = /^(?:(?:human|process):[a-z0-9][a-z0-9._-]{0,63}|[a-z0-9][a-z0-9._-]{0,63}\/[a-z0-9][a-z0-9.+_-]{0,63})$/;
const utc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const sourceKeys = new Set(["id", "resource", "title", "author", "usage_count", "last_modified", "usage_window"]);
const sourceId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validatePolicy(artifacts, root = process.cwd()) {
  const diagnostics = [];
  const rootIndex = artifacts.find((artifact) => artifact.kind === "root-index");
  if (rootIndex !== undefined) {
    const parsed = parseFrontmatter(rootIndex.text);
    if (!hasFrontmatter(rootIndex.text) || parsed.error || !parsed.metadata || Array.isArray(parsed.metadata) || Object.keys(parsed.metadata).length !== 1 || parsed.metadata.okf_version !== "0.2") diagnostics.push(diagnostic("quality", "OWA-QUALITY-ROOT-VERSION", "Repository root index should declare only okf_version: \"0.2\".", rootIndex.path));
  }
  for (const artifact of artifacts.filter((item) => item.kind === "concept" && item.parsed?.metadata)) {
    const metadata = artifact.parsed.metadata;
    const yaml = frontmatterSource(artifact.text) ?? "";
    if (/\t/.test(yaml) || /(^|[\s,[{])(?:[&*!][A-Za-z0-9_-]+)|^\s*<<:/m.test(yaml)) diagnostics.push(diagnostic("quality", "OWA-QUALITY-YAML-PRODUCER-SAFETY", "Repository frontmatter forbids tabs, anchors, aliases, merge keys, and explicit tags.", artifact.path));
    if (!types.has(metadata.type)) diagnostics.push(diagnostic("quality", "OWA-QUALITY-TAXONOMY", `Type '${metadata.type}' is not in the approved taxonomy.`, artifact.path));
    for (const field of ["title", "description", "status"]) if (typeof metadata[field] !== "string" || metadata[field].trim() === "") diagnostics.push(diagnostic("quality", "OWA-QUALITY-REQUIRED-METADATA", `Repository field '${field}' should be a non-empty string.`, artifact.path));
    if (metadata.status && !statuses.has(metadata.status)) diagnostics.push(diagnostic("quality", "OWA-QUALITY-STATUS", "Status should be draft, stable, or deprecated.", artifact.path));
    for (const key of Object.keys(metadata)) if (!topLevel.includes(key)) diagnostics.push(diagnostic("quality", "OWA-QUALITY-UNKNOWN-FIELD", `Unknown repository top-level field '${key}'.`, artifact.path));
    const h1 = /^#\s+(.+)$/m.exec(artifact.parsed.body)?.[1]?.trim();
    if (!h1) diagnostics.push(diagnostic("quality", "OWA-QUALITY-H1-MISSING", "Concept body should contain an H1.", artifact.path));
    else if (metadata.title && metadata.title !== h1) diagnostics.push(diagnostic("quality", "OWA-QUALITY-TITLE-MISMATCH", "Frontmatter title should equal the first H1.", artifact.path));
    if (metadata.tags !== undefined && (!Array.isArray(metadata.tags) || metadata.tags.some((tag) => typeof tag !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag)))) diagnostics.push(diagnostic("quality", "OWA-QUALITY-TAGS", "Tags should be lowercase kebab-case strings.", artifact.path));
    if (metadata.sources !== undefined) {
      if (!Array.isArray(metadata.sources)) diagnostics.push(diagnostic("quality", "OWA-QUALITY-SOURCES", "Sources should be an array when present.", artifact.path));
      else {
        const ids = new Set();
        for (const source of metadata.sources) {
          if (!source || typeof source !== "object" || typeof source.resource !== "string" || source.resource.trim() === "") diagnostics.push(diagnostic("quality", "OWA-QUALITY-SOURCE-RESOURCE", "Each source should contain a non-empty resource.", artifact.path));
          if (source && typeof source === "object") for (const key of Object.keys(source)) if (!sourceKeys.has(key)) diagnostics.push(diagnostic("quality", "OWA-QUALITY-SOURCE-FIELD", `Unknown source field '${key}'.`, artifact.path));
          if (source?.id) {
            if (typeof source.id !== "string" || !sourceId.test(source.id)) diagnostics.push(diagnostic("quality", "OWA-QUALITY-SOURCE-ID", "Source IDs should be lowercase kebab-case.", artifact.path));
            if (ids.has(source.id)) diagnostics.push(diagnostic("quality", "OWA-QUALITY-SOURCE-DUPLICATE", "Source IDs should be unique within a Concept.", artifact.path));
            ids.add(source.id);
          }
        }
      }
    }
    if (metadata.stale_after !== undefined && (typeof metadata.stale_after !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(metadata.stale_after))) diagnostics.push(diagnostic("quality", "OWA-QUALITY-STALE-DATE", "stale_after should be an absolute YYYY-MM-DD date.", artifact.path));
    if (["Security Control", "Operational Runbook"].includes(metadata.type) && metadata.stale_after === undefined) diagnostics.push(diagnostic("quality", "OWA-QUALITY-STALE-DATE-MISSING", "This Concept type should declare stale_after.", artifact.path));
    if (["Security Control", "Operational Runbook", "Phase Record", "Architecture Decision", "Product Requirement"].includes(metadata.type) && metadata.sources === undefined) diagnostics.push(diagnostic("quality", "OWA-QUALITY-SOURCES-MISSING", "This Concept type should declare sources.", artifact.path));
    if (metadata.resource !== undefined && (typeof metadata.resource !== "string" || isFilesystemAbsolute(metadata.resource) && !metadata.resource.startsWith("/"))) diagnostics.push(diagnostic("quality", "OWA-QUALITY-RESOURCE", "resource should be a portable path or URL.", artifact.path));
    if (metadata.generated !== undefined) {
      if (!metadata.generated || typeof metadata.generated !== "object" || !actor.test(metadata.generated.by ?? "") || !utc.test(metadata.generated.at ?? "")) diagnostics.push(diagnostic("quality", "OWA-QUALITY-GENERATED", "generated should contain a valid actor and UTC timestamp.", artifact.path));
    }
    if (metadata.verified !== undefined) {
      const records = Array.isArray(metadata.verified) ? metadata.verified : [metadata.verified];
      if (records.some((record) => !record || typeof record !== "object" || !actor.test(record.by ?? "") || !utc.test(record.at ?? ""))) diagnostics.push(diagnostic("quality", "OWA-QUALITY-VERIFIED", "Each verified record should contain a valid actor and UTC timestamp.", artifact.path));
    }
    if (metadata.status === "deprecated" && !/(superseded|replacement|retire)/i.test(artifact.parsed.body)) diagnostics.push(diagnostic("quality", "OWA-QUALITY-DEPRECATED-RATIONALE", "Deprecated Concepts should state a replacement or retirement rationale.", artifact.path));
    if (metadata.owa !== undefined) {
      if (!metadata.owa || typeof metadata.owa !== "object" || Array.isArray(metadata.owa)) diagnostics.push(diagnostic("quality", "OWA-QUALITY-OWA-OBJECT", "owa should be an object.", artifact.path));
      else for (const [key, value] of Object.entries(metadata.owa)) {
        if (!owa.has(key)) diagnostics.push(diagnostic("quality", "OWA-QUALITY-OWA-FIELD", `Unknown owa field '${key}'.`, artifact.path));
        else if (key.endsWith("_ids") && (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || item.length === 0) || new Set(value).size !== value.length)) diagnostics.push(diagnostic("quality", "OWA-QUALITY-OWA-IDS", `owa.${key} should be a non-empty list of unique IDs.`, artifact.path));
      }
    }
    const present = Object.keys(metadata); const expected = [...present].sort((a, b) => topLevel.indexOf(a) - topLevel.indexOf(b));
    if (present.join("\0") !== expected.join("\0")) diagnostics.push(diagnostic("format", "OWA-FORMAT-FRONTMATTER-ORDER", "Frontmatter fields are not in canonical order.", artifact.path, "warning"));
    if (/[ \t]+$/m.test(artifact.text)) diagnostics.push(diagnostic("format", "OWA-FORMAT-TRAILING-WHITESPACE", "Markdown contains trailing whitespace.", artifact.path, "warning"));
  }
  return diagnostics;
}

export function validateQuality(artifacts, root) {
  const diagnostics = [];
  const byPath = new Map(artifacts.filter((artifact) => artifact.extension === ".md" && typeof artifact.text === "string").map((artifact) => [artifact.path, artifact]));
  const reachable = new Set();
  const pending = byPath.has("okf/index.md") ? ["okf/index.md"] : [];
  while (pending.length > 0) {
    const current = pending.shift();
    if (reachable.has(current)) continue;
    reachable.add(current);
    const artifact = byPath.get(current);
    for (const match of artifact.text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const raw = match[1].split("#", 1)[0];
      if (!raw || /^(https?:|mailto:|#)/i.test(raw)) continue;
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(current), raw.replaceAll("\\", "/")));
      const resolved = byPath.has(target) ? target : byPath.has(`${target.replace(/\/$/, "")}/index.md`) ? `${target.replace(/\/$/, "")}/index.md` : undefined;
      if (resolved !== undefined && !reachable.has(resolved)) pending.push(resolved);
    }
  }
  for (const artifact of artifacts.filter((item) => item.kind === "concept" && !reachable.has(item.path))) diagnostics.push(diagnostic("quality", "OWA-QUALITY-CONCEPT-UNREACHABLE", "Concept is not reachable from okf/index.md.", artifact.path, "warning"));
  return diagnostics;
}
