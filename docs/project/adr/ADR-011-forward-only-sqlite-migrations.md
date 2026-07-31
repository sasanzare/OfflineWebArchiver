# ADR-011 — Forward-Only SQLite Migrations and Backups

## Status

Accepted on 2026-07-31.

## Context

Project databases must evolve without silent schema drift, partial upgrades, or unsafe copies of an open WAL database.

## Decision

Use ordered forward-only migrations with stable three-digit IDs, hard-checked SHA-256 SQL checksums, an append-only `schema_migrations` history, application version, UTC application time, and duration. Each migration runs in `BEGIN IMMEDIATE` and rolls back on any failure. Unknown order, duplicate definition, modified applied checksum, user-version mismatch, or newer schema fails closed.

Before any pending migration on an existing schema, use the official SQLite backup API to create a database snapshot plus checksum metadata under `database/backups/`. A Project writer lock and SQLite immediate transaction prevent concurrent migration. No automatic downgrade exists.

## Consequences

Applied SQL is immutable. Corrections require a new migration. Backups consume space and are excluded from ordinary export. Backup retention and restore UX remain a Product Phase 17 decision.

## Alternatives

Editing applied SQL, ad-hoc startup DDL, raw copying of an open WAL file, down migrations, and an external migration framework were rejected for integrity or unnecessary dependency reasons.

## Security Impact

Checksums detect local history alteration. Backup metadata contains no host path or secret. Backups remain Project data and inherit local filesystem protections.

## Portability Impact

SQL uses SQLite STRICT tables and standard file backup output. Migration IDs and checksums are platform-independent.

## Testing Impact

Tests cover order/checksum rules, applied checksum drift, injected transactional failure/rollback, version-1 upgrade, pre-migration backup, integrity failure, and metadata mismatch.

## Migration Impact

Current schema is 2: `001_initialize_project_schema` and `002_add_project_events`. Only the five Phase 4 tables are present.

## Evidence

`packages/persistence-sqlite/src/migrations.ts`, `tests/unit/persistence-sqlite.test.ts`, `tests/integration/project-lifecycle.test.ts`, and `npm run migrations:validate`.

## Phase Impact

Resolves the migration mechanism in OD-013 and the pre-migration backup subset of OD-023. Queue migrations remain Product Phase 6.

## Traceability

Requirements: FR-PROJECT-003, NFR-REL-002. Acceptance: AC-PROJECT-004..005, AC-P04-009..013. Risks: R-012, R-013. Decisions: OD-013, OD-023.
