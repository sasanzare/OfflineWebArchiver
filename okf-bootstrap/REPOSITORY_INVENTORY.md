# Repository Inventory

**Document status:** Verified working-tree inventory  
**Inspection date:** 2026-07-31  
**Branch:** `main`  
**Commit at inspection:** `0abb7b1`  
**Working-tree state:** Product Phase 1, OKF Phase 0, and Product Phase 2 are not committed  
**Last updated:** 2026-07-31

The repository now contains the Product Phase 1/OKF documentation baseline and
one isolated Product Phase 2 experimental source/test/build/package spike. It
still has no production source, final application scaffold, database/migration,
CI workflow, generated public contract, release artifact, or canonical `okf/`
directory. `VERIFIED` below applies only to the artifact and evidence scope named
in each row.

## Product Phase 1 artifacts present at inspection

| Path | Artifact type | Purpose | Authority level | Current status | Related domain | Product phase | Related requirement / acceptance IDs | Migrate into canonical OKF? | Notes |
|---|---|---|---:|---|---|---|---|---|---|
| `README.md` | Repository entry point | Product status, safety, documentation index | 3 | `VERIFIED` | product, phases | P01 | All families by index | Link/update; do not duplicate | Tracked file modified in working tree |
| `HANDOFF.md` | Working-state handoff | Current phase, changes, validation, Git state, next action | 3 | `VERIFIED` | phases, evidence | P02 | NFR-KNOW-003, AC-OKF-003, AC-P02-014 | Migrate phase facts; keep handoff current | Updated for P02; untracked |
| `docs/product/PROJECT_SCOPE.md` | Product authority | Scope, boundaries, FR/NFR definitions | 3 | `VERIFIED` | product, scope, requirements | P01 | FR-*, NFR-* | Yes, as requirement/domain nodes linked to source | Does not prove implementation |
| `docs/product/ACCEPTANCE_MATRIX.md` | Acceptance authority | Measurable acceptance definitions/statuses | 3 | `VERIFIED` | validation, requirements | P01 / P02 update | AC-* | Yes, as acceptance nodes/relations | AC-P02-* records only the experimental spike; production criteria remain separate |
| `docs/product/COVERAGE_AND_ELIGIBILITY.md` | Measurement authority | Eligible page identity, denominator, quality formulas | 3 | `VERIFIED` | scope, validation, reporting | P01 | FR-SCOPE-*, FR-VALIDATE-001, NFR-QUAL-001 | Yes | Verifies planned measurement contract |
| `docs/testing/TEST_FIXTURE_STRATEGY.md` | Testing strategy | Forty-eight planned deterministic fixture categories | 3 | `VERIFIED` | testing, evidence | P01 | FX-001..048, NFR-TEST-001 | Yes | Fixture source/tests do not yet exist |
| `docs/testing/TARGET_SITE_ACCEPTANCE_PLAN.md` | Acceptance template | Authorized private-target execution/evidence plan | 3 | `VERIFIED` | validation, operations, security, privacy | P01 / planned P24 | AC-VALIDATE-001, TS-001..020 | Yes, sanitized plan/relations | Target identity and approvals remain placeholders |
| `docs/project/RISK_REGISTER.md` | Risk authority | Scored risks, owners, mitigations, contingencies | 3 | `VERIFIED` | risks | P01 / continuous | R-001..040; RISK-KNOW-001 | Yes | P02 added measured evidence and R-038..040; no risk was closed |
| `docs/project/DEFINITION_OF_DONE.md` | Completion authority | Project-wide phase/change completion gates | 3 | `VERIFIED` | phases, validation, evidence | P01 / continuous | NFR-TEST-001, NFR-KNOW-* | Yes | Future phases must apply OKF synchronization |
| `docs/project/OPEN_DECISIONS.md` | Decision authority | Owner-bound unresolved project decisions | 3 | `VERIFIED` | decisions | P01 / continuous | OD-001..027 | Yes | P02 evidence added; recommendations are not outcomes |
| `docs/project/PHASE_PLAN.md` | Product phase authority | Numbered Product Phases 1–25 and gates | 3 | `VERIFIED` | phases | P01–P25 | Phase-linked requirements/ACs | Yes | OKF Phase 0 is not a product phase |
| `docs/project/TRACEABILITY.md` | Traceability authority | Requirement-to-acceptance/phase/test/risk mapping | 3 | `VERIFIED` | requirements, evidence | P01 / continuous | All current requirement/AC families including AC-P02-* | Yes, into registries/maps | P02 spike evidence is mapped; production implementation evidence remains planned |

## Product Phase 2 experimental artifacts

