# Job Attempts and Retry Foundation

`attemptCount` starts at zero. A successful guarded `pending -> processing` claim increments it and inserts exactly one attempt with a unique claim token. Failed or empty claims do not increment. `maxAttempts` is `1..100`; Desktop/CLI controlled enqueue defaults to `3`.

Completion finalizes the active attempt as `completed`. Failure sanitizes its message and finalizes the attempt as `retrying` when `retryable` and attempts remain, otherwise `failed`. Retry scheduling persists `nextEligibleAt`; due release moves `retrying -> pending` without changing the attempt count. The next successful claim creates the next consecutive attempt number.

There is no in-memory retry timer. A closed/reopened process observes the stored retry time. Product Phase 6 intentionally excludes HTTP `Retry-After`, exponential network backoff, Origin throttling, retry storms control, Lease timeouts, stale-processing recovery, and automatic Resume. Product Phase 7 owns abandoned processing recovery; later network phases own HTTP policy.
