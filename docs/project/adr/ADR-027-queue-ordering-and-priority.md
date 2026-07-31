# ADR-027: Queue Ordering and Priority

## Status

Accepted — 2026-07-31.

## Context

Repeatable claims and useful controlled testing require a portable total order.

## Decision

Priority policy version 1 uses bounded integer priorities and orders priority descending, due time ascending, depth ascending, queue sequence ascending, and UUID ordinal ascending. Rediscovery may lower depth but never recalculates priority.

## Alternatives

FIFO only, locale comparison, random order, mutable aging, and runtime load-based priority were rejected for Phase 6.

## Consequences

Ordering is deterministic; strict priority starvation remains an explicit monitored risk.

## Security Impact

Bounded explicit priority prevents oversized/unvalidated scheduling input.

## Reliability Impact

Stable tie-breakers reproduce selection across restart.

## Concurrency Impact

The claim index matches the total order used inside the transaction.

## Persistence Impact

Priority/source, due time, depth, and queue sequence persist.

## Migration Impact

Migration 004 adds queue sequence and matching claim/retry indexes.

## Testing Impact

Comparator, priority mapping, tie-breakers, restart, and claim-order tests are required.

## Related Requirements

FR-QUEUE-001; FR-QUEUE-003.

## Related Acceptance Criteria

AC-P06-015..016; AC-P06-018.

## Related Risks

R-061.

## Related Open Decisions

OD-040.

## Related OKF Domains

queue; testing.
