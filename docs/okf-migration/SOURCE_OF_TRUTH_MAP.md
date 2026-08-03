# Target Source-of-Truth Map

## Phase 5 execution update

Migrated Concepts are the authoritative human-readable semantic representation for their subjects. Legacy Markdown paths are transitional compatibility artifacts only. Manifest and registries remain extension authorities or transitional derived indexes as classified in `PHASE_05_EXTENSION_BRIDGE_REPORT.md`.

## Phase 4 execution amendment

Under `OKF-P4-A001`, the new core Concepts are created directly under `okf/` because the Phase 4 contract requires `okf/index.md`. They are future semantic representations, not an immediate consumer cutover: current product, ADR, source, test, registry, and legacy Markdown authorities remain operational. The Phase 4 ledger marks each duplicate legacy source as preserved and read-only for migration purposes. Phase 5 must finalize extension relocation and authority cutover before any deletion.

| Phase 4 category | Realized target authority during overlap |
|---|---|
| Product | `okf/product/overview.md` plus the authored root and product indexes |
| Architecture | `okf/architecture/application-service.md`, `browser-runtime.md`, and `contracts.md` |
| Data | `okf/data/project-format.md`, `database.md`, and `persistence.md` |
| Workflow | `okf/workflow/queue.md`, `job-state-machine.md`, and `rendering.md` |
| Recovery | `okf/recovery/leases.md`, `fencing.md`, and `checkpoint-recovery.md` |
| History | `okf/history/phase-01.md` through `phase-08.md` |

## Policy

Each fact has one editable authority. An official Concept becomes the semantic knowledge authority only after its reviewed migration cutover. External product/governance documents and source/tests may remain authoritative for their specialized facts. Extension indexes and reports are derived unless this table explicitly identifies an authored project-only authority.

