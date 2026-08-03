---
type: Data Model
title: Database
description: Defines SQLite schema progression, constraints, and durable identity rules.
tags: [data, sqlite, migrations, persistence]
status: stable
sources:
  - id: sqlite-authority
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/docs/architecture/SQLITE_PERSISTENCE.md
    title: SQLite persistence architecture authority
  - id: sqlite-source
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/packages/persistence-sqlite/src/index.ts
    title: SQLite persistence production source
  - id: render-schema-source
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/packages/persistence-sqlite/src/render.ts
    title: Render result persistence source
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-PROJECT-002, FR-PROJECT-003, NFR-REL-002]
  acceptance_ids: [AC-PROJECT-002, AC-PROJECT-004, AC-P04-005, AC-P04-007]
  decision_ids: [OD-013]
  risk_ids: [R-012, R-013]
  evidence_ids: [OKF-EV-P04-PERSISTENCE, OKF-EV-P08-PERSISTENCE]
  legacy_ids: [OKF-DOM-009]
---

# Database

SQLite schema 6 adds strict Render Result, Event, and Failure ledgers and indexes. Earlier schema history remains preserved: schema 5 covers Lease, Checkpoint, and Recovery; schema 4 covers Queue; schema 3 covers Profile; and schemas 1 and 2 cover Project history.

Constraints and repositories enforce Project, Run, Job, attempt, Lease identity, current fencing, bounded values and JSON, result uniqueness, and portable artifact descriptors. The [Project Format](project-format.md) and [Persistence](persistence.md) Concepts describe the data boundary; no Link Discovery, Asset, API, Proxy, or Session table exists.

