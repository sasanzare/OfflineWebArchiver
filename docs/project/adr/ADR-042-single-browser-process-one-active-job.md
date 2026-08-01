# ADR-042: One Browser Runtime and One Active Job

## Status
Accepted — 2026-08-01.

## Context
Phase 8 needs process reuse without a premature Worker or Browser pool.

## Decision
One Application Service owns one reusable Browser Process and permits one active Page Job. Recycle after 100 Page sessions or 30 minutes. Allow at most three explicit/automatic restarts per five minutes.

## Alternatives
Process per Job, process per Project, and a Browser pool were rejected for this phase.

## Consequences
Throughput is intentionally serialized and predictable.

## Security Impact
Ownership is centralized and callers cannot inject process options.

## Reliability Impact
Health, disconnect, shutdown, restart, and recycling behavior are explicit.

## Concurrency Impact
Concurrent Page creation fails `BROWSER_BUSY`.

## Persistence Impact
Health is runtime state; durable Job outcomes remain in SQLite.

## Migration Impact
None.

## Testing Impact
Lifecycle tests cover busy denial, automatic recycle, explicit restart, limit accounting, close, and actual process kill.

## Portability Impact
Process discovery evidence is Windows-specific; lifecycle APIs are platform-neutral.

## Related Requirements
FR-RENDER-001, NFR-PERF-001, NFR-REL-001.

## Related Acceptance Criteria
AC-P08-003, AC-P08-004.

## Related Risks
R-092, R-093.

## Related Open Decisions
OD-068, OD-069.

## Related OKF Domains
OKF-DOM-012, OKF-DOM-013.
