# ADR-016: Versioned URL Normalization and Identity

## Status

Accepted — 2026-07-31.

## Context

Equivalent URLs require stable identities across runs and platforms.

## Decision

Scope Engine 1 uses WHATWG resolution, documented host/path/query/fragment normalization, and SHA-256 of `scope-identity-v1\n<identity-url>`.

## Consequences

Identity changes require an engine-version decision and golden fixture update.

## Alternatives

Raw URL strings and locale-sensitive sorting were rejected as nondeterministic.

## Security Impact

Unsafe syntax and credentials fail closed; sensitive values are omitted.

## Portability Impact

UTF-8 hashing and ordinal UTF-16 string ordering are OS/locale/timezone independent.

## Testing Impact

Golden, repeatability, duplicate-query, relative-resolution, and adversarial tests are mandatory.

## Migration Impact

Future engine versions must migrate persisted identities; Phase 5 persists no discovered identity.

## Evidence

`tests/fixtures/scope/normalization.golden.json` and `npm run scope:golden`.

## Phase Impact

Completes normalization and identity for Product Phase 5.

## Persistence Impact

Profile schema and engine versions are persisted; normalized identities remain decision output until Product Phase 6 owns queue persistence.

## Related Requirements

FR-SCOPE-001.

## Related Acceptance Criteria

AC-SCOPE-001; AC-P05-005,011..014,029..031.

## Related Risks

R-008; R-047.

## Related Open Decisions

OD-029.

## Related OKF Domains

scope-engine; site-profile; persistence; testing.

## Traceability

FR-SCOPE-001; AC-SCOPE-001; AC-P05-005,011..014,029..031; OD-029; R-008, R-047.
