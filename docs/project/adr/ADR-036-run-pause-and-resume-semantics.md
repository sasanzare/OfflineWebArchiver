# ADR-036: Run Pause and Resume Semantics

## Status

Accepted — 2026-08-01.

## Context

Immediate forced pause can interrupt non-atomic work and misrepresent durability.

## Decision

Pause is cooperative: request, owner Checkpoint, acknowledgement, Lease release, logical paused state. Explicit resume requeues paused work and requires a fresh higher-generation Lease.

## Alternatives

Instant state flip, forced kill as normal pause, and token reuse were rejected.

## Consequences

Pause waits for a safe boundary; forced-pause timeout remains future policy.

## Security Impact

Only scoped commands and current owners can acknowledge.

## Portability Impact

Run control uses persisted states, not OS signals.

## Reliability Impact

Resume begins from a committed Checkpoint and fresh ownership.

## Concurrency Impact

Acknowledgement atomically checkpoints and releases the Lease.

## Persistence Impact

`run_control` and Run Checkpoints persist control intent.

## Migration Impact

Migration 005 backfills `active` for existing Runs.

## Testing Impact

Request, acknowledgement, state, release, resume, and re-claim are required.

## Related Requirements

NFR-REL-001; FR-UX-002.

## Related Acceptance Criteria

AC-P07-022..025.

## Related Risks

R-078; R-079.

## Related Open Decisions

OD-052..056.

## Related OKF Domains

run-control; pause-resume; queue.
