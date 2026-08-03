# Validator Gap Analysis

## Phase 6 update

The production layered validator now covers official frontmatter and reserved files, repository producer metadata, preserved extension registries, quality links, and formatting warnings. Schema-only and CI-only controls remain intentionally deferred.

## Current Validator

Entry points are `npm run okf:validate` and `npm run okf:migrate` in `package.json`. `tools/okf/validate.mjs` recursively parses JSON under `okf/`, reads `okf-extension/manifest.json`, then loads eight named registries: domains, nodes, evidence, relationships, phases, decisions, risks, and changes.

Confirmed checks include JSON parseability, custom manifest fields, custom status membership, registry item shape, globally unique IDs, safe existing repository paths, mapping IDs against selected Markdown authorities, verified-node evidence links, relationship endpoints, phase numbers, required phase/change records, and selected critical requirement coverage. Errors are collected and produce exit code `1`; unknown suite/input selection produces exit code `2` in the test runner. The validator emits no warning channel and never repairs records.

`tools/okf/migrate.mjs` is not a data migrator. It verifies prerequisite paths and then calls the custom validator. Tests in `tests/okf/validator.test.ts` run negative policy probes for both scripts. `tools/testing/run-tests.mjs` includes an `okf` suite. No `.github/` CI configuration was present in this audit.

## Missing Official Conformance Checks

- Recursive Markdown discovery with reserved-file classification.
- UTF-8 and parseable YAML frontmatter checks for concepts.
- Non-empty official `type` checks.
- Reserved `index.md` and `log.md` structural checks.
- Root `okf_version` handling.
- Official lifecycle values, actor syntax, and metadata-family validation when present.
- Official source-resource, verified mapping/list normalization, stale date, and Attested Computation validation.
- Consumer-permissive behavior for unknown frontmatter, unknown types, missing optional data, and broken links.

## Custom Checks to Preserve

Keep repository-local evidence path safety, ID uniqueness, registry relationship resolution, requirement/acceptance/risk/decision mappings, phase/change coverage, verified-node evidence policy, bootstrap prerequisite checking, and strict internal documentation-link policy. These are OfflineWebArchiver governance controls, not official conformance requirements.

## Required Dual-Validator Architecture

```text
Official OKF v0.2 validator
  - reads only the official Markdown bundle
  - validates mandatory conformance and permissive consumer behavior

OfflineWebArchiver extension validator
  - validates JSON registries, traceability, project policies, generated artifacts,
    strict repository links, and bridges between extensions and concepts
```

The two validators should report separately and may share parsing utilities only if the official layer remains permissive about unknown extension fields.

## False-Positive and Compatibility Risks

The present validator would falsely reject official unknown frontmatter if it were extended with its closed JSON-schema mentality. Conversely, an official-only validator would miss orphaned project requirements and evidence mappings. Existing `okf-extension/validation/schemas/manifest.schema.json` has a stale phase constant and is not invoked by the current Node validator; Phase 6 must distinguish that custom defect from official conformance.
