import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDefaultSiteProfileDraft, evaluateScope, parseSiteProfile } from "@offline-web-archive/scope-engine";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = JSON.parse(await readFile(path.join(root, "tests/fixtures/scope/normalization.golden.json"), "utf8"));
const draft = createDefaultSiteProfileDraft(fixture.profile);
const profile = parseSiteProfile({
  schemaVersion: 1, engineVersion: 1,
  profileId: "00000000-0000-4000-8000-000000000501",
  projectId: "00000000-0000-4000-8000-000000000502",
  revisionId: "00000000-0000-4000-8000-000000000503",
  sequence: 1, createdAt: "2026-07-31T12:00:00.000Z", updatedAt: "2026-07-31T12:00:00.000Z",
  ...draft,
});
for (const item of fixture.cases) {
  const decision = evaluateScope(profile, { url: item.input, ...(item.baseUrl === undefined ? {} : { baseUrl: item.baseUrl }) });
  const originalTimezone = process.env.TZ;
  process.env.TZ = "Pacific/Honolulu";
  const repeated = evaluateScope(profile, { url: item.input, ...(item.baseUrl === undefined ? {} : { baseUrl: item.baseUrl }) });
  if (JSON.stringify(decision) !== JSON.stringify(repeated)) throw new Error(`${item.name}: repeated evaluation changed across timezone context`);
  if (originalTimezone === undefined) delete process.env.TZ; else process.env.TZ = originalTimezone;
  for (const key of ["normalizedUrl", "identityUrl", "identityHash", "eligible"]) {
    if (item[key] !== undefined && decision[key] !== item[key]) throw new Error(`${item.name}: ${key} changed from the golden value`);
  }
}
process.stdout.write(`Scope golden validation passed for ${fixture.cases.length} deterministic cases.\n`);
