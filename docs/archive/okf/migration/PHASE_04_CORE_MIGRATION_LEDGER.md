# Phase 4 Core Migration Ledger

## Scope and baseline

Phase 4 implements the exact handoff set under the `okf/` production root required by `OKF-P4-A001`. The starting branch was `main`, the starting commit was `fff6cedd1be69f818d076c2504b2f33f1c395095`, and the starting worktree was clean. No Phase 1-3 file was untracked or modified at the baseline; all prior migration documents were already tracked. Existing application, test, script, CI, registry, manifest, evidence, and legacy source files remain untouched.

The set contains 24 source documents, including the two-source Phase 3 merge and the Phase navigation source, 21 resulting Concepts, seven reserved indexes (the root plus six directory indexes), 28 new production files in total, zero splits, one merge, two index conversions, and 34 deferred source rows for Phase 5.

## Source-to-target ledger

| Migration ID | Source path(s) | Target path | Action | Concept type | Lifecycle | Project state mapping | Source mappings | Relationships added | Semantic change / deferred content | Validation | Risk | Phase 5 follow-up |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P4-001 | `okf/knowledge/product/README.md` | `okf/product/index.md` and `okf/product/overview.md` | Convert navigation and contribute durable overview | Project Overview | stable | implementation `partial`; verification `verified` | Product scope, acceptance, legacy product source | Product overview links to core category Concepts | Volatile phase-navigation text omitted; current product authority remains upstream | PASS | Medium | Reconcile product requirements and extension reports. |
| P4-002 | `okf/knowledge/product/NEXT_PHASE.md` | `okf/product/overview.md` | Merge durable scope and preserve source | Project Overview | stable | implementation `partial`; verification `verified` | Legacy next-phase source | Product overview links to history index | Exact next-phase claim intentionally omitted because it is volatile and conflicts with the legacy README wording | PASS | Medium | Resolve phase-navigation authority. |
| P4-003 | `okf/knowledge/application-service/README.md` | `okf/architecture/application-service.md` | Create target and preserve legacy | Architecture Component | stable | implementation `partial`; verification `verified` | Domain, source, and integration evidence IDs | Links to contracts, queue, leases, recovery, browser, and rendering | Status line normalized into project-state fields; no implementation claim added | PASS | Medium | Complete remaining architecture components and cutover. |
| P4-004 | `okf/knowledge/browser-runtime/README.md` | `okf/architecture/browser-runtime.md` | Create target and preserve legacy | Architecture Component | stable | implementation `implemented`; verification `verified` | Runtime architecture, source, integration, security, and process evidence | Links to application service, contracts, queue, rendering, and recovery | Version and platform limitations preserved | PASS | Medium | Migrate remaining browser/security Concepts. |
| P4-005 | `okf/knowledge/contracts/README.md` | `okf/architecture/contracts.md` | Create target and preserve legacy | Architecture Component | stable | implementation `implemented`; verification `verified` | Contract source, Phase 8 report, and interface evidence | Links to application service, browser, queue, and rendering | Transport and raw-handle exclusions retained | PASS | Medium | Reconcile all contract and ADR rows. |
| P4-006 | `okf/knowledge/project-format/README.md` | `okf/data/project-format.md` | Create target and preserve legacy | Data Model | stable | implementation `implemented`; verification `verified` | Project format authority, source, and tests | Links to database, persistence, and queue | Portable-path and future-auth boundary retained | PASS | High | Reconcile remaining data Concepts and bridge IDs. |
| P4-007 | `okf/knowledge/database/README.md` | `okf/data/database.md` | Create target and preserve legacy | Data Model | stable | implementation `implemented`; verification `verified` | SQLite authority and schema/persistence sources | Links to project format and persistence | Schema history and absent-table limitations retained | PASS | High | Add render-results and remaining data targets. |
| P4-008 | `okf/knowledge/persistence/README.md` | `okf/data/persistence.md` | Create target and preserve legacy | Data Model | stable | implementation `implemented`; verification `verified` | SQLite, queue, and recovery persistence sources | Links to database, queue, and checkpoint recovery | Retention and sensitive-database limitations retained | PASS | Medium | Reconcile persistence extension evidence. |
| P4-009 | `okf/knowledge/queue/README.md` | `okf/workflow/queue.md` | Create target and preserve legacy | Workflow | stable | implementation `implemented`; verification `verified` | Queue domain, persistence, lifecycle, concurrency, and recovery evidence | Links to state machine, leases, fencing, and rendering | No discovery/enqueue capability inferred | PASS | High | Migrate scope, discovery, and attempts workflows. |
| P4-010 | `okf/knowledge/job-state-machine/README.md` | `okf/workflow/job-state-machine.md` | Create target and preserve legacy | Workflow | stable | implementation `implemented`; verification `verified` | Queue and recovery tests plus domain evidence | Links to queue, leases, and checkpoint recovery | Recovery transitions were normalized as workflow behavior | PASS | High | Reconcile typed transition relationships. |
| P4-011 | `okf/knowledge/rendering/README.md` | `okf/workflow/rendering.md` | Create target and preserve legacy | Workflow | stable | implementation `implemented`; verification `verified` | Rendering authority, source, lifecycle, and fault evidence | Links to queue, application service, browser, and recovery | Discovery remains planned; no extra renderer behavior introduced | PASS | Medium | Migrate security and SPA/discovery workflows. |
| P4-012 | `okf/knowledge/leases/README.md` | `okf/recovery/leases.md` | Create target and preserve legacy | Recovery Procedure | stable | implementation `implemented`; verification `verified` | Recovery source, persistence, concurrency, and domain evidence | Links to fencing and checkpoint recovery | Sensitive active credential limitation retained | PASS | High | Reconcile heartbeat, run-control, and lease evidence. |
| P4-013 | `okf/knowledge/fencing/README.md` | `okf/recovery/fencing.md` | Create target and preserve legacy | Recovery Procedure | stable | implementation `implemented`; verification `verified` | Fencing ADR, recovery source, and concurrency evidence | Links to leases, checkpoint recovery, and state machine | Stale-generation invariant retained exactly | PASS | High | Preserve typed fencing edges in extension bridge. |
| P4-014 | `okf/knowledge/checkpoint-recovery/README.md` | `okf/recovery/checkpoint-recovery.md` | Create target and preserve legacy | Recovery Procedure | stable | implementation `implemented`; verification `verified` | Recovery source, persistence, and process-kill evidence | Links to leases, fencing, state machine, and rendering | Bounds and confirmation rules retained; no automatic resume inferred | PASS | High | Migrate partial-files, output, and run-control Concepts. |
| P4-015 | `okf/knowledge/product/PHASES.md` | `okf/history/index.md` | Convert phase navigation to reserved index | Reserved index | n/a | n/a | Legacy phase navigation source | Links to all eight Phase Records | Volatile Phase 9/10 next-phase text omitted; index lists durable records only | PASS | Medium | Reconcile generated phase index and future phase navigation. |
| P4-016 | `okf/knowledge/architecture/PHASE_03_ARCHITECTURE_RECORD.md` | `okf/history/phase-03.md` | Merge unique historical context | Phase Record | stable | verification `verified` | Merged architecture note and Phase 3 record | Links to living architecture Concepts | Duplicate paragraph is retained once; current architecture is not governed by history | PASS | High | Reconcile Phase 3 source authority and phase registry. |
| P4-017 | `okf/phases/phase-01/PHASE_01_RECORD.md` | `okf/history/phase-01.md` | Create target and preserve legacy | Phase Record | stable | verification `verified` | Scope and acceptance evidence | Links to Product Overview | Historical status is contextual, not lifecycle | PASS | Medium | Bridge phase registry and acceptance IDs. |
| P4-018 | `okf/phases/phase-02/PHASE_02_RECORD.md` | `okf/history/phase-02.md` | Create target and preserve legacy | Phase Record | stable | verification `verified` | Feasibility report, spike, and retained evidence | Links to Product Overview and Architecture index | Clean-machine limitation retained | PASS | Medium | Preserve spike references during extension move. |
| P4-019 | `okf/phases/phase-03/PHASE_03_ARCHITECTURE_RECORD.md` | `okf/history/phase-03.md` | Merge primary historical record | Phase Record | stable | verification `verified` | Phase record, ADR, source, tests, validator evidence | Links to Application Service, Contracts, Architecture index | `NOT_COMMITTED` and historical limitations retained | PASS | High | Complete path bridge before any cleanup. |
| P4-020 | `okf/phases/phase-04/PHASE_04_PROJECT_FORMAT_RECORD.md` | `okf/history/phase-04.md` | Create target and preserve legacy | Phase Record | stable | verification `verified` | Phase report, security review, format, persistence, and record evidence | Links to Project Format, Database, Persistence | Boundaries and ZIP/lock limitations retained | PASS | Medium | Reconcile phase 4 extension evidence. |
| P4-021 | `okf/phases/phase-05/PHASE_05_SCOPE_AND_NORMALIZATION_RECORD.md` | `okf/history/phase-05.md` | Create target and preserve legacy | Phase Record | stable | verification `verified` | Phase report, security review, and record evidence | Links to Queue as later consumer | No request, DNS, queue, or browser evidence inferred | PASS | Medium | Migrate Profile and Scope Concepts. |
| P4-022 | `okf/phases/phase-06/PHASE_06_PERSISTENT_QUEUE_RECORD.md` | `okf/history/phase-06.md` | Create target and preserve legacy | Phase Record | stable | verification `verified` | Queue source, lifecycle tests, report, and record evidence | Links to Queue, state machine, and Leases | Phase 7 capabilities remain explicitly outside the historical boundary | PASS | Medium | Reconcile queue phase/relationship indexes. |
| P4-023 | `okf/phases/phase-07/PHASE_07_RECOVERY_RECORD.md` | `okf/history/phase-07.md` | Create target and preserve legacy | Phase Record | stable | verification `verified` | Recovery source, process-kill tests, report, and record evidence | Links to Leases, Fencing, and Checkpoint Recovery | Browser and future asset limitations retained | PASS | Medium | Bridge recovery evidence and governance records. |
| P4-024 | `okf/phases/phase-08/PHASE_08_BROWSER_RENDERING_RECORD.md` | `okf/history/phase-08.md` | Create target and preserve legacy | Phase Record | stable | verification `verified` | Browser/render sources, fault tests, report, and record evidence | Links to Browser Runtime, Rendering, Queue, and Checkpoint Recovery | Platform and retention limitations retained | PASS | Medium | Reconcile browser/render relationships and evidence. |

