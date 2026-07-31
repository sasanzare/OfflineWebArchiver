# ADR-028: Queue Idempotency Strategy

## Status

Accepted — 2026-07-31.

## Context

Transport/process retries must not duplicate claims, attempts, transitions, completion effects, or administrative actions.

## Decision

Persist operation type, Project/Run, bounded idempotency key, canonical business-request hash, and first result. Exclude operation/correlation metadata from hashing. Same key/request replays; same key/different business request conflicts. Completion additionally compares completion key, result, and original claim token. Batch derives stable item keys.

## Alternatives

Correlation IDs, in-memory caches, completion keys alone, and silent last-write-wins were rejected.

## Consequences

Retries survive restart; Project-lifetime records grow until a later retention policy.

## Security Impact

Keys are validated; request/result data is bounded and redacted; conflicts reveal no raw payload.

## Reliability Impact

No repeated transition or attempt finalization occurs for a replay.

## Concurrency Impact

The unique operation key and immediate transaction serialize competing retries.

## Persistence Impact

`queue_operations` is retained and never cleared by queue maintenance.

## Migration Impact

Migration 004 adds the operation ledger and time index.

## Testing Impact

Restart, changed correlation, conflict, repeated completion/failure, and multi-connection races are required.

## Related Requirements

FR-QUEUE-002; FR-QUEUE-003.

## Related Acceptance Criteria

AC-QUEUE-002; AC-P06-021..023; AC-P06-035.

## Related Risks

R-059; R-063.

## Related Open Decisions

OD-041.

## Related OKF Domains

queue; persistence; contracts.
