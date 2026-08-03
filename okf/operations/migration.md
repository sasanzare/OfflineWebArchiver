---
type: Operational Runbook
title: Database Migration
description: Defines the additive SQLite migration process and its compatibility safeguards.
tags: [operations, migrations, sqlite, compatibility]
status: stable
sources:
  - id: migration-strategy
    resource: docs/architecture/MIGRATION_STRATEGY.md
    title: Migration strategy authority
stale_after: "2026-11-01"
owa:
  implementation_status: implemented
  verification_status: verified
  evidence_ids: [OKF-EV-P08-PERSISTENCE, OKF-EV-P04-TESTS]
---

# Database Migration

Migration `006_add_browser_rendering_engine` is additive and creates only Render ledgers and indexes. Applied migrations 001 through 005 remain immutable and checksum-validated.

Supported older Projects use the verified backup-before-migration, `BEGIN IMMEDIATE`, rollback, integrity, and compatibility flow. The [Project Format](../data/project-format.md) and [Database](../data/database.md) Concepts define the resulting data boundary.
