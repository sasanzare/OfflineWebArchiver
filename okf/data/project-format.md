---
type: Data Model
title: Project Format
description: Defines the portable Project layout, versioning rules, and artifact path constraints.
tags: [data, project-format, portability]
status: stable
sources:
  - id: project-format-docs
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/docs/architecture/PROJECT_FORMAT.md
    title: Project format architecture authority
  - id: project-format-source
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/packages/project-format/src/index.ts
    title: Project format production source
  - id: project-format-tests
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/tests/unit/project-format.test.ts
    title: Project format unit tests
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-PROJECT-001, FR-PROJECT-004, NFR-PORT-002]
  acceptance_ids: [AC-PROJECT-001, AC-PROJECT-003, AC-P04-001, AC-P04-003]
  decision_ids: [OD-014]
  risk_ids: [R-013, R-031, R-045]
  evidence_ids: [OKF-EV-P04-FORMAT, OKF-EV-P04-TESTS]
  legacy_ids: [OKF-DOM-008]
---

# Project Format

Project format 1.1.0 remains compatible with 1.0.0 and provides a portable `profile/config.json` plus the declared `crawlQueue` feature. Queue, Lease, Checkpoint, Recovery, and Render rows live in SQLite schema 6. Final HTML and optional PNG artifacts use fixed Project-relative paths.

All persisted internal paths are portable relative paths. Host paths, tokens, and secrets are not Queue fields, and Browser resources never enter Project data. Auth and proxy roots remain future capability only. The format is implemented by the [Database](database.md) and [Persistence](persistence.md) layers and consumed by the [Queue](../workflow/queue.md).

