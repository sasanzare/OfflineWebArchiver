---
type: Recovery Procedure
title: Checkpoint Recovery
description: Defines bounded inspection, confirmation, resume, and partial-file decisions from durable checkpoints.
tags: [recovery, checkpoints, resume, partial-files]
status: stable
sources:
  - id: recovery-source
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/packages/recovery/src/index.ts
    title: Recovery model source
  - id: recovery-persistence-source
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/packages/persistence-sqlite/src/recovery.ts
    title: Checkpoint recovery persistence source
  - id: recovery-process-kill-tests
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/tests/process-kill/recovery-process-kill.test.ts
    title: Recovery process-kill tests
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-RECOVERY-001, NFR-REL-001]
  acceptance_ids: [AC-P07-010, AC-P07-035]
  decision_ids: [OD-051, OD-052, OD-053, OD-054]
  risk_ids: [R-065, R-073, R-074]
  evidence_ids: [OKF-EV-P07-DOMAIN, OKF-EV-P07-PERSISTENCE, OKF-EV-P07-LIFECYCLE, OKF-EV-P07-PROCESS-KILL]
  legacy_ids: [OKF-DOM-046]
---

# Checkpoint Recovery

Recovery model 1 provides inspect-only Project open, explicit confirmed and idempotent apply, bounded batches of 100 by default and 500 maximum, durable cursor and report Resume, interrupted attempt history, and safe requeue. Completed outputs are checked by size and SHA-256 before recovery classifies a result.

Recovery uses the [Leases](leases.md) and [Fencing](fencing.md) protections and preserves the [Page Job State Machine](../workflow/job-state-machine.md) history. Evidence is recorded by `packages/persistence-sqlite/src/recovery.ts` and the recovery and process-kill test suites. Browser lifecycle and rendering consume these rules through the [Rendering](../workflow/rendering.md) workflow.

