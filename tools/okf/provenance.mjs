import { diagnostic } from "./diagnostics.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";
import { classifyResource, checkRemote, verifySameRepositoryPermalink } from "./references.mjs";

function provenanceDiagnostic(ruleId, message, file, severity = "error", details = {}) {
  return diagnostic("provenance", ruleId, message, file, severity, details);
}

function resourceEntries(metadata) {
  const entries = [];
  if (Array.isArray(metadata.sources)) {
    for (const [index, source] of metadata.sources.entries()) {
      if (source && typeof source === "object" && typeof source.resource === "string") entries.push({ field: "sources[" + index + "].resource", value: source.resource, sourceId: typeof source.id === "string" ? source.id : undefined });
    }
  }
  for (const field of ["resource", "computation"]) if (typeof metadata[field] === "string") entries.push({ field, value: metadata[field] });
  for (const owner of ["executor", "attester"]) {
    if (metadata[owner] && typeof metadata[owner] === "object" && typeof metadata[owner].resource === "string") entries.push({ field: owner + ".resource", value: metadata[owner].resource });
  }
  return entries;
}

function checkBase(artifact, entry, classification, status) {
  return {
    file: artifact.path,
    field: entry.field,
    sourceId: entry.sourceId,
    resource: typeof entry.value === "string" ? entry.value.trim() : entry.value,
    classification: classification.kind,
    status,
  };
}

export async function validateProvenance(artifacts, root, options = {}) {
  const diagnostics = [];
  const checks = [];
  for (const artifact of artifacts.filter((item) => item.kind === "concept" && item.text !== undefined)) {
    const parsed = artifact.parsed ?? parseFrontmatter(artifact.text);
    artifact.parsed = parsed;
    if (parsed.error || !parsed.metadata || typeof parsed.metadata !== "object" || Array.isArray(parsed.metadata)) continue;
    for (const entry of resourceEntries(parsed.metadata)) {
      const classification = classifyResource(entry.value);
      if (classification.kind === "invalid") {
        checks.push(checkBase(artifact, entry, classification, "not-classified"));
        continue;
      }
      if (classification.kind === "scope-descriptor") {
        checks.push(checkBase(artifact, entry, classification, "scope-descriptor"));
        continue;
      }
      if (classification.kind === "filesystem-absolute-path") {
        diagnostics.push(provenanceDiagnostic("OWA-PROVENANCE-LOCAL-ABSOLUTE-PATH", "OWA provenance does not permit developer-local absolute filesystem paths.", artifact.path, "error", { suggestion: "Use an HTTPS immutable permalink or a bundle-relative path." }));
        checks.push(checkBase(artifact, entry, classification, "owa-policy-violation"));
        continue;
      }
      if (classification.kind === "github-permalink") {
        if (classification.invalid) {
          diagnostics.push(provenanceDiagnostic("OWA-PROVENANCE-GITHUB-PERMALINK-MALFORMED", classification.reason, artifact.path));
          checks.push(checkBase(artifact, entry, classification, "owa-policy-violation"));
          continue;
        }
        if (!classification.immutable) {
          diagnostics.push(provenanceDiagnostic("OWA-PROVENANCE-MUTABLE-GITHUB-URL", "OWA provenance requires a full commit-SHA GitHub blob permalink without query or fragment state.", artifact.path, "error", { suggestion: "Use https://github.com/{owner}/{repo}/blob/{full-commit-sha}/{path}." }));
          checks.push(checkBase(artifact, entry, classification, "owa-policy-violation"));
          continue;
        }
        const local = await (options.verifySameRepositoryPermalink ?? verifySameRepositoryPermalink)(root, classification);
        let status = local.status;
        if (local.status === "commit-not-present-locally") diagnostics.push(provenanceDiagnostic("OWA-PROVENANCE-COMMIT-NOT-FOUND", "The GitHub permalink commit is not present in the local repository.", artifact.path));
        else if (local.status === "path-not-found-locally") diagnostics.push(provenanceDiagnostic("OWA-PROVENANCE-PATH-NOT-IN-COMMIT", "The GitHub permalink path is not present at the referenced local commit.", artifact.path));
        else if (local.status === "local-check-failed") diagnostics.push(provenanceDiagnostic("OWA-PROVENANCE-LOCAL-CHECK-FAILED", "The same-repository commit/path pair could not be verified locally.", artifact.path));
        else if (local.status === "local-check-unavailable") status = "local-target-not-checked";
        if (options.remote && ["not-local-repository", "local-check-unavailable", "local-check-failed"].includes(local.status)) {
          const remote = await checkRemote(entry.value.trim());
          status = remote.status;
          if (remote.status === "remote-target-missing") diagnostics.push(provenanceDiagnostic("OWA-PROVENANCE-REMOTE-NOT-FOUND", "The optional remote provenance check returned HTTP 404.", artifact.path));
        }
        checks.push(checkBase(artifact, entry, classification, status));
        continue;
      }
      if (classification.kind === "absolute-url") {
        diagnostics.push(provenanceDiagnostic("OWA-PROVENANCE-NON-GITHUB-URL", "OWA provenance requires current concrete sources to use HTTPS GitHub blob permalinks with full commit SHAs.", artifact.path, "error", { suggestion: "Use an immutable GitHub blob URL or classify the value as a scope descriptor." }));
        checks.push(checkBase(artifact, entry, classification, "owa-policy-violation"));
        continue;
      }
      diagnostics.push(provenanceDiagnostic("OWA-PROVENANCE-RELATIVE-SOURCE", "OWA provenance requires current concrete sources to use immutable GitHub blob permalinks.", artifact.path, "error", { suggestion: "Use an HTTPS GitHub blob URL pinned to a full commit SHA." }));
      checks.push(checkBase(artifact, entry, classification, "owa-policy-violation"));
    }
  }
  return { diagnostics, checks };
}
