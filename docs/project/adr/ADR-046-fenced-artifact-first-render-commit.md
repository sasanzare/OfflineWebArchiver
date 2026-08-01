# ADR-046: Fenced Artifact-First Render Commit

## Status
Accepted — 2026-08-01.

## Context
Rendered bytes and relational state cannot be atomically committed by one filesystem/SQLite primitive.

## Decision
Write HTML/PNG atomically first, then use one SQLite transaction guarded by active Lease owner/token/expiry/Fencing Generation to insert the result/output descriptors and finish Job/attempt/transition/Lease state. Replay an already durable result idempotently.

## Alternatives
Database-first commit, unguarded artifact replacement, and deleting history on retry were rejected.

## Consequences
An interrupted pre-DB artifact may be overwritten by the valid owner; no false completed result exists. Post-commit replay returns the same result.

## Security Impact
Artifact paths are fixed portable relatives and metadata rejects sensitive keys.

## Reliability Impact
Stale workers cannot checkpoint, fail, or commit; completed outputs retain SHA-256 verification.

## Concurrency Impact
`BEGIN IMMEDIATE`, uniqueness, and fencing serialize the terminal commit.

## Persistence Impact
Migration 006 adds Render result/event/failure ledgers and indexes.

## Migration Impact
Forward-only schema 6; prior migrations remain immutable and backup-before-migration remains active.

## Testing Impact
Fault injection covers after-HTML-write and after-database-commit boundaries plus existing fencing races.

## Portability Impact
Paths use Project-relative slash-separated form and atomic replacement policy.

## Related Requirements
FR-RECOVERY-001, FR-RENDER-001, NFR-REL-001, NFR-REL-002.

## Related Acceptance Criteria
AC-P08-012, AC-P08-013, AC-P08-014.

## Related Risks
R-098, R-099.

## Related Open Decisions
OD-074.

## Related OKF Domains
OKF-DOM-013, OKF-DOM-022, OKF-DOM-026.
