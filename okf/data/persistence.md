---
type: Data Model
title: Persistence
description: Defines durable storage guarantees for queue, recovery, and portable project operations.
tags: [data, persistence, sqlite, recovery]
status: stable
sources:
  - id: persistence-architecture
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/docs/architecture/SQLITE_PERSISTENCE.md
    title: SQLite persistence architecture authority
  - id: persistence-source
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/packages/persistence-sqlite/src/recovery.ts
    title: Recovery persistence source
  - id: queue-persistence-source
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/packages/persistence-sqlite/src/queue.ts
    title: Queue persistence source
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-PROJECT-001, FR-PROJECT-002, FR-PROJECT-004, NFR-REL-002]
  acceptance_ids: [AC-P04-014, AC-P04-016, AC-P04-018, AC-P04-021]
  decision_ids: [OD-013, OD-014, OD-023]
  risk_ids: [R-012, R-045, R-046]
  evidence_ids: [OKF-EV-P04-PERSISTENCE, OKF-EV-P06-PERSISTENCE, OKF-EV-P07-PERSISTENCE]
  legacy_ids: [OKF-DOM-011]
---

# Persistence

The persistence layer stores Lease ownership using a token verifier and Fencing Generation, immutable Checkpoints, cooperative Run control, bounded resumable recovery reports and cursors, completed-output verification state, and clean or unclean execution sessions. Queue Scope Decisions, Page Jobs, attempts, transitions, discoveries, and idempotency results survive Project reopen under the Project lock and short SQLite immediate transactions.

Identity uniqueness, ownership, attempt numbering, and state are database constrained. Atomic file and directory promotion, SQLite repository operations, portable ZIP import and export, and single-writer lock coordination remain the Project foundation. Security and portability limitations remain recorded in the upstream Phase 4 review and ADRs. The [Database](database.md) provides the schema authority, while [Queue](../workflow/queue.md) and [Checkpoint Recovery](../recovery/checkpoint-recovery.md) consume these guarantees.

