# ADR-015: Portable Site Profile Authority

## Status

Accepted — 2026-07-31.

## Context

Profiles must be portable, reviewable, versioned, and consistent with Project revisions.

## Decision

`profile/config.json` is configuration authority. SQLite schema 3 is the immutable revision/integrity ledger. Profile updates hold the Project lock, require the expected revision, append Project/Profile/rule rows, atomically replace files, compensate ordinary failure, and fail closed on divergence.

## Consequences

Projects remain inspectable and historical revisions are queryable; a crash window across filesystem and SQLite is detectable but not self-healing.

## Alternatives

Database-only authority harmed portability; file-only authority lacked revision integrity; silent last-writer-wins was rejected.

## Security Impact

Strict secret-free validation and SHA-256 consistency prevent ambiguous policy selection.

## Portability Impact

Canonical JSON uses relative Project placement and UTC.

## Testing Impact

Lifecycle, revision-conflict, export/import, and tamper tests are required.

## Migration Impact

Adds migration 003 and Project format 1.1.0 compatibility.

## Evidence

`packages/persistence-sqlite/src/index.ts` and `tests/integration/profile-lifecycle.test.ts`.

## Phase Impact

Completes Product Phase 5 profile authority; no queue is introduced.

## Persistence Impact

Profile JSON is portable authority; SQLite schema 3 stores immutable hashes, current pointers, revisions, and normalized rules, while the manifest mirrors Base URL and active revision.

## Related Requirements

FR-AUTHZ-001.

## Related Acceptance Criteria

AC-P05-001..004.

## Related Risks

R-013; R-053.

## Related Open Decisions

OD-028.

## Related OKF Domains

site-profile; project-format; database; migration; persistence; security.

## Traceability

FR-AUTHZ-001; AC-P05-001..004; OD-028; R-013, R-053.
