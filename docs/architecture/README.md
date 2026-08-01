# Production Architecture

## Product Phase 8 Browser and Rendering foundation

The current architecture adds `packages/browser-runtime` as the sole Playwright adapter and `packages/rendering` as browser-independent orchestration. Archive Core owns ports/models, Application Service owns Queue/Lease/Checkpoint/Fencing orchestration, SQLite schema 6 owns Render ledgers/artifacts, and contract 1.5 carries Browser/Render commands. Read [Browser Runtime](BROWSER_RUNTIME.md), [Lifecycle](BROWSER_LIFECYCLE.md), [Rendering Engine](RENDERING_ENGINE.md), [Stability](RENDER_STABILITY.md), [Runtime Network Policy](RUNTIME_NETWORK_POLICY.md), [Render Results](RENDER_RESULTS.md), and the [Phase 8 security review](PHASE_08_SECURITY_REVIEW.md).

Product Phase 8 adds owned Playwright Core 1.56.1/Chromium 141.0.7390.37 revision 1194, Render Engine 1, Context profile 1, contract 1.5.0, SQLite schema 6, CLI/Desktop controls, and real browser/process-kill evidence. No Link Discovery, automatic enqueue, production downloader, human-paced interaction, authentication, proxy, or Worker pool exists.

The dependency path is Apps -> contract/Application Service -> Core ports and pure policy -> SQLite/platform adapters. Desktop/CLI never access Queue tables directly. SQLite owns short `BEGIN IMMEDIATE` transactions and persistent uniqueness/history; the Queue package owns deterministic behavior without SQLite/Electron/browser/network dependencies.

Start with [System Context](SYSTEM_CONTEXT.md), [Container Architecture](CONTAINER_ARCHITECTURE.md), [Component Boundaries](COMPONENT_BOUNDARIES.md), and [Dependency Rules](DEPENDENCY_RULES.md). Phase 6 authorities are [Persistent Queue](PERSISTENT_QUEUE.md), [Job State Machine](JOB_STATE_MACHINE.md), [Job Identity](JOB_IDENTITY_AND_DEDUPLICATION.md), [Queue Ordering](QUEUE_ORDERING_AND_PRIORITY.md), [Queue Persistence](QUEUE_PERSISTENCE.md), [Queue Concurrency](QUEUE_CONCURRENCY.md), and the [Phase 6 Security Review](PHASE_06_SECURITY_REVIEW.md).

Accepted production decisions are ADR-001 through ADR-048. Product Phase 8 — Browser Lifecycle and Rendering Engine is verified; Product Phase 9 — Link Discovery and SPA Support is exact next. Discovery/download/auth/proxy/archive/runtime/release work remains unimplemented unless explicitly assigned to Phase 9.
