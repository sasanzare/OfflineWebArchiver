# ADR-013 — Bounded ZIP Project Export Container

## Status

Accepted on 2026-07-31.

## Context

OD-014 requires a portable export/import workflow with integrity and hostile-archive handling, while future archives may eventually be much larger than the empty Phase 4 foundation.

## Decision

Keep the working Project as a directory and add optional ZIP `1.0.0` export using exact `fflate@0.8.3`, a pure JavaScript dependency. Each archive contains deterministic forward-slash names, fixed ZIP timestamps, `project.json`, a SQLite backup snapshot, approved content directories, and `.offline-archive-export.json` with Project identity, UTC export time, size, and SHA-256 for every payload.

Exclude locks, WAL/SHM, temp, logs, backups, auth, proxies, and unknown roots. Import parses the central directory before decompression, rejects ZIP64/multi-disk/encryption/unknown methods, traversal/absolute/drive/UNC/backslash/reserved names, invalid UTF-8, duplicate/case-colliding names, symlink/special entries, undeclared files, checksum mismatch, corruption, and configured entry/size/ratio limits. Extraction occurs in a sibling staging directory; full Project/database validation precedes promotion.

Phase 4 limits are 256 MiB compressed, 512 MiB expanded, 128 MiB per entry, 5,000 entries, and ratio 100. Encryption and secret export are not implemented.

## Consequences

The bounded in-memory implementation is appropriate for Phase 4 but is not the final large-archive/ZIP64 design. OD-014 must be revisited before large captured Projects or Product Phase 25 portability claims.

## Alternatives

Directory-only transfer, TAR, native shell tools, an encrypted container, and immediate streaming ZIP64 were rejected for usability, portability, security boundary, or premature complexity.

## Security Impact

Import is untrusted input and fails before final extraction/promotion. Secret-bearing/reserved paths are excluded. SHA-256 is integrity detection, not authenticity.

## Portability Impact

Portable names and cross-platform collision checks are mandatory. ZIP64 and files above the stated limits are explicitly unsupported.

## Testing Impact

Tests cover round trip/identity, exclusions, movement, traversal, aliases, corruption, checksums, size/ratio limits, and failed-import cleanup.

## Migration Impact

Container format has its own version. Future container versions do not change the working Project format implicitly.

## Evidence

[fflate project documentation](https://github.com/101arrowz/fflate), `packages/persistence-sqlite/src/archive.ts`, and lifecycle/security tests.

## Phase Impact

Resolves OD-014 for the bounded Phase 4 foundation; final high-volume export remains open before Product Phase 25.

## Traceability

Requirements: FR-PROJECT-004, NFR-PORT-002, NFR-SEC-002. Acceptance: AC-PROJECT-003, AC-P04-016..020. Risks: R-021, R-031, R-045. Decision: OD-014.
