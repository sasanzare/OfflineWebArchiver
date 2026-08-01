# ADR-035: Checkpoint Storage and Versioning

## Status

Accepted — 2026-08-01.

## Context

Resume needs bounded durable progress without serializing worker internals or secrets.

## Decision

Use immutable model-version-1 Job, Run, and Artifact Checkpoints. Sequence per Job, link supersession, validate current Lease/fencing, canonicalize bounded secret-free JSON, and store only portable paths.

## Alternatives

Mutable single rows, arbitrary blobs, browser snapshots, and filesystem-only progress were rejected.

## Consequences

History is auditable and versioned; retention is deferred.

## Security Impact

Secret-like keys, traversal, oversized, and deeply nested payloads fail closed.

## Portability Impact

JSON and slash-separated relative paths are portable.

## Reliability Impact

Committed progress survives process termination and old records remain inspectable.

## Concurrency Impact

Lease/fencing ownership prevents stale Checkpoints.

## Persistence Impact

Three normalized Checkpoint tables are added.

## Migration Impact

Migration 005 adds versioned tables and indexes.

## Testing Impact

Sequence, supersession, ownership, bounds, and crash durability are required.

## Related Requirements

NFR-REL-001; NFR-REL-002; NFR-PORT-002.

## Related Acceptance Criteria

AC-P07-017..021.

## Related Risks

R-075; R-076; R-077.

## Related Open Decisions

OD-057; OD-058.

## Related OKF Domains

checkpoint-recovery; artifact-checkpoints; persistence.
