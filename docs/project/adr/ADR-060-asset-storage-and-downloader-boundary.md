# ADR-060: Asset Storage and Downloader Boundary

## Status

Accepted for Product Phase 17 within the explicit-descriptor and injected
network-adapter boundary.

## Context

The existing Project has Scope identity, Queue/Lease/Recovery ownership,
canonical paths, proxy/session affinity, and the Phase 16 scheduler, but no
durable Asset source/content model. Asset bytes must be resumable and
deduplicated without allowing partial output, stale workers, path traversal, or
alternate network routing.

## Decision

Archive Core defines versioned Asset identity, resume, network, repository, and
filesystem capability ports. Application Service owns orchestration and calls
only the injected network port and filesystem capability. Persistence owns
SQLite schema 12/migration 012 and implements the filesystem capability.

Source identity is URL-based and retains meaningful query parameters; content
identity is the SHA-256 of verified persisted bytes. Source and content rows are
separate, and Page↔Asset provenance is many-to-many. Content paths are
deterministic and Project-relative. Temporary files are written and synced
before atomic promotion; a completed source is persisted only after final
verification and current fencing ownership.

The downloader is a scheduler executor, not a discovery engine. It must acquire
an Origin budget, preserve proxy/Session affinity, re-authorize redirects, and
never use an unrestricted fetch or direct fallback.

## Consequences

Resumption and duplicate workers have explicit durable boundaries, and the
Application Service remains portable and architecture-compliant because file I/O
is behind `AssetFileStorePort`. A production HTTP/Browser adapter still needs
separate integration and authorized target-site evidence. URL-source metadata
can grow with provenance and content verification requires a bounded streaming
hash pass.

## Alternatives rejected

- Deduplicate by symlink/hardlink: rejected for portability and escape risk.
- Store only URL rows or only content rows: rejected because provenance and
  content identity have different lifecycles.
- Let Application Service import filesystem primitives: rejected because
  Persistence owns trusted-root and atomic storage operations.
- Fetch outside the scheduler: rejected because it would bypass shared Origin
  cooldown, proxy affinity, and rate budgets.
- Treat a `200` or missing validator as a safe append: rejected because it can
  combine different remote byte versions.

## Related records

- [Phase 17 implementation report](../PHASE_17_IMPLEMENTATION_REPORT.md)
- [Asset Downloader architecture](../../architecture/ASSET_DOWNLOADER.md)
- [Phase 17 security review](../../architecture/PHASE_17_SECURITY_REVIEW.md)
- [Canonical path decision](ADR-056-canonical-path-safety.md)
- [Worker Pool decision](ADR-059-worker-pool-and-rate-limit-compliance.md)
