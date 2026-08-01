# ADR-048: Browser and Page Crash Recovery

## Status
Accepted — 2026-08-01.

## Context
Browser/renderer termination must not corrupt Queue state or be confused with navigation/security failures.

## Decision
Classify Browser disconnect as `BROWSER_CRASHED` and Page crash as `PAGE_CRASHED`, with crash classification taking precedence over secondary interception state. Close resources, record a retryable durable Render Failure, release the Lease, and rely on Phase 7 retry/recovery. Completed results are replayed, not rendered twice.

## Alternatives
Generic navigation failure, automatic infinite restart, and direct Job reopening were rejected.

## Consequences
Retry remains bounded by Job attempt limits and the Browser restart budget.

## Security Impact
Crash handling never bypasses current Fencing Generation or runtime authorization.

## Reliability Impact
Actual Windows renderer/browser process termination proves classification and durable state.

## Concurrency Impact
Only the active Job is affected; no pool exists.

## Persistence Impact
Failure/attempt/transition/Lease history remains immutable and queryable.

## Migration Impact
Schema 6 provides Render failure/event ledgers.

## Testing Impact
Process-kill tests terminate actual owned renderer and browser processes and verify recoverable Job state.

## Portability Impact
Windows is verified; Linux/macOS process-kill evidence remains deferred.

## Related Requirements
FR-RECOVERY-001, FR-RENDER-001, NFR-REL-001.

## Related Acceptance Criteria
AC-P08-016, AC-P08-017.

## Related Risks
R-093, R-101.

## Related Open Decisions
OD-076.

## Related OKF Domains
OKF-DOM-012, OKF-DOM-022.
