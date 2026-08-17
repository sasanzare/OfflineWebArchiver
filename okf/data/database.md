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
  verification_status: partial
  requirement_ids: [FR-PROJECT-002, FR-PROJECT-003, FR-AUTH-002, NFR-REL-002, NFR-SEC-002]
  acceptance_ids: [AC-PROJECT-002, AC-PROJECT-004, AC-P04-005, AC-P04-007, AC-P12-005, AC-P12-006, AC-P12-014]
  decision_ids: [OD-013]
  risk_ids: [R-012, R-013]
  evidence_ids: [OKF-EV-P04-PERSISTENCE, OKF-EV-P08-PERSISTENCE, OKF-EV-P10-TRACE]
  legacy_ids: [OKF-DOM-009]
---

# Database

SQLite schema 13 adds the Project-owned Asset source/content/relation through
forward-only migration `012_add_asset_downloader` and replay snapshots/events
through `013_add_network_replay`, alongside schema 11 scheduler state and the
schema 10 `proxies` metadata ledger. Migration 011 adds the Project/Run/Origin
cooldown ledger; earlier schema history remains
preserved: schema 6 covers Render Result, Event, and Failure; schema 5
covers Lease, Checkpoint, and Recovery; schema 4 covers Queue; schema 3 covers
Profile; and schemas 1 and 2 cover Project history.

Constraints and repositories enforce Project, Run, Job, attempt, Lease identity,
current fencing, bounded values and JSON, result/trace uniqueness, redacted
interaction data, portable artifact descriptors, Session Project ownership,
revision checks, Profile/format compatibility, and safe validation metadata. The
`browser_sessions` table stores no cookies, localStorage, IndexedDB, passwords,
tokens, or serialized Storage State; its `secret_ref` is an opaque Phase 11
reference. `run_state` is constrained to the versioned Crawl Run state
vocabulary and is separate from legacy pause-control fields. Migration
`009_add_crawl_run_state` is forward-only and defaults upgraded rows to
`running`; `010_add_proxies` adds no raw credential columns. Migration 012
stores Asset source identity, redacted URL metadata, validators, bounded
progress, fenced ownership, content-object identity, and many-to-many
Page↔Asset relations; it stores no credentials, response bodies, or cookies.
Replay metadata stores only selected safe request/response descriptors and
content hashes; response bytes remain content-addressed files under the Project
root and are verified before fulfillment. The [Project Format](project-format.md)
and [Persistence](persistence.md) Concepts describe the data boundary.
Discovery, rewriting, and worker orchestration remain separate concerns. Proxy
credential bytes remain in the Secret Store.
