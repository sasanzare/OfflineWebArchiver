# OKF Migration Acceptance Matrix

## Phase 5 update

Content migration, Concept metadata, indexes, extension documentation, evidence preservation, relationship preservation, and legacy-path classification are complete. Automated official validation and CI remain Phase 6 and 7 obligations.

## Phase 6 update

Layer separation, deterministic reporting, legacy extension checks, focused regression tests, and production validation are complete. Broad CI integration remains deferred.

## Phase 7 update

Blocking CI gates, non-blocking quality reporting, artifact publication, branch-protection guidance, and CI security documentation are complete. Hosted execution and manual branch protection remain unresolved external configuration.

## Phase 1 Summary

| ID | Criterion | Status | Evidence |
|---|---|---|---|
| OKF-MIG-P1-001 | Git baseline, current artifacts, consumers, official requirements, gaps, authorities, and risks were recorded. | PASSED | `CURRENT_STATE_AUDIT.md`, `FILE_INVENTORY.md`, `COMPLIANCE_MATRIX.md`, `VALIDATOR_GAP_ANALYSIS.md`, `SOURCE_OF_TRUTH_MAP.md`, `MIGRATION_RISK_REGISTER.md` |
| OKF-MIG-P1-002 | Existing implementation remained unchanged and no conformance claim was made. | PASSED | Phase 1 final Git inspection and validation record |

## Phase 2 Criteria

