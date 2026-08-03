---
type: Phase Record
title: Product Phase 7 - Checkpoint, Lease, and Crash Recovery
description: Preserves the historical Product Phase 7 ownership, checkpoint, and crash-recovery result.
tags: [history, phase-record, recovery, leases]
status: stable
sources:
  - id: phase-07-report
    resource: docs/project/PHASE_07_IMPLEMENTATION_REPORT.md
    title: Product Phase 7 implementation report
  - id: phase-07-recovery-source
    resource: packages/recovery/src/index.ts
    title: Product Phase 7 recovery source
  - id: phase-07-process-kill-tests
    resource: tests/process-kill/recovery-process-kill.test.ts
    title: Product Phase 7 process-kill tests
owa:
  verification_status: verified
  evidence_ids: [OKF-EV-P07-DOMAIN, OKF-EV-P07-PERSISTENCE, OKF-EV-P07-LIFECYCLE, OKF-EV-P07-PROCESS-KILL, OKF-EV-P07-DOCS, OKF-EV-P07-RECORD]
  legacy_ids: [OKF-PHASE-007]
---

# Product Phase 7 - Checkpoint, Lease, and Crash Recovery

## Historical project result

The record was marked `VERIFIED` and activated on 2026-08-01. Application and workspaces were 0.7.0, contract 1.4.0, Project format 1.1.0, SQLite schema and migration 5, Queue state machine 2, and Recovery, Checkpoint, and Lease configuration 1.

## Outcome

Phase 7 verified persistent Lease ownership, Heartbeat and explicit renewal, inclusive expiry, monotonic Fencing Generation, immutable Job, Run, and Artifact Checkpoints, cooperative Pause and Resume, read-only Project-open inspection, explicit bounded resumable recovery, completed-output size and SHA-256 verification, and safe partial-file decisions. Phase 6 Queue identity, idempotency, and history remained intact.

## Persistence, evidence, and security

Forward migration `005_add_checkpoint_lease_recovery` preserved migrations 001 through 004 and added Run control, Lease, Checkpoint, output descriptor, recovery operation and event, execution-session, and compatibility recovery fields and indexes. Lease Token plaintext was never stored; only a SHA-256 verifier was durable.

Evidence included `packages/recovery/src/index.ts`, `packages/persistence-sqlite/src/recovery.ts`, Core, Application Service, contracts, CLI, and Desktop changes, recovery lifecycle and concurrency tests, actual process-kill boundaries, 5-minute, 6-hour, 24-hour, 3-day, and 14-day horizons, and the phase implementation report. Governance included ADR-031 through ADR-040, AC-P07-001 through AC-P07-039, and R-067 through R-089.

Token output and logging were forbidden; ownership, fencing, expiry, payload and path bounds, root containment, and recovery confirmation failed closed. Browser rendering and lifecycle were planned for Phase 8. Production Asset Downloader and production Range integration were planned for Phase 9. Worker Pool, distributed clocks, retention and compaction, forced pause, and revision reconciliation remained unresolved. The living rules are represented by [Leases](../recovery/leases.md), [Fencing](../recovery/fencing.md), and [Checkpoint Recovery](../recovery/checkpoint-recovery.md).
