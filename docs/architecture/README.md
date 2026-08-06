# Production Architecture

## Product Phase 8 Browser/Rendering foundation and Phase 10 interaction foundation

The current architecture adds `packages/browser-runtime` as the sole Playwright adapter and `packages/rendering` as browser-independent orchestration. Archive Core owns ports/models, Application Service owns Queue/Lease/Checkpoint/Fencing orchestration, SQLite schema 7 owns Render and Interaction ledgers, and contract 1.6 carries Browser/Render/Interaction commands. Read [Browser Runtime](BROWSER_RUNTIME.md), [Human-Paced Interaction](BROWSER_INTERACTION.md), [Lifecycle](BROWSER_LIFECYCLE.md), [Rendering Engine](RENDERING_ENGINE.md), [Stability](RENDER_STABILITY.md), [Runtime Network Policy](RUNTIME_NETWORK_POLICY.md), [Render Results](RENDER_RESULTS.md), [Phase 8 security review](PHASE_08_SECURITY_REVIEW.md), and [Phase 10 security review](PHASE_10_SECURITY_REVIEW.md).

The Phase 10 foundation adds Interaction Profile/Plan/Trace schema 1, contract 1.6.0, SQLite schema 7, bounded approved plans, real browser input, explicit policy handling, and redacted trace evidence. The repository still lacks the Phase 9 Discovery Engine, so no Phase 10 completion or discovery integration claim is made. Authentication, proxy, downloader, and Worker pool work remain outside scope.

The dependency path is Apps -> contract/Application Service -> Core ports and pure policy -> SQLite/platform adapters. Desktop/CLI never access Queue tables directly. SQLite owns short `BEGIN IMMEDIATE` transactions and persistent uniqueness/history; the Queue package owns deterministic behavior without SQLite/Electron/browser/network dependencies.

Start with [System Context](SYSTEM_CONTEXT.md), [Container Architecture](CONTAINER_ARCHITECTURE.md), [Component Boundaries](COMPONENT_BOUNDARIES.md), and [Dependency Rules](DEPENDENCY_RULES.md). Phase 6 authorities are [Persistent Queue](PERSISTENT_QUEUE.md), [Job State Machine](JOB_STATE_MACHINE.md), [Job Identity](JOB_IDENTITY_AND_DEDUPLICATION.md), [Queue Ordering](QUEUE_ORDERING_AND_PRIORITY.md), [Queue Persistence](QUEUE_PERSISTENCE.md), [Queue Concurrency](QUEUE_CONCURRENCY.md), and the [Phase 6 Security Review](PHASE_06_SECURITY_REVIEW.md).

Accepted production decisions are ADR-001 through ADR-049. Product Phase 8 is verified; Product Phase 9 — Link Discovery and SPA Support remains the exact prerequisite next phase. Phase 10 interaction work is partial and must not bypass discovery or claim later-phase behavior.
