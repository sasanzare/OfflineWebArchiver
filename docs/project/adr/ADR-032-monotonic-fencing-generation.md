# ADR-032: Monotonic Fencing Generation

## Status

Accepted — 2026-08-01.

## Context

An expired owner may retain an old token and race a newer owner.

## Decision

Increment a durable Job Fencing Generation on every Lease claim and require the current generation, owner, token, scope, active status, and non-expiry on protected writes.

## Alternatives

Token-only fencing, wall-clock ordering, and owner-name comparison were rejected.

## Consequences

Old owners fail closed even after recovery and re-claim.

## Security Impact

Stolen stale tokens cannot authorize current writes.

## Portability Impact

The integer generation is platform-neutral.

## Reliability Impact

Ownership ordering does not depend on clock precision.

## Concurrency Impact

Generation validation occurs in the same transaction as the write.

## Persistence Impact

Generation is stored on Page Jobs, Leases, and owner-controlled Checkpoints.

## Migration Impact

Migration 005 adds `fencing_generation` additively.

## Testing Impact

Stale completion, failure, Checkpoint, and renewal attempts must be rejected.

## Related Requirements

NFR-REL-001; NFR-SEC-004.

## Related Acceptance Criteria

AC-P07-005; AC-P07-009; AC-P07-034.

## Related Risks

R-069; R-070.

## Related Open Decisions

OD-048.

## Related OKF Domains

fencing; leases; job-state-machine.
