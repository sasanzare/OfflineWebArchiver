# ADR-025: Page Job State Machine

## Status

Accepted — 2026-07-31.

## Context

Ad-hoc status writes permit torn, invalid, or silently reopened work.

## Decision

State-machine version 1 allowlists seven states and ten edges. Completed, failed, skipped, and blocked are terminal. Every mutation validates the current state and persists a transition with reason, operation, correlation, and insertion order.

## Alternatives

Free-form states, implicit retry flags, silent administrative reopen, and Phase 7 recovery states were rejected.

## Consequences

All invalid pairs are explicit errors; terminal requeue requires a future reviewed command/policy.

## Security Impact

Claim-owned processing exits and stable reason codes prevent unauthorized state injection.

## Reliability Impact

Audit history and terminal invariants remain visible after restart.

## Concurrency Impact

Guarded updates and transactions prevent competing edges from both committing.

## Persistence Impact

State, timestamps, reason codes, and ordered transitions are stored separately.

## Migration Impact

Migration 004 adds state checks and transition storage; no Lease columns exist.

## Testing Impact

All 49 state pairs, valid workflows, invalid edges, and terminal races are tested.

## Related Requirements

FR-QUEUE-003.

## Related Acceptance Criteria

AC-QUEUE-003; AC-P06-019..030.

## Related Risks

R-057; R-059.

## Related Open Decisions

OD-038.

## Related OKF Domains

queue; application-service; testing.
