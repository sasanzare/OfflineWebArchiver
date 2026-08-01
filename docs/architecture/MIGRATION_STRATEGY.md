# Migration Strategy

## Migration 005

`005_add_checkpoint_lease_recovery` is forward-only and additive. It does not edit migrations 001–004, backfills Run control for existing Runs, and new Run creation inserts control explicitly. Tests cover schema 4→5, schema 1→5, rollback/integrity, exact migration IDs, and final schema assertions.

Current SQLite schema is 4. Additive immutable migration `004_add_persistent_page_queue` creates normalized Scope Decision, Page Job, attempt, transition, discovery, and Queue operation tables plus supporting constraints/indexes. Applied migrations 001–003 are unchanged. Opening any supported older schema creates a verified SQLite backup before advancing.

SQLite migrations are forward-only, ordered, and immutable:

1. `001_initialize_project_schema` creates migration history, metadata, Revision, and Run tables.
2. `002_add_project_events` adds the lifecycle event ledger and its index.
3. `003_add_site_profiles` adds current/immutable Profile revisions, normalized scope rules, and a revision index.
4. `004_add_persistent_page_queue` adds the durable Page Job Queue and history/idempotency ledgers without Lease, Heartbeat, or Checkpoint tables.

Each definition has a stable ID, contiguous sequence, SQL text, and computed SHA-256. The database stores ID/sequence/checksum, applied UTC time, application version, and elapsed milliseconds. Startup rejects unknown, duplicated, reordered, missing, or checksum-modified history and rejects a `PRAGMA user_version` mismatch.

Open first validates without mutation and acquires the Project writer lock. If migrations are pending, it creates a SQLite API backup plus checksum metadata under `database/backups/`, then runs each migration in `BEGIN IMMEDIATE`. Failure rolls back that migration, preserves the prior manifest and backup, closes the connection, and releases the lock. Manifest and metadata schema versions are changed only after all migrations succeed. No downgrade or destructive best-effort repair exists.

Migration logs contain IDs, sequences, versions, duration, and status—not SQL data, Project paths, or secrets. Backup retention/restore UX remains open for Product Phase 17.

Tests cover definition validation, recorded checksum alteration, unknown/mismatched state, injected failure rollback, real legacy upgrades through schema 5, backup presence/metadata, Queue/Lease/Checkpoint/Recovery tables/indexes/constraints, preserved migrations 001–004, and post-upgrade integrity.
