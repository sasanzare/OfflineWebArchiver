# SQLite Persistence

SQLite schema 4 extends the Project/Profile foundation with `scope_decisions`, `page_jobs`, `job_attempts`, `job_transitions`, `job_discoveries`, and `queue_operations`. Migration `004_add_persistent_page_queue` is forward-only and leaves migrations 001–003 unchanged.

`@offline-web-archive/persistence-sqlite` implements Project, Profile, and Queue ports. Application Service orchestrates it; Desktop and CLI use only contract 1.3.0. Archive Core, Queue pure policy, Scope Engine, and Project Format remain free of SQLite/Electron imports.

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

The queue survives close/reopen and bounded export/import snapshots. Clearing pending work writes terminal `skipped` transitions and never deletes Jobs or histories. There is no Lease, Heartbeat, Checkpoint, expiry, stale-processing repair, browser, Asset, proxy, authentication, API-capture, or crawler table in schema 4.
