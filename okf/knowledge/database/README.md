# Database Knowledge — Transitional Legacy Artifact

> This file is not authoritative. The migrated Concept is [Database](../../data/database.md). It remains for legacy-path compatibility until Phase 8 cleanup.

**Status:** VERIFIED through SQLite schema 6.

Migration `006_add_browser_rendering_engine` adds strict Render Result/Event/Failure ledgers and indexes. Schema 5 Lease/Checkpoint/Recovery, schema 4 Queue, schema 3 Profile, and schema 1–2 Project history remain preserved. Constraints and repositories enforce Project/Run/Job/attempt/Lease identity, current fencing, bounded values/JSON, result uniqueness, and portable artifact descriptors.

Authority is `docs/architecture/SQLITE_PERSISTENCE.md` and `packages/persistence-sqlite`. No Link Discovery, Asset, API, Proxy, or Session table exists.
