# ADR-021: Scope Engine Versioning

## Status

Accepted — 2026-07-31.

## Context

Normalization semantics must not change invisibly beneath persisted profiles or future jobs.

## Decision

Engine version is integer `1`, stored in every profile and decision and exposed by `scope.getEngineInfo`. Identity-affecting behavior requires a new engine version, compatibility plan, golden fixtures, and ADR update.

## Consequences

Bug fixes that alter identities are migrations, not patches.

## Alternatives

Application-version-only and unversioned engines were rejected.

## Security Impact

Auditors can reproduce the policy semantics used for a decision.

## Portability Impact

Golden fixtures pin cross-platform behavior.

## Testing Impact

Contract, golden, and repeatability tests assert engine version.

## Migration Impact

Phase 6 must store engine/profile revision with each identity/job.

## Evidence

`scope.getEngineInfo`, golden fixtures, and contract checks.

## Phase Impact

Establishes the Phase 5 compatibility axis.

## Persistence Impact

Engine version is stored in Profile JSON/revision JSON and emitted in decisions; future incompatible semantics require explicit migration rather than silent reinterpretation.

## Related Requirements

FR-SCOPE-001.

## Related Acceptance Criteria

AC-P05-029..031.

## Related Risks

R-042; R-047.

## Related Open Decisions

OD-034.

## Related OKF Domains

site-profile; scope-engine; migration; persistence.

## Traceability

FR-SCOPE-001; AC-P05-029..031; OD-034; R-042, R-047.
