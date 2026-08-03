import { repositoryRoot } from "../build/typescript.mjs";
import { diagnostic, sortDiagnostics } from "./diagnostics.mjs";
import { discoverOkf } from "./discovery.mjs";
import { validateOfficial } from "./official.mjs";
import { validateReferences } from "./references.mjs";
import { validateExtension } from "./extension.mjs";
import { validatePolicy, validateQuality } from "./policy.mjs";

const officialLayers = new Set(["official", "references", "quality", "format"]);

function unexpected(layer, error) {
  return diagnostic("internal", "OKF-INTERNAL-UNEXPECTED-EXCEPTION", `Unexpected ${layer} validator exception: ${error instanceof Error ? error.message : String(error)}.`, layer, "error", { sourceLayer: layer, suggestion: "Fix the validator exception; it is never treated as a successful validation." });
}

async function safeAsync(layer, callback) {
  try { return { value: await callback(), diagnostics: [] }; } catch (error) { return { value: undefined, diagnostics: [unexpected(layer, error)] }; }
}

function safeSync(layer, callback) {
  try { return { value: callback(), diagnostics: [] }; } catch (error) { return { value: undefined, diagnostics: [unexpected(layer, error)] }; }
}

export function validateArtifactSafety(artifacts) {
  const diagnostics = [];
  for (const artifact of artifacts) {
    if (artifact.kind === "unsafe-link") diagnostics.push(diagnostic("official", "OKF-STRUCT-UNSAFE-LINK", "Symbolic links and junctions are not allowed in the official bundle.", artifact.path));
    else if (artifact.kind === "unknown-artifact") diagnostics.push(diagnostic("official", "OKF-STRUCT-UNEXPECTED-ARTIFACT", "Only Markdown files are allowed in the official bundle.", artifact.path));
  }
  return diagnostics;
}

export function wrapExtensionErrors(messages) {
  return messages.map((message) => diagnostic("extension", "OWA-EXT-LEGACY-ERROR", message, "okf-extension"));
}

export async function validateAll(root = repositoryRoot, options = {}) {
  const onlyLayer = options.onlyLayer;
  const runOfficial = onlyLayer === undefined || onlyLayer === "official";
  const runReferences = onlyLayer === undefined || onlyLayer === "references";
  const runExtension = onlyLayer === undefined || onlyLayer === "extension";
  const runQuality = onlyLayer === undefined || onlyLayer === "quality";
  const runFormat = onlyLayer === undefined || onlyLayer === "format";
  const needsOfficialArtifacts = officialLayers.has(onlyLayer) || onlyLayer === undefined;
  let artifacts = [];
  const diagnostics = [];
  let referenceChecks = [];

  if (needsOfficialArtifacts) {
    const discovered = await safeAsync("discovery", () => discoverOkf(root));
    artifacts = discovered.diagnostics.length === 0 && Array.isArray(discovered.value) ? discovered.value : [];
    if (discovered.diagnostics.length > 0) diagnostics.push(...discovered.diagnostics);
  }

  if (runOfficial) {
    const result = safeSync("official", () => validateOfficial(artifacts));
    diagnostics.push(...result.diagnostics);
  }
  if (runReferences) {
    const result = await safeAsync("references", () => validateReferences(artifacts, root, options));
    if (result.diagnostics.length > 0) diagnostics.push(...result.diagnostics);
    else {
      diagnostics.push(...(result.value?.diagnostics ?? []));
      referenceChecks = result.value?.checks ?? [];
    }
  }
  if (runExtension) {
    const result = await safeAsync("extension", async () => (await validateExtension(root)).diagnostics);
    diagnostics.push(...result.diagnostics);
  }
  if (runQuality || runFormat) {
    // Official parsing is intentionally used as a data preparation step; its diagnostics remain hidden
    // when a caller explicitly requests only the project quality or formatting layer.
    if (artifacts.length > 0) validateOfficial(artifacts);
    const policy = safeSync("quality", () => validatePolicy(artifacts, root));
    for (const item of policy.diagnostics) if ((item.layer === "quality" && runQuality) || (item.layer === "format" && runFormat)) diagnostics.push(item);
    if (runQuality) {
      const quality = safeSync("quality", () => validateQuality(artifacts, root));
      diagnostics.push(...quality.diagnostics);
    }
  }
  return { artifacts, diagnostics: sortDiagnostics(diagnostics), referenceChecks };
}
