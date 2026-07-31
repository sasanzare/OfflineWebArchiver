# ADR-017: Domain Matching and Public Suffix

## Status

Accepted — 2026-07-31.

## Context

Naive suffix matching crosses domain boundaries and two-label heuristics misclassify registrable domains.

## Decision

Scope authorization uses explicit exact/subdomain label-boundary rules with deny precedence. Registrable-domain relation uses bundled PSL data from `tldts` 7.4.9 only as descriptive metadata.

## Consequences

The exact MIT-licensed dependency bundles its PSL and performs no runtime update or request. PSL updates are reviewed dependency changes with domain/security/golden validation and an engine-version decision when classifications change; they cannot expand allow rules.

## Alternatives

String suffixes and home-grown public-suffix tables were rejected.

## Security Impact

`badexample.com` cannot match `example.com`; IDN is compared as canonical ASCII.

## Portability Impact

Bundled data avoids runtime network and OS resolver differences.

## Testing Impact

Exact/subdomain boundaries, IDN, IP literals, private suffixes, and external relation require tests.

## Migration Impact

Profile schema 1 records explicit rule mode; PSL version is dependency evidence.

## Evidence

`packages/scope-engine/src/index.ts` and scope unit tests.

## Phase Impact

Completes domain/origin policy without DNS or requests.

## Persistence Impact

Profiles persist explicit exact/subdomain rules; the pinned PSL version is dependency evidence, not mutable Project data.

## Related Requirements

FR-SCOPE-002.

## Related Acceptance Criteria

AC-SCOPE-002; AC-P05-008..013.

## Related Risks

R-027; R-049.

## Related Open Decisions

OD-030.

## Related OKF Domains

scope-engine; security; testing.

## Traceability

FR-SCOPE-002; AC-SCOPE-002; AC-P05-008..013; OD-030; R-027, R-049.
