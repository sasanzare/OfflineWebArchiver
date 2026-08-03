# Eight-Phase Migration Plan

## Phase 5 completion

Content migration and the extension bridge are complete. Phase 6 implements distinct official and extension validators; Phase 7 adds deterministic validation and CI; Phase 8 evaluates removal of legacy compatibility paths.

## Phase 6 completion

The dual validator and focused tests are implemented. Phase 7 owns CI integration and stricter warning policy decisions.

## Phase 1: Audit and Migration Planning

**Status:** Complete.
**Objective:** Record the repository/Git baseline, current artifacts and consumers, official v0.2 requirements, conformance gaps, authority duplication, risks, and phased plan.
**Outputs:** Initial documents in this directory.
**Prohibited:** Current `okf/`, validator, code, scripts, test, and CI changes.

## Phase 2: Target Bundle Architecture and Taxonomy

**Status:** Complete after the documented Phase 2 validation record passes.
**Objective:** Freeze the physical official/extension boundary, final directory tree, 14-type taxonomy, reserved-file usage, naming, authored/generated ownership, source direction, and disposition of all 58 Markdown files.
**Outputs:** The eight Phase 2 design documents and updates to the Phase 1 plan, risks, authority map, proposal, navigation, and acceptance matrix.
**Prohibited:** Any current `okf/` content change, metadata implementation, validator rewrite, or production reserved file.
**Rollback:** Revert only migration-planning documentation.

## Phase 3: Metadata and Frontmatter Contract

**Status:** Complete after the Phase 3 validation record passes. The contract is frozen in `METADATA_CONTRACT.md`, its companion models, design examples/fixtures, modular schemas, migration map, decisions, and Phase 4 handoff.

### Fixed Inputs

- Phase 4 execution root is `okf/` under amendment `OKF-P4-A001`; the Phase 2 design root `okf/bundle/` remains historical design context until the Phase 5 extension-boundary decision.
- Target paths are those in `CONTENT_MIGRATION_MAP.md`.
- The 14 canonical types in `CONCEPT_TAXONOMY.md` are closed unless contradictory evidence is recorded.
- Root index is authored; directory indexes are generated; official log is omitted.
- Official Concepts remain readable independently of extension JSON.
- Concepts and explicitly retained upstream sources are authoritative; generated indexes/reports are derived.

### Required Scope

Define the exact YAML frontmatter contract for v0.2 and project extension fields: type serialization, optional lifecycle status, actors, generation/verification, sources/provenance, freshness, extension namespace, stable bridge IDs, authority/cutover markers where needed, and compatibility behavior. Define generated-file marker syntax, canonical Markdown link serialization, parser choice, schema/fixture strategy, and mapping of every current mixed-purpose status to the correct dimension.

### Must Not Redesign

Phase 3 must not move files, bulk-add frontmatter, change target roots or paths, add/remove taxonomy types casually, create `log.md`, make generated registries authoritative, merge official and extension validation, or implement the full validator. A contradiction requires a superseding decision and mapping/risk updates.

### Acceptance

Every approved type has valid/invalid fixtures; every current status has a non-lossy destination; official and extension fields are distinguishable; generated markers and authority rules are testable; no current Concept is edited.

## Phase 4: Core Concept Migration and Indexes

Create `okf/index.md` with the authored root index, generated-style directory indexes, product overview, a reviewed core across architecture/data/workflow/recovery, and Phase Records. Apply the Phase 3 contract. Use the amended target paths and merge/index decisions. Keep every current path and registry operational during overlap.

Acceptance requires manual official-contract validation of the migrated subset, extension bridge coverage, resolved links, semantic review against source authorities, deterministic index structure, and recorded per-file cutover. No registry or legacy deletion is allowed. Full-bundle conformance remains open while legacy Markdown is still present.

## Phase 5: Full Migration and Extension Bridge

Migrate the remaining single Concepts, extension documentation, security/operations/testing content, and all remaining dispositions. Materialize `okf/extensions/`, preserve every registry/evidence record, reconcile relationship semantics, and generate `extensions/compatibility/legacy-path-map.json` before changing consumers.

Acceptance requires all 58 source rows implemented or explicitly retained, every JSON family reconciled, every active consumer mapped, no dual editable authority, and no evidence loss. `okf/legacy/` is optional and migration-only; creating or deleting it requires a reviewed plan.

## Phase 6: Official and Extension Validator Implementation

Implement separate official v0.2 and project-extension validators, metadata parsing, schema corrections, generators, stale checks, compatibility checks, and positive/negative fixtures. The official validator targets only `okf/bundle/` and tolerates what v0.2 tolerates. The extension validator preserves strict naming, link, path, evidence, registry, phase, and change policy.

Acceptance requires distinct commands/results, deterministic no-write checks, current-validator parity, no silent repair, no authored-file overwrite, and regression coverage for the known schema mismatch.

## Phase 7: Tests, CI, and Quality Controls

Expand fixture, migration, link, reserved-file, root-boundary, generator safety, stale-output, and compatibility tests. Document stable local commands. Add CI only if repository governance approves, and do not require network access for ordinary conformance.

Acceptance requires deterministic clean-checkout validation and separately identifiable official/extension failures.

## Phase 8: Cleanup and Final Conformance Audit

Reconcile the inventory, compatibility map, current consumers, authorities, evidence, generated outputs, and validation reports. Audit the official subtree and extension layer separately. Propose removal or relocation of legacy artifacts only with explicit approval and recoverable Git review.

Acceptance requires every artifact accounted for, all consumers switched or documented, no false conformance claim, no unresolved duplicate authority, and retained rollback/audit evidence.

## Delivery Matrix

| Phase | Expected files | Prohibited changes | Dependencies | Principal risks |
|---|---|---|---|---|
| 1 | Baseline audit/planning docs | Existing implementation | Official source and repository evidence | Unsupported conclusions |
| 2 | Architecture, taxonomy, mapping, boundary, policy, decisions | Existing `okf/`, metadata, validator, code/CI | Phase 1 audit | Unstable paths or hidden decisions |
| 3 | Metadata contract and fixtures | Content migration and architecture redesign | Fixed Phase 2 inputs | Semantic/status corruption |
| 4 | Core Concepts and indexes | Registry deletion or early consumer cutover | Phases 2-3 | Broken links and duplicate authority |
| 5 | Remaining Concepts, extensions, compatibility map | Evidence loss or destructive cleanup | Core migration acceptance | Traceability and path breakage |
| 6 | Dual validators, generators, schemas, fixtures | Silent repair or conflated results | Complete bridge | False positives/negatives, stale output |
| 7 | Tests, documented gates, approved CI | Mandatory network validation | Stable Phase 6 commands | CI disruption |
| 8 | Final audits and approved cleanup | Unapproved deletion | All prior evidence | False conformance or incomplete cutover |

Every phase rollback is a reviewed Git revert limited to that phase's targets. Current custom registries, bootstrap inputs, and evidence remain recoverable until successor controls and the final audit pass.
