import { diagnostic } from "./diagnostics.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";

function validRecord(value) { return value && typeof value === "object" && !Array.isArray(value); }

export function validateOfficial(artifacts) {
  const diagnostics = [];
  for (const artifact of artifacts) {
    if (artifact.kind === "concept") {
      const parsed = parseFrontmatter(artifact.text);
      artifact.parsed = parsed;
      if (parsed.error) diagnostics.push(diagnostic("official", "OKF-OFFICIAL-001", `Concept frontmatter is invalid: ${parsed.error}.`, artifact.path));
      else if (typeof parsed.metadata.type !== "string" || parsed.metadata.type.trim() === "") diagnostics.push(diagnostic("official", "OKF-OFFICIAL-002", "Concept type must be a non-empty string.", artifact.path));
      else {
        for (const field of ["generated", "verified", "sources"]) if (parsed.metadata[field] !== undefined && !validRecord(parsed.metadata[field]) && !Array.isArray(parsed.metadata[field])) diagnostics.push(diagnostic("official", "OKF-OFFICIAL-003", `Official field ${field} has an unsupported structure.`, artifact.path));
      }
    } else if (artifact.kind === "root-index") {
      const parsed = parseFrontmatter(artifact.text); artifact.parsed = parsed;
      if (parsed.error || !parsed.metadata || Object.keys(parsed.metadata).length !== 1 || parsed.metadata.okf_version !== "0.2") diagnostics.push(diagnostic("official", "OKF-OFFICIAL-010", "Root index frontmatter must contain only okf_version: \"0.2\".", artifact.path));
    } else if (artifact.kind === "directory-index" && artifact.text.startsWith("---\n")) diagnostics.push(diagnostic("official", "OKF-OFFICIAL-011", "Directory index must not contain frontmatter.", artifact.path));
    else if (artifact.kind === "log" && !/^# .+\n\n## \d{4}-\d{2}-\d{2}/m.test(artifact.text)) diagnostics.push(diagnostic("official", "OKF-OFFICIAL-012", "Log must use ISO date headings.", artifact.path));
    else if (artifact.kind === "unknown-markdown") diagnostics.push(diagnostic("official", "OKF-OFFICIAL-013", "Markdown artifact has no approved classification.", artifact.path));
  }
  return diagnostics;
}
