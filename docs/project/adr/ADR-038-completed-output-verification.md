# ADR-038: Completed Output Verification

## Status

Accepted — 2026-08-01.

## Context

A terminal database state cannot prove its output still exists or is intact.

## Decision

Persist portable descriptors with byte length and SHA-256; verify root containment, non-symlink, size, and hash. Preserve valid completed Jobs; report invalid output without silently reopening terminal state.

## Alternatives

Existence-only checks, mtime trust, automatic terminal reopening, and unchecked absolute paths were rejected.

## Consequences

Integrity is explicit; hashing cost and remediation policy remain visible.

## Security Impact

Traversal and symlink escape fail closed.

## Portability Impact

Descriptors use relative paths and standard SHA-256.

## Reliability Impact

Valid outputs are not duplicated; corruption is detected.

## Concurrency Impact

Descriptor writes are idempotent and owner-fenced.

## Persistence Impact

`completed_outputs` stores verification status/time.

## Migration Impact

Migration 005 adds the descriptor ledger.

## Testing Impact

Missing, size, hash, valid preservation, path, and symlink cases are required.

## Related Requirements

NFR-REL-002; NFR-SEC-003.

## Related Acceptance Criteria

AC-P07-028..030.

## Related Risks

R-080; R-081.

## Related Open Decisions

OD-060; OD-061.

## Related OKF Domains

completed-output; persistence; security.
