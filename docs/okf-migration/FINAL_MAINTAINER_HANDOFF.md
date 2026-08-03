# Final OKF Maintainer Handoff

Last updated: 2026-08-03

## Important paths

| Purpose | Path |
|---|---|
| Official bundle and navigation | `okf/index.md` and nine subject directories |
| Project extension contract | `okf-extension/README.md` |
| Extension manifest and registries | `okf-extension/manifest.json`, `okf-extension/registry/*.json` |
| Production schemas | `okf-extension/validation/schemas/*.json` |
| Validator | `tools/okf/` |
| Focused tests | `tests/okf/` and `tests/fixtures/okf/` |
| CI workflow | `.github/workflows/okf-validation.yml` |
| Current authority map | `docs/okf-migration/SOURCE_OF_TRUTH_MAP.md` |
| Troubleshooting evidence | `PHASE_08_VALIDATOR_COVERAGE_AUDIT.md`, `PHASE_07_FAILURE_TRIAGE.md` |

## Standard Concept workflow

1. Choose one approved type from `CONCEPT_TAXONOMY.md` and a stable kebab-case path in the matching subject directory.
2. Add frontmatter from `METADATA_CONTRACT.md`: non-empty `type`, `title`, `description`, explicit lifecycle `status`, and only applicable optional fields.
3. Make the body H1 exactly match `title` and write useful standalone Markdown knowledge.
4. Add portable `sources` for derived or normative claims. Never use a drive, UNC, home, environment, root-absolute, or traversal path.
5. Add meaningful Markdown links to related Concepts. Use registry relationships only when a project-specific typed edge adds semantics.
6. Update the direct directory `index.md` and, for top-level structure, `okf/index.md`.
7. Update affected node, domain, phase, evidence, relationship, decision, risk, or change records atomically. Do not reintroduce `owa.legacy_paths`.
8. Run `npm run test:okf`, then `npm run okf:validate`.
9. Run broader repository gates when preparing a change and review the hosted `OKF Validation` result.

## Special changes

### Deprecate a Concept

Set official `status: deprecated`, explain the replacement in the body, update inbound links and indexes, update extension paths/edges, and retain the file until a reviewed removal decision confirms no consumer depends on it. Do not use project verification or governance state as lifecycle.

### Rename a Concept

Treat the path as identity. Search all Markdown, manifest, registries, schemas, tests, and public docs; move the file; update every inbound link and canonical path; update indexes and extension mappings; add regression coverage; record the change. Do not create an unvalidated compatibility copy or silently retain two authorities.

### Generated Concepts or outputs

No final OKF artifact is generated and there is no regeneration command. Before introducing generation, implement a deterministic producer, declared inputs, owned-output allowlist, marker, collision protection, no-write CI check, and stale/manual-edit fixtures. A generated Concept uses valid `generated.by` and UTC `generated.at`; human edits must occur at its authority input.

### Verification and freshness

A material body, source, lifecycle, or semantic link change invalidates prior trust. Remove or supersede the applicable `verified` event, make the change, and have the named verifier re-evaluate it. When `stale_after` is reached, review the authority and sources; update the date only after substantive review, otherwise mark the content appropriately.

### Extension rule or data-shape change

Update the extension boundary, manifest/schema version if applicable, procedural validation, positive and negative tests, extension inventory, source-of-truth map, and change registry. Preserve official-layer permissiveness.

### Taxonomy or metadata-contract change

Record the evidence and decision, update taxonomy/contract/field reference/examples/design schemas, update production policy and fixtures, assess every existing Concept, and choose a semantic extension version. An official OKF version stays independent.

### New validator diagnostic

Assign one unique code in one layer, choose severity according to CI policy, make its path reachable, add focused positive/negative tests, update the diagnostic catalog and troubleshooting guide, and confirm deterministic human and JSON output. Retiring a code requires proof its data source or rule was retired and replacement integrity remains covered.

## Commands and result interpretation

```text
npm ci
npm run test:okf
npm run okf:validate
npm run okf:validate:official
npm run okf:validate:extensions
npm run okf:validate:quality
npm run okf:validate:json
npm run docs:validate
npm run format:check
npm run lint
npm run typecheck
npm test
```

Exit 0 means the selected gate passed; exit 1 means validation errors; exit 2 means command usage or layer selection is invalid. JSON mode must be a single parseable object. Quality warnings do not fail CI, while official, policy, extension, and formatting errors do.

## CI and manual administration

Workflow: `OKF Validation`. Job: `OKF validation and quality gates`. Stable required-check name: `OKF Validation / OKF validation and quality gates`. Artifact: `okf-conformance-report`, containing `.artifacts/okf/conformance.json`, retained 14 days.

Two administrative tasks remain:

- `ADMIN-CI-001`: verify and record a hosted workflow execution.
- `ADMIN-BP-001`: configure/verify branch protection requiring the stable check.

Do not infer either status from local files. The migration is otherwise closed; future work is normal maintenance, not continuation of transitional cleanup.
