---
type: Data Model
title: Render Results
description: Defines durable Render result, event, failure, and artifact descriptor records.
tags: [data, rendering, artifacts, sqlite]
status: stable
sources:
  - id: render-results-legacy-knowledge
    resource: okf/knowledge/render-results/README.md
    title: Legacy Render Results knowledge
  - id: render-persistence-source
    resource: packages/persistence-sqlite/src/render.ts
    title: Render persistence source
  - id: render-fault-evidence
    resource: tests/integration/render-persistence-faults.test.ts
    title: Render persistence fault tests
owa:
  implementation_status: implemented
  verification_status: verified
  evidence_ids: [OKF-EV-P08-PERSISTENCE, OKF-EV-P08-FAULTS]
  legacy_paths: [okf/knowledge/render-results/README.md]
---

# Render Results

SQLite schema 6 adds Render Result, Event, and Failure ledgers. An artifact-first write followed by a fenced SQLite transaction commits portable HTML and optional PNG SHA-256 descriptors, terminal Queue state, attempt, transition, Lease release, and event as one protected result.

The [Rendering](../workflow/rendering.md) workflow produces these records. [Completed Output](../recovery/completed-output.md) verifies terminal artifacts without silently reopening a completed Job.