| Knowledge category | Current source | Future authoritative source | Derived outputs / extension indexes | Validation inputs | Migration dependencies | Owner | Stale-data risk |
|---|---|---|---|---|---|---|---|
| Project identity and scope | Root `README.md`, `HANDOFF.md`, product knowledge | `bundle/product/overview.md` for stable knowledge; root project docs retain repository entry-point roles | Root/product indexes; node index | Concept metadata/body and project links | Reconcile duplicated scope in Phase 4 | Product/documentation owner | Medium: entry-point docs may drift |
| Product requirements | `docs/product/PROJECT_SCOPE.md` and acceptance authorities | Existing product authority until reviewed Product Requirement Concepts are promoted | Traceability and node indexes | Requirement Concepts plus linked authority | Phase 3 authority/provenance contract; Phase 5 migration | Product owner | High: dual text during transition |
| Architecture | `docs/architecture/*.md`, ADRs, current knowledge | Living Architecture Overview/Component Concepts for explanatory architecture; code remains implementation authority | Node, system, dependency, relationship indexes | Concepts, Markdown links, source references | Phase 4-5 semantic review | Architecture owner | Medium |
| Architecture decisions | ADRs and decision authority; `decisions.json` index | Existing ADR/decision source; official Architecture Decision Concepts only when individually curated | Generated decision and relationship indexes/reports | ADRs, Concept links, decision annotations | Reconcile 101 current decision rows in Phase 5-6 | Architecture owner | High |
| Database and persistence | Source packages, migrations, current knowledge | Data Model Concepts for semantic rules; source/migrations for executable schema | Node/relationship indexes and evidence coverage | Concepts, migrations, source evidence | Phase 4 migration and source links | Data/architecture owner | High if schema and narrative diverge |
| Archive workflow | Queue/rendering/scope/site-profile knowledge and source | Workflow Concepts for behavior; source for implementation | Node, relationship, traceability indexes | Concepts, tests, source evidence | Phase 4 migration | Product/architecture owner | Medium |
| Recovery | Recovery knowledge and tests | Recovery Procedure Concepts for guarantees; tests/source for implementation evidence | Relationship and evidence reports | Concepts, negative/recovery tests | Phase 4 migration | Architecture owner | High because safety invariants are cross-linked |
| Lease and fencing behavior | Lease, heartbeat, fencing, run-control knowledge and source | Corresponding Recovery Procedure Concepts | Relationship/evidence indexes | Concepts, database/source, concurrency tests | Coordinated Phase 4 cutover | Architecture owner | Critical if independently edited |
| Security | ADRs/reviews, security/runtime-network knowledge | Security Control Concepts for controls; ADRs/reviews retain decision/evidence roles | Risk, decision, relationship, evidence reports | Concepts, security tests, review evidence | Phase 5 migration | Security/architecture owner | High |
| Testing | Test tooling, tests, current testing knowledge | `bundle/testing/test-strategy.md` for strategy; tests/commands for executable truth | Evidence and conformance reports | Test Strategy, package commands, fixtures | Phase 5 migration, Phase 7 automation | Quality owner | Medium |
| Operational procedures | Current migration, observability, packaging knowledge and build docs | Operational Runbook Concepts | Build/evidence reports and node index | Concepts, current commands, source links | Phase 5 migration | Maintainer/release owner | Medium |
| Phase history | Phase records, phase plan, `phases.json` | Phase Record Concepts for history; current phase plan remains planning authority | Generated history index and phase registry | Phase Records, evidence links, phase plan | Phase 4 records; path compatibility | Phase owner | Medium |
| Implementation evidence | Tests, builds, source, reviews, `evidence.json` | Evidence artifacts prove facts; authored extension registry governs evidence identity/location | Evidence coverage and traceability reports | Paths, hashes/commands where applicable, Concept links | Preserve all 54 records in Phase 5 | Quality owner | Critical |
| Registry relationships | `relationships.json` and map Markdown | Markdown links plus approved authored extension annotations | Generated relationship registry and maps | Concepts, annotations, path policy | Edge-by-edge reconciliation in Phase 5-6 | Architecture/tooling owner | High: typed semantics may be lost |
| Project domain vocabulary | `domains.json` | Authored `extensions/registry/domains.json` | Domain map and Concept-domain mappings | Domain schema and Concept references | Move after compatibility bridge | Architecture owner | High if IDs change |
| Manifest configuration | `okf/manifest.json` | Authored `extensions/manifest.json` for extension configuration | Tool summaries | Extension schema and tooling | Consumer path bridge | Tooling owner | High |
| Validation policy | Executable validator/tests plus semantic rules | Executable tests and approved extension policy; official specification remains official authority | Validation/conformance reports | Official bundle, extensions, fixtures | Dual validator implementation in Phase 6 | Validator owner | High: official and private rules can blur |
| Migration status | This migration directory and `changes.json` | Reviewed migration plan/map/decisions; authored extension change ledger after activation | Compatibility map and audit reports | Git diff, mapping coverage, validators | Phases 3-8 | Migration owner | Medium |

## Dual-Representation Rules

- A generated artifact always names or records its authoritative inputs.
- A Concept linked to an upstream authority summarizes and contextualizes; it does not silently redefine the authoritative acceptance, ADR, schema, or implementation fact.
- A registry row derived from a Concept cannot be edited to change the Concept. The source must change and the registry must regenerate.
- The evidence registry is authoritative for evidence identity and repository location, but the referenced artifact is authoritative for its own content.
- During migration overlap, the change ledger records which path is authoritative and marks the other representation read-only or derived.

## Phase 2 Resolution

The Phase 1 owner questions about physical extension location, Concept granularity, phase treatment, and registry authority are resolved by the Phase 2 architecture and migration map. No unresolved authority choice blocks Phase 3.

## Phase 3 Metadata Authority Rules

- `type`, `title`, `description`, lifecycle, and body meaning are authored Concept authority after cutover.
- `generated` identifies production of current content; `verified` identifies actual checks; neither is inferred from legacy status.
- `sources` is portable reader-facing provenance. The evidence registry remains authority for evidence IDs, locations, methods, and project traceability.
- `owa` state fields summarize the applicable project dimension from its existing authority; traceability arrays bridge rather than replace external requirement, acceptance, decision, risk, and evidence authorities.
- Proposed schemas describe producer shape only. They are design artifacts until Phase 6 and never override official permissive consumption.
