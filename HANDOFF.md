# Handoff

**Document status:** Product Phase 7 completion handoff

**Current branch:** `main`

**Product phase:** Product Phase 7 — Checkpoint, Lease, and Crash Recovery (`complete`)

**OKF phase:** synchronized through Product Phase 7 (`verified`)

**Next product phase:** Product Phase 8 — Browser Lifecycle and Rendering Engine (`not started`)

**Last updated:** 2026-08-01

## Product Phase 7 result

Application/workspaces `0.7.0`, contract `1.4.0`, SQLite schema `5`, Queue state machine `2`, and Recovery/Checkpoint/Lease models `1` are implemented. Forward migration `005_add_checkpoint_lease_recovery` preserves migrations 001–004 and adds Run control, Job Leases, Job/Run/Artifact Checkpoints, completed-output descriptors, recovery operations/events, execution sessions, compatibility recovery fields, and ownership/index constraints.

An atomic claim issues one active Lease, stores its verification digest in `job_leases`, increments Fencing Generation, starts the attempt, and moves the Job to processing. The active credential is also retained in the Phase 6 Queue/attempt/idempotency ledgers so an identical claim can replay after restart; the Project database must therefore be treated as sensitive. Heartbeat records liveness without extension; renewal explicitly extends from the renewal time; expiration is `now >= expiresAt`. Every protected write validates Project/Run/Job/owner/token/generation/active/non-expired ownership. Stale owners cannot commit.

Recovery inspection is read-only, including on Project open. Confirmed recovery is Project/Run-scoped, idempotent, bounded, transactional, reason-coded, and resumable from a persisted cursor. Abandoned attempts become logically interrupted and safely requeue while retaining history. Cooperative pause checkpoints and releases ownership before paused; resume requires a fresh higher-generation Lease.

Completed outputs validate root-bounded non-symlink relative path, length, and SHA-256 while preserving valid terminal Jobs. Partial-file policy restarts on missing Range or changed validators and safely resumes a deterministic local 206 fixture. It is only a foundation; no production downloader exists.

## Evidence

Actual child processes are terminated with `SIGKILL` around attempt/claim/checkpoint/recovery/output-commit fault points and unclean Project sessions. Fake-clock recovery passes at 5 minutes, 6 hours, 24 hours, 3 days, and 14 days. Independent SQLite connection races prove active-Lease uniqueness, fencing, and recovery serialization. CLI and real Electron smoke tests cover recovery, report, pause/resume, Lease/Checkpoint inspection, confirmation, and token omission.

ADRs 031–040 are Accepted; AC-P07-001–039 have direct evidence. R-067–089 track residual timing, clock, growth, filesystem, performance, and future Worker integration risks. Decisions on retention, forced pause, revision reconciliation, verification frequency, production partial retention, session retention, and maximum resume age remain open.

## Known limitations

- Product Phase 7 remains single-host/single-Project-writer; distributed clock and shared-filesystem semantics are not proven.
- Checkpoint/recovery/session retention and large-artifact hash performance are unresolved.
- Pause is cooperative and has no timeout or forced-pause policy.
- A changed Project/Profile revision is not auto-reconciled on Resume.
- Recovery reports invalid completed output but does not silently reopen a terminal Job.
- Active Lease credentials remain in the local Phase 6 compatibility/idempotency ledgers for durable identical-claim replay; database encryption and protected-store-backed sealing are deferred to a later security/storage review.
- No browser lifecycle/rendering, network dispatch, link discovery, production Asset Downloader, Worker Pool, authentication, proxy, or crawler is implemented.

## Exact next product phase

**Product Phase 8 — Browser Lifecycle and Rendering Engine.** It must integrate a production browser boundary and lifecycle with the Phase 7 Lease/Fencing/Checkpoint contracts without weakening scope authorization, recovery, token secrecy, or Project portability. Asset downloading remains Product Phase 9.

## References

- [Phase 7 implementation report](docs/project/PHASE_07_IMPLEMENTATION_REPORT.md)
- [Phase 7 canonical record](okf/phases/phase-07/PHASE_07_RECOVERY_RECORD.md)
- [Crash Recovery](docs/architecture/CRASH_RECOVERY.md)
- [Phase 7 security review](docs/architecture/PHASE_07_SECURITY_REVIEW.md)
