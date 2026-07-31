# Queue

**Status:** VERIFIED through Product Phase 6  
**Versions:** Queue policy 1; SQLite schema 4; contract 1.3.0  
**Authority:** `packages/archive-core`, `packages/queue`, `packages/persistence-sqlite`, and `packages/application-service`

Product Phase 6 implements a persistent Page Job queue. The Core owns public models and the repository port; the Queue package owns pure transition, ordering, retry, idempotency, and result-validation policy; SQLite owns transactional storage; and Application Service owns orchestration. Desktop and CLI use only the transport-neutral contract.

Logical uniqueness is `(projectId, runId, profileRevision, normalizationEngineVersion, identityHash, jobType)`. The database unique constraint is authoritative. Equivalent rediscoveries return the existing Job while recording idempotent discovery provenance and lowering the Job's effective depth when appropriate.

Eligible Jobs use the deterministic order `priority DESC, nextEligibleAt ASC, depth ASC, queueSequence ASC, jobId ASC`. Priority policy version 1 defines `seed=1000`, `high=750`, `normal=500`, `low=250`, and `background=100`; all stored values are bounded to `0..1000`.

Mutations use short `BEGIN IMMEDIATE` SQLite transactions. Claims create a UUID token, increment `attemptCount`, insert the processing attempt and transition, and prevent a second connection from claiming the same Job. Completion and failure require the token. Operation and completion keys are persisted with canonical request hashes so identical retries return the committed result and conflicting retries fail.

The queue persists Jobs, attempts, transitions, discoveries, Scope Decision references, and idempotency operations. It exposes bounded list/history/statistics queries and test-only explicit pending clearing as audited `skipped` transitions; history is not deleted.

Lease expiration, Heartbeats, stale-processing recovery, Checkpoints, and Crash Recovery are `PLANNED` for Product Phase 7. A Product Phase 6 claim never expires automatically.

Evidence: `tests/integration/queue-lifecycle.test.ts`, `tests/integration/queue-security.test.ts`, `tests/concurrency/queue-concurrency.test.ts`, and `docs/project/PHASE_06_IMPLEMENTATION_REPORT.md`.
