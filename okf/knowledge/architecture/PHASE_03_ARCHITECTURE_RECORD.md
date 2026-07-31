# Product Phase 3 Architecture Knowledge

The production system uses npm workspaces with dependency direction `apps -> application-service -> archive-core`, plus transport-neutral contracts and narrow platform/observability adapters. Desktop uses an allowlisted Electron IPC bridge; CLI invokes the same application service in-process. The canonical phase record is `okf/phases/phase-03/PHASE_03_ARCHITECTURE_RECORD.md`.
