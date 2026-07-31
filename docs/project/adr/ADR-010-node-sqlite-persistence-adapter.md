# ADR-010 — Node SQLite Persistence Adapter

## Status

Accepted on 2026-07-31.

## Context

OD-013 requires production SQLite with transactions, backup, integrity checks, Electron compatibility, secure configuration, maintenance viability, and no user-installed runtime.

## Decision

Use Node 24 `node:sqlite` `DatabaseSync` in the Node-only `persistence-sqlite` adapter. Electron 43 embeds Node 24.17 and the real Electron smoke exercises the adapter. This avoids a separately packaged native addon and ABI rebuild pipeline. Connections disable extensions, enable defensive mode, set `foreign_keys=ON`, `journal_mode=WAL`, `synchronous=FULL`, `busy_timeout=5000`, and `trusted_schema=OFF`. Read validation connections also set `query_only=ON`.

The database is `database/crawl.db`. Archive Core owns transport-neutral types and the storage port; it imports no SQLite, Node, path, ZIP, Electron, or CLI module.

## Consequences

The adapter is synchronous and belongs outside the renderer. Large future workloads may require a utility process, but Phase 4 operations are bounded and measured through actual CLI/Electron processes.

## Alternatives

`better-sqlite3`, `sqlite3`, WASM SQLite, and a separate local database service were considered. Native addons add Electron rebuild/ABI and packaging work; WASM complicates filesystem/durability/backup; a service adds an unjustified process and transport boundary.

## Security Impact

Extension loading is permanently disabled, defensive/trusted-schema settings reduce schema abuse, prepared statements carry data, and the renderer has no database access.

## Portability Impact

The SQLite file format is portable. Product packaging must keep an Electron/Node line that contains the required `node:sqlite` backup and defensive APIs.

## Testing Impact

Real SQLite integration covers schema, foreign keys, integrity, migrations, corruption, identity, backup, CLI, and Electron.

## Migration Impact

Changing adapter/library requires an ADR, package/ABI evidence, backup compatibility proof, and unchanged Core port semantics.

## Evidence

[Node 24 SQLite documentation](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html), [Electron 43 release](https://www.electronjs.org/blog/electron-43-0), `packages/persistence-sqlite`, and Electron smoke.

## Phase Impact

Resolves OD-013 for Product Phase 4. It does not introduce crawl queues or scheduler tables.

## Traceability

Requirements: FR-PROJECT-002..003, NFR-REL-002, NFR-MAINT-001. Acceptance: AC-PROJECT-002..005, AC-P04-005..008. Risks: R-012, R-013. Decision: OD-013.
