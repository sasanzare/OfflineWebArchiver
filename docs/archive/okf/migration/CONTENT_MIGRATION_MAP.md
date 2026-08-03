# Content Migration Map

## Scope and Interpretation

This ledger classifies all 58 original Markdown files under `okf/`, exactly once each. Phase 5 implements every row using additive targets and retained transitional source paths; the complete result is recorded in `COMPLETE_CONTENT_MIGRATION_LEDGER.md`.

`OKF-P4-A001` is the recorded Phase 4 realization amendment. The original proposed paths below retain the Phase 2 `okf/bundle/` notation for historical traceability; the Phase 4 core rows are implemented at the corresponding `okf/<category>/...` paths listed in the execution table below. No legacy source is removed or rewritten.

## Phase 4 execution path realization

| Source path | Phase 4 target path | Action | Type |
|---|---|---|---|
| `okf/knowledge/product/README.md` + `okf/knowledge/product/NEXT_PHASE.md` | `okf/product/index.md` + `okf/product/overview.md` | Convert index and merge durable scope | Project Overview |
| `okf/knowledge/product/PHASES.md` | `okf/history/index.md` | Convert phase navigation to reserved index | Reserved index |
| `okf/knowledge/application-service/README.md` | `okf/architecture/application-service.md` | Create target and preserve legacy | Architecture Component |
| `okf/knowledge/browser-runtime/README.md` | `okf/architecture/browser-runtime.md` | Create target and preserve legacy | Architecture Component |
| `okf/knowledge/contracts/README.md` | `okf/architecture/contracts.md` | Create target and preserve legacy | Architecture Component |
| `okf/knowledge/project-format/README.md` | `okf/data/project-format.md` | Create target and preserve legacy | Data Model |
| `okf/knowledge/database/README.md` | `okf/data/database.md` | Create target and preserve legacy | Data Model |
| `okf/knowledge/persistence/README.md` | `okf/data/persistence.md` | Create target and preserve legacy | Data Model |
| `okf/knowledge/queue/README.md` | `okf/workflow/queue.md` | Create target and preserve legacy | Workflow |
| `okf/knowledge/job-state-machine/README.md` | `okf/workflow/job-state-machine.md` | Create target and preserve legacy | Workflow |
| `okf/knowledge/rendering/README.md` | `okf/workflow/rendering.md` | Create target and preserve legacy | Workflow |
| `okf/knowledge/leases/README.md` | `okf/recovery/leases.md` | Create target and preserve legacy | Recovery Procedure |
| `okf/knowledge/fencing/README.md` | `okf/recovery/fencing.md` | Create target and preserve legacy | Recovery Procedure |
| `okf/knowledge/checkpoint-recovery/README.md` | `okf/recovery/checkpoint-recovery.md` | Create target and preserve legacy | Recovery Procedure |
| `okf/knowledge/architecture/PHASE_03_ARCHITECTURE_RECORD.md` + `okf/phases/phase-03/PHASE_03_ARCHITECTURE_RECORD.md` | `okf/history/phase-03.md` | Merge and preserve both sources | Phase Record |
| `okf/phases/phase-01/PHASE_01_RECORD.md` | `okf/history/phase-01.md` | Create target and preserve legacy | Phase Record |
| `okf/phases/phase-02/PHASE_02_RECORD.md` | `okf/history/phase-02.md` | Create target and preserve legacy | Phase Record |
| `okf/phases/phase-04/PHASE_04_PROJECT_FORMAT_RECORD.md` | `okf/history/phase-04.md` | Create target and preserve legacy | Phase Record |
| `okf/phases/phase-05/PHASE_05_SCOPE_AND_NORMALIZATION_RECORD.md` | `okf/history/phase-05.md` | Create target and preserve legacy | Phase Record |
| `okf/phases/phase-06/PHASE_06_PERSISTENT_QUEUE_RECORD.md` | `okf/history/phase-06.md` | Create target and preserve legacy | Phase Record |
| `okf/phases/phase-07/PHASE_07_RECOVERY_RECORD.md` | `okf/history/phase-07.md` | Create target and preserve legacy | Phase Record |
| `okf/phases/phase-08/PHASE_08_BROWSER_RENDERING_RECORD.md` | `okf/history/phase-08.md` | Create target and preserve legacy | Phase Record |

