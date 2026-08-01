# ADR-044: Combined DOM and Network Stability

## Status
Accepted — 2026-08-01.

## Context
Initial load and generic `networkidle` do not prove a dynamic page is ready.

## Decision
Render stability model 1 requires optional selector readiness plus simultaneous versioned DOM and finite-network quiet windows within explicit deadlines. WebSocket/EventSource do not remain active blockers. Bounded fixture scroll is test-only.

## Alternatives
Fixed sleep, load event only, Playwright `networkidle`, and unbounded scrolling were rejected.

## Consequences
Continuous mutation or polling becomes an explicit bounded failure rather than a hang.

## Security Impact
Selectors and policy values are bounded; no arbitrary page automation is introduced.

## Reliability Impact
Defaults are deterministic and failure codes distinguish stability/Render bounds.

## Concurrency Impact
No shared state exists between Jobs.

## Persistence Impact
Durations, versions, checkpoints, and safe events are recorded.

## Migration Impact
Schema 6 stores result durations/versions.

## Testing Impact
Static, JavaScript, SPA, lazy, continuous-mutation, and EventSource fixtures exercise the policy.

## Portability Impact
The policy is independent of OS locale and timing defaults.

## Related Requirements
FR-RENDER-002, NFR-TEST-001, NFR-PERF-001.

## Related Acceptance Criteria
AC-P08-007, AC-P08-008, AC-P08-009.

## Related Risks
R-009, R-095.

## Related Open Decisions
OD-071, OD-072.

## Related OKF Domains
OKF-DOM-013, OKF-DOM-031.
