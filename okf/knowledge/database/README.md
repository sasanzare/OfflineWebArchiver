# Database Knowledge

Product Phase 7 verifies SQLite schema 5 and forward migration `005_add_checkpoint_lease_recovery`: Run control, Leases, three Checkpoint ledgers, completed outputs, recovery operations/events, execution sessions, and recovery/fencing fields/indexes. Migrations 001–004 remain preserved.

SQLite schema 4 adds normalized Scope Decision, Page Job, attempt, transition, discovery, and operation-idempotency ledgers through immutable migration 004. Database constraints enforce logical Job uniqueness, closed states, bounded values, attempt uniqueness, and Project/Run ownership. Eligibility and ordered-history indexes support deterministic bounded queries.

Authority is `docs/architecture/SQLITE_PERSISTENCE.md` and `packages/persistence-sqlite`. Schema 3 Profile tables remain intact. Lease, Heartbeat, Checkpoint, content, Asset, auth, and proxy schemas remain planned.
