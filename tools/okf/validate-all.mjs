import { repositoryRoot } from "../build/typescript.mjs";
import { validateOkf as validateLegacy } from "./validate.mjs";
import { sortDiagnostics, diagnostic } from "./diagnostics.mjs";
import { discoverOkf } from "./discovery.mjs";
import { validateOfficial } from "./official.mjs";
import { validatePolicy, validateQuality } from "./policy.mjs";

export async function validateAll(root = repositoryRoot) {
  const artifacts = await discoverOkf(root);
  const diagnostics = [...validateOfficial(artifacts), ...validatePolicy(artifacts), ...validateQuality(artifacts, root)];
  const legacy = await validateLegacy(root);
  diagnostics.push(...legacy.map((message) => diagnostic("extension", "OKF-EXT-001", message, "okf")));
  return { artifacts, diagnostics: sortDiagnostics(diagnostics) };
}
