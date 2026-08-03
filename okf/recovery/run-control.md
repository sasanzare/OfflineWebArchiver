---
type: Recovery Procedure
title: Run Control
description: Defines persistent Run control states and Project-scoped control snapshots.
tags: [recovery, runs, pause, state-machine]
status: stable
sources:
  - id: recovery-persistence-source
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/packages/persistence-sqlite/src/recovery.ts
    title: Recovery persistence source
owa:
  implementation_status: implemented
  verification_status: verified
  evidence_ids: [OKF-EV-P07-PERSISTENCE, OKF-EV-P07-LIFECYCLE]
---

# Run Control

Persistent Run states are `active`, `pause_requested`, `paused`, `resuming`, `recovering`, `stopped`, `completed`, and `failed`. Migration 005 backfills existing Runs; commands are scoped to a Project and Run, and Run Checkpoints retain control snapshots.

[Pause and Resume](pause-resume.md) defines the cooperative state transition behavior.
