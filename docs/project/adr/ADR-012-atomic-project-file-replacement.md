# ADR-012 — Atomic Project File Replacement

## Status

Accepted on 2026-07-31.

## Context

Manifest, backup metadata, export, and initial Project promotion must not expose partial final files after failure or interruption.

## Decision

Write a unique mode-0600 temporary sibling, flush it, close it, rename it on the same filesystem, then best-effort flush the parent directory where supported. Existing destinations are refused unless the caller explicitly requests replacement. Initial create/import build a unique sibling directory, validate it completely, and atomically rename it to a previously absent destination. Trust-boundary symlinks are rejected and owned temporary paths are cleaned on failure.

## Consequences

Final names are never used as working files. Filesystems, antivirus, and power-loss semantics still vary; retained prior files and backups are the recovery boundary.

## Alternatives

In-place truncation, cross-filesystem move, predictable temp names, delete-before-write, and broad cleanup were rejected.

## Security Impact

Exclusive temporary creation, non-overwrite defaults, symlink rejection, and exact cleanup targets reduce race and overwrite exposure.

## Portability Impact

The same-directory rename model works on Windows, Linux, and macOS, subject to documented filesystem durability differences. No claim is made for network filesystems.

## Testing Impact

Atomic tests verify non-overwrite, prior-content preservation, explicit replacement, and no temporary sibling after completion. Lifecycle tests verify no final destination after failed import.

## Migration Impact

Manifest format changes and future artifacts must reuse this adapter or document a stronger primitive.

## Evidence

`packages/persistence-sqlite/src/atomic.ts` and the atomic/lifecycle tests.

## Phase Impact

Completes Product Phase 4 atomic file behavior; large streaming artifact promotion remains later work.

## Traceability

Requirements: FR-PROJECT-001..003, NFR-REL-002. Acceptance: AC-PROJECT-001, AC-P04-014..015. Risks: R-012, R-013, R-016.
