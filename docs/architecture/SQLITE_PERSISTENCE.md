# SQLite Persistence

## Product Phase 8 Render persistence

Schema 6 adds immutable Render Result/Event/Failure ledgers linked to existing Jobs, attempts, and Leases. Every write validates Project/Run/Job, owner/token, non-expired active Lease, and current Fencing Generation. Artifact bytes are atomically written before one `BEGIN IMMEDIATE` result transaction updates output descriptors, Job, attempt, transition, Lease, and event. Operation/result uniqueness supports replay without duplicate results.

## Schema 5 recovery ledger

Migration 005 adds Run control, Job Leases, Job/Run/Artifact Checkpoints, completed outputs, recovery operations/events, execution sessions, and additive recovery/fencing fields. Immediate transactions, foreign keys, unique active ownership, idempotency hashes, indexes, WAL/full-sync, integrity checks, and backup-before-migration remain authoritative.

SQLite schema 6 extends the schema 5 Project/Profile/Queue/Recovery foundation with Render Result, Event, and Failure ledgers. Migration `006_add_browser_rendering_engine` is forward-only and leaves migrations 001–005 unchanged.

`@offline-web-archive/persistence-sqlite` implements Project, Profile, Queue, Recovery, and Render repositories. Application Service orchestrates it; Desktop and CLI use only contract 1.5.0. Archive Core, Recovery/Queue/Rendering pure policy, Scope Engine, and Project Format remain free of SQLite/Electron imports.

The adapter uses Node 24 `node:sqlite`, extensions disabled, defensive mode, `foreign_keys=ON`, `journal_mode=WAL`, `synchronous=FULL`, `busy_timeout=5000`, and `trusted_schema=OFF`. Validation connections add `query_only=ON`; close checkpoints WAL; backup/export use the SQLite backup API.

## Queue integrity

- `page_jobs` stores Project/Run/Profile/revision/engine/identity ownership, closed state vocabulary, bounded priority/attempt/depth fields, durable eligibility/order sequence, claim data, redacted failure data, and bounded result summaries.
- A database unique constraint on Project, Run, Profile revision, normalization engine, identity hash, and Job type is the final duplicate-enqueue authority.
- Composite ownership foreign keys prevent a Scope decision, Job, attempt, transition, discovery, or operation from crossing Project/Run identity.
- `job_attempts` has unique attempt numbers per Job and retains token/outcome/times.
- `job_transitions` and `job_discoveries` use monotonic insertion sequences for deterministic histories.
- `queue_operations` stores Project-scoped command/key, canonical business request hash, and safe committed result for idempotent replay/conflict detection.
- Eligibility/order/state/operation/discovery indexes support bounded Queue queries and statistics.

Enqueue, claim, completion, failure, retry schedule/release, skip, block, and clear-pending mutations use short `BEGIN IMMEDIATE` transactions. Claim selects one due `pending` Job in total order, performs a guarded update, assigns a UUID token, increments the attempt, and records attempt/transition atomically. Database uniqueness resolves concurrent duplicates without an unprotected select/insert assumption.

Queue, Recovery, and Render ledgers survive close/reopen and bounded export/import snapshots. Clearing pending work writes terminal `skipped` transitions and never deletes Jobs or histories. Schema 6 has Render result/event/failure tables, but no Link Discovery, production Asset, Proxy, Authentication/Session, or API-capture table.
