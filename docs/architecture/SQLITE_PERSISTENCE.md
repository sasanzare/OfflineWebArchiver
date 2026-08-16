# SQLite Persistence

## Product Phase 8 Render and Phase 10 Interaction persistence

Schema 6 adds immutable Render Result/Event/Failure ledgers linked to existing Jobs, attempts, and Leases. Every write validates Project/Run/Job, owner/token, non-expired active Lease, and current Fencing Generation. Artifact bytes are atomically written before one `BEGIN IMMEDIATE` result transaction updates output descriptors, Job, attempt, transition, Lease, and event. Operation/result uniqueness supports replay without duplicate results.

Schema 7 adds `interaction_profiles` and `interaction_traces`. Profiles store a validated canonical JSON representation with a hash and revision identity; absence is treated as a disabled profile so older Projects preserve behavior. Traces are bounded, recursively redacted, schema-versioned, and linked to Project/Run/Job/profile/fencing identities. Trace writes use the same active Lease, token hash, expiry, and Fencing Generation checks as protected recovery/render writes, inside a short `BEGIN IMMEDIATE` transaction. Reusing an existing trace ID is idempotent only when the canonical content matches.

Schema 8 adds the Project-owned `browser_sessions` metadata ledger. Schema 9
adds the constrained `run_state` column to `run_control` and
`run_checkpoints`; Crawl Run lifecycle is therefore durable and independent of
legacy pause-control reasons. Migration `009_add_crawl_run_state` is additive,
forward-only, and defaults upgraded rows to `running`.

## Schema 5 recovery ledger

Migration 005 adds Run control, Job Leases, Job/Run/Artifact Checkpoints, completed outputs, recovery operations/events, execution sessions, and additive recovery/fencing fields. Immediate transactions, foreign keys, unique active ownership, idempotency hashes, indexes, WAL/full-sync, integrity checks, and backup-before-migration remain authoritative.

SQLite schema 9 extends the Project/Profile/Queue/Recovery/Render foundation
with Interaction, Session, and Crawl Run metadata ledgers. Migrations
`007_add_browser_interaction`, `008_add_browser_sessions`, and
`009_add_crawl_run_state` are forward-only and leave prior migrations unchanged.

`@offline-web-archive/persistence-sqlite` implements Project, Profile, Queue, Recovery, Render, Interaction, Session, Crawl Run, proxy, and scheduler-state metadata repositories. Application Service orchestrates it; Desktop and CLI use contract 1.11.0. Login Flow configuration is optional Profile JSON and contains only locator/policy descriptors; OTP and phone inputs have no SQLite schema or migration. Secret payloads remain outside SQLite in the dedicated Secret Store; only safe metadata/status crosses the service boundary. Archive Core, Recovery/Queue/Rendering/Interaction/Scheduler/Secret pure policy, Scope Engine, and Project Format remain free of SQLite/Electron imports.

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

Queue, Recovery, Render, and Interaction ledgers survive close/reopen and bounded export/import snapshots. Clearing pending work writes terminal `skipped` transitions and never deletes Jobs or histories. Schema 7 has Render and Interaction tables, but no Phase 9 Discovery, production Asset, or API-capture table.

## Schema 10 proxy metadata ledger

Migration `010_add_proxies` adds the Project-owned `proxies` table. It stores
canonical protocol/host/port identity, safe display/configuration metadata,
opaque `credential_ref`, enabled and health state, latency and success/failure
counters, cooldown time, bounded safe error code/summary, timestamps, and a
revision. A unique Project/protocol/host/port constraint prevents duplicate
identities. Username/password bytes are not columns and are never written to
SQLite. Proxy credential material remains in the dedicated Secret Store.

The `SqliteProjectStorage` adapter exposes proxy CRUD/import operations through
short transactions with Project ownership and revision checks. Existing
schema-9 Projects migrate forward without rewriting prior ledgers; the
manifest advertises proxy support at schema 10 and scheduler state at schema
11. Browser Runtime and Worker Pool use Core ports and do not read proxy or
scheduler tables directly.

## Schema 11 scheduler state ledger

Migration `011_add_scheduler_state` adds the Project/Run-scoped
`origin_rate_limits` table and a due-origin index. It stores a canonical Origin,
optional bounded cooldown timestamp, last HTTP status, and update timestamp.
It has no request headers, bodies, cookies, credentials, or proxy secret bytes.
The scheduler restores this state before dispatch and writes it with short
`BEGIN IMMEDIATE` transactions; a failed write is surfaced rather than
silently dropping a cooldown.
