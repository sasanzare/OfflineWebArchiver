# ADR-045: CDP Runtime Network Authorization

## Status
Accepted — 2026-08-01.

## Context
Navigation-time scope approval is insufficient for redirects and subrequests, and route interception did not reliably expose every redirect hop.

## Decision
Use browser-runtime-owned CDP Fetch interception to authorize every GET/HEAD request and redirect before continuation. Re-evaluate Phase 5 policy, resolve all DNS answers, require public classifications, and permit only exact loopback fixture origins in construction-time test mode.

## Alternatives
Initial-URL-only validation, response-only blocking, unrestricted loopback, and Desktop/CLI-controlled exceptions were rejected.

## Consequences
Authorization is fail-closed and may block sites whose DNS or redirect behavior is ambiguous.

## Security Impact
Private/link-local/reserved/mixed DNS, unsupported methods, and unapproved redirect targets are blocked.

## Reliability Impact
Denied requests produce bounded structured evidence rather than silent navigation.

## Concurrency Impact
Each Context has its own interception session.

## Persistence Impact
Only safe URLs, counts, and bounded failure summaries are stored.

## Migration Impact
Schema 6 evidence JSON is bounded by constraints.

## Testing Impact
Tests cover non-GET denial, private redirect, exact loopback exception, URL redaction, and failed requests.

## Portability Impact
CDP is Chromium-specific, consistent with the Phase 8 engine pin.

## Related Requirements
FR-SCOPE-003, FR-RENDER-001, NFR-SEC-003.

## Related Acceptance Criteria
AC-P08-010, AC-P08-011.

## Related Risks
R-096, R-097.

## Related Open Decisions
OD-073.

## Related OKF Domains
OKF-DOM-011, OKF-DOM-012, OKF-DOM-028.