## Production target ledger

| Target ID | Production path | Kind | Source ledger IDs | Metadata / ownership | Result |
|---|---|---|---|---|---|
| T-001 | `okf/index.md` | Authored root reserved index | Handoff root rule | `okf_version: "0.2"` only; no Concept fields | PASS |
| T-002 | `okf/product/index.md` | Generated-style directory index | P4-001 | No frontmatter; generated marker; direct child only | PASS |
| T-003 | `okf/product/overview.md` | Concept | P4-001, P4-002 | Project Overview; sources and `owa` bridge | PASS |
| T-004 | `okf/architecture/index.md` | Generated-style directory index | Architecture group | No frontmatter; generated marker; direct child only | PASS |
| T-005 | `okf/architecture/application-service.md` | Concept | P4-003 | Architecture Component | PASS |
| T-006 | `okf/architecture/browser-runtime.md` | Concept | P4-004 | Architecture Component | PASS |
| T-007 | `okf/architecture/contracts.md` | Concept | P4-005 | Architecture Component | PASS |
| T-008 | `okf/data/index.md` | Generated-style directory index | Data group | No frontmatter; generated marker; direct child only | PASS |
| T-009 | `okf/data/project-format.md` | Concept | P4-006 | Data Model | PASS |
| T-010 | `okf/data/database.md` | Concept | P4-007 | Data Model | PASS |
| T-011 | `okf/data/persistence.md` | Concept | P4-008 | Data Model | PASS |
| T-012 | `okf/workflow/index.md` | Generated-style directory index | Workflow group | No frontmatter; generated marker; direct child only | PASS |
| T-013 | `okf/workflow/queue.md` | Concept | P4-009 | Workflow | PASS |
| T-014 | `okf/workflow/job-state-machine.md` | Concept | P4-010 | Workflow | PASS |
| T-015 | `okf/workflow/rendering.md` | Concept | P4-011 | Workflow | PASS |
| T-016 | `okf/recovery/index.md` | Generated-style directory index | Recovery group | No frontmatter; generated marker; direct child only | PASS |
| T-017 | `okf/recovery/leases.md` | Concept | P4-012 | Recovery Procedure | PASS |
| T-018 | `okf/recovery/fencing.md` | Concept | P4-013 | Recovery Procedure | PASS |
| T-019 | `okf/recovery/checkpoint-recovery.md` | Concept | P4-014 | Recovery Procedure | PASS |
| T-020 | `okf/history/index.md` | Generated-style directory index | P4-015 through P4-024 | No frontmatter; generated marker; direct child only | PASS |
| T-021 | `okf/history/phase-01.md` | Concept | P4-016 | Phase Record | PASS |
| T-022 | `okf/history/phase-02.md` | Concept | P4-017 | Phase Record | PASS |
| T-023 | `okf/history/phase-03.md` | Concept | P4-015, P4-018 | Phase Record merge | PASS |
| T-024 | `okf/history/phase-04.md` | Concept | P4-019 | Phase Record | PASS |
| T-025 | `okf/history/phase-05.md` | Concept | P4-020 | Phase Record | PASS |
| T-026 | `okf/history/phase-06.md` | Concept | P4-021 | Phase Record | PASS |
| T-027 | `okf/history/phase-07.md` | Concept | P4-022 | Phase Record | PASS |
| T-028 | `okf/history/phase-08.md` | Concept | P4-023 | Phase Record | PASS |

## Count reconciliation

| Measure | Count | Check |
|---|---:|---|
| Selected source documents | 24 | Handoff rows: 3 product/index + 3 architecture + 3 data + 3 workflow + 3 recovery + 10 history inputs (including the Phase 3 duplicate) |
| Resulting normal Concepts | 21 | 1 product + 3 architecture + 3 data + 3 workflow + 3 recovery + 8 Phase Records |
| In-place migrations | 0 | Every selected source remains at its current path |
| New target-path migrations | 21 | Every normal Concept is additive |
| Split migrations | 0 | Frozen map has no split candidate |
| Merge migrations | 1 | Two Phase 3 sources become one Phase Record |
| Index conversions | 2 | Product README and Phase navigation are represented by indexes; product README also contributes to overview |
| Reserved indexes | 7 | Root plus product, architecture, data, workflow, recovery, and history |
| New production files | 28 | 21 Concepts + 7 indexes |
| Deferred source rows | 34 | All remaining map rows are listed in `PHASE_05_HANDOFF.md` |

All selected source rows and all new target paths are accounted for above. The source registry, evidence registry, manifest, relationships, and current validator were not edited.
