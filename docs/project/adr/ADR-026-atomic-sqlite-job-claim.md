# ADR-026: Atomic SQLite Job Claim

## Status

Accepted — 2026-07-31.

## Context

Two local callers must not claim the same due Job, and stale callers must not complete work they do not own.

## Decision

Within `BEGIN IMMEDIATE`, select the deterministic next pending Job, update it with a UUID claim token and claimed-by label under `state='pending'`, increment attempt count, insert the attempt and transition, then commit. Completion/failure/owned terminal actions require that token.

## Alternatives

Application mutexes, select-then-update outside a transaction, expiring Phase 6 claims, and PID ownership were rejected.

## Consequences

One claim succeeds; no Phase 6 mechanism releases a crashed processing owner.

## Security Impact

Opaque claim tokens fence ordinary stale or unrelated callers and are never logged.

## Reliability Impact

Attempt creation and claim state commit together.

## Concurrency Impact

Separate-connection races verify one claim and one active attempt.

## Persistence Impact

Claim time/by/token and attempt history survive close/reopen.

## Migration Impact

Claim/attempt columns, checks, unique tokens, and claim-order index are added in migration 004.

## Testing Impact

Concurrent claims, invalid tokens, completion/failure races, and attempt uniqueness are gates.

## Related Requirements

FR-QUEUE-003.

## Related Acceptance Criteria

AC-QUEUE-003; AC-P06-017..020.

## Related Risks

R-058; R-065; R-015.

## Related Open Decisions

OD-039.

## Related OKF Domains

queue; database; security; checkpoint-recovery.
