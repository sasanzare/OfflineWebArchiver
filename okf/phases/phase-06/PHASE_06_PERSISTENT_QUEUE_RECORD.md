# Product Phase 6 — Persistent Queue and Job State Machine

**Status:** VERIFIED  
**Activated:** 2026-07-31  
**Application/workspaces:** 0.6.0  
**Contract:** 1.3.0  
**Project format:** 1.1.0  
**SQLite schema:** 4  
**Queue state machine:** 1  
**Priority policy:** 1

## Outcome

Product Phase 6 adds a durable, deterministic, transactional, and idempotent SQLite-backed Page Job queue. Approved Product Phase 5 Scope Decisions can be enqueued, duplicate URL identities are constrained in the database, alternate discovery provenance is retained, claims are atomic and token-fenced, and completion/failure/retry/skip/block histories survive Project reopen.

The dependency direction remains Desktop/CLI -> contracts -> Application Service -> Core ports, with SQLite and platform implementations outside Core. `packages/queue` contains pure policy and does not depend on SQLite, Electron, browser, network, worker, or operating-system APIs.

## Registered Models

- Stable Page Job logical identity: Project + Run + Profile revision + normalization engine + identity hash + Page type.
- States: pending, processing, completed, failed, retrying, skipped, blocked.
- Terminal states: completed, failed, skipped, blocked.
- Ordering: priority descending, due time ascending, depth ascending, insertion sequence ascending, Job UUID ascending.
- Attempts increment only on a committed claim; completion/failure finalize the active attempt.
- Persistent idempotency: Project-scoped operation/key and canonical business-request hash.
- Discovery: immutable source/parent/type/depth records with minimum effective Job depth.

## Persistence and Migration

Forward migration `004_add_persistent_page_queue` creates `scope_decisions`, `page_jobs`, `job_attempts`, `job_transitions`, `job_discoveries`, and `queue_operations`, plus ownership, uniqueness, transition-order, eligibility, state, and operation indexes/constraints. Existing backup-before-migration, foreign-key, WAL, full-sync, integrity, checksum, and rollback-on-failure behavior remains authoritative. Earlier migrations are unchanged.

## Interfaces

Contract 1.3.0 adds `queue.enqueue`, `queue.enqueueBatch`, `queue.claimNext`, `queue.complete`, `queue.fail`, `queue.scheduleRetry`, `queue.releaseDueRetries`, `queue.skip`, `queue.block`, `queue.get`, `queue.list`, `queue.getStatistics`, `queue.getHistory`, and `queue.clearPending`. CLI exposes all operations in human/JSON modes; Desktop exposes bounded summary/list/detail/history/filter and controlled test mutations over the isolated bridge.

## Evidence

- Domain: `packages/queue/src/index.ts`, `tests/unit/queue.test.ts`, `tools/queue/state-machine.mjs`.
- Persistence/lifecycle: `packages/persistence-sqlite/src/queue.ts`, `tests/integration/queue-lifecycle.test.ts`.
- Security: `tests/integration/queue-security.test.ts`, `tools/security/check.mjs`.
- Concurrency: `tests/concurrency/queue-concurrency.test.ts` uses Worker Threads and independent SQLite connections.
- Interfaces: `tests/cli/cli-smoke.test.ts`, `tests/electron/desktop-smoke.test.ts`.
- Decisions: ADR-023 through ADR-030.
- Acceptance: AC-P06-001 through AC-P06-035.
- Implementation report: `docs/project/PHASE_06_IMPLEMENTATION_REPORT.md`.

## Risks and Unknowns

R-056 through R-066 cover uniqueness, state/claim/terminal races, scheduling, growth, retry, security, and recovery. R-065 remains open and critical: a crash can leave a non-expiring Product Phase 6 claim in `processing`. Retention/compaction, scale thresholds, and starvation aging remain future measured decisions.

## Explicit Boundary

There is no Lease table, Heartbeat, Lease expiry, stale-processing repair, Checkpoint, automatic Resume, browser renderer, link discovery, downloader, or real crawler. Those capabilities are not inferred from synthetic Queue commands or statistics. Product Phase 7 — Checkpoint, Lease, and Crash Recovery is `PLANNED` and must preserve Phase 6 token fencing and idempotency.
