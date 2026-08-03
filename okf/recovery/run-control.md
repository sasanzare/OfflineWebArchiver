---
type: Recovery Procedure
title: Run Control
description: Defines persistent Run control states and Project-scoped control snapshots.
tags: [recovery, runs, pause, state-machine]
status: stable
sources:
  - id: run-control-legacy-knowledge
    resource: okf/knowledge/run-control/README.md
    title: Legacy Run Control knowledge
  - id: recovery-persistence-source
    resource: packages/persistence-sqlite/src/recovery.ts
    title: Recovery persistence source
owa:
  implementation_status: implemented
  verification_status: verified
  evidence_ids: [OKF-EV-P07-PERSISTENCE, OKF-EV-P07-LIFECYCLE]
  legacy_paths: [okf/knowledge/run-control/README.md]
---

# Run Control

Persistent Run states are `active`, `pause_requested`, `paused`, `resuming`, `recovering`, `stopped`, `completed`, and `failed`. Migration 005 backfills existing Runs; commands are scoped to a Project and Run, and Run Checkpoints retain control snapshots.

[Pause and Resume](pause-resume.md) defines the cooperative state transition behavior.
