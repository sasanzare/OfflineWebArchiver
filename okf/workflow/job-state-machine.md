---
type: Workflow
title: Page Job State Machine
description: Defines persistent Page Job states, transitions, attempts, and recovery outcomes.
tags: [workflow, queue, state-machine, recovery]
status: stable
sources:
  - id: queue-domain-source
    resource: packages/queue/src/index.ts
    title: Queue state-machine source
  - id: queue-tests
    resource: tests/unit/queue.test.ts
    title: Queue state-machine tests
  - id: recovery-tests
    resource: tests/unit/recovery.test.ts
    title: Recovery transition tests
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-QUEUE-003, FR-RECOVERY-001]
  acceptance_ids: [AC-P06-014, AC-P06-028, AC-P07-015, AC-P07-024]
  decision_ids: [OD-038, OD-039, OD-042, OD-054, OD-055]
  risk_ids: [R-057, R-058, R-059, R-064, R-065, R-069, R-078]
  evidence_ids: [OKF-EV-P06-DOMAIN, OKF-EV-P06-TESTS, OKF-EV-P07-LIFECYCLE]
  legacy_ids: [OKF-DOM-045]
---

# Page Job State Machine

The queue state machine includes `pending`, `processing`, `completed`, `failed`, `retrying`, `skipped`, and `blocked`. Completed, failed, skipped, and blocked are terminal states. Attempts increment only on a committed claim, and the active attempt is finalized by completion or failure.

Recovery adds `processing` to `interrupted` and `paused`, `interrupted` to `pending`, `failed`, or `blocked`, and `paused` to `pending`. Abandoned attempts close as interrupted, pause acknowledgement closes as paused, and Resume retains history while the next claim increments Fencing Generation. The [Queue](queue.md), [Leases](../recovery/leases.md), and [Checkpoint Recovery](../recovery/checkpoint-recovery.md) Concepts provide the surrounding persistence and safety rules.

