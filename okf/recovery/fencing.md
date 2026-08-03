---
type: Recovery Procedure
title: Fencing
description: Defines monotonic generation checks that prevent stale Job owners from writing state.
tags: [recovery, fencing, leases, concurrency]
status: stable
sources:
  - id: fencing-knowledge
    resource: okf/knowledge/fencing/README.md
    title: Legacy fencing knowledge
  - id: recovery-source
    resource: packages/recovery/src/index.ts
    title: Recovery fencing policy source
  - id: fencing-adr
    resource: docs/project/adr/ADR-032-monotonic-fencing-generation.md
    title: Fencing generation decision
  - id: recovery-concurrency-tests
    resource: tests/concurrency/recovery-concurrency.test.ts
    title: Fencing concurrency tests
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-QUEUE-003, NFR-REL-001]
  acceptance_ids: [AC-P07-005, AC-P07-009]
  decision_ids: [OD-048]
  risk_ids: [R-069, R-070]
  evidence_ids: [OKF-EV-P07-DOMAIN, OKF-EV-P07-CONCURRENCY]
  legacy_ids: [OKF-DOM-049]
  legacy_paths: [okf/knowledge/fencing/README.md]
---

# Fencing

Every Lease claim increments the durable per-Job Fencing Generation. A stale generation cannot checkpoint, renew, fail, or complete a Job even when an old token is retained. The generation check is applied together with scope, owner, token, status, and expiry validation.

[Leases](leases.md) define ownership and expiry. [Checkpoint Recovery](checkpoint-recovery.md) and the [Page Job State Machine](../workflow/job-state-machine.md) rely on fencing to keep interrupted, resumed, and completed histories ordered and protected.

