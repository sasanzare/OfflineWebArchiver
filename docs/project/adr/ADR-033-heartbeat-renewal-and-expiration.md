# ADR-033: Heartbeat, Renewal, and Expiration

## Status

Accepted — 2026-08-01.

## Context

Liveness observation and ownership extension have different audit and failure semantics.

## Decision

Heartbeat records time without extending expiry. Explicit renewal sets expiry from renewal time. Default heartbeat interval is 15 seconds. Expiry is inclusive at `now >= expiresAt`, with no implicit grace period.

## Alternatives

Heartbeat-as-renewal, sliding expiry on all writes, and a hidden grace period were rejected.

## Consequences

Owners explicitly control lifetime and recovery has an exact boundary.

## Security Impact

Silent ownership extension is prevented.

## Portability Impact

All persisted times are UTC ISO strings.

## Reliability Impact

Heartbeat loss alone does not shorten an already-issued Lease.

## Concurrency Impact

Renewal revalidates ownership under an immediate transaction.

## Persistence Impact

Heartbeat and expiry are separate Lease columns.

## Migration Impact

Migration 005 creates both fields.

## Testing Impact

Fake-clock tests cover before/at/after expiry and renewal.

## Related Requirements

NFR-REL-001; NFR-TEST-001.

## Related Acceptance Criteria

AC-P07-006..009; AC-P07-027.

## Related Risks

R-067; R-068; R-071; R-072.

## Related Open Decisions

OD-044..050.

## Related OKF Domains

heartbeats; leases; testing.
