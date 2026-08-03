# System Map — Transitional Legacy Artifact

> This file is not authoritative. Its extension documentation is [System Map](../../extensions/maps/system.md). It remains for legacy-path compatibility until Phase 8 cleanup.

Desktop Renderer -> Preload Bridge -> Electron IPC Adapter -> Application Service -> Archive Core. CLI -> in-process Adapter -> the same Application Service -> Archive Core. All requests and responses use Contracts 1.0.0.
