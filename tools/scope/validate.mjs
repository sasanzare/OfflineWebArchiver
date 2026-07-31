import {
  createDefaultSiteProfileDraft,
  normalizeSiteProfileDraft,
  SCOPE_ENGINE_VERSION,
  SITE_PROFILE_SCHEMA_VERSION,
} from "@offline-web-archive/scope-engine";

const draft = createDefaultSiteProfileDraft({ name: "Validation", seedUrl: "https://example.com/" });
normalizeSiteProfileDraft(JSON.parse(JSON.stringify(draft)));
let rejected = false;
try {
  normalizeSiteProfileDraft({ ...draft, domainRules: [...draft.domainRules, { ...draft.domainRules[0], effect: "deny" }] });
} catch {
  rejected = true;
}
if (!rejected) throw new Error("Conflicting rules were not rejected");
process.stdout.write(`Scope Engine ${SCOPE_ENGINE_VERSION}, profile schema ${SITE_PROFILE_SCHEMA_VERSION}, and strict profile validation passed.\n`);
