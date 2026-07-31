# Migration Knowledge

Verified migration authority is `docs/architecture/MIGRATION_STRATEGY.md`. Migrations are ordered, immutable, checksum-recorded, transactionally forward-only, and backed up with the SQLite backup API before pending work. Recovery retention/restore remains open.
