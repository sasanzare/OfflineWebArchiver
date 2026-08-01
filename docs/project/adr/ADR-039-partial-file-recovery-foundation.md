# ADR-039: Partial File Recovery Foundation

## Status

Accepted — 2026-08-01.

## Context

Future downloads need a safe decision before appending to partial bytes.

## Decision

Model Artifact Checkpoints and a pure decision: resume only with Range support, matching non-null validators, plausible size, and durable offset; otherwise restart/discard. Verify completed bytes by SHA-256. Prove it with a loopback HTTP Range fixture, not a production downloader.

## Alternatives

Blind append, size-only resume, external-host integration, and deleting every partial were rejected.

## Consequences

The safety policy is ready for Phase 9 integration while network dispatch remains absent.

## Security Impact

Paths are bounded and Project-relative; no external host is contacted.

## Portability Impact

Artifact metadata is OS-neutral.

## Reliability Impact

Changed validators and unsupported Range restart safely.

## Concurrency Impact

Artifact Checkpoints require current Lease/fencing ownership.

## Persistence Impact

Artifact progress and validator are durable.

## Migration Impact

Migration 005 adds `artifact_checkpoints`.

## Testing Impact

206 resume, non-Range restart, changed validator, hash mismatch, and promotion are required.

## Related Requirements

FR-ASSET-002; NFR-REL-002.

## Related Acceptance Criteria

AC-P07-031..033.

## Related Risks

R-082; R-083; R-084.

## Related Open Decisions

OD-062; OD-063.

## Related OKF Domains

partial-files; artifact-checkpoints; testing.
