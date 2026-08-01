# ADR-040: Clock Abstraction

## Status

Accepted — 2026-08-01.

## Context

Lease and multi-day recovery boundaries must be deterministic and timezone independent.

## Decision

Recovery policy receives a `Clock` that returns strict UTC timestamps. Production uses system time; tests use a controllable fake. Persist expiry instants and compare `now >= expiresAt`; never infer duration from heartbeat count.

## Alternatives

Direct `Date.now()` throughout repositories, local time, and sleeps in tests were rejected.

## Consequences

Time policy is testable; distributed clock synchronization remains a future deployment concern.

## Security Impact

Malformed/non-UTC input fails validation.

## Portability Impact

UTC ISO timestamps behave consistently across supported OSes.

## Reliability Impact

5-minute, 6-hour, 24-hour, 3-day, and 14-day horizons run without waiting.

## Concurrency Impact

Transactions evaluate one injected instant per operation.

## Persistence Impact

UTC timestamps remain the canonical durable time representation.

## Migration Impact

No platform-specific migration is needed; migration 005 adds relevant timestamp columns.

## Testing Impact

Exact-boundary and multi-day fake-clock suites are mandatory.

## Related Requirements

NFR-REL-001; NFR-TEST-001; NFR-PORT-002.

## Related Acceptance Criteria

AC-P07-008; AC-P07-027.

## Related Risks

R-071; R-072; R-089.

## Related Open Decisions

OD-049; OD-050; OD-065.

## Related OKF Domains

heartbeats; checkpoint-recovery; testing.
