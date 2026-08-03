# Queue — Transitional Legacy Artifact

> This file is not authoritative. The migrated Concept is [Queue](../../workflow/queue.md). It remains for legacy-path compatibility until Phase 8 cleanup.

**Status:** VERIFIED through Product Phase 7

**Versions:** Queue state machine 2; SQLite schema 6; contract 1.5.0

Phase 6 logical identity, deterministic priority, idempotency, attempt, and history invariants remain authoritative. Phase 7 active Lease/Fencing/Recovery remains mandatory. Phase 8 may render only an existing eligible queued Job and commit through those protected writes. There is still no automatic discovery/enqueue, production downloader, or Worker Pool.
