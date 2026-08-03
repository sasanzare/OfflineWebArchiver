---
type: Recovery Procedure
title: Pause and Resume
description: Defines cooperative pause acknowledgement, checkpointing, Lease release, and resumable requeueing.
tags: [recovery, pause, resume, leases]
status: stable
sources:
  - id: recovery-lifecycle-evidence
    resource: tests/integration/recovery-lifecycle.test.ts
    title: Recovery lifecycle tests
owa:
  implementation_status: implemented
  verification_status: verified
  evidence_ids: [OKF-EV-P07-LIFECYCLE]
---

# Pause and Resume

Pause is cooperative: a request is observed by the owner, the owner records a Checkpoint, acknowledgement occurs, and the Lease is released. Resume explicitly requeues paused work, and a fresh claim receives a higher generation.

Forced pause remains planned. [Run Control](run-control.md) defines the persistent control states, and [Fencing](fencing.md) protects the generation change.
