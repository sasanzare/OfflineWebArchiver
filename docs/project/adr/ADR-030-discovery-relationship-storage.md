# ADR-030: Discovery Relationship Storage

## Status

Accepted — 2026-07-31.

## Context

Logical deduplication must not erase alternate parent/provenance or depth improvements.

## Decision

Store immutable relationship rows with parent, child, safe source, type, source/result depth, Scope Decision, and time. Hash the relationship content for per-child idempotency. Set effective Job depth to the minimum discovered depth and retain every distinct history row.

## Alternatives

One parent column, no history for duplicates, last-depth-wins, and increasing effective depth were rejected.

## Consequences

Multiple parents and lower-depth rediscovery remain auditable; relationship storage grows.

## Security Impact

Only a redacted source URL is stored; Project/Run scoped Scope foreign keys prevent cross-owner linkage.

## Reliability Impact

Deduplication preserves provenance and never reopens a terminal Job.

## Concurrency Impact

The unique discovery key prevents duplicate rows under racing insertions.

## Persistence Impact

Insertion sequence provides deterministic relationship history.

## Migration Impact

Migration 004 adds discovery storage, composite references, and child/parent indexes.

## Testing Impact

Multiple parents, identical races, canonical/redirect types, lower/higher depths, and terminal rediscovery are required.

## Related Requirements

FR-QUEUE-001; FR-QUEUE-002.

## Related Acceptance Criteria

AC-QUEUE-002; AC-P06-011..014.

## Related Risks

R-056; R-062.

## Related Open Decisions

OD-043.

## Related OKF Domains

queue; scope-engine; persistence.