| ID | Criterion | Verification method | Expected result | Status | Evidence |
|---|---|---|---|---|---|
| OKF-MIG-P2-001 | Current Git state and baseline commit are recorded. | Compare initial and final Git inspection. | Branch, hash, and pre-existing Phase 1 files are known. | PASSED | Phase 2 validation record below |
| OKF-MIG-P2-002 | Phase 1 inputs are reviewed and revalidated. | Recount files/artifacts and inspect consumers/entry points. | Baseline still matches repository evidence or corrections are recorded. | PASSED | `TARGET_BUNDLE_ARCHITECTURE.md`; validation record |
| OKF-MIG-P2-003 | Final target directory architecture is documented. | Review complete proposed tree and directory contracts. | Later phases can implement without path redesign. | PASSED | `TARGET_BUNDLE_ARCHITECTURE.md` |
| OKF-MIG-P2-004 | Official and project-extension boundaries are explicit. | Review physical roots and validation scope. | `okf/bundle/` and `okf/extensions/` have distinct contracts. | PASSED | `TARGET_BUNDLE_ARCHITECTURE.md`, `EXTENSION_BOUNDARY.md` |
| OKF-MIG-P2-005 | Dependency direction is defined. | Inspect source and generation arrows. | Concepts feed derived indexes and validation, not the reverse. | PASSED | `EXTENSION_BOUNDARY.md`, `SOURCE_OF_TRUTH_MAP.md` |
| OKF-MIG-P2-006 | Stable Concept taxonomy is approved. | Count and review canonical types. | 14 stable semantic types are fixed. | PASSED | `CONCEPT_TAXONOMY.md`, `PHASE_02_DECISIONS.md` |
| OKF-MIG-P2-007 | Every type has inclusion and exclusion criteria. | Parse each type section. | All 14 definitions contain required classification guidance. | PASSED | `CONCEPT_TAXONOMY.md` |
| OKF-MIG-P2-008 | Every current Markdown source appears in the map. | Compare recursive `okf/**/*.md` list to source rows. | Each source appears exactly once. | PASSED | `CONTENT_MIGRATION_MAP.md`; validation record |
| OKF-MIG-P2-009 | Migration-map totals reconcile. | Count mutually exclusive actions. | Counts sum to actual source count 58. | PASSED | `CONTENT_MIGRATION_MAP.md`; validation record |
| OKF-MIG-P2-010 | Every source has an action and classification. | Check required table cells. | No blank action/type/path/disposition. | PASSED | `CONTENT_MIGRATION_MAP.md` |
| OKF-MIG-P2-011 | Root and directory index policies are defined. | Review reserved-file sections. | Authored root and generated shallow directory indexes are fixed. | PASSED | `TARGET_BUNDLE_ARCHITECTURE.md`, `AUTHORING_AND_GENERATION_POLICY.md` |
| OKF-MIG-P2-012 | Official `log.md` use is decided. | Review architecture decision. | Log is explicitly omitted with rationale. | PASSED | `PHASE_02_DECISIONS.md` (OKF-P2-D006) |
| OKF-MIG-P2-013 | Path and naming rules are deterministic. | Review rules and examples. | Stable lowercase kebab-case identity and rename policy are complete. | PASSED | `PATH_AND_NAMING_CONVENTIONS.md` |
| OKF-MIG-P2-014 | Authored/generated artifact policies are defined. | Review category table and controls. | Ownership, markers, overwrite, regeneration, stale, and CI expectations are explicit. | PASSED | `AUTHORING_AND_GENERATION_POLICY.md` |
| OKF-MIG-P2-015 | Current extension families have future classifications. | Reconcile JSON, evidence, maps, reports, rules, and schemas. | Every current family has authority, producer, consumer, treatment, retention, and risk. | PASSED | `EXTENSION_BOUNDARY.md` |
| OKF-MIG-P2-016 | Source-of-truth boundaries are actionable. | Review target authority table. | No knowledge category has two independently editable authorities. | PASSED | `SOURCE_OF_TRUTH_MAP.md` |
| OKF-MIG-P2-017 | Major decisions are individually recorded. | Review decision IDs and required fields. | All required topics have explicit accepted decisions. | PASSED | `PHASE_02_DECISIONS.md` |
| OKF-MIG-P2-018 | Material unresolved decisions are documented. | Review unresolved list. | No hidden blocker; deferred work has phase ownership. | PASSED | `PHASE_02_UNRESOLVED_ITEMS.md` |
| OKF-MIG-P2-019 | Phase 3 receives stable inputs. | Review fixed-input and must-not-redesign sections. | Metadata work can proceed without architecture redesign. | PASSED | `MIGRATION_PLAN.md` |
| OKF-MIG-P2-020 | Eight-phase plan reflects Phase 2 design. | Review all future phase scopes. | Targets, prohibitions, dependencies, and acceptance are aligned. | PASSED | `MIGRATION_PLAN.md` |
| OKF-MIG-P2-021 | Risk register reflects Phase 2 decisions. | Review new boundary/generation/compatibility risks. | Controls and target phases are assigned. | PASSED | `MIGRATION_RISK_REGISTER.md` |
| OKF-MIG-P2-022 | Acceptance matrix is accurately updated. | Review this matrix against requested criteria. | No criterion is omitted or prematurely passed. | PASSED | This file |
| OKF-MIG-P2-023 | Existing `okf/` files remain unchanged. | Inspect `git diff -- okf` and file count. | Empty diff and 58 current Markdown files. | PASSED | Phase 2 validation record below |
| OKF-MIG-P2-024 | Validator behavior remains unchanged. | Inspect diff scope and run existing validator. | No tool/script change; current validator passes. | PASSED | Phase 2 validation record below |
| OKF-MIG-P2-025 | Production code, tests, scripts, and CI remain unchanged. | Inspect complete Git diff/status. | Only migration-planning documentation differs from baseline. | PASSED | Phase 2 validation record below |
| OKF-MIG-P2-026 | Created and modified repository documentation is English-only. | Scan Phase 1-2 files for non-English scripts. | No Persian/Arabic-script text exists. | PASSED | Phase 2 documentation check |
| OKF-MIG-P2-027 | Safe repository commands are executed and recorded. | Run available package commands from inspected `package.json`. | Results and exit codes are recorded without unrelated fixes. | PASSED | Phase 2 validation record below |
| OKF-MIG-P2-028 | No commit or push occurs. | Compare starting/ending HEAD and inspect Git state. | HEAD remains `dd0fb00fd869dee2a808f48fc157f45c00c98cb0`. | PASSED | Phase 2 final Git inspection |
| OKF-MIG-P2-029 | Working tree contains only intended migration docs and preserved prior changes. | Inspect `git status --short` and path scope. | No Phase 2 repository change exists outside `docs/okf-migration/`. | PASSED | Phase 2 final Git inspection |

## Phase 3 Criteria

