---
type: Recovery Procedure
title: Partial File Recovery
description: Defines the safe policy for resuming, restarting, discarding, and completing partial files.
tags: [recovery, files, range-requests, downloads]
status: stable
sources:
  - id: partial-files-legacy-knowledge
    resource: okf/knowledge/partial-files/README.md
    title: Legacy Partial Files knowledge
  - id: partial-file-evidence
    resource: tests/integration/partial-file-recovery.test.ts
    title: Partial file recovery tests
owa:
  implementation_status: partial
  verification_status: partial
  evidence_ids: [OKF-EV-P07-RANGE]
  legacy_paths: [okf/knowledge/partial-files/README.md]
---

# Partial File Recovery

The recovery policy deterministically selects resume, restart, discard, or complete for partial artifacts. It is verified against a local HTTP Range and no-Range fixture.

Production Asset Downloader integration, retention, remote policy, and scale remain planned. The policy preserves the [Artifact Checkpoints](artifact-checkpoints.md) integrity boundary.
