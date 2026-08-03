# Phase 4 Link and Source Audit

## Audit scope

This audit covers the 28 new production files under `okf/` and the 21 normal Concepts created by Phase 4. Links and source resources were checked after the production files were written. Paths are repository-relative; no Windows drive, UNC, `file:`, home, or environment path was introduced.

## Internal Markdown link audit

The following table lists every newly introduced internal link grouped by source file. Each target in a row was checked independently against the repository filesystem.

| Source file | Internal targets introduced | Result |
|---|---|---|
| `okf/index.md` | `product/index.md`; `architecture/index.md`; `data/index.md`; `workflow/index.md`; `recovery/index.md`; `history/index.md` | 6/6 resolve |
| `okf/product/index.md` | `overview.md` | 1/1 resolve |
| `okf/product/overview.md` | `../architecture/application-service.md`; `../data/project-format.md`; `../workflow/queue.md`; `../recovery/checkpoint-recovery.md`; `../architecture/browser-runtime.md`; `../workflow/rendering.md`; `../history/index.md` | 7/7 resolve |
| `okf/architecture/index.md` | `application-service.md`; `browser-runtime.md`; `contracts.md` | 3/3 resolve |
| `okf/architecture/application-service.md` | `../workflow/queue.md`; `../recovery/leases.md`; `../recovery/checkpoint-recovery.md`; `browser-runtime.md`; `../workflow/rendering.md` | 5/5 resolve |
| `okf/architecture/browser-runtime.md` | `../workflow/rendering.md`; `application-service.md`; `contracts.md`; `../workflow/queue.md`; `../recovery/checkpoint-recovery.md` | 5/5 resolve |
| `okf/architecture/contracts.md` | `application-service.md`; `../workflow/queue.md`; `../workflow/rendering.md`; `browser-runtime.md` | 4/4 resolve |
| `okf/data/index.md` | `project-format.md`; `database.md`; `persistence.md` | 3/3 resolve |
| `okf/data/project-format.md` | `database.md`; `persistence.md`; `../workflow/queue.md` | 3/3 resolve |
| `okf/data/database.md` | `project-format.md`; `persistence.md` | 2/2 resolve |
| `okf/data/persistence.md` | `database.md`; `../workflow/queue.md`; `../recovery/checkpoint-recovery.md` | 3/3 resolve |
| `okf/workflow/index.md` | `queue.md`; `job-state-machine.md`; `rendering.md` | 3/3 resolve |
| `okf/workflow/queue.md` | `job-state-machine.md`; `../recovery/leases.md`; `../recovery/fencing.md`; `rendering.md` | 4/4 resolve |
| `okf/workflow/job-state-machine.md` | `queue.md`; `../recovery/leases.md`; `../recovery/checkpoint-recovery.md` | 3/3 resolve |
| `okf/workflow/rendering.md` | `queue.md`; `../architecture/application-service.md`; `../architecture/browser-runtime.md` | 3/3 resolve |
| `okf/recovery/index.md` | `leases.md`; `fencing.md`; `checkpoint-recovery.md` | 3/3 resolve |
| `okf/recovery/leases.md` | `fencing.md`; `checkpoint-recovery.md` | 2/2 resolve |
| `okf/recovery/fencing.md` | `leases.md`; `checkpoint-recovery.md`; `../workflow/job-state-machine.md` | 3/3 resolve |
| `okf/recovery/checkpoint-recovery.md` | `leases.md`; `fencing.md`; `../workflow/job-state-machine.md`; `../workflow/rendering.md` | 4/4 resolve |
| `okf/history/index.md` | `phase-01.md`; `phase-02.md`; `phase-03.md`; `phase-04.md`; `phase-05.md`; `phase-06.md`; `phase-07.md`; `phase-08.md` | 8/8 resolve |
| `okf/history/phase-01.md` | `../product/overview.md` | 1/1 resolve |
| `okf/history/phase-02.md` | `../product/overview.md`; `../architecture/index.md` | 2/2 resolve |
| `okf/history/phase-03.md` | `../architecture/application-service.md`; `../architecture/contracts.md`; `../architecture/index.md` | 3/3 resolve |
| `okf/history/phase-04.md` | `../data/project-format.md`; `../data/database.md`; `../data/persistence.md` | 3/3 resolve |
| `okf/history/phase-05.md` | `../workflow/queue.md` | 1/1 resolve |
| `okf/history/phase-06.md` | `../workflow/queue.md`; `../workflow/job-state-machine.md`; `../recovery/leases.md` | 3/3 resolve |
| `okf/history/phase-07.md` | `../recovery/leases.md`; `../recovery/fencing.md`; `../recovery/checkpoint-recovery.md` | 3/3 resolve |
| `okf/history/phase-08.md` | `../architecture/browser-runtime.md`; `../workflow/rendering.md`; `../workflow/queue.md`; `../recovery/checkpoint-recovery.md` | 4/4 resolve |

