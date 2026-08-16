# Asset Downloader Architecture

Product Phase 17 adds an explicit-descriptor Asset pipeline. Archive Core owns
the versioned identity, resume, path, and network ports. Application Service
coordinates a single scheduler reservation, Lease/fencing checks, authorization
callbacks, checkpoints, and the download state machine. Persistence owns
SQLite rows and the filesystem capability implementation.

## Execution boundary

Every download receives a `WorkerReservation`, an `OriginNetworkRequestBudget`,
the scheduler response observer, proxy/session affinity, and a current Lease.
The downloader calls only the injected `AssetNetworkPort`; it does not call
`fetch`, open a server, or bypass the scheduler. Redirect targets are
re-authorized before another request. A configured proxy or authenticated
Session cannot silently fall back to direct routing.

The input is an explicit `AssetSourceInput` containing Project/Run/revision,
Page Job, asset type, relation kind, original and normalized URL, and the
existing Scope Engine identity hash. Discovery is deliberately outside this
component.

## Storage flow

1. Persistence creates or reuses the source row and its Page↔Asset relation.
2. A transactional claim validates Project, Run, Page Job, Lease, owner, and
   fencing generation. An unexpired active owner prevents a second download.
3. `AssetFileStorePort` prepares a Project-relative partial file. Durable
   `resume_offset`, size, and validator metadata are updated at bounded
   intervals and mirrored into the existing Recovery checkpoint boundary.
4. A compatible `206` response appends at the exact durable offset. A `200`,
   incompatible `Content-Range`, changed validator, or safe `416` path causes a
   bounded restart rather than combining different byte versions.
5. The stream is synced, hashed, and size-checked. The content SHA-256 selects
   `assets/objects/sha256/<prefix>/<hash>`; an exclusive content lock prevents
   duplicate promotion races.
6. The partial is atomically promoted or discarded when the same content object
   already exists. SQLite is finalized only after the persisted bytes pass
   verification. A stale owner cannot finalize the source.

## Identity and provenance

URL identity and content identity are separate. Source rows preserve original
and normalized URL metadata, redirect provenance, validators, relation kind,
and Page Job ownership. Content rows are Project-scoped by SHA-256 and byte
length. Multiple source rows may reference one content row; no symlink or
hardlink is used as a deduplication mechanism.

## Filesystem capability boundary

`AssetFileStorePort` is defined in Archive Core and implemented by
`packages/persistence-sqlite/src/asset-files.ts`. The implementation delegates
path normalization and trusted-root checks to the shared canonical mapper and
Persistence atomic helpers. It streams reads, exposes bounded file-handle
operations for writes/truncation/sync, rejects symlink ancestors and targets,
uses exclusive lock creation, and promotes only regular files through an
atomic rename.

## Source of truth

- Core contract: `packages/archive-core/src/assets.ts`
- Downloader orchestration: `packages/application-service/src/asset-downloader.ts`
- SQLite Asset repository: `packages/persistence-sqlite/src/assets.ts`
- Filesystem adapter: `packages/persistence-sqlite/src/asset-files.ts`
- Migration: `packages/persistence-sqlite/src/migrations.ts`
- Focused fixtures: `tests/unit/assets.test.ts`,
  `tests/integration/asset-download.test.ts`,
  `tests/integration/asset-path-safety.test.ts`, and
  `tests/concurrency/asset-concurrency.test.ts`
