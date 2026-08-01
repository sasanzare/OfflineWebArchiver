# ADR-043: Isolated Context and Page per Job

## Status
Accepted — 2026-08-01.

## Context
Reusing cookies, permissions, or storage would couple unrelated Jobs and introduce future Session behavior.

## Decision
Create one fresh non-persistent Browser Context and one Page per Lease-owned attempt with deterministic profile version 1; close both on every outcome.

## Alternatives
Persistent profiles and shared Contexts were rejected; per-navigation Pages inside a shared Context were deferred.

## Consequences
Every Job pays Context creation cost but gains deterministic isolation.

## Security Impact
No system profile, authentication data, cookie sharing, stored permissions, or persistent storage is used.

## Reliability Impact
Context close is the final cleanup boundary.

## Concurrency Impact
One Page/Context is active because ADR-042 serializes Jobs.

## Persistence Impact
Only safe profile version/configuration metadata enters Render Results.

## Migration Impact
Schema 6 records context profile version.

## Testing Impact
Browser integration verifies deterministic configuration and per-Job cleanup.

## Portability Impact
Locale/timezone/viewport do not inherit host settings.

## Related Requirements
FR-RENDER-001, NFR-SEC-003.

## Related Acceptance Criteria
AC-P08-005, AC-P08-006.

## Related Risks
R-094.

## Related Open Decisions
OD-070.

## Related OKF Domains
OKF-DOM-012, OKF-DOM-013.
