# Application Service Knowledge — Transitional Legacy Artifact

> This file is not authoritative. The migrated Concept is [Application Service](../../architecture/application-service.md). It remains for legacy-path compatibility until Phase 8 cleanup.

**Status:** PARTIAL product service, VERIFIED through Product Phase 8 scope.

Contract 1.5 commands are authorized and orchestrated here. Product Phase 8 composes Phase 5 Scope, Phase 6 Queue, Phase 7 Lease/Heartbeat/Fencing/Checkpoint/Pause/Recovery, Browser Runtime, Rendering Engine, and persistence ports. `render.start` accepts an existing queued Job, not an ad-hoc URL; it owns stage events, Heartbeats/renewal, Pause observation, fenced commit/failure, error translation, and cleanup.

Desktop and CLI invoke the same service. No raw Browser/Playwright/SQLite handle crosses the service boundary. Automatic discovery/enqueue and all later network workflows remain planned.
