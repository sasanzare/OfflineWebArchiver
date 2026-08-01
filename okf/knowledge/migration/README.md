# Migration Knowledge

The current final schema is 5. Migration 005 is additive, backfills `run_control`, preserves Phase 6 Queue evidence, runs under the existing backup/rollback/integrity strategy, and is validated from legacy and schema-4 Projects.

Product Phase 6 adds checksum-protected forward-only migration `004_add_persistent_page_queue`. Supported older schemas back up before upgrade; applied migrations 001–003 remain unchanged. Schema 4 contains no Product Phase 7 Lease/Heartbeat/Checkpoint table.

Verified migration authority is `docs/architecture/MIGRATION_STRATEGY.md`. Migrations are ordered, immutable, checksum-recorded, transactionally forward-only, and backed up with the SQLite backup API before pending work. Recovery retention/restore remains open.
