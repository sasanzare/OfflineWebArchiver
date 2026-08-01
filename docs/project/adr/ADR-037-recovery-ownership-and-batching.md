# ADR-037: Recovery Ownership and Batching

## Status

Accepted — 2026-08-01.

## Context

Recovery may race another recovery or crash while processing a large Project.

## Decision

Inspect first; require confirmation and idempotency for apply. Serialize with an active-operation constraint and immediate transactions. Persist request hash, owner operation, cursor, cumulative counters, and report. Default batch is 100, maximum 500; Project open only inspects.

## Alternatives

Automatic open mutation, unbounded one-shot repair, and in-memory recovery locks were rejected.

## Consequences

Recovery is explicit, resumable, bounded, and auditable.

## Security Impact

Reports omit tokens and operations remain Project/Run scoped.

## Portability Impact

No OS process probing is required.

## Reliability Impact

Committed batches resume after crashes without double transition.

## Concurrency Impact

Unique active operation plus transactional predicates serialize writers.

## Persistence Impact

Operation and event ledgers retain progress and reasons.

## Migration Impact

Migration 005 adds recovery tables/indexes.

## Testing Impact

Dry run, concurrency, operation crash, cursor resume, and project-open inspection are required.

## Related Requirements

NFR-REL-001; NFR-REL-002.

## Related Acceptance Criteria

AC-P07-010..012; AC-P07-026; AC-P07-034..035.

## Related Risks

R-073; R-074; R-086.

## Related Open Decisions

OD-051; OD-059.

## Related OKF Domains

checkpoint-recovery; recovery-operations; database.