| ID | Criterion | Status | Evidence |
|---|---|---|---|
| OKF-MIG-P3-001 | Git baseline and pre-existing state are recorded. | PASSED | Phase 3 validation record |
| OKF-MIG-P3-002 | Phase 2 architecture/taxonomy/mapping inputs are validated. | PASSED | `PHASE_04_METADATA_HANDOFF.md` and structural checks |
| OKF-MIG-P3-003 | Every approved metadata field has exactly one category. | PASSED | `METADATA_CONTRACT.md` |
| OKF-MIG-P3-004 | Every field has type and validation behavior. | PASSED | `FRONTMATTER_FIELD_REFERENCE.md`, schemas |
| OKF-MIG-P3-005 | Normal Concept minimum is complete. | PASSED | `METADATA_CONTRACT.md` |
| OKF-MIG-P3-006 | Generated Concept minimum is complete. | PASSED | `METADATA_CONTRACT.md`, generated schema |
| OKF-MIG-P3-007 | Type enumeration exactly matches 14 Phase 2 types. | PASSED | Common schema/type check |
| OKF-MIG-P3-008 | Official lifecycle is separate from project state. | PASSED | `STATUS_AND_LIFECYCLE_MODEL.md` |
| OKF-MIG-P3-009 | All nine current status values have mappings. | PASSED | `STATUS_AND_LIFECYCLE_MODEL.md`, migration map |
| OKF-MIG-P3-010 | Actor syntax and provenance are complete. | PASSED | `ACTOR_AND_PROVENANCE_MODEL.md` |
| OKF-MIG-P3-011 | AI-assisted authorship is documented. | PASSED | `ACTOR_AND_PROVENANCE_MODEL.md` |
| OKF-MIG-P3-012 | Generated semantics are complete. | PASSED | Actor model and generated schema |
| OKF-MIG-P3-013 | Verification semantics are complete. | PASSED | Freshness policy and verification schema |
| OKF-MIG-P3-014 | Source semantics are complete. | PASSED | Source/evidence model and source schema |
| OKF-MIG-P3-015 | Evidence registry integration is defined. | PASSED | `SOURCE_AND_EVIDENCE_MODEL.md` |
| OKF-MIG-P3-016 | Portable source-resource rules are defined. | PASSED | Source/evidence model and invalid fixture |
| OKF-MIG-P3-017 | `stale_after` policy is defined. | PASSED | `FRESHNESS_AND_VERIFICATION_POLICY.md` |
| OKF-MIG-P3-018 | Project extension fields are minimized and documented. | PASSED | Field reference and project extension schema |
| OKF-MIG-P3-019 | Root-index metadata is defined. | PASSED | Reserved-file contract/root schema |
| OKF-MIG-P3-020 | Directory-index metadata is defined. | PASSED | Reserved-file contract/directory schema |
| OKF-MIG-P3-021 | Log metadata is explicitly not applicable for production. | PASSED | Reserved-file contract and fixtures |
| OKF-MIG-P3-022 | Canonical YAML normalization is complete. | PASSED | `METADATA_CONTRACT.md` |
| OKF-MIG-P3-023 | Validation severities/layers are separated. | PASSED | Metadata contract and decisions |
| OKF-MIG-P3-024 | Valid examples cover all types/reserved categories. | PASSED | `VALID_FRONTMATTER_EXAMPLES.md` |
| OKF-MIG-P3-025 | Invalid fixtures cover major failure classes. | PASSED | `INVALID_FRONTMATTER_FIXTURES.md` |
| OKF-MIG-P3-026 | Proposed schemas exist and parse. | PASSED | Phase 3 schema check |
| OKF-MIG-P3-027 | All local schema references resolve. | PASSED | Phase 3 schema check |
| OKF-MIG-P3-028 | Procedural schema limitations are documented. | PASSED | Schema comments and metadata contract |
| OKF-MIG-P3-029 | Current-to-future metadata map is complete/reconciled. | PASSED | `METADATA_MIGRATION_MAP.md` |
| OKF-MIG-P3-030 | Major metadata decisions are recorded. | PASSED | `PHASE_03_DECISIONS.md` |
| OKF-MIG-P3-031 | No unresolved item blocks Phase 4. | PASSED | `PHASE_03_UNRESOLVED_ITEMS.md` |
| OKF-MIG-P3-032 | Phase 4 execution handoff is complete. | PASSED | `PHASE_04_METADATA_HANDOFF.md` |
| OKF-MIG-P3-033 | Migration plan and risk register are updated. | PASSED | `MIGRATION_PLAN.md`, `MIGRATION_RISK_REGISTER.md` |
| OKF-MIG-P3-034 | Phase 3 acceptance criteria are updated accurately. | PASSED | This matrix |
| OKF-MIG-P3-035 | Current production `okf/` files remain unchanged. | PASSED | Final scope check |
| OKF-MIG-P3-036 | Production validator behavior remains unchanged. | PASSED | Existing validator run and scoped diff |
| OKF-MIG-P3-037 | Production code/tests/scripts/CI remain unchanged. | PASSED | Final scope check |
| OKF-MIG-P3-038 | Created/modified repository files are English-only. | PASSED | Script scan |
| OKF-MIG-P3-039 | Safe repository and specific checks are recorded. | PASSED | Phase 3 validation record |
| OKF-MIG-P3-040 | No commit or push occurred. | PASSED | Final Git inspection |
| OKF-MIG-P3-041 | Working tree contains only intended Phase 3 migration docs and preserved changes. | PASSED | Final Git inspection |

