# ADR-029: Attempt and Retry Foundation

## Status

Accepted — 2026-07-31.

## Context

Retries must remain durable and count only actual processing attempts without introducing network policy or crash recovery.

## Decision

Increment on successful claim, persist attempts `1..100`, move retryable failures with remaining attempts to `retrying`, persist `nextEligibleAt`, and release due retries deterministically to pending. Exhausted/non-retryable failures are terminal.

## Alternatives

Increment on enqueue/failure, in-memory timers, automatic due claims, HTTP backoff, and unlimited attempts were rejected.

## Consequences

Retry survives restart, but processing claims never expire in Phase 6.

## Security Impact

Failure messages are sanitized; no target response bodies, headers, or secrets are stored.

## Reliability Impact

Consecutive attempt numbers and maximum enforcement prevent retry-count drift.

## Concurrency Impact

Unique attempt numbers and release/claim transactions handle races.

## Persistence Impact

Attempt outcomes, safe errors, retry time, and transitions are durable.

## Migration Impact

Migration 004 adds attempt/retry fields and indexes without recovery fields.

## Testing Impact

Retryable, terminal, exhausted, premature/due release, reopen, and release/claim race tests are required.

## Related Requirements

FR-QUEUE-003.

## Related Acceptance Criteria

AC-P06-016; AC-P06-024..028; AC-QUEUE-003.

## Related Risks

R-064; R-065; R-015.

## Related Open Decisions

OD-042.

## Related OKF Domains

queue; reliability; checkpoint-recovery.
