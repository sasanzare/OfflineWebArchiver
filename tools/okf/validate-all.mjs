import { repositoryRoot } from "../build/typescript.mjs";
import { canonicalLayer, diagnostic, sortDiagnostics } from "./diagnostics.mjs";
import { discoverOkf } from "./discovery.mjs";
import { validateOfficial } from "./official.mjs";
import { validateReferences } from "./references.mjs";
import { validateProvenance } from "./provenance.mjs";
import { validateExtension } from "./extension.mjs";
import { validatePolicy, validateQuality } from "./policy.mjs";

const artifactLayers = new Set(["official", "references", "provenance", "quality", "format"]);

function unexpected(layer, error) {
  return diagnostic("internal", "INTERNAL-UNEXPECTED-EXCEPTION", "Unexpected " + layer + " validator exception: " + (error instanceof Error ? error.message : String(error)) + ".", layer, "error", { sourceLayer: layer, suggestion: "Fix the validator exception; it is never treated as a successful validation." });
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
    if (artifact.kind === "unsafe-link") diagnostics.push(diagnostic("official", "OKF-CONFORMANCE-UNSAFE-LINK", "Symbolic links and junctions are not allowed in the official bundle.", artifact.path));
    else if (artifact.kind === "unknown-artifact") diagnostics.push(diagnostic("official", "OKF-CONFORMANCE-UNEXPECTED-ARTIFACT", "Only Markdown files are allowed in the official bundle.", artifact.path));
  }
  return diagnostics;
}

export function wrapExtensionErrors(messages) {
  return messages.map((message) => diagnostic("extension", "OWA-EXT-LEGACY-ERROR", message, "okf-extension"));
}

export async function validateAll(root = repositoryRoot, options = {}) {
  const requestedLayer = options.onlyLayer === undefined ? undefined : canonicalLayer(options.onlyLayer);
  const runOfficial = requestedLayer === undefined || requestedLayer === "official";
  const runReferences = requestedLayer === undefined || requestedLayer === "references";
  const runProvenance = requestedLayer === undefined || requestedLayer === "provenance";
  const runExtension = requestedLayer === undefined || requestedLayer === "extension";
  const runQuality = requestedLayer === undefined || requestedLayer === "quality";
  const runFormat = requestedLayer === undefined || requestedLayer === "format";
  const needsOfficialArtifacts = requestedLayer === undefined || artifactLayers.has(requestedLayer);
  let artifacts = [];
  const diagnostics = [];
  let referenceChecks = [];
  let provenanceChecks = [];

  if (needsOfficialArtifacts) {
    const discovered = await safeAsync("discovery", () => discoverOkf(root));
    diagnostics.push(...discovered.diagnostics);
    if (discovered.diagnostics.length === 0 && Array.isArray(discovered.value)) artifacts = discovered.value;
  }

  if (runOfficial) {
    const result = safeSync("official conformance", () => validateOfficial(artifacts));
    diagnostics.push(...result.diagnostics);
    if (result.diagnostics.length === 0) diagnostics.push(...(result.value ?? []));
  }
  if (runReferences) {
    const result = await safeAsync("references", () => validateReferences(artifacts, root, options));
    diagnostics.push(...result.diagnostics);
    if (result.diagnostics.length === 0) {
      diagnostics.push(...(result.value?.diagnostics ?? []));
      referenceChecks = result.value?.checks ?? [];
    }
  }
  if (runProvenance) {
    const result = await safeAsync("provenance", () => validateProvenance(artifacts, root, options));
    diagnostics.push(...result.diagnostics);
    if (result.diagnostics.length === 0) {
      diagnostics.push(...(result.value?.diagnostics ?? []));
      provenanceChecks = result.value?.checks ?? [];
    }
  }
  if (runExtension) {
    const result = await safeAsync("extension", async () => (await validateExtension(root)).diagnostics);
    diagnostics.push(...result.diagnostics);
    if (result.diagnostics.length === 0) diagnostics.push(...(result.value ?? []));
  }
  if (runQuality || runFormat) {
    if (artifacts.length > 0) validateOfficial(artifacts);
    const policy = safeSync("quality and format", () => validatePolicy(artifacts, root));
    diagnostics.push(...policy.diagnostics);
    if (policy.diagnostics.length === 0) {
      for (const item of policy.value ?? []) if ((item.layer === "quality" && runQuality) || (item.layer === "format" && runFormat)) diagnostics.push(item);
    }
    if (runQuality) {
      const quality = safeSync("quality", () => validateQuality(artifacts, root));
      diagnostics.push(...quality.diagnostics);
      if (quality.diagnostics.length === 0) diagnostics.push(...(quality.value ?? []));
    }
  }
  return { artifacts, diagnostics: sortDiagnostics(diagnostics), referenceChecks, provenanceChecks };
}
