# Google OKF v0.2 Migration Documentation

## Purpose

This directory records the evidence-based migration from the repository's custom Organizational Knowledge Framework to the official Google Open Knowledge Format (OKF) v0.2. It is planning documentation; it does not claim that the current `okf/` tree conforms.

## Completed Planning Phases

Phase 1 audited the current implementation, extracted official requirements, identified source-of-truth and validator boundaries, and established the eight-phase plan.

Phase 2 revalidated that baseline and fixed the target architecture, official/extension boundary, 14-type Concept taxonomy, reserved-file policy, authored/generated ownership, source-of-truth direction, and exact disposition of all 58 current Markdown files. Phase 2 changes planning documentation only; it does not migrate current knowledge or implement the Phase 3 metadata contract.

## Authoritative Specification

The normative source is the official [Google Open Knowledge Format v0.2 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md). The official [OKF directory](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf) is supporting context.

## Navigation

### Phase 1 Audit

- [Current-state audit](CURRENT_STATE_AUDIT.md)
- [File inventory](FILE_INVENTORY.md)
- [Official requirements](OFFICIAL_OKF_REQUIREMENTS.md)
- [Compliance matrix](COMPLIANCE_MATRIX.md)
- [Validator gap analysis](VALIDATOR_GAP_ANALYSIS.md)

### Target Design and Migration Control

- [Target bundle architecture](TARGET_BUNDLE_ARCHITECTURE.md)
- [Concept taxonomy](CONCEPT_TAXONOMY.md)
- [Content migration map](CONTENT_MIGRATION_MAP.md)
- [Path and naming conventions](PATH_AND_NAMING_CONVENTIONS.md)
- [Official and extension boundary](EXTENSION_BOUNDARY.md)
- [Authoring and generation policy](AUTHORING_AND_GENERATION_POLICY.md)
- [Phase 2 decisions](PHASE_02_DECISIONS.md)
- [Phase 2 unresolved items](PHASE_02_UNRESOLVED_ITEMS.md)
- [Source-of-truth map](SOURCE_OF_TRUTH_MAP.md)
- [Migration risk register](MIGRATION_RISK_REGISTER.md)
- [Target-state proposal](TARGET_STATE_PROPOSAL.md)
- [Eight-phase migration plan](MIGRATION_PLAN.md)
- [Acceptance matrix](ACCEPTANCE_MATRIX.md)

## Fixed Phase 2 Inputs to Phase 3

- Official bundle root: `okf/bundle/`.
- Project extension root: `okf/extensions/`.
- Concepts are authored; directory indexes and machine indexes are generated.
- Root `index.md` is authored and declares `okf_version: "0.2"`.
- Official `log.md` is omitted.
- Concept paths use stable lowercase kebab-case.
- The approved taxonomy contains 14 types.
- Current extension data is preserved until a validated compatibility cutover.

Phase 3 defines metadata and serialization against these inputs. It must not redesign the hierarchy, taxonomy, reserved-file policy, or dependency direction without new contradictory evidence and a superseding decision.

## Explicit Non-Implementation Statement

No migration is implemented by Phases 1-2. Existing `okf/` artifacts remain in their original paths and formats, no production reserved file or frontmatter is added, and the custom validator retains its current behavior.
