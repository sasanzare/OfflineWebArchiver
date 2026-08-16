---
type: Recovery Procedure
title: Partial File Recovery
description: Defines the safe policy for resuming, restarting, discarding, and completing partial files.
tags: [recovery, files, range-requests, downloads]
status: stable
sources:
  - id: partial-file-evidence
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/tests/integration/partial-file-recovery.test.ts
    title: Partial file recovery tests
owa:
  implementation_status: implemented
  verification_status: verified
  evidence_ids: [OKF-EV-P07-RANGE, OKF-EV-P17-DOMAIN, OKF-EV-P17-TESTS]
---

# Partial File Recovery

The recovery policy deterministically selects resume, restart, discard, or
complete for partial artifacts. Product Phase 17 applies it to explicit Asset
descriptors with durable SQLite progress, validator checks, scheduler-bound
network requests, and a final SHA-256/size verification pass.

The deterministic in-memory fixtures verify interruption and HTTP `206`
resume. Production adapter wiring, retention, remote target policy, and scale
remain separate gates. The policy preserves the [Artifact Checkpoints](artifact-checkpoints.md)
integrity boundary.
