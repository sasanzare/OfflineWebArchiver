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
  implementation_status: partial
  verification_status: partial
  evidence_ids: [OKF-EV-P07-RANGE]
---

# Partial File Recovery

The recovery policy deterministically selects resume, restart, discard, or complete for partial artifacts. It is verified against a local HTTP Range and no-Range fixture.

Production Asset Downloader integration, retention, remote policy, and scale remain planned. The policy preserves the [Artifact Checkpoints](artifact-checkpoints.md) integrity boundary.
