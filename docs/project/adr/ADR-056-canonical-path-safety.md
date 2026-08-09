# ADR-056: Canonical Path Safety

## Status

Accepted for Product Phase 13 hardening.

## Context

Downloader, Rewriter, Import, and future archive runtime work will all map
untrusted URLs and archive names into Project-relative filesystem paths. Separate
validators would drift and could disagree about encoded traversal, Windows
aliases, Unicode, or case collisions.

## Decision

Use the version 1 Archive Core canonical path helper as the single pure contract.
It rejects absolute, drive-qualified, UNC, separator-confused, dot/parent,
empty, encoded and double-encoded traversal, invalid percent encoding, control
character, reserved device-name, trailing dot/space, non-NFC, oversized, and
non-portable segments. It produces an NFC normalized path and a case-folded
collision key. Project Format and Recovery delegate to it. Persistence adds a
root-contained resolver that rejects symlink ancestors before writes or output
verification.

No downloader, HTML rewrite, or archive runtime is implemented by this ADR;
later consumers must import the helper rather than create a local path mapper.

## Consequences

Path policy is consistent across current ZIP import, artifact checkpoints, and
future archive writers. The canonical 240-character bound is stricter than the
legacy Recovery bound, so future importers must surface a safe rejection rather
than truncate.

## Alternatives

- Use `path.resolve` alone: rejected because it is host-specific and does not
  address archive aliases, encoded traversal, or reserved Windows names.
- Keep package-local validators: rejected because cross-package drift is the
  principal risk this contract addresses.
- Sanitize by replacing unsafe characters: rejected because silent remapping
  can create collisions and data confusion.

## Security Impact

Positive. Traversal, URL encoding, platform aliases, collisions, and symlink
ancestor escapes are fail-closed. The helper does not claim to defend a hostile
filesystem after validation; atomic writes and root checks remain required.

## Portability Impact

Windows 11 is the primary target; Windows 10 is legacy/optional. The policy also
defines behavior for Linux/macOS through the same portable subset, with native
filesystem tests still required before support claims.

## Testing Impact

Corpus tests cover traversal, URL and double encoding, absolute/UNC/drive paths,
reserved names, Unicode normalization, long segments, case collisions, and
symlink boundaries. Every future path consumer must include the helper in its
focused tests.

## Migration Impact

No database migration. Existing stored paths are validated on use; no silent
renaming is performed.

## Evidence

- `packages/archive-core/src/path-safety.ts`
- `packages/project-format/src/index.ts`
- `packages/recovery/src/index.ts`
- `packages/persistence-sqlite/src/atomic.ts`
- `tests/unit/project-format.test.ts`
- `docs/architecture/CANONICAL_PATH_SAFETY.md`

## Phase Impact

This ADR establishes the shared helper only. Downloader, Rewriter, Import
expansion, and archive runtime consumers remain later-phase work.

## Traceability

- Acceptance: `AC-P13-013`, `AC-P13-014`
- Security review: `docs/architecture/PHASE_13_SECURITY_REVIEW.md`