**Internal link result:** 95/95 new relative Markdown links resolve. No external URL was added to the production slice, and no legacy broken link was repaired outside the selected targets.

## Source metadata audit

Every source entry below was checked for a non-empty portable `resource`, an existing repository path, and a unique source ID within its Concept. The 21 Concepts contain 80 source records.

| Target Concept | Source resources |
|---|---|
| `okf/product/overview.md` | `docs/product/PROJECT_SCOPE.md`; `docs/product/ACCEPTANCE_MATRIX.md`; `okf/knowledge/product/README.md`; `okf/knowledge/product/NEXT_PHASE.md` |
| `okf/architecture/application-service.md` | `okf/knowledge/application-service/README.md`; `packages/application-service/src/index.ts`; `tests/integration/application-service.test.ts` |
| `okf/architecture/browser-runtime.md` | `okf/knowledge/browser-runtime/README.md`; `docs/architecture/BROWSER_RUNTIME.md`; `packages/browser-runtime/src/index.ts`; `tests/integration/render-lifecycle.test.ts` |
| `okf/architecture/contracts.md` | `okf/knowledge/contracts/README.md`; `packages/contracts/src/index.ts`; `docs/project/PHASE_08_IMPLEMENTATION_REPORT.md` |
| `okf/data/project-format.md` | `okf/knowledge/project-format/README.md`; `docs/architecture/PROJECT_FORMAT.md`; `packages/project-format/src/index.ts`; `tests/unit/project-format.test.ts` |
| `okf/data/database.md` | `okf/knowledge/database/README.md`; `docs/architecture/SQLITE_PERSISTENCE.md`; `packages/persistence-sqlite/src/index.ts`; `packages/persistence-sqlite/src/render.ts` |
| `okf/data/persistence.md` | `okf/knowledge/persistence/README.md`; `docs/architecture/SQLITE_PERSISTENCE.md`; `packages/persistence-sqlite/src/recovery.ts`; `packages/persistence-sqlite/src/queue.ts` |
| `okf/workflow/queue.md` | `okf/knowledge/queue/README.md`; `packages/queue/src/index.ts`; `packages/persistence-sqlite/src/queue.ts`; `tests/integration/queue-lifecycle.test.ts` |
| `okf/workflow/job-state-machine.md` | `okf/knowledge/job-state-machine/README.md`; `packages/queue/src/index.ts`; `tests/unit/queue.test.ts`; `tests/unit/recovery.test.ts` |
| `okf/workflow/rendering.md` | `okf/knowledge/rendering/README.md`; `docs/architecture/RENDERING_ENGINE.md`; `packages/rendering/src/index.ts`; `tests/integration/render-lifecycle.test.ts` |
| `okf/recovery/leases.md` | `okf/knowledge/leases/README.md`; `packages/recovery/src/index.ts`; `packages/persistence-sqlite/src/recovery.ts`; `tests/concurrency/recovery-concurrency.test.ts` |
| `okf/recovery/fencing.md` | `okf/knowledge/fencing/README.md`; `packages/recovery/src/index.ts`; `docs/project/adr/ADR-032-monotonic-fencing-generation.md`; `tests/concurrency/recovery-concurrency.test.ts` |
| `okf/recovery/checkpoint-recovery.md` | `okf/knowledge/checkpoint-recovery/README.md`; `packages/recovery/src/index.ts`; `packages/persistence-sqlite/src/recovery.ts`; `tests/process-kill/recovery-process-kill.test.ts` |
| `okf/history/phase-01.md` | `okf/phases/phase-01/PHASE_01_RECORD.md`; `docs/product/PROJECT_SCOPE.md`; `docs/product/ACCEPTANCE_MATRIX.md` |
| `okf/history/phase-02.md` | `okf/phases/phase-02/PHASE_02_RECORD.md`; `docs/project/PHASE_02_FEASIBILITY_REPORT.md`; `okf-bootstrap/PHASE_EVIDENCE/PHASE_02_FEASIBILITY_EVIDENCE.md`; `spikes/phase-02-feasibility/README.md` |
| `okf/history/phase-03.md` | `okf/phases/phase-03/PHASE_03_ARCHITECTURE_RECORD.md`; `okf/knowledge/architecture/PHASE_03_ARCHITECTURE_RECORD.md`; `docs/project/adr/ADR-003-local-application-service-transport-boundary.md`; `tools/okf/validate.mjs` |
| `okf/history/phase-04.md` | `okf/phases/phase-04/PHASE_04_PROJECT_FORMAT_RECORD.md`; `docs/project/PHASE_04_IMPLEMENTATION_REPORT.md`; `docs/architecture/PHASE_04_SECURITY_REVIEW.md` |
| `okf/history/phase-05.md` | `okf/phases/phase-05/PHASE_05_SCOPE_AND_NORMALIZATION_RECORD.md`; `docs/project/PHASE_05_IMPLEMENTATION_REPORT.md`; `docs/architecture/PHASE_05_SECURITY_REVIEW.md` |
| `okf/history/phase-06.md` | `okf/phases/phase-06/PHASE_06_PERSISTENT_QUEUE_RECORD.md`; `docs/project/PHASE_06_IMPLEMENTATION_REPORT.md`; `packages/queue/src/index.ts`; `tests/integration/queue-lifecycle.test.ts` |
| `okf/history/phase-07.md` | `okf/phases/phase-07/PHASE_07_RECOVERY_RECORD.md`; `docs/project/PHASE_07_IMPLEMENTATION_REPORT.md`; `packages/recovery/src/index.ts`; `tests/process-kill/recovery-process-kill.test.ts` |
| `okf/history/phase-08.md` | `okf/phases/phase-08/PHASE_08_BROWSER_RENDERING_RECORD.md`; `docs/project/PHASE_08_IMPLEMENTATION_REPORT.md`; `packages/browser-runtime/src/index.ts`; `packages/rendering/src/index.ts`; `tests/integration/render-persistence-faults.test.ts` |

**Source result:** 80/80 resources exist, 80/80 are portable, and 0/80 use a machine-specific path. Source IDs are unique within all 21 Concepts. Evidence IDs remain in the unchanged `okf/registry/evidence.json`; no registry row was rewritten. Concepts preserve registry-backed IDs in `owa.evidence_ids` and `owa.legacy_ids`; full edge-by-edge evidence reconciliation is deferred to Phase 5.

## Findings and limitations

- No broken new link was found.
- No prohibited local path was found in canonical frontmatter or source resources.
- The source `okf/knowledge/product/PHASES.md` is represented by the history index without copying its volatile Phase 9 and Phase 10 next-phase claims.
- The existing legacy Markdown remains at its original paths and may still contain custom links or non-OKF metadata; those are outside this new-link audit and remain Phase 5 work.

