# Product Phase 6 Implementation Report

**Status:** Complete, subject to the repository's automated validation record  
**Date:** 2026-07-31  
**Scope:** Persistent Queue and Job State Machine only

## Delivered

Product Phase 6 introduces `packages/queue` and extends Archive Core with stable Page Job, attempt, transition, discovery, statistics, repository-port, error, and command models. The pure Queue package owns state machine version 1, priority policy version 1, ordering, retry, idempotency, redaction, and result-commit validation. Application Service remains the sole orchestrator for Scope re-evaluation and Queue repository calls.

SQLite schema 4 is introduced by forward migration `004_add_persistent_page_queue`. It adds normalized Scope Decision, Page Job, attempt, transition, discovery, and operation-idempotency ledgers. Composite foreign keys preserve Project/Run ownership, the logical identity unique constraint prevents duplicate Page Jobs under races, and explicit sequence columns preserve deterministic history and queue order.

The transport contract is 1.3.0 and the application/workspaces are 0.6.0. Project format remains 1.1.0 while its SQLite schema compatibility moves to 4 and its feature declaration includes `crawlQueue`.

## Queue Semantics

- Logical identity: Project, Run, Profile revision, normalization engine version, identity hash, and Page type.
- States: pending, processing, completed, failed, retrying, skipped, blocked.
- Terminal: completed, failed, skipped, blocked.
- Ordering: priority descending; eligible time, depth, insertion sequence, and Job ID ascending.
- Claim: `BEGIN IMMEDIATE`, guarded pending selection/update, UUID claim token, attempt increment and transition in one commit.
- Completion/failure: token-fenced, transactional, persistent operation hashes, identical replay returns the original result, conflicts reject.
- Retry: explicit `retrying` and due-time release; attempt count starts at zero and increments only on successful claim; exhausted/non-retryable work becomes terminal failed.
- Discovery: duplicate Jobs retain multiple relationships; lower-depth rediscovery updates only effective Job depth.
- Clearing: bounded, explicit test/approved command turns pending Jobs into audited skipped states; it never deletes history.

## Interfaces and Safety

CLI and Desktop call only Application Service through contract 1.3.0. The CLI implements all Queue commands with human/JSON output, bounded pagination, and stable validation/business exit codes. The isolated Desktop renderer implements summary, state filter, list, detail/history, duplicate explanation, and controlled enqueue/claim/complete/fail simulation without direct database access.

Inputs are runtime-validated and bounded. SQL is parameterized, Project/Run/Profile/revision ownership is checked, claim tokens fence terminal writes, sensitive URL/error/result values are redacted or rejected, logging contains identifiers and counts rather than raw URLs, and renderer isolation/CSP/sender/path grants remain enforced.

## Evidence

AC-P06-001 through AC-P06-035 map to unit, migration, integration, security, concurrency, CLI, Electron, contract, architecture, documentation, and OKF evidence. The state validator covers 10 allowed and 39 rejected state pairs. Worker Thread concurrency tests use independent SQLite connections for duplicate enqueue, claim, terminal/retry races, attempt integrity, reopen, and transaction integrity.

ADRs 023–030 are Accepted. Decisions OD-036–043 are resolved. Risks R-056–066 are recorded; R-065 remains open and critical for Product Phase 7.

## Non-Goals Preserved

No Lease expiration, Heartbeat, stale-processing recovery, Crash Recovery, Checkpoint, automatic Resume, browser rendering, link discovery, network request, downloader, worker pool, or real crawler was introduced. A claimed Job can remain `processing` after its owner crashes; Product Phase 6 intentionally does not repair it.

## Next Phase

Product Phase 7 — Checkpoint, Lease, and Crash Recovery. It must add fenced Lease ownership, Heartbeats, expiration, abandoned-processing recovery, durable Checkpoints, safe Pause/Resume, crash/system-shutdown and multi-day recovery, completed-output verification, partial-asset foundations, and stale-worker commit prevention while preserving Product Phase 6 state and idempotency invariants.
