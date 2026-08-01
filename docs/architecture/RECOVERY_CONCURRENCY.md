# Recovery Concurrency

Lease claim, renewal, Checkpoint, pause acknowledgement, terminal write, and recovery batches use SQLite immediate transactions. A partial unique index permits only one active Lease per Job and another permits one active recovery operation per Project/Run. Ownership predicates include Project, Run, Job, owner, the active Lease token digest, active status, expiry, and current Fencing Generation; Phase 6 Queue predicates additionally verify their compatibility claim field.

Independent connections race in tests: only one claim wins, only the current generation can write, concurrent recovery does not double-transition, and a resumed recovery operation advances its persisted cursor. Project locking remains the outer single-writer user-process guard; SQLite constraints and fencing remain authoritative inside recovery flows.
