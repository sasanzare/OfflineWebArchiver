# SQLite Persistence

`@offline-web-archive/persistence-sqlite` implements the `ProjectStoragePort` owned by Archive Core. Application Service orchestrates it; Desktop and CLI use only contracts/service. Archive Core and Project Format remain free of SQLite, Electron, CLI, and Node filesystem imports.

The adapter uses Node 24 `node:sqlite`; Electron 43 supplies the same Node major. It opens `database/crawl.db` with extensions disabled and defensive mode enabled. Writer pragmas are:

| Pragma | Value | Reason |
|---|---|---|
| `foreign_keys` | `ON` | Enforce Revision/Run references |
| `journal_mode` | `WAL` | Consistent readers and durable writer recovery |
| `synchronous` | `FULL` | Favor Project integrity over write throughput in the foundation |
| `busy_timeout` | `5000` | Bounded contention handling, never indefinite wait |
| `trusted_schema` | `OFF` | Do not trust schema expressions to invoke unsafe application functions |

Validation connections add `query_only=ON`. Close checkpoints WAL with `TRUNCATE`; export and migration backups use the SQLite backup API, not a raw copy of an open database. A Project lock enforces the application single-writer rule.

Phase 4 schema owns exactly five tables:

- `schema_migrations`: immutable ordered migration ledger.
- `project_metadata`: one row that mirrors stable manifest identity/version facts.
- `project_revisions`: initial durable Revision identity and sequence.
- `runs`: initial durable Run identity and Revision reference.
- `project_events`: sanitized lifecycle/migration/export events.

No queue, page, asset, proxy, authentication, API-capture, worker, lease, or crawl table is allowed before its assigned phase. `npm run migrations:validate` checks this schema foundation.
