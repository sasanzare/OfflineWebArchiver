# ADR-020: Canonical and Redirect Classification

## Status

Accepted — 2026-07-31.

## Context

Canonical and redirect facts must be classified before later crawl execution exists.

## Decision

Phase 5 accepts supplied canonical/redirect facts and emits finite classifications. Redirect status, chain identity, maximum count, scope, external approval, and HTTPS downgrade are explicit. No target is fetched.

## Consequences

Later fetchers must call the same classifier after each received hop.

## Alternatives

Following targets in the engine and silently accepting external canonicals were rejected.

## Security Impact

Loops, out-of-scope targets, denies, invalid statuses, and downgrade fail closed.

## Portability Impact

Classification depends only on supplied values and profile.

## Testing Impact

All classification branches, loops, external targets, and downgrade require tests.

## Migration Impact

None in Phase 5; aliases are not durably stored.

## Evidence

`docs/architecture/CANONICAL_AND_REDIRECT_POLICY.md` and unit tests.

## Phase Impact

Completes local relationship policy without starting Phase 6.

## Persistence Impact

Canonical and redirect policy flags are Profile data; relationship facts and classifications are not persisted in Phase 5.

## Related Requirements

FR-SCOPE-002; FR-SCOPE-003.

## Related Acceptance Criteria

AC-P05-023..026.

## Related Risks

R-027; R-051.

## Related Open Decisions

OD-033.

## Related OKF Domains

scope-engine; security; testing.

## Traceability

FR-SCOPE-002, FR-SCOPE-003; AC-P05-023..026; OD-033; R-027, R-051.
