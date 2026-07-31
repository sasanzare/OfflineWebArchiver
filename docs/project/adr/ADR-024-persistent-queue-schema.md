# ADR-024: Persistent Queue Schema

## Status

Accepted — 2026-07-31.

## Context

Page Jobs, attempts, state history, discovery provenance, Scope Decisions, and idempotency must survive restart atomically.

## Decision

SQLite schema 4 uses six normalized tables: `scope_decisions`, `page_jobs`, `job_attempts`, `job_transitions`, `job_discoveries`, and `queue_operations`, with foreign keys, checks, unique rules, insertion sequences, and claim/retry/state indexes.

## Alternatives

In-memory queues, one JSON payload table, filesystem work items, and premature Lease/Checkpoint tables were rejected.

## Consequences

The ledger is queryable and auditable but grows until a later retention decision.

## Security Impact

Parameterized SQL and scoped foreign keys prevent SQL injection and cross-run Scope linkage; only redacted values persist.

## Reliability Impact

Transactions, checksums, backup-before-migration, and integrity checks fail closed.

## Concurrency Impact

WAL, busy timeout, short immediate transactions, and database constraints coordinate callers.

## Persistence Impact

Queue history is durable and clear-pending performs no deletion.

## Migration Impact

Forward-only `004_add_persistent_page_queue` is additive; migrations 001–003 are immutable.

## Testing Impact

Tables, indexes, constraints, rollback, backup, compatibility, and integrity are directly tested.

## Related Requirements

FR-QUEUE-001..003; FR-PROJECT-003.

## Related Acceptance Criteria

AC-QUEUE-001; AC-QUEUE-003; AC-P06-001..002; AC-P06-031..034.

## Related Risks

R-012; R-014; R-062; R-063.

## Related Open Decisions

OD-037; OD-023.

## Related OKF Domains

queue; database; migration; persistence.
