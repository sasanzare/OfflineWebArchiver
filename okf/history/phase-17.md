---
type: Phase Record
title: Product Phase 17 - Asset Downloader, Deduplication, and Path Safety
description: Records the explicit-asset scheduler boundary, durable content/source model, resumable storage, and canonical path controls.
tags: [history, phase-record, assets, downloader, recovery, security]
status: stable
sources:
  - id: phase-seventeen-report
    resource: Phase 17 implementation report in the repository
    title: Phase 17 implementation report
---

# Product Phase 17 - Asset Downloader, Deduplication, and Path Safety

Phase 17 implements the explicit-descriptor Asset Downloader boundary. Archive
Core owns Asset identity, resume, network, repository, and filesystem ports;
Application Service coordinates scheduler permits and Lease/fencing; SQLite
schema 12 stores source/content/relation state; Persistence owns streaming file
I/O, locks, symlink checks, and atomic promotion.

The focused deterministic suite verifies URL identity, content deduplication,
Page↔Asset provenance, HTTP Range resume, fencing, and filesystem safety. Phase
9 discovery, production network adapter wiring, rewriting, replay, and
authorized target-site acceptance remain separate gates. See the [Phase 17
validation](../testing/phase-17-validation.md) and repository
implementation/security records.