| Path | Artifact type | Purpose | Authority level | Current status | Related domain | Product phase | Related requirement / acceptance IDs | Migrate into canonical OKF? | Notes |
|---|---|---|---:|---|---|---|---|---|---|
| `spikes/phase-02-feasibility/` | Experimental source/test/build package | Executable Windows feasibility slice and deterministic fixture | 1 | `VERIFIED` for identified spike behavior | desktop-interface, browser-runtime, rendering, discovery, html-rewriting, offline-runtime, security, testing, packaging, windows | P02 | AC-P02-001..012 | Register as historical experimental component/evidence, not production package | Generated browsers/build/output/dist are ignored |
| `spikes/phase-02-feasibility/package.json` and `package-lock.json` | Experimental dependency/build definitions | Exact npm inputs and reproducible commands | 1 | `VERIFIED` | testing, packaging, evidence | P02 | AC-P02-002, AC-P02-009..012 | Record identified versions and provisional status | npm is not selected for production |
| `spikes/phase-02-feasibility/tests/` | Executable tests | Unit and real local integration coverage | 1 | `VERIFIED` | testing, evidence | P02 | AC-P02-002..008, AC-P02-011..012 | Register test/evidence relationships | Final run 18/18 assertions passed |
| `spikes/phase-02-feasibility/scripts/` | Build/test/package checks | Browser, Electron, package and restricted-`PATH` verification | 1 | `VERIFIED` | testing, packaging, windows, evidence | P02 | AC-P02-001..002, AC-P02-009..013 | Register commands/results and limitations | Clean-host status remains partial |
| `spikes/phase-02-feasibility/DEPENDENCIES.md` | Generated dependency inventory | Installed package versions/licenses/inclusion/review limitations | 2 | `VERIFIED` as generated inventory | packaging, security, evidence | P02 | AC-P02-009, AC-P02-012 | Use as dependency evidence input | Not legal approval or final SBOM |
| `docs/project/PHASE_02_FEASIBILITY_REPORT.md` | Phase report | Findings, measurements, failures, risks, decisions, recommendation | 2 | `VERIFIED` as evidence summary | phases, evidence, all affected P02 domains | P02 | AC-P02-001..014 | Migrate summary relationships; retain source evidence | Does not supersede executable results |
| `docs/project/adr/ADR-EXP-001-PHASE-02-SPIKE-TOOLING.md` | Experimental ADR | Provisional npm/TypeScript/Electron/builder/test choices | 3 | `VERIFIED` as experimental decision record | decisions, architecture, packaging | P02 only | AC-P02-001, AC-P02-009, AC-P02-012 | Preserve as experimental evidence | Production decision not finalized |
| `docs/project/adr/ADR-EXP-002-PLAYWRIGHT-CHROMIUM-PACKAGING.md` | Experimental ADR | Owned browser path/copy/fail-fast decision | 3 | `VERIFIED` as experimental decision record | browser-runtime, packaging, decisions | P02 only | AC-P02-002, AC-P02-009..010 | Preserve as experimental evidence | Production decision not finalized |
| `docs/project/adr/ADR-EXP-003-LOOPBACK-SPIKE-RUNTIME.md` | Experimental ADR | Built-in loopback server boundary | 3 | `VERIFIED` as experimental decision record | offline-runtime, security, decisions | P02 only | AC-P02-007..008, AC-P02-011 | Preserve as experimental evidence | Production decision not finalized |
| `okf-bootstrap/PHASE_EVIDENCE/PHASE_02_FEASIBILITY_EVIDENCE.md` | Bootstrap phase evidence | P02 impact, evidence, limitations, migration handoff | 2 | `VERIFIED` | phases, evidence | P02 | NFR-KNOW-003, AC-P02-014, AC-OKF-003..004 | Migrate under P03 gate; preserve bootstrap | Commit is `NOT_COMMITTED` |

## OKF Phase 0 artifacts

