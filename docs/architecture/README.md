# Production Architecture

## Product Phase 7 recovery foundation

The current architecture adds the GUI/network-independent `packages/recovery` policy package, Core `RecoveryRepositoryPort`, SQLite schema 5 adapter, Application Service orchestration, contract 1.4, and CLI/Desktop recovery surfaces. Read [Job Leases](JOB_LEASES.md), [Heartbeats and Fencing](HEARTBEATS_AND_FENCING.md), [Checkpoint Model](CHECKPOINT_MODEL.md), [Crash Recovery](CRASH_RECOVERY.md), [Pause and Resume](PAUSE_AND_RESUME.md), and the [Phase 7 security review](PHASE_07_SECURITY_REVIEW.md). No browser or production downloader dependency enters these layers.

Product Phase 7 adds `@offline-web-archive/recovery`, Archive Core recovery ports/models, transport contract 1.4.0, SQLite schema 5, state-machine 2, Application Service orchestration, CLI/Desktop Recovery controls, and crash/concurrency/security evidence. No network, DNS, production Worker process, crawler, downloader, or browser capability is present.

The dependency path is Apps -> contract/Application Service -> Core ports and pure policy -> SQLite/platform adapters. Desktop/CLI never access Queue tables directly. SQLite owns short `BEGIN IMMEDIATE` transactions and persistent uniqueness/history; the Queue package owns deterministic behavior without SQLite/Electron/browser/network dependencies.

Start with [System Context](SYSTEM_CONTEXT.md), [Container Architecture](CONTAINER_ARCHITECTURE.md), [Component Boundaries](COMPONENT_BOUNDARIES.md), and [Dependency Rules](DEPENDENCY_RULES.md). Phase 6 authorities are [Persistent Queue](PERSISTENT_QUEUE.md), [Job State Machine](JOB_STATE_MACHINE.md), [Job Identity](JOB_IDENTITY_AND_DEDUPLICATION.md), [Queue Ordering](QUEUE_ORDERING_AND_PRIORITY.md), [Queue Persistence](QUEUE_PERSISTENCE.md), [Queue Concurrency](QUEUE_CONCURRENCY.md), and the [Phase 6 Security Review](PHASE_06_SECURITY_REVIEW.md).

Accepted production decisions are ADR-001 through ADR-040. Product Phase 7 — Checkpoint, Lease, and Crash Recovery is verified; Product Phase 8 — Browser Lifecycle and Rendering Engine is exact next. Discovery/download/auth/proxy/archive/runtime/release work remains unimplemented.
