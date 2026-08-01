# Crash Recovery

Recovery model version 1 separates inspection from mutation. `recovery.inspect` is read-only and reports expired Leases, `processing` Jobs without active Leases, abandoned attempts, unclean execution sessions, and invalid completed outputs. Project open runs only this inspection and returns `clean`, `recovery-available`, `recovery-required`, or `recovery-blocked`; it never mutates Queue state automatically.

`recovery.recover` requires explicit confirmation plus an idempotency key. It executes in `BEGIN IMMEDIATE`, is Project/Run scoped, records a durable operation/report, and processes a bounded batch (default 100, maximum 500). A crashed operation resumes from its persisted cursor with the same request hash. Recoverable stale work transitions logically to `interrupted`, closes the abandoned attempt as interrupted, releases stale Lease ownership, and safely requeues to `pending` without erasing history.

Actual child-process `SIGKILL` tests cover crashes around claim, Checkpoint, recovery commit, completion descriptor commit, and unclean Project sessions. See [Recovery operations](RECOVERY_OPERATIONS.md).