## Phase 3 Validation Record

| Command or method | Exit code/result | Finding | Relationship to Phase 3 |
|---|---:|---|---|
| Initial Git inspection | 0 | Branch `main`, start commit `63d26acba69c7a9bee72494aecc16178b2562d20`, clean tree, all 19 Phase 1-2 documents present. | Establishes preserved baseline |
| Official specification refresh | Success | Re-read official v0.2 frontmatter, trust, source, lifecycle, path, actor, reserved-file, conformance, and versioning rules. | Normative semantic input |
| Phase 2 input/current metadata revalidation | 0 | 58 mapped Markdown sources, 14 types, sibling official/extension roots, no unresolved blocker; nine legacy statuses and every registry item field inventoried. | Prevents silent redesign or guessed mappings |
| Proposed schema JSON/reference check | 0 | 8/8 schemas parsed, 8 unique `$id` values, and zero unresolved local `$ref` targets. | Validates machine-readable design artifacts |
| Phase 3 contract coverage check | 0 | 14 schema/taxonomy/example types match; 9 status values mapped; 10 extension fields documented; 20 valid examples, 28 invalid fixtures, 48 migration rows, 24 decisions, and 41 criteria found. | Validates required design coverage |
| English/trailing-whitespace scan | 0 | Zero Arabic-script matches and zero trailing-whitespace matches in migration files. | Validates language/format scope |
| `npm run okf:validate` | 0 | Existing 8-registry custom validation passed with zero orphaned critical requirements and broken references. | Confirms unchanged production validator behavior |
| `npm run docs:validate` | 0 | 124 required artifacts and 160 relative links passed. | Validates updated documentation links |
| `npm run format:check` | 0 | Production format checks passed. | Confirms no production formatting regression |
| `npm run lint` | 0 | Production lint passed. | Confirms no source regression |
| `npm run typecheck` | 0 | TypeScript build check passed. | Confirms no type regression |
| `npm test` (sandbox attempt) | 1 | Sandbox blocked esbuild child-process creation with `spawn EPERM`; no assertion failed. | Environmental limitation, not Phase 3 failure |
| `npm test` (approved execution) | 0 | All 84 tests passed; zero failed, skipped, cancelled, or todo. | Full regression validation |
| `git diff --check` and scoped production diff | 0 | No whitespace error and no change under `okf/`, apps, packages, tools, tests, package scripts, or CI. | Confirms design-only scope |
| Final Git/head/frontmatter/reserved-file check | 0 | HEAD unchanged, no current frontmatter, no production root index/log, and all changes limited to migration documentation. | Confirms Phase 3 prohibitions and no commit/push |

## Phase 1-2 Validation Record