`Concept count` records the number of coherent semantic units in the source. A target type of `N/A — extension` or `N/A — reserved index` means the source will not become an ordinary official Concept. Target paths are repository-relative proposed paths. All moves wait for compatibility coverage; `No` in Owner decision means no unresolved owner choice blocks the disposition.

## Complete Source-to-Target Ledger

| # | Source path | Current title | Current role | Current source-of-truth status | Concept count | Proposed action | Target Concept type | Proposed target path | Split/merge dependencies | Extension dependencies | Risk | Target phase | Owner decision | Notes |
|---:|---|---|---|---|---:|---|---|---|---|---|---|---:|---|---|
| 1 | `okf/evidence/builds/README.md` | Build Evidence | Explains build evidence family | Reference-only | 1 | `MOVE_TO_EXTENSION_DOCUMENTATION` | N/A — extension | `okf/extensions/evidence/builds.md` | None | `evidence.json` | Medium | 5 | No | Preserve as authored guide; registry governs evidence IDs. |
| 2 | `okf/evidence/decisions/README.md` | Decision Evidence | Explains decision evidence family | Reference-only | 1 | `MOVE_TO_EXTENSION_DOCUMENTATION` | N/A — extension | `okf/extensions/evidence/decisions.md` | None | `evidence.json`, `decisions.json` | Medium | 5 | No | Keep outside official Concept tree. |
| 3 | `okf/evidence/runtime/README.md` | Runtime Evidence | Explains runtime evidence family | Reference-only | 1 | `MOVE_TO_EXTENSION_DOCUMENTATION` | N/A — extension | `okf/extensions/evidence/runtime.md` | None | `evidence.json` | Medium | 5 | No | Preserve repository/runtime evidence guidance. |
| 4 | `okf/evidence/source/README.md` | Source Evidence | Explains source evidence family | Reference-only | 1 | `MOVE_TO_EXTENSION_DOCUMENTATION` | N/A — extension | `okf/extensions/evidence/source.md` | None | `evidence.json` | Medium | 5 | No | Official source metadata does not replace project evidence IDs. |
| 5 | `okf/evidence/tests/README.md` | Test Evidence | Explains test evidence family | Reference-only | 1 | `MOVE_TO_EXTENSION_DOCUMENTATION` | N/A — extension | `okf/extensions/evidence/tests.md` | None | `evidence.json` | Medium | 5 | No | Test results remain evidence, not Test Strategy. |
| 6 | `okf/knowledge/application-service/README.md` | Application Service Knowledge | Describes application-service boundary and contracts | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Architecture Component | `okf/bundle/architecture/application-service.md` | None | Node/relationship indexes derived later | Medium | 4 | No | Concept becomes semantic authority after reviewed cutover. |
| 7 | `okf/knowledge/architecture/PHASE_03_ARCHITECTURE_RECORD.md` | Product Phase 3 Architecture Knowledge | Historical architecture-phase narrative | Narrative reference | 1 | `MERGE_WITH_ANOTHER_CONCEPT` | Phase Record | `okf/bundle/history/phase-03.md` | Merge with row 50; remove duplicate narrative during migration | Phase/evidence indexes | High | 4 | No | Living architecture facts must link to, not be governed by, the historical record. |
| 8 | `okf/knowledge/artifact-checkpoints/README.md` | Artifact Checkpoints | Defines artifact checkpoint/recovery behavior | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Recovery Procedure | `okf/bundle/recovery/artifact-checkpoints.md` | None | Evidence and relationship bridge | Medium | 4 | No | Preserve failure invariants and checkpoint semantics. |
| 9 | `okf/knowledge/browser-runtime/README.md` | Browser Runtime Knowledge | Describes browser runtime component | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Architecture Component | `okf/bundle/architecture/browser-runtime.md` | None | Node/relationship indexes | Medium | 4 | No | Runtime behavior links to rendering workflow. |
| 10 | `okf/knowledge/checkpoint-recovery/README.md` | Checkpoint Recovery | Defines recovery from persisted checkpoints | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Recovery Procedure | `okf/bundle/recovery/checkpoint-recovery.md` | None | Evidence bridge | Medium | 4 | No | Retain as one coherent recovery subject. |
| 11 | `okf/knowledge/cli/README.md` | CLI Knowledge | Describes command-line interface boundary | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Architecture Component | `okf/bundle/architecture/cli.md` | None | Node/relationship indexes | Low | 4 | No | Interface is a component, not a separate type. |
| 12 | `okf/knowledge/completed-output/README.md` | Completed Output | Defines completed-output recovery treatment | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Recovery Procedure | `okf/bundle/recovery/completed-output.md` | None | Evidence bridge | Medium | 4 | No | Link to render-results Data Model. |
| 13 | `okf/knowledge/contracts/README.md` | Contracts Knowledge | Describes cross-layer contracts | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Architecture Component | `okf/bundle/architecture/contracts.md` | None | Node/relationship indexes | Medium | 4 | No | Preserve one contract-boundary Concept. |
| 14 | `okf/knowledge/database/README.md` | Database Knowledge | Describes SQLite schema and database rules | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Data Model | `okf/bundle/data/database.md` | None | Evidence bridge | Medium | 4 | No | Source/migrations remain implementation authority. |
| 15 | `okf/knowledge/desktop-interface/README.md` | Desktop Interface Knowledge | Describes desktop UI boundary | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Architecture Component | `okf/bundle/architecture/desktop-interface.md` | None | Node/relationship indexes | Low | 4 | No | UI status notes must not define type or path. |
| 16 | `okf/knowledge/fencing/README.md` | Fencing | Defines stale-writer prevention | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Recovery Procedure | `okf/bundle/recovery/fencing.md` | None | Evidence and relationship bridge | High | 4 | No | Preserve token/ownership invariants exactly. |
| 17 | `okf/knowledge/heartbeats/README.md` | Heartbeats | Defines lease heartbeat behavior | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Recovery Procedure | `okf/bundle/recovery/heartbeats.md` | None | Evidence bridge | Medium | 4 | No | Link to leases and fencing. |
| 18 | `okf/knowledge/job-attempts/README.md` | Job Attempts | Describes attempt lifecycle and orchestration | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Workflow | `okf/bundle/workflow/job-attempts.md` | None | Evidence bridge | Medium | 4 | No | Data details link to database Concept. |
| 19 | `okf/knowledge/job-state-machine/README.md` | Page Job State Machine | Defines persistent job transitions | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Workflow | `okf/bundle/workflow/job-state-machine.md` | None | Required current docs link; phase bridge | High | 4 | No | Preserve transition semantics and current consumer until cutover. |
| 20 | `okf/knowledge/leases/README.md` | Leases | Defines lease acquisition and expiry | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Recovery Procedure | `okf/bundle/recovery/leases.md` | None | Evidence bridge | High | 4 | No | Link to heartbeats and fencing. |
| 21 | `okf/knowledge/migration/README.md` | Migration Knowledge | Gives application data-migration operations | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Operational Runbook | `okf/bundle/operations/migration.md` | None | Evidence bridge | Medium | 5 | No | Distinguish product data migration from this OKF migration. |
| 22 | `okf/knowledge/observability/README.md` | Observability Knowledge | Describes logs and diagnostics operations | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Operational Runbook | `okf/bundle/operations/observability.md` | None | Evidence bridge | Low | 5 | No | Retain actionable diagnostic guidance. |
| 23 | `okf/knowledge/packaging/README.md` | Packaging Knowledge | Describes packaging and release operations | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Operational Runbook | `okf/bundle/operations/packaging.md` | None | Build evidence bridge | Medium | 5 | No | Build outputs remain evidence. |
| 24 | `okf/knowledge/partial-files/README.md` | Partial Files | Defines treatment of incomplete artifacts | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Recovery Procedure | `okf/bundle/recovery/partial-files.md` | None | Evidence bridge | Medium | 4 | No | Link to checkpoint and output Concepts. |
| 25 | `okf/knowledge/pause-resume/README.md` | Pause and Resume | Defines controlled run suspension/restart | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Recovery Procedure | `okf/bundle/recovery/pause-resume.md` | None | Evidence bridge | Medium | 4 | No | Recovery classification reflects durable continuation guarantees. |
| 26 | `okf/knowledge/persistence/README.md` | Persistence Knowledge | Describes persistence model and guarantees | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Data Model | `okf/bundle/data/persistence.md` | None | Evidence bridge | Medium | 4 | No | Keep coherent; link to database and project format. |
| 27 | `okf/knowledge/platform/README.md` | Platform Knowledge | Describes platform/runtime boundary | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Architecture Component | `okf/bundle/architecture/platform.md` | None | Node/relationship indexes | Low | 4 | No | Platform is structural, not a Reference. |
| 28 | `okf/knowledge/product/DECISIONS.md` | Decision Knowledge | Summarizes decision registry | Derived/reference | 1 | `MOVE_TO_EXTENSION_DOCUMENTATION` | N/A — extension | `okf/extensions/reports/decisions.md` | None | `decisions.json`; future generated report | High | 5 | No | ADRs/decision sources remain authority. |
| 29 | `okf/knowledge/product/EVIDENCE.md` | Evidence Knowledge | Summarizes evidence coverage | Derived/reference | 1 | `MOVE_TO_EXTENSION_DOCUMENTATION` | N/A — extension | `okf/extensions/reports/evidence.md` | None | `evidence.json`; future generated report | High | 5 | No | Do not turn evidence coverage into official knowledge authority. |
| 30 | `okf/knowledge/product/NEXT_PHASE.md` | Next Product Phase | Summarizes next-phase direction | Derived/reference | 1 | `MERGE_WITH_ANOTHER_CONCEPT` | Project Overview | `okf/bundle/product/overview.md` | Merge durable scope only with row 32's product material; omit transient plan status | Phase plan remains upstream authority | Medium | 4 | No | No standalone volatile `next-phase` identity. |
| 31 | `okf/knowledge/product/PHASES.md` | Phase Knowledge | Navigation/summary of product phases | Derived/reference | 1 | `CONVERT_TO_INDEX` | N/A — reserved index | `okf/bundle/history/index.md` | Generated from rows 48-55 | `phases.json` derived later | Medium | 4 | No | Substantive history stays in Phase Records. |
| 32 | `okf/knowledge/product/README.md` | Product Knowledge | Product navigation and overview | Narrative reference | 1 | `CONVERT_TO_INDEX` | N/A — reserved index | `okf/bundle/product/index.md` | Stable overview content contributes to `product/overview.md` with row 30 | Node index | Medium | 4 | No | Index is generated; product body becomes separate overview Concept. |
| 33 | `okf/knowledge/product/RISKS.md` | Risk Knowledge | Summarizes risk registry | Derived/reference | 1 | `MOVE_TO_EXTENSION_DOCUMENTATION` | N/A — extension | `okf/extensions/reports/risks.md` | None | `risks.json`; future generated report | High | 5 | No | Risk authority stays external/extension, not a Concept type. |
| 34 | `okf/knowledge/project-format/README.md` | Project Format Knowledge | Defines persisted project bundle format | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Data Model | `okf/bundle/data/project-format.md` | None | Evidence bridge | High | 4 | No | Preserve compatibility and versioning rules in body. |
| 35 | `okf/knowledge/queue/README.md` | Queue | Describes persistent queue behavior | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Workflow | `okf/bundle/workflow/queue.md` | None | Required current docs link; evidence bridge | High | 4 | No | Link to state machine, attempts, and database. |
| 36 | `okf/knowledge/rendering/README.md` | Rendering Knowledge | Describes page rendering flow | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Workflow | `okf/bundle/workflow/rendering.md` | None | Evidence bridge | Medium | 4 | No | Browser runtime remains a linked component. |
| 37 | `okf/knowledge/render-results/README.md` | Render Results Knowledge | Defines captured render result structure | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Data Model | `okf/bundle/data/render-results.md` | None | Evidence bridge | Medium | 4 | No | Result lifecycle links to completed/partial output recovery. |
| 38 | `okf/knowledge/run-control/README.md` | Run Control | Defines ownership-aware run control | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Recovery Procedure | `okf/bundle/recovery/run-control.md` | None | Evidence bridge | High | 4 | No | Preserve concurrency invariants. |
| 39 | `okf/knowledge/runtime-network/README.md` | Runtime Network Knowledge | Defines runtime network restrictions | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Security Control | `okf/bundle/security/runtime-network.md` | None | Evidence bridge | High | 5 | No | Network behavior is a control because it enforces a trust boundary. |
| 40 | `okf/knowledge/scope-engine/README.md` | Scope Engine Knowledge | Describes URL scope decision workflow | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Workflow | `okf/bundle/workflow/scope-engine.md` | None | Evidence bridge | Medium | 4 | No | Link to site profile and normalization authorities. |
| 41 | `okf/knowledge/security/README.md` | Security Knowledge | Describes security boundaries and controls | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Security Control | `okf/bundle/security/security-boundaries.md` | None | Risk/decision/evidence bridge | High | 5 | No | Broader control overview distinct from runtime network. |
| 42 | `okf/knowledge/site-profile/README.md` | Site Profile Knowledge | Describes crawl profile normalization and selection flow | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Workflow | `okf/bundle/workflow/site-profile.md` | None | Evidence bridge | Medium | 4 | No | Persisted shape links to project-format Data Model. |
| 43 | `okf/knowledge/testing/README.md` | Testing Knowledge | Describes repository testing approach | Narrative reference | 1 | `KEEP_AS_SINGLE_CONCEPT` | Test Strategy | `okf/bundle/testing/test-strategy.md` | None | `evidence.json`; current docs link | Medium | 5 | No | Execution results stay in extensions. |
| 44 | `okf/maps/dependencies/README.md` | Dependency Map | Human-readable dependency map | Derived/reference | 1 | `MOVE_TO_EXTENSION_DOCUMENTATION` | N/A — extension | `okf/extensions/maps/dependencies.md` | None | Domains/nodes/relationships | Medium | 5 | No | Generate later where reproducible. |
| 45 | `okf/maps/domains/README.md` | Domain Map | Human-readable domain registry map | Derived/reference | 1 | `MOVE_TO_EXTENSION_DOCUMENTATION` | N/A — extension | `okf/extensions/maps/domains.md` | None | `domains.json`, `nodes.json` | Medium | 5 | No | Private domain vocabulary remains extension. |
| 46 | `okf/maps/system/README.md` | System Map | Human-readable system graph | Derived/reference | 1 | `MOVE_TO_EXTENSION_DOCUMENTATION` | N/A — extension | `okf/extensions/maps/system.md` | None | Nodes/relationships; links to Architecture Overview | Medium | 5 | No | Do not duplicate it as living architecture authority. |
| 47 | `okf/maps/traceability/README.md` | Traceability Map | Maps requirements to evidence and knowledge | Derived/reference | 1 | `MOVE_TO_EXTENSION_DOCUMENTATION` | N/A — extension | `okf/extensions/maps/traceability.md` | None | Evidence/decision/risk/relationship registries | High | 5 | No | Preserve all IDs and orphan checks. |
| 48 | `okf/phases/phase-01/PHASE_01_RECORD.md` | Product Phase 1 Record | Historical phase narrative | Narrative record | 1 | `KEEP_AS_SINGLE_CONCEPT` | Phase Record | `okf/bundle/history/phase-01.md` | None | Phase/evidence indexes | Medium | 4 | No | Historical authority; not current product state. |
| 49 | `okf/phases/phase-02/PHASE_02_RECORD.md` | Product Phase 2 Record | Historical phase narrative | Narrative record | 1 | `KEEP_AS_SINGLE_CONCEPT` | Phase Record | `okf/bundle/history/phase-02.md` | None | Phase/evidence indexes | Medium | 4 | No | Preserve spike/evidence boundaries. |
| 50 | `okf/phases/phase-03/PHASE_03_ARCHITECTURE_RECORD.md` | Product Phase 3 — Architecture, Monorepo, and Layer Contracts | Historical phase narrative | Narrative record | 1 | `KEEP_AS_SINGLE_CONCEPT` | Phase Record | `okf/bundle/history/phase-03.md` | Merge input from row 7 into this target | Phase/evidence indexes | High | 4 | No | This is the primary merge target. |
| 51 | `okf/phases/phase-04/PHASE_04_PROJECT_FORMAT_RECORD.md` | Product Phase 4 Project Format Record | Historical phase narrative | Narrative record | 1 | `KEEP_AS_SINGLE_CONCEPT` | Phase Record | `okf/bundle/history/phase-04.md` | None | Required current path; phase/evidence indexes | Medium | 4 | No | Preserve current consumer until compatibility cutover. |
| 52 | `okf/phases/phase-05/PHASE_05_SCOPE_AND_NORMALIZATION_RECORD.md` | Product Phase 5 Scope and Normalization Record | Historical phase narrative | Narrative record | 1 | `KEEP_AS_SINGLE_CONCEPT` | Phase Record | `okf/bundle/history/phase-05.md` | None | Required current path; phase/evidence indexes | Medium | 4 | No | Historical status does not enter official lifecycle status. |
| 53 | `okf/phases/phase-06/PHASE_06_PERSISTENT_QUEUE_RECORD.md` | Product Phase 6 — Persistent Queue and Job State Machine | Historical phase narrative | Narrative record | 1 | `KEEP_AS_SINGLE_CONCEPT` | Phase Record | `okf/bundle/history/phase-06.md` | None | Required current path; phase/evidence indexes | Medium | 4 | No | Link to living queue/state-machine Concepts. |
| 54 | `okf/phases/phase-07/PHASE_07_RECOVERY_RECORD.md` | Product Phase 7 — Checkpoint, Lease, and Crash Recovery | Historical phase narrative | Narrative record | 1 | `KEEP_AS_SINGLE_CONCEPT` | Phase Record | `okf/bundle/history/phase-07.md` | None | Required current path; phase/evidence indexes | Medium | 4 | No | Link to living recovery Concepts. |
| 55 | `okf/phases/phase-08/PHASE_08_BROWSER_RENDERING_RECORD.md` | Product Phase 8 — Browser Lifecycle and Rendering Engine | Historical phase narrative | Narrative record | 1 | `KEEP_AS_SINGLE_CONCEPT` | Phase Record | `okf/bundle/history/phase-08.md` | None | Required current path; phase/evidence indexes | Medium | 4 | No | Link to browser-runtime and rendering Concepts. |
| 56 | `okf/README.md` | Canonical OKF | Describes current custom framework and JSON authority | Narrative authority | 1 | `MOVE_TO_EXTENSION_DOCUMENTATION` | N/A — extension | `okf/extensions/README.md` | Rewrite as extension boundary guide after cutover | Manifest and all registry families | High | 5 | No | Must not become the official root index. |
| 57 | `okf/validation/reports/PHASE_03_OKF_MIGRATION_REPORT.md` | Product Phase 3 OKF Migration Report | Historical custom migration validation report | Historical evidence | 1 | `MOVE_TO_EXTENSION_DOCUMENTATION` | N/A — extension | `okf/extensions/validation/reports/phase-03-migration-report.md` | None | Current validator requires old path | High | 5 | No | Move only with consumer update and compatibility test. |
| 58 | `okf/validation/rules/SEMANTIC_RULES.md` | OKF Semantic Validation Rules | Documents custom validation semantics | Reference-only policy | 1 | `MOVE_TO_EXTENSION_DOCUMENTATION` | N/A — extension | `okf/extensions/validation/rules/semantic-rules.md` | Reconcile with executable behavior in Phase 6 | Validator, schemas, tests | High | 5 | No | Explicitly label as project policy, not official v0.2 semantics. |

