---
type: Recovery Procedure
title: Artifact Checkpoints
description: Defines portable artifact checkpoint data and the Lease-owned resume boundary.
tags: [recovery, checkpoints, artifacts, integrity]
status: stable
sources:
  - id: recovery-source
    resource: packages/recovery/src/index.ts
    title: Recovery policy source
owa:
  implementation_status: implemented
  verification_status: verified
  evidence_ids: [OKF-EV-P07-DOMAIN, OKF-EV-P07-LIFECYCLE]
---

# Artifact Checkpoints

Artifact checkpoints persist a root-bounded portable path, byte count, expected length, SHA-256, validator, resume offset, generation, and committed flag under current [Lease](leases.md) ownership.

The checkpoint is the recovery boundary for [Checkpoint Recovery](checkpoint-recovery.md) and never permits a stale owner to commit an artifact.