| Path | Artifact type | Purpose | Authority level | Current status | Related domain | Product phase | Related requirement / acceptance IDs | Migrate into canonical OKF? | Notes |
|---|---|---|---:|---|---|---|---|---|---|
| `okf-bootstrap/README.md` | Bootstrap entry point | Define OKF purpose, stage, rules, and navigation | 3 | `VERIFIED` | product, evidence, phases | Cross-cutting before P02 | NFR-KNOW-001..004, AC-OKF-001 | Migrate active rules; preserve bootstrap | Does not create canonical OKF |
| `okf-bootstrap/REPOSITORY_INVENTORY.md` | Inventory | Record existing and separately planned artifacts | 3 | `VERIFIED` | evidence, operations | Cross-cutting before P02 | NFR-KNOW-001..002 | Migrate inventory facts/evidence | This file |
| `okf-bootstrap/AUTHORITATIVE_SOURCE_MAP.md` | Governance map | Define authority, conflicts, triggers, owners, domains | 3 | `VERIFIED` | evidence, decisions | Cross-cutting before P02 | NFR-KNOW-002..004 | Yes | Future Level 1 evidence gains precedence |
| `okf-bootstrap/KNOWLEDGE_DOMAIN_MODEL.md` | Domain registry proposal | Define current/planned domains and dependencies | 3 | `VERIFIED` | all domains | P01 planning; P03 activation | NFR-KNOW-001, AC-OKF-002 | Yes, after validation | Implementation domains are not `VERIFIED` |
| `okf-bootstrap/EVIDENCE_POLICY.md` | Governance contract | Define evidence hierarchy, types, fields, paths, lifecycle | 3 | `VERIFIED` | evidence | Cross-cutting P02–P25 | NFR-KNOW-002, AC-OKF-004 | Yes | Machine schema remains unresolved |
| `okf-bootstrap/STATUS_MODEL.md` | Governance contract | Define mandatory statuses, transitions, conflict workflow | 3 | `VERIFIED` | evidence, decisions | Cross-cutting P02–P25 | NFR-KNOW-004, AC-OKF-005 | Yes | Status validates claims, not whole files |
| `okf-bootstrap/IDENTIFIER_CONVENTIONS.md` | Naming contract | Define stable IDs, paths, slugs, dates, phases, lifecycle | 3 | `VERIFIED` | evidence, requirements | Cross-cutting P02–P25 | NFR-KNOW-001 | Yes | Preserves legacy risk IDs |
| `okf-bootstrap/TARGET_OKF_STRUCTURE.md` | Structure proposal | Describe but not create future canonical layout | 3 | `PLANNED` | evidence, architecture | Planned P03 | AC-OKF-006 | Use as migration input | Schema choices remain open |
| `okf-bootstrap/PHASE_EVOLUTION_CONTRACT.md` | Continuous governance contract | Require OKF impact/evidence work in P02–P25 | 3 | `VERIFIED` | phases, evidence | P02–P25 | NFR-KNOW-003, AC-OKF-003 | Yes | Most important bootstrap deliverable |
| `okf-bootstrap/BOOTSTRAP_GAP_ANALYSIS.md` | Gap register | Classify expected evidence/decision/drift gaps | 3 | `VERIFIED` | evidence, risks | Cross-cutting before P02 | RISK-KNOW-001 | Convert active gaps to canonical nodes | Missing implementation evidence is expected |
| `okf-bootstrap/BOOTSTRAP_TRACEABILITY.md` | Migration map | Map current artifacts/ID families to future domains/nodes | 3 | `VERIFIED` | requirements, evidence | P01 → planned P03 | NFR-KNOW-001..004, AC-OKF-002 | Yes | Includes every critical requirement family |
| `okf-bootstrap/MIGRATION_AND_ACTIVATION_PLAN.md` | Migration plan | Define Product Phase 3 prerequisites, steps, validation, rollback | 3 | `PLANNED` | architecture, evidence, phases | Planned P03 | AC-OKF-006 | Execute and preserve | Not an activated structure |
| `okf-bootstrap/OPEN_QUESTIONS.md` | OKF question register | Track schema/tool/ownership/policy unknowns | 3 | `VERIFIED` | decisions, evidence | P02–P03 and later deadlines | OKF-OD-001..025, OD-026 | Migrate unresolved questions | Does not duplicate project decisions |
| `okf-bootstrap/PHASE_EVIDENCE/README.md` | Evidence guidance | Define temporary bootstrap phase-summary format | 3 | `VERIFIED` | phases, evidence | P02 until P03 activation | NFR-KNOW-002..003 | Preserve, then stop expanding | Phase 2 evidence file now exists |

## Planned artifacts that do not yet exist

These are plans, not inventory entries:

| Planned artifact | Earliest phase | Current status | Evidence/decision needed |
|---|---|---|---|
| Canonical `okf/` manifest, registries, knowledge, phase, evidence, map, and validation structure | P03 | `BLOCKED` | Actual P03 structure/contracts; OKF schema/tool/owner decisions; migration dry-run and rollback |
| Approved ADRs, architectural package/layer boundaries, public contracts | P03 | `BLOCKED` | Phase 2 findings and project decisions |
| Project format, database, queue, browser, archive, authentication, proxy, runtime, UI, packaging, and release implementation evidence | P04–P25 | `PLANNED` | Corresponding phase implementation, tests, builds, and runtime evidence |

## Inventory maintenance

Every phase record states created, modified, removed, renamed, generated, and
deprecated artifacts. New files must receive domain ownership and relationships.
Removed files must update active evidence links and retain historical
supersession/removal records. Inventory is re-derived from the repository at each
activation/release validation; it is not trusted as a static snapshot.
