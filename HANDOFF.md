# Handoff

**Document status:** Product Phase 6 completion handoff
**Current branch:** `main`
**Product phase:** Product Phase 6 — Persistent Queue and Job State Machine (`complete`)
**OKF phase:** Canonical OKF synchronized through Product Phase 6 (`verified`)
**Next product phase:** Product Phase 7 — Checkpoint, Lease, and Crash Recovery (`not started`)
**Last updated:** 2026-07-31

## Product Phase 6 result

Application/workspaces `0.6.0`, contract `1.3.0`, Project format `1.1.0`, SQLite schema `4`, and Queue state/priority policies `1` are implemented. Migration `004_add_persistent_page_queue` preserves migrations 001–003 and adds normalized Scope Decision, Page Job, attempt, transition, discovery, and idempotency ledgers with database-enforced logical uniqueness and ownership.

Approved Product Phase 5 decisions can enqueue durable Page Jobs. Equivalent identities return the existing Job while retaining alternate discovery relationships and minimum effective depth. Deterministic priority/due/depth/sequence/UUID ordering survives reopen. `BEGIN IMMEDIATE` claims commit state, UUID token, attempt count, attempt row, and transition atomically. Completion, failure, retry scheduling/release, skip, block, history, statistics, and bounded pending clearing are token-fenced and/or idempotent as applicable.

CLI exposes the 14 Queue commands in human and JSON modes with bounded pagination and stable validation/business exit codes. Desktop exposes a sandboxed Queue summary, filters, list, detail/history, duplicate explanation, and controlled enqueue/claim/complete/fail simulation through the existing two-method bridge. Neither interface imports persistence or executes raw SQL.

ADRs 023–030 are Accepted; OD-036–043 are resolved; AC-P06-001–035 have direct evidence. Risks R-056–066 track residual concurrency, growth, scheduling, retry, security, and recovery concerns. R-065 remains open and critical.

## Architecture and security invariants

- Core and `packages/queue` are SQLite/Electron/browser/network independent.
- Application Service owns Scope re-evaluation, revision/ownership checks, and repository orchestration.
- Queue identity includes Project, Run, Profile revision, engine version, identity hash, and Page type.
- Claim tokens never expire in Product Phase 6 and are required for completion/failure.
- SQL is parameterized; inputs/results/errors/pagination are bounded; raw sensitive URLs are not logged.
- Jobs and history are not physically cleared; approved/test clearing records `skipped` transitions.
- SQLite backup-before-migration, checksums, foreign keys, WAL/full sync, integrity checking, and rollback behavior remain intact.

## Known limitations

- A crash can leave a Job in `processing`; Product Phase 6 has no Lease expiration, Heartbeat, stale-processing recovery, or Crash Recovery.
- There is no Checkpoint, safe Pause/Resume, automatic or multi-day Resume, or stale-worker lease fencing beyond the non-expiring claim token.
- Strict priority can starve lower-priority work; aging and scheduler policies require measured future evidence.
- Queue/history/idempotency retention and scale thresholds are not finalized.
- Queue commands are synthetic local state operations: there is no browser rendering, link discovery, network request, downloader, worker pool, or real crawler.
- Phase 4 filesystem/SQLite physical-atomicity, ZIP locking, shared-filesystem, and cross-platform validation limits remain.
- Phase 5 hostname DNS/rebinding authorization remains a future dispatch-time requirement.

## Exact next product phase

**Product Phase 7 — Checkpoint, Lease, and Crash Recovery.** It must add Worker Lease ownership, Heartbeats and expiration, abandoned `processing` recovery, persistent Checkpoints, safe Pause/Resume, application/process/system-shutdown and multi-day recovery, completed-output hash verification, partial Asset recovery foundations, and stale-worker commit prevention while preserving Product Phase 6 token, idempotency, history, and state invariants. Do not reinterpret Product Phase 6 claims as leases.

## Evidence

- [Product Phase 6 implementation report](docs/project/PHASE_06_IMPLEMENTATION_REPORT.md)
- [Product Phase 6 canonical record](okf/phases/phase-06/PHASE_06_PERSISTENT_QUEUE_RECORD.md)
- [Persistent Queue architecture](docs/architecture/PERSISTENT_QUEUE.md)
- [Concurrency design](docs/architecture/QUEUE_CONCURRENCY.md)
- [Product Phase 5 implementation report](docs/project/PHASE_05_IMPLEMENTATION_REPORT.md)
- [Product Phase 4 implementation report](docs/project/PHASE_04_IMPLEMENTATION_REPORT.md)
