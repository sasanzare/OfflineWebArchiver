---
type: Phase Record
title: Product Phase 6 - Persistent Queue and Job State Machine
description: Preserves the historical Product Phase 6 durable queue and Page Job state-machine result.
tags: [history, phase-record, queue, state-machine]
status: stable
sources:
  - id: phase-06-report
    resource: docs/project/PHASE_06_IMPLEMENTATION_REPORT.md
    title: Product Phase 6 implementation report
  - id: phase-06-queue-source
    resource: packages/queue/src/index.ts
    title: Product Phase 6 queue source
  - id: phase-06-queue-tests
    resource: tests/integration/queue-lifecycle.test.ts
    title: Product Phase 6 queue lifecycle tests
owa:
  verification_status: verified
  evidence_ids: [OKF-EV-P06-DOMAIN, OKF-EV-P06-PERSISTENCE, OKF-EV-P06-INTEGRATION, OKF-EV-P06-RECORD]
  legacy_ids: [OKF-PHASE-006]
---

# Product Phase 6 - Persistent Queue and Job State Machine

## Historical project result

The record was marked `VERIFIED` and activated on 2026-07-31. Application and workspaces were 0.6.0, contract 1.3.0, Project format 1.1.0, SQLite schema 4, Queue state machine 1, and Priority policy 1.

## Outcome

Product Phase 6 added a durable, deterministic, transactional, and idempotent SQLite-backed Page Job queue. Approved Scope Decisions could be enqueued, duplicate URL identities were constrained in the database, alternate discovery provenance was retained, claims were atomic and token-fenced, and completion, failure, retry, skip, and block histories survived Project reopen.

The dependency direction remained Desktop and CLI to contracts to Application Service to Core ports, with SQLite and platform implementations outside Core. `packages/queue` contained pure policy and did not depend on SQLite, Electron, browser, network, worker, or operating-system APIs.

## Registered models and persistence

Stable Page Job identity combined Project, Run, Profile revision, normalization engine, identity hash, and Page type. States were pending, processing, completed, failed, retrying, skipped, and blocked. Ordering was priority descending, due time ascending, depth ascending, insertion sequence ascending, and Job UUID ascending. Attempts incremented only on a committed claim, and completion or failure finalized the active attempt. Persistent idempotency used a Project-scoped operation/key and canonical business-request hash. Discovery retained source, parent, type, and depth records with minimum effective Job depth.

Migration `004_add_persistent_page_queue` created `scope_decisions`, `page_jobs`, `job_attempts`, `job_transitions`, `job_discoveries`, and `queue_operations` with ownership, uniqueness, transition-order, eligibility, state, and operation indexes and constraints. Backup-before-migration, foreign-key, WAL, full-sync, integrity, checksum, and rollback-on-failure behavior remained authoritative.

## Interfaces, evidence, and boundary

Contract 1.3.0 added the queue enqueue, claim, completion, failure, retry, skip, block, get, list, statistics, history, and clear-pending commands. CLI and Desktop exposed bounded queue operations. Evidence included queue domain, persistence, security, concurrency, CLI, and Electron tests, ADR-023 through ADR-030, AC-P06-001 through AC-P06-035, and the phase implementation report.

Risk R-065 remained open and critical because a crash could leave a non-expiring Phase 6 processing claim. There was no Lease table, Heartbeat, stale-processing repair, Checkpoint, automatic Resume, browser renderer, link discovery, downloader, or real crawler in this phase. The living queue behavior is described by [Queue](../workflow/queue.md) and [Page Job State Machine](../workflow/job-state-machine.md); later ownership is described by [Leases](../recovery/leases.md).

