# Product Phase 7 Implementation Report

## Status

Complete and verified on 2026-08-01. No commit, push, tag, release, browser engine, crawler, network dispatcher, production Asset Downloader, or Worker Pool was created by this phase.

## Versions and migration

Application/workspaces are `0.7.0`; contract is `1.4.0`; SQLite schema is `5`; Queue state machine is `2`; Recovery, Checkpoint, and Lease configuration models are `1`. Forward migration `005_add_checkpoint_lease_recovery` is additive and migrations 001–004 remain byte-for-byte unchanged.

## Implemented architecture

`packages/recovery` contains pure clock, Lease, Checkpoint payload, output descriptor, partial-file, and interruption policy. Core defines ports and domain types. Application Service validates and orchestrates. SQLite owns transactional persistence. CLI and Desktop use versioned commands and cannot access SQL. The Desktop renderer remains isolated.

Lease claim atomically increments Fencing Generation and creates one active Lease whose verifier is SHA-256 hashed. Phase 6 compatibility/idempotency ledgers retain the active credential for durable replay and make the Project database sensitive. Heartbeat never extends; renewal is explicit; exact-boundary expiry is inclusive. Protected writes reject stale/expired/released/mismatched ownership.

Job, Run, and Artifact Checkpoints are immutable, versioned, bounded, portable, secret-resistant, and owner-fenced. Run pause is request/acknowledge/checkpoint/release; Resume requeues and reclaims with a higher generation.

Recovery provides read-only inspection, confirmed apply, durable reports, Project/Run ownership, bounded batches, active-operation serialization, request-hash idempotency, and persisted cursor Resume. Project open detects but never repairs automatically. Completed output verification checks path containment, symlink, length, and SHA-256. Partial-file policy is proven with a loopback Range fixture and non-Range fallback only.

## Direct evidence

- Unit: Lease boundaries/config, Checkpoint limits/secrets, paths, partial-file decisions, contracts, parser, state machine.
- Integration: claim/renew/heartbeat/expiry/fencing, Checkpoints, pause/resume, recovery, output verification, Range fixture, reopen.
- Concurrency: independent SQLite connections race claim and recovery.
- Process kill: actual child `SIGKILL` around attempt, claim, Checkpoint, recovery, descriptor commit, and open session.
- Multi-day: fake-clock horizons 5m, 6h, 24h, 3d, and 14d.
- Interfaces: built CLI and real Electron smoke tests, including token omission.
- Static gates: type/build/lint/format, architecture, contracts, migrations, Queue, recovery, Checkpoint, security, docs, and OKF.

## Acceptance and governance

AC-P07-001–039 map direct evidence. ADR-031–040 record the actual decisions. R-067–089 and OD-044–065 distinguish verified decisions from unresolved retention/performance/integration policy. Canonical OKF phase 7 registers the source, tests, schemas, interfaces, decisions, risks, and limitations.

## Deferred boundary

The exact next phase is **Product Phase 8 — Browser Lifecycle and Rendering Engine**. Browser dispatch must adopt these ownership contracts. Production Asset downloading remains Phase 9; Worker Pool scheduling remains later work.
