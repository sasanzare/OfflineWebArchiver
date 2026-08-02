# Current-State Audit

## Executive Summary

Confirmed: `okf/` is an active, custom **Organizational Knowledge Framework**, not an official Google OKF v0.2 bundle. It combines Markdown narrative records with JSON manifest and registries. `okf/README.md` declares JSON registries authoritative for identifiers, links, statuses, phases, and evidence; product and project Markdown remains authoritative for requirements, acceptance criteria, risks, and decisions.

The repository is not currently conformant with official Google OKF v0.2. The official format requires parseable YAML frontmatter and non-empty `type` on every non-reserved Markdown concept. The audit found 58 Markdown files below `okf/`; none starts with YAML frontmatter. Current `README.md` files are ordinary custom documents, not official reserved `index.md` files.

## Repository State at Audit Start

- Branch: `main`.
- Baseline commit: `dd0fb00fd869dee2a808f48fc157f45c00c98cb0`.
- Working tree: clean before Phase 1 documentation was created.
- CI configuration: no `.github/` directory was present at audit time.

## Current Framework Architecture

The custom framework is represented as follows:

```text
Product/project Markdown authorities and source/tests
  -> manually maintained Markdown knowledge, phase, evidence, and map records
  -> JSON manifest plus eight JSON registries
  -> tools/okf/validate.mjs
  -> npm run okf:validate and tests/okf/validator.test.ts
  -> documentation/phase reporting and release handoff
```

`okf/manifest.json` selects registry files. The registries hold global IDs, status labels, repository paths, mappings to requirements/acceptance/risk/decision authorities, and graph relationships. The validator reads both registry JSON and selected Markdown authorities, checks a project-specific status vocabulary, paths, IDs, references, evidence, required phase/change records, and selected requirement coverage.

## Major Findings

1. **Strong project extensions exist.** Registry IDs, evidence mappings, traceability mappings, phase records, fail-closed repository-path checks, and negative tests are valuable project-specific capabilities.
2. **Official document conformance is absent.** No current `okf/**/*.md` file has frontmatter, a `type`, official `status`, provenance, or official actor metadata.
3. **Terminology conflicts.** The repository calls the current system Organizational Knowledge Framework; the official source calls OKF Open Knowledge Format. The terms must remain distinct during transition.
4. **Status semantics conflict.** Current values such as `VERIFIED`, `PLANNED`, and `BLOCKED` mix verification, implementation, migration, and lifecycle meanings. Official `status` is only `draft`, `stable`, or `deprecated`.
5. **Validator scope differs.** `tools/okf/validate.mjs` validates custom JSON and selected repository policy; it does not parse YAML, identify concepts, enforce official reserved-file rules, or evaluate official Markdown conformance.
6. **A custom schema inconsistency exists.** `okf/validation/schemas/manifest.schema.json` declares `activatedPhase` constant `7`, while `okf/manifest.json` and `tools/okf/validate.mjs` operate at phase `8`. The current validator does not invoke that JSON Schema; this is a custom-framework issue, not an official OKF requirement.

## Current Strengths

- Repository-relative evidence paths and fail-closed traversal protection in `tools/okf/validate.mjs`.
- Explicit phase/evidence/decision/risk traceability in `okf/registry/*.json`.
- Preserved historical bootstrap material in `okf-bootstrap/`.
- Existing `npm run okf:validate`, `npm run okf:migrate`, and automated negative probes in `tests/okf/validator.test.ts`.

## Current Non-Conformance Areas

- No official root `index.md` or optional official `log.md`.
- No YAML frontmatter, required `type`, or concept-ID model for existing custom Markdown records.
- No official `okf_version` declaration.
- No official `generated`, `verified`, `sources`, `stale_after`, actor, or link-semantics processing.
- Current status vocabulary is incompatible with the official lifecycle field.

## Custom Status Model Audit

The current `OKF_STATUSES` set in `tools/okf/validate.mjs` is a project extension. It must not be copied into official `status`.

| Current value | Observed use | Meaning dimension | Proposed future treatment |
|---|---|---|---|
| `VERIFIED` | Manifest and registry records | Verification/evidence quality | `verification_status` extension; official lifecycle normally `stable` only after separate review. |
| `PLANNED` | Future phases and capabilities | Implementation/planning state | `implementation_status` or `migration_status` extension; official lifecycle may be `draft`. |
| `PARTIAL` | Incomplete evidence/spike results | Evidence completeness | `evidence_status` extension. |
| `UNKNOWN` | Unresolved decision/state | Knowledge certainty | `verification_status` or explicit unresolved-decision extension. |
| `NEEDS_OWNER_CONFIRMATION` | Governance questions | Ownership/approval state | `owner_decision_status` extension. |
| `DOCUMENTATION_CODE_CONFLICT` | Drift reporting | Conflict state | `consistency_status` extension. |
| `DEPRECATED` | Retained obsolete records | Lifecycle state | Official `status: deprecated` when applied to a concept; otherwise extension state. |
| `BLOCKED` | Prevented work/phase | Workflow state | `implementation_status` extension. |
| `NOT_APPLICABLE` | Inapplicable evidence or capability | Applicability state | `applicability_status` extension. |

Official lifecycle is limited to `draft`, `stable`, and `deprecated`. The mapping above is a proposal, not an implementation.

## Unknowns Requiring Later Resolution

- Which narrative records should become single concepts versus indexes, logs, references, or extension documents.
- Whether generated official indexes will be committed or produced in CI/release tooling.
- The durable owner and update policy for provenance and verification metadata.
- Whether the existing JSON registry remains the long-term extension authority or becomes a derived bridge.
