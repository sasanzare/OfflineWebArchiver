# Google OKF v0.2 Migration Documentation

## Phase 5 completion

Phase 5 completes the approved content migration: 40 Concepts, 10 reserved indexes, 15 extension documents, and 58 retained transitional legacy paths. Final production-validator and CI conformance remain deferred to Phases 6 and 7.

## Phase 6 completion

Phase 6 implements separated official, repository-policy, extension, quality, and formatting validation with human and JSON reports. CI enforcement remains Phase 7 work.

## Purpose

This directory records the evidence-based migration from the repository's custom Organizational Knowledge Framework to the official Google Open Knowledge Format (OKF) v0.2. It is planning documentation; it does not claim that the current `okf/` tree conforms.

## Completed Planning Phases

Phase 1 audited the current implementation, extracted official requirements, identified source-of-truth and validator boundaries, and established the eight-phase plan.

Phase 2 revalidated that baseline and fixed the target architecture, official/extension boundary, 14-type Concept taxonomy, reserved-file policy, authored/generated ownership, source-of-truth direction, and exact disposition of all 58 current Markdown files. Phase 2 changes planning documentation only; it does not migrate current knowledge or implement the Phase 3 metadata contract.

Phase 3 freezes the complete metadata/frontmatter producer contract, lifecycle and project state mapping, actor/provenance/evidence/freshness rules, reserved-file metadata, examples, invalid design fixtures, modular Draft 2020-12 schemas, current-to-future field mapping, and the Phase 4 handoff. It remains design-only and does not modify the current bundle or validator.

Phase 4 activates the reviewed core migration slice at the production root `okf/` under amendment `OKF-P4-A001`. It adds the root and core indexes, 21 Concepts, and the six Phase 4 reports while preserving all current legacy paths, registries, and validator behavior. This is a partial migration; remaining legacy Markdown and extension relocation are Phase 5 work.

### Phase 4 execution reports

- [Core migration ledger](PHASE_04_CORE_MIGRATION_LEDGER.md)
- [Link and source audit](PHASE_04_LINK_AND_SOURCE_AUDIT.md)
- [Semantic preservation report](PHASE_04_SEMANTIC_PRESERVATION_REPORT.md)
- [Conformance report](PHASE_04_CONFORMANCE_REPORT.md)
- [Implementation report](PHASE_04_IMPLEMENTATION_REPORT.md)
- [Phase 5 handoff](PHASE_05_HANDOFF.md)

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
- [Metadata contract](METADATA_CONTRACT.md)
- [Frontmatter field reference](FRONTMATTER_FIELD_REFERENCE.md)
- [Status and lifecycle model](STATUS_AND_LIFECYCLE_MODEL.md)
- [Actor and provenance model](ACTOR_AND_PROVENANCE_MODEL.md)
- [Source and evidence model](SOURCE_AND_EVIDENCE_MODEL.md)
- [Freshness and verification policy](FRESHNESS_AND_VERIFICATION_POLICY.md)
- [Reserved-file metadata contract](RESERVED_FILE_METADATA_CONTRACT.md)
- [Metadata migration map](METADATA_MIGRATION_MAP.md)
- [Valid frontmatter examples](VALID_FRONTMATTER_EXAMPLES.md)
- [Invalid frontmatter fixtures](INVALID_FRONTMATTER_FIXTURES.md)
- [Phase 3 decisions](PHASE_03_DECISIONS.md)
- [Phase 3 unresolved items](PHASE_03_UNRESOLVED_ITEMS.md)
- [Phase 4 metadata handoff](PHASE_04_METADATA_HANDOFF.md)
- [Proposed design schemas](schema/)
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

## Fixed Phase 3 Inputs to Phase 4

- Required Concept fields: `type`, `title`, `description`, and explicit `status`.
- Canonical type enum: the 14 Phase 2 types, exact spelling, no aliases.
- Official lifecycle: `draft`, `stable`, `deprecated`.
- Project state namespace: `owa` with implementation, verification, governance, traceability, and legacy bridge fields only.
- Portable actor/source/date formats and canonical field order are fixed.
- Root index has only `okf_version`; directory indexes and logs have no frontmatter; production log remains omitted.

For the Phase 4 execution slice, `OKF-P4-A001` realizes the root index as `okf/index.md` and the selected category paths directly under `okf/`. This is a documented physical-root amendment required by the Phase 4 execution contract; metadata semantics and the 14-type taxonomy remain frozen.

## Explicit Non-Implementation Statement

Phases 1-3 were design-only. Phase 4 now adds only the approved core targets and leaves existing `okf/` artifacts in their original paths and formats. The proposed schemas remain unwired, and the custom validator retains its current behavior.
