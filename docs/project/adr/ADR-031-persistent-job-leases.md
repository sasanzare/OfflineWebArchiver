# ADR-031: Persistent Job Leases

## Status

Accepted — 2026-08-01.

## Context

Phase 6 claim tokens never expired, so a crash could strand a Job in `processing`.

## Decision

Persist one active Project/Run/Job-scoped Lease per claimed Job. Claim atomically starts the attempt, creates a random token, stores its SHA-256 verification digest in the Lease row, and returns the credential to the owner. Preserve the Phase 6 Queue/attempt/idempotency credential fields so an identical claim can replay after restart. Default duration is 60 seconds; allowed range is 5 seconds to 24 hours.

## Alternatives

Non-expiring claims, in-memory timers, and process-ID ownership were rejected.

## Consequences

Ownership survives process loss and becomes recoverable; owners must heartbeat or renew.

## Security Impact

Tokens are sensitive capability data. They are omitted from logs and ordinary inspection/UI/list/report output, but the owner claim result and mutation inputs carry them. Phase 6 compatibility/idempotency rows retain the active credential; Project database confidentiality and future encryption/sealing remain explicit residual concerns.

## Portability Impact

UTC timestamps and SQLite rows require no OS-specific primitive.

## Reliability Impact

Expired ownership can be detected without guessing from process state.

## Concurrency Impact

A partial unique index permits one active Lease per Job.

## Persistence Impact

`job_leases` is the authoritative ownership ledger.

## Migration Impact

Migration 005 adds the table and indexes without changing migrations 001–004.

## Testing Impact

Boundary expiry, reopen, concurrent claims, and process kill are required.

## Related Requirements

NFR-REL-001; NFR-REL-002.

## Related Acceptance Criteria

AC-P07-001..004; AC-P07-008.

## Related Risks

R-065; R-067; R-068; R-072.

## Related Open Decisions

OD-044; OD-045; OD-046.

## Related OKF Domains

leases; queue; database; persistence.
