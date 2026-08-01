# Migration Knowledge

**Status:** VERIFIED through migration 006/schema 6.

Migration `006_add_browser_rendering_engine` is additive and creates only Render ledgers/indexes. Applied migrations 001–005 remain immutable and checksum-validated. Supported older Projects use the existing verified backup-before-migration, `BEGIN IMMEDIATE`, rollback, integrity, and compatibility flow.

Authority is `docs/architecture/MIGRATION_STRATEGY.md`, the migration source, validator, and lifecycle tests.