| Command or check | Exit code | Result | Pre-existing or Phase 2-caused failure |
|---|---:|---|---|
| Initial `git branch --show-current`, `git rev-parse HEAD`, and `git status --short` | 0 | `main`; start commit `dd0fb00fd869dee2a808f48fc157f45c00c98cb0`; expected untracked Phase 1 directory only. | No failure |
| Baseline artifact/consumer revalidation | 0 | 58 Markdown and 11 JSON files; custom validator/tooling consumers confirmed; no production or CI consumer found. | No failure |
| `npm run okf:validate` | 0 | 8 registries passed with zero orphaned critical requirements and zero broken references. | No failure |
| `npm run docs:validate` | 0 | 124 required artifacts and 146 relative links passed. | No failure |
| `npm run format:check` | 0 | Production format checks passed. | No failure |
| `npm run lint` | 0 | Production source lint checks passed. | No failure |
| `npm run typecheck` | 0 | TypeScript build check passed. | No failure |
| `npm test` (sandbox attempt) | 1 | Environment blocked esbuild child-process creation with `spawn EPERM`; no test assertion ran or failed. | Sandbox limitation, not a repository or Phase 2 failure |
| `npm test` (approved process execution) | 0 | All 84 tests passed; 0 failed, skipped, or cancelled. | No failure |
| Phase 2 documentation structural check | 0 | 58 unique map rows match 58 sources; action totals reconcile; 14 complete type definitions; no Arabic-script text or trailing whitespace. | No failure |
| Final scope/frontmatter/reserved-file inspection | 0 | No `okf/` diff, no current frontmatter delimiters, no production root index/log, and all 19 untracked files are under `docs/okf-migration/`. | No failure |

## Future Phase Gates

| Phase | Gate | Status |
|---:|---|---|
| 3 | Metadata/frontmatter contract and fixture corpus implement fixed Phase 2 inputs. | PASSED |
| 4 | Reviewed core Concepts and indexes conform without removing current authorities. | PASSED |
| 5 | All mapped content and extension data have implemented dispositions and compatibility coverage. | NOT_STARTED |
| 6 | Official and extension validators/generators are separate and testable. | NOT_STARTED |
| 7 | Deterministic local/approved CI quality controls pass. | NOT_STARTED |
| 8 | Final official and extension audits pass; cleanup is explicitly approved. | NOT_STARTED |

## Phase 4 Criteria

| ID | Criterion | Status | Evidence |
|---|---|---|---|
| OKF-MIG-P4-001 | Baseline branch, commit, and clean starting status are recorded. | PASSED | `PHASE_04_IMPLEMENTATION_REPORT.md` |
| OKF-MIG-P4-002 | The Phase 2 and Phase 3 contracts and exact handoff are revalidated. | PASSED | `PHASE_04_METADATA_HANDOFF.md`, `PHASE_04_IMPLEMENTATION_REPORT.md` |
| OKF-MIG-P4-003 | The explicit root amendment is documented before production files are created. | PASSED | `PHASE_02_DECISIONS.md`, `PHASE_03_DECISIONS.md` |
| OKF-MIG-P4-004 | `okf/index.md` follows the root reserved-file contract. | PASSED | `okf/index.md`, `PHASE_04_CONFORMANCE_REPORT.md` |
| OKF-MIG-P4-005 | Required product, architecture, data, workflow, recovery, and history indexes exist without frontmatter. | PASSED | Six directory indexes and link audit |
| OKF-MIG-P4-006 | The exact 23 source documents produce 21 Concepts plus the required indexes. | PASSED | `PHASE_04_CORE_MIGRATION_LEDGER.md` |
| OKF-MIG-P4-007 | Every migrated Concept has valid frontmatter, an approved type, canonical field order, and lifecycle separation. | PASSED | Manual metadata validation and conformance report |
| OKF-MIG-P4-008 | Every migrated Concept has portable source attribution and no machine-specific path. | PASSED | `PHASE_04_LINK_AND_SOURCE_AUDIT.md` |
| OKF-MIG-P4-009 | Markdown relationships introduced by Phase 4 resolve. | PASSED | `PHASE_04_LINK_AND_SOURCE_AUDIT.md` |
| OKF-MIG-P4-010 | The Phase 3 architecture duplicate is merged without deleting either source. | PASSED | `okf/history/phase-03.md`, semantic preservation report |
| OKF-MIG-P4-011 | Existing registries, manifest, validator, application code, tests, scripts, and CI are unchanged. | PASSED | Scoped Git diff and implementation report |
| OKF-MIG-P4-012 | Remaining legacy content and full-bundle non-conformance are explicitly reported. | PASSED | Conformance report and Phase 5 handoff |
| OKF-MIG-P4-013 | Six Phase 4 reports are complete and counts reconcile. | PASSED | Report set under `docs/okf-migration/` |
| OKF-MIG-P4-014 | No commit or push occurs during Phase 4. | PASSED | Final Git inspection |
