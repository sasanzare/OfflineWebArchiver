# ADR-018: Query and Fragment Classification

## Status

Accepted — 2026-07-31.

## Context

Tracking, functional, secret, and hash-route parameters have different identity effects.

## Decision

Profile schema 1 classifies query keys as identity, functional, tracking, ignored, or denied, with an explicit unknown default. Duplicates are preserved and sorted. Sensitive values are removed. Fragment policy is ignore-all, preserve-all, or preserve-hash-routes.

## Consequences

Profile revisions visibly own identity policy; defaults are data rather than hidden behavior.

## Alternatives

Drop-all queries and preserve-all fragments were rejected as unsafe defaults.

## Security Impact

Sensitive values never enter results, logs, or persistence.

## Portability Impact

Sorting is independent of locale and input order after key/value/index comparison.

## Testing Impact

Duplicates, sensitive denial, unknown modes, and all fragment modes require tests.

## Migration Impact

Identity-affecting changes require a new profile revision and possibly engine version.

## Evidence

`docs/architecture/QUERY_AND_FRAGMENT_POLICY.md` and unit/golden tests.

## Phase Impact

Completes query/fragment policy for Product Phase 5.

## Persistence Impact

Classifications and fragment mode are persisted in Profile revisions; sensitive values are never persisted.

## Related Requirements

FR-SCOPE-001.

## Related Acceptance Criteria

AC-P05-017..022.

## Related Risks

R-008; R-048.

## Related Open Decisions

OD-031.

## Related OKF Domains

site-profile; scope-engine; security; persistence.

## Traceability

FR-SCOPE-001; AC-P05-017..022; OD-031; R-008, R-048.
