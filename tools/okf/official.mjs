import { diagnostic } from "./diagnostics.mjs";
import { hasFrontmatter, parseFrontmatter } from "./frontmatter.mjs";

function validRecord(value) { return value && typeof value === "object" && !Array.isArray(value); }
const actor = /^(?:(?:human|process):[a-z0-9][a-z0-9._-]{0,63}|[a-z0-9][a-z0-9._-]{0,63}\/[a-z0-9][a-z0-9.+_-]{0,63})$/;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const date = /^\d{4}-\d{2}-\d{2}$/;

export function validateOfficial(artifacts) {
  const diagnostics = [];
  for (const artifact of artifacts) {
    if (artifact.kind === "concept") {
      const parsed = parseFrontmatter(artifact.text);
      artifact.parsed = parsed;
      if (parsed.error) diagnostics.push(diagnostic("official", "OKF-OFFICIAL-001", `Concept frontmatter is invalid: ${parsed.error}.`, artifact.path));
      else if (!validRecord(parsed.metadata)) diagnostics.push(diagnostic("official", "OKF-OFFICIAL-001", "Concept frontmatter root must be a mapping.", artifact.path));
      else if (typeof parsed.metadata.type !== "string" || parsed.metadata.type.trim() === "") diagnostics.push(diagnostic("official", "OKF-OFFICIAL-002", "Concept type must be a non-empty string.", artifact.path));
      else {
        const metadata = parsed.metadata;
        if (metadata.generated !== undefined && (!validRecord(metadata.generated) || !actor.test(metadata.generated.by ?? "") || (metadata.generated.at !== undefined && !timestamp.test(metadata.generated.at)))) diagnostics.push(diagnostic("official", "OKF-OFFICIAL-003", "generated requires an official actor in 'by' and an ISO 8601 UTC 'at' when present.", artifact.path));
        if (metadata.verified !== undefined) {
          const records = Array.isArray(metadata.verified) ? metadata.verified : [metadata.verified];
          if (records.length === 0 || records.some((record) => !validRecord(record) || !actor.test(record.by ?? "") || !timestamp.test(record.at ?? ""))) diagnostics.push(diagnostic("official", "OKF-OFFICIAL-004", "verified must be a mapping or non-empty list of records with official actors and ISO 8601 UTC timestamps.", artifact.path));
        }
        if (metadata.sources !== undefined && (!Array.isArray(metadata.sources) || metadata.sources.length === 0 || metadata.sources.some((source) => !validRecord(source) || typeof source.resource !== "string" || source.resource.trim() === ""))) diagnostics.push(diagnostic("official", "OKF-OFFICIAL-005", "sources must be a non-empty list whose entries contain a non-empty resource.", artifact.path));
        if (metadata.status !== undefined && !["draft", "stable", "deprecated"].includes(metadata.status)) diagnostics.push(diagnostic("official", "OKF-OFFICIAL-006", "status must be draft, stable, or deprecated when present.", artifact.path));
        if (metadata.stale_after !== undefined && (typeof metadata.stale_after !== "string" || !date.test(metadata.stale_after))) diagnostics.push(diagnostic("official", "OKF-OFFICIAL-007", "stale_after must be an absolute YYYY-MM-DD date when present.", artifact.path));
        if (metadata.type === "Attested Computation" && (typeof metadata.runtime !== "string" || metadata.runtime.trim() === "")) diagnostics.push(diagnostic("official", "OKF-OFFICIAL-008", "Attested Computation requires a non-empty runtime.", artifact.path));
      }
    } else if (artifact.kind === "root-index") {
      if (hasFrontmatter(artifact.text)) {
        const parsed = parseFrontmatter(artifact.text); artifact.parsed = parsed;
        if (parsed.error || !validRecord(parsed.metadata) || Object.keys(parsed.metadata).length !== 1 || parsed.metadata.okf_version !== "0.2") diagnostics.push(diagnostic("official", "OKF-OFFICIAL-010", "Root index frontmatter, when present, may contain only okf_version: \"0.2\".", artifact.path));
      }
    } else if (artifact.kind === "directory-index" && hasFrontmatter(artifact.text)) diagnostics.push(diagnostic("official", "OKF-OFFICIAL-011", "Directory index must not contain frontmatter.", artifact.path));
    else if (artifact.kind === "log" && !/^# .+\n\n## \d{4}-\d{2}-\d{2}/m.test(artifact.text)) diagnostics.push(diagnostic("official", "OKF-OFFICIAL-012", "Log must use ISO date headings.", artifact.path));
    else if (artifact.kind === "unknown-markdown") diagnostics.push(diagnostic("official", "OKF-OFFICIAL-013", "Markdown artifact has no approved classification.", artifact.path));
  }
  return diagnostics;
}
