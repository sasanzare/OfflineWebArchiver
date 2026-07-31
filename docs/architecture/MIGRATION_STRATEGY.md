# Migration Strategy

SQLite migrations are forward-only, ordered, and immutable. Current schema version is 2:

1. `001_initialize_project_schema` creates migration history, metadata, Revision, and Run tables.
2. `002_add_project_events` adds the lifecycle event ledger and its index.

Each definition has a stable ID, contiguous sequence, SQL text, and computed SHA-256. The database stores ID/sequence/checksum, applied UTC time, application version, and elapsed milliseconds. Startup rejects unknown, duplicated, reordered, missing, or checksum-modified history and rejects a `PRAGMA user_version` mismatch.

Open first validates without mutation and acquires the Project writer lock. If migrations are pending, it creates a SQLite API backup plus checksum metadata under `database/backups/`, then runs each migration in `BEGIN IMMEDIATE`. Failure rolls back that migration, preserves the prior manifest and backup, closes the connection, and releases the lock. Manifest and metadata schema versions are changed only after all migrations succeed. No downgrade or destructive best-effort repair exists.

Migration logs contain IDs, sequences, versions, duration, and status—not SQL data, Project paths, or secrets. Backup retention/restore UX remains open for Product Phase 17.

Tests cover definition validation, recorded checksum alteration, unknown/mismatched state, injected failure rollback, real schema-1 upgrade, backup presence/metadata, and post-upgrade integrity.
