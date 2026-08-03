import { repositoryRoot } from "../build/typescript.mjs";
import { validateOkf as validateLegacy } from "./validate.mjs";
import { sortDiagnostics, diagnostic } from "./diagnostics.mjs";
import { discoverOkf } from "./discovery.mjs";
import { validateOfficial } from "./official.mjs";
import { validatePolicy, validateQuality } from "./policy.mjs";

export function validateArtifactSafety(artifacts) {
  const diagnostics = [];
  for (const artifact of artifacts) {
    if (artifact.kind === "unsafe-symlink") diagnostics.push(diagnostic("extension", "OKF-EXT-002", "Symbolic links are not allowed in the production OKF tree.", artifact.path));
    else if (artifact.kind === "unknown-artifact") diagnostics.push(diagnostic("extension", "OKF-EXT-003", "Non-Markdown artifact has no approved classification.", artifact.path));
  }
  return diagnostics;
}

export function wrapExtensionErrors(messages) {
  return messages.map((message) => diagnostic("extension", "OKF-EXT-001", message, "okf"));
}

export async function validateAll(root = repositoryRoot) {
  const artifacts = await discoverOkf(root);
  const diagnostics = [...validateOfficial(artifacts), ...validatePolicy(artifacts, root), ...validateQuality(artifacts, root), ...validateArtifactSafety(artifacts)];
  const legacy = await validateLegacy(root);
  diagnostics.push(...wrapExtensionErrors(legacy));
  return { artifacts, diagnostics: sortDiagnostics(diagnostics) };
}
