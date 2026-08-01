# ADR-034: Recovery State Transitions

## Status

Accepted — 2026-08-01.

## Context

Abandoned processing must remain auditable and must not be mistaken for ordinary retry.

## Decision

State-machine version 2 adds logical `interrupted` and `paused`. Recovery records processing-to-interrupted, closes the abandoned attempt, then safely requeues interrupted work to pending; history is retained in recovery-aware transition fields/events.

## Alternatives

Direct processing-to-pending mutation, deletion, and marking every crash failed were rejected.

## Consequences

Crash cause and safe requeue are visible without rebuilding Phase 6 history tables.

## Security Impact

All transitions enforce Project/Run ownership and bounded reason codes.

## Portability Impact

States are contract strings independent of OS.

## Reliability Impact

Recovery preserves attempt accounting and terminal states.

## Concurrency Impact

Transition and Lease release commit atomically.

## Persistence Impact

Migration 005 adds compatibility recovery-state/outcome columns and event rows.

## Migration Impact

Existing Jobs keep their Phase 6 state; no earlier migration changes.

## Testing Impact

Crash, safe requeue, history, and valid-completed preservation are required.

## Related Requirements

FR-QUEUE-003; NFR-REL-001.

## Related Acceptance Criteria

AC-P07-013..016; AC-P07-030.

## Related Risks

R-065; R-073; R-074.

## Related Open Decisions

OD-051; OD-054.

## Related OKF Domains

checkpoint-recovery; job-state-machine; job-attempts.
