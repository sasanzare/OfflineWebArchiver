# Queue Concurrency

## Lease/recovery extension

Independent-connection tests now race active Lease acquisition, stale-generation writes, and recovery operations. SQLite unique indexes and `BEGIN IMMEDIATE` ensure one active Lease and one active Project/Run recovery operation; idempotent cursor Resume prevents double transitions after a crash.

Queue mutation transactions use SQLite WAL, foreign keys, `synchronous=FULL`, a 5-second busy timeout, and `BEGIN IMMEDIATE`. Correctness does not depend on an application mutex. Database uniqueness protects logical identity and discovery keys; guarded state updates protect claims; unique claim tokens and `(job_id, attempt_number)` protect ownership and attempt order.

Real Worker Thread tests open separate SQLite connections and race identical enqueue, alternate duplicate discovery, claim-next, completion, failure, complete/fail, retry-release/claim, and statistics reads. Verified invariants are one logical Job, one active claim, one terminal result, one transition per edge, consecutive attempts, idempotent replay, and `PRAGMA integrity_check = ok`.

Transactions are deliberately short and contain no network or browser work. Reads are bounded. A Project close ends its owned connection and lock; separately started SQLite operations finish on their own connection, and reopening verifies the durable ledger. Cross-process lock contention and long-running transactions remain monitored risks.

Claims do not expire. If a process crashes after claim, the Job stays `processing`; Product Phase 7 must introduce Lease/Heartbeat semantics without permitting a stale owner to commit.
