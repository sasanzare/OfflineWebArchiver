# SQLite Concurrency Stress Plan

The current repositories use `BEGIN IMMEDIATE`, WAL, `synchronous=FULL`, a
busy timeout, idempotency rows, Lease tokens, and fencing generations. Phase 13
records the stress contract for the future Worker Pool:

1. start several workers against one Project and verify one claim per Job;
2. race completion, failure, retry release, and cancellation;
3. inject a crash before and after each worker commit;
4. force busy/lock contention and verify bounded retry behavior;
5. reopen and validate Queue, Lease, run state, checkpoints, asset descriptors,
   and terminal output consistency;
6. verify duplicate operation IDs replay one durable result and stale fencing
   cannot mutate a newer owner.

The existing SQLite concurrency suite covers the current Queue/Lease ledgers.
The full Worker Pool stress suite is deferred until the Worker Pool exists.

