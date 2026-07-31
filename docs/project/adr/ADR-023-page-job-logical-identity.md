# ADR-023: Page Job Logical Identity

## Status

Accepted — 2026-07-31.

## Context

Raw URLs and generated UUIDs cannot safely prevent duplicate work across equivalent URL forms, while Profile and engine changes must not silently mix semantics.

## Decision

Use a UUID `jobId` for reference and database uniqueness over Project, Run, Profile revision, Scope Engine version, identity hash, and Page Job type. Duplicate enqueue returns the existing Job and still records distinct discovery evidence.

## Alternatives

Raw URL, identity hash alone, Project-wide deduplication, and application-only prechecks were rejected.

## Consequences

Equivalent Phase 5 identities deduplicate within one Run/revision/version; intentional new Runs and semantic revisions remain isolated.

## Security Impact

Sensitive URL components removed by Scope Engine never enter identity storage; ownership checks prevent cross-Project/Run reads.

## Reliability Impact

The database is the final uniqueness authority.

## Concurrency Impact

`BEGIN IMMEDIATE` plus the unique constraint produces one Job under concurrent enqueue.

## Persistence Impact

Identity URL/hash and all uniqueness axes persist on `page_jobs`.

## Migration Impact

Migration 004 adds the unique rule without changing migrations 001–003.

## Testing Impact

Tracking, functional query, fragment, revision/version, duplicate, and multi-connection races are required.

## Related Requirements

FR-QUEUE-001; FR-QUEUE-002.

## Related Acceptance Criteria

AC-QUEUE-002; AC-P06-003..010.

## Related Risks

R-014; R-056; R-060.

## Related Open Decisions

OD-036.

## Related OKF Domains

queue; scope-engine; database; persistence.
