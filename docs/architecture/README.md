# Production Architecture

Product Phase 6 adds `@offline-web-archive/queue`, Archive Core Queue ports/models, transport contract 1.3.0, SQLite schema 4, state-machine/priority policy 1, Application Service orchestration, CLI Queue commands, Desktop Queue inspection, and concurrency/security evidence. No network, DNS, Worker process, Lease, Heartbeat, Checkpoint, stale recovery, crawler, or browser capability is present.

The dependency path is Apps -> contract/Application Service -> Core ports and pure policy -> SQLite/platform adapters. Desktop/CLI never access Queue tables directly. SQLite owns short `BEGIN IMMEDIATE` transactions and persistent uniqueness/history; the Queue package owns deterministic behavior without SQLite/Electron/browser/network dependencies.

Start with [System Context](SYSTEM_CONTEXT.md), [Container Architecture](CONTAINER_ARCHITECTURE.md), [Component Boundaries](COMPONENT_BOUNDARIES.md), and [Dependency Rules](DEPENDENCY_RULES.md). Phase 6 authorities are [Persistent Queue](PERSISTENT_QUEUE.md), [Job State Machine](JOB_STATE_MACHINE.md), [Job Identity](JOB_IDENTITY_AND_DEDUPLICATION.md), [Queue Ordering](QUEUE_ORDERING_AND_PRIORITY.md), [Queue Persistence](QUEUE_PERSISTENCE.md), [Queue Concurrency](QUEUE_CONCURRENCY.md), and the [Phase 6 Security Review](PHASE_06_SECURITY_REVIEW.md).

Accepted production decisions are ADR-001 through ADR-030. Product Phase 7 — Checkpoint, Lease, and Crash Recovery remains planned; rendering/discovery/download/auth/proxy/archive/runtime/release work also remains unimplemented.
