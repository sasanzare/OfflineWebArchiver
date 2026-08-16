# Product Phase 17 — Asset Downloader, Deduplication, and Path Safety

## Status

Phase 17 is implemented and locally validated within the declared explicit-asset
downloader boundary. The focused Phase 17 suite passes, and the implementation
preserves the Phase 16 scheduler, proxy/session affinity, Lease, fencing,
Recovery, and canonical-path boundaries. This report does not claim Phase 9
discovery, a live target-site run, HTML/CSS rewriting, replay, or a clean-HEAD
release promotion.

## Scope delivered

- Archive Core asset identity and source/content contracts for CSS, JavaScript,
  images, SVG, fonts, audio, video, JSON, manifests, favicons, and generic
  binary assets.
- URL identity that preserves meaningful query parameters while redacting
  sensitive query values in durable and returned metadata. The existing Scope
  Engine identity hash remains the URL identity input; content identity is the
  SHA-256 of the bytes that were actually persisted.
- SQLite schema 12 and forward-only migration `012_add_asset_downloader` for
  content objects, source provenance, Page↔Asset relations, download state,
  validator/checkpoint fields, and fenced ownership metadata.
- Resumable, idempotent, and deterministic downloading through an injected
  `AssetNetworkPort` and the Phase 16 `WorkerPoolScheduler` reservation and
  Origin budget. No unrestricted `fetch` or direct server was added.
- HTTP `206`/`Content-Range` resume, validator checks, safe restart on `200`,
  bounded `416` recovery, maximum-size enforcement, streaming writes, durable
  progress checkpoints, final SHA-256/size verification, and atomic promotion.
- Canonical content-object paths, per-content exclusive lock files, ancestor
  symlink rejection, and a Persistence-owned `AssetFileStorePort` so
  Application Service does not cross the filesystem architecture boundary.
- Many-to-many Page↔Asset provenance with separate URL source rows and shared
  content rows. Identical bytes from different URLs are stored once without
  symlinks or hardlinks.

## Explicit boundary and non-goals

Callers must provide explicit, already-authorized asset descriptors. Phase 17
does not implement the independent Phase 9 discovery engine. The network port
is an adapter boundary; wiring a production HTTP/Browser transport, HTML/CSS
rewriting, offline replay, archive serving, and target-site acceptance remain
separate work.

## Validation

The focused Phase 17 command is `npm run test:phase17`. It covers source
idempotency and fencing, content deduplication and Page↔Asset relations, Range
resume after interruption, canonical root/symlink safety, URL identity, and
resume policy. Full repository gates and their exact results are recorded in
the task HANDOFF after execution. Final validation recorded `202/202` full
regression tests passing, `7/7` focused Phase 17 tests passing, `12/12` secret
leakage tests passing, `43/43` OKF validator tests passing, and passing
typecheck, build, lint, format, architecture, migration, security, docs, and
OKF policy gates. This is implementation validation on an intentionally dirty
worktree, not clean-HEAD release promotion.

## Related records

- [Asset Downloader architecture](../architecture/ASSET_DOWNLOADER.md)
- [Phase 17 security review](../architecture/PHASE_17_SECURITY_REVIEW.md)
- [ADR-060](adr/ADR-060-asset-storage-and-downloader-boundary.md)
- [Partial-file recovery](../architecture/PARTIAL_FILE_RECOVERY.md)
- [Canonical path safety](../architecture/CANONICAL_PATH_SAFETY.md)