## Reconciled Summary

| Disposition | Count |
|---|---:|
| Files kept as single Concepts | 39 |
| Files split into multiple Concepts | 0 |
| Files merged with another Concept | 2 |
| Files converted to indexes | 2 |
| Files converted to logs | 0 |
| Files moved to references | 0 |
| Files moved to extension documentation | 15 |
| Files kept as transitional artifacts | 0 |
| Files proposed for deprecation | 0 |
| Files requiring owner decision | 0 |
| **Total source files** | **58** |

The mutually exclusive primary-action total is `39 + 0 + 2 + 2 + 0 + 0 + 15 + 0 + 0 + 0 = 58`. Transitional retention is a sequencing rule for every moved path, not a second primary action.

## Merge and Index Outcomes

- Rows 7 and 50 converge on one `history/phase-03.md` Phase Record. Row 50 is the primary historical narrative; row 7 contributes unique architecture-phase context. No living architecture authority is taken from the historical output without separate review.
- Rows 30 and 32 contribute stable product context to `product/overview.md`, but their primary actions differ: row 30 merges and row 32 becomes the product index. Transient next-phase status is not migrated into the overview.
- Row 31 becomes the generated `history/index.md`; rows 48-55 remain the substantive historical Concepts.
- No current source justifies a split. This avoids section-driven fragmentation while retaining future evidence-based splitting through a superseding decision.

## Authority Cutover Rule

A target path does not become authoritative merely by being created. Each Phase 4-5 migration change must record content review, upstream authority links, extension reconciliation, compatibility coverage, and the cutover point. Until then, the corresponding current path retains the status shown above.
