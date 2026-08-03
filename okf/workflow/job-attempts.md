---
type: Workflow
title: Job Attempts
description: Defines when Job attempts advance and how interruption and pause retain attempt history.
tags: [workflow, queue, attempts, recovery]
status: stable
sources:
  - id: queue-lifecycle-evidence
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/tests/integration/queue-lifecycle.test.ts
    title: Queue lifecycle tests
owa:
  implementation_status: implemented
  verification_status: verified
  evidence_ids: [OKF-EV-P06-INTEGRATION, OKF-EV-P07-LIFECYCLE]
---

# Job Attempts

An attempt increments only when a Job is claimed. Crash recovery closes abandoned work as interrupted, and cooperative pause closes it as paused; neither outcome erases prior attempt history.

The [Queue](queue.md) preserves the durable history, while [Pause and Resume](../recovery/pause-resume.md) defines the cooperative control path.
