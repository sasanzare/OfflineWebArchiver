---
type: Recovery Procedure
title: Leases
description: Defines durable Job ownership, expiry, token verification, and protected write checks.
tags: [recovery, leases, ownership, concurrency]
status: stable
sources:
  - id: leases-knowledge
    resource: okf/knowledge/leases/README.md
    title: Legacy Lease knowledge
  - id: recovery-source
    resource: packages/recovery/src/index.ts
    title: Recovery policy source
  - id: recovery-persistence-source
    resource: packages/persistence-sqlite/src/recovery.ts
    title: Lease persistence source
  - id: recovery-concurrency-tests
    resource: tests/concurrency/recovery-concurrency.test.ts
    title: Lease concurrency tests
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-QUEUE-003, FR-RECOVERY-001]
  acceptance_ids: [AC-P07-002, AC-P07-009]
  decision_ids: [OD-044, OD-047]
  risk_ids: [R-067, R-068, R-070]
  evidence_ids: [OKF-EV-P07-DOMAIN, OKF-EV-P07-PERSISTENCE, OKF-EV-P07-CONCURRENCY]
  legacy_ids: [OKF-DOM-047]
  legacy_paths: [okf/knowledge/leases/README.md]
---

# Leases

Lease configuration 1 defaults to 60 seconds and stores a SHA-256 verifier in the Lease row. Only one active Lease per Job is allowed. Protected writes validate scope, owner, token, Fencing Generation, status, and expiry before changing queue or recovery state.

The active credential remains available to the Phase 6 compatibility and idempotency ledgers for restart-safe identical replay, so the Project database is sensitive. The [Fencing](fencing.md) Concept rejects stale generations, and [Checkpoint Recovery](checkpoint-recovery.md) uses the Lease boundary for bounded recovery decisions.

