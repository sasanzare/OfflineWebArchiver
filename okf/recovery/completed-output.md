---
type: Recovery Procedure
title: Completed Output
description: Defines verification of terminal artifact descriptors without silently reopening completed Jobs.
tags: [recovery, output, artifacts, integrity]
status: stable
sources:
  - id: output-verification-evidence
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/tests/unit/recovery.test.ts
    title: Completed output verification tests
owa:
  implementation_status: implemented
  verification_status: verified
  evidence_ids: [OKF-EV-P07-OUTPUT]
---

# Completed Output

Completed-output descriptors use root-bounded, non-symlink relative paths, a size, and a SHA-256 digest. A valid terminal Job stays completed; missing or mismatched output is reported rather than silently reopened.

This verification complements [Render Results](../data/render-results.md) and the artifact ownership rules in [Artifact Checkpoints](artifact-checkpoints.md).
