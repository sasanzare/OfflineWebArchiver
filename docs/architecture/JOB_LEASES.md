# Job Leases

Product Phase 7 replaces non-expiring worker ownership with a Project/Run/Job-scoped Lease. An atomic claim moves one eligible Job to `processing`, starts its attempt, creates one active Lease, returns the owner credential, and increments the Job's monotonic Fencing Generation. `job_leases` stores the SHA-256 verification digest. The Phase 6 `page_jobs`, `job_attempts`, and claim-idempotency ledgers retain the active credential so an identical claim can replay after restart; the Project database is sensitive until a future encryption/sealing design replaces that compatibility path.

At most one active Lease exists per Job. Completion, failure, Checkpoint, Artifact Checkpoint, Heartbeat, renewal, and release require the same Project, Run, Job, owner, token, and Fencing Generation. Expiration is inclusive: `now >= expiresAt`. The default duration is 60 seconds, accepted values are 5 seconds through 24 hours, and an expired or released Lease cannot be revived.

Heartbeat records liveness but never changes `expiresAt`; renewal validates current ownership and sets expiry from renewal time. Lease Token values are sensitive capability data. The owner claim result and protected mutation inputs carry the token; logs, ordinary Lease/list/report output, CLI human/JSON display, and Desktop display do not expose it.

See [Heartbeats and fencing](HEARTBEATS_AND_FENCING.md), [Recovery concurrency](RECOVERY_CONCURRENCY.md), and ADR-031 through ADR-033.
