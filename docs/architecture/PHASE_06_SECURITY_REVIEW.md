# Product Phase 6 Security Review

## Implemented controls

- Strict contract `1.3.0` validation, UUID/state/reason/key enums, URL `8193`, batch `250`, list/retry `200`, attempts `100`, priority `1000`, result metadata `4096` bytes/depth `4`, and sanitized message `400` limits.
- Product Phase 5 credential/sensitive query and fragment removal before persistence; Job logging uses IDs, hashes, counts, state, and safe messages, not raw URLs, tokens, cookies, headers, or claim tokens.
- Parameterized SQL, defensive SQLite, foreign keys, Project/Run/Profile/engine ownership checks, composite Scope references, atomic claims, claim-token completion/failure, and persistent idempotency conflict detection.
- Renderer sandbox, context isolation, disabled Node integration, sender/path authorization, two-method preload bridge, CSP, denied navigation/windows/permissions/downloads/webviews, bounded pagination, and no renderer SQL access.
- Adversarial tests cover sensitive URLs/messages, oversized metadata/batch/list, invalid state/Job/token, idempotency conflicts, cross-project/Run access, SQL-injection strings, and secret scan.

## Planned controls

Product Phase 7 will add authenticated logical Worker ownership, Leases, Heartbeats, expiration, stale-owner rejection, persistent Checkpoints, and crash/shutdown recovery. Later dispatch phases must repeat DNS/IP authorization immediately before connection.

## Deferred controls

Network headers/cookies/authentication, browser sandbox policy, proxy credentials, target content handling, output hashing, Asset validation, Origin backoff, and production packaging are deferred because their runtimes do not exist.

## Unknown controls

Retention periods for `queue_operations` and transition/discovery history, administrative terminal requeue authorization, multi-process writer deployment limits, priority aging, and large-Project statistics strategy require measured later decisions. Stale `processing` Jobs are a known open Phase 7 risk, not a solved control.
