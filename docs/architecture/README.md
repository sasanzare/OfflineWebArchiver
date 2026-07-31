# Production Architecture

Product Phase 4 extends the Phase 3 production architecture with portable Project format `1.0.0`, SQLite schema 2, forward migrations/backups, atomic files, single-writer locking, bounded ZIP transfer, contract `1.1.0`, and actual Desktop/CLI Project workflows.

Start with [System Context](SYSTEM_CONTEXT.md), [Container Architecture](CONTAINER_ARCHITECTURE.md), [Component Boundaries](COMPONENT_BOUNDARIES.md), and [Dependency Rules](DEPENDENCY_RULES.md). Project-specific authorities are [Project Format](PROJECT_FORMAT.md), [SQLite Persistence](SQLITE_PERSISTENCE.md), [Migration Strategy](MIGRATION_STRATEGY.md), [Lifecycle](PROJECT_LIFECYCLE.md), [Atomic Files](ATOMIC_FILE_OPERATIONS.md), [Import/Export](PROJECT_IMPORT_EXPORT.md), [Locking](PROJECT_LOCKING.md), [Portable Paths](PORTABLE_PATH_RULES.md), and the [Phase 4 Security Review](PHASE_04_SECURITY_REVIEW.md).

Accepted production decisions are ADR-001 through ADR-014. Crawling, URL normalization/scope, queues, browser rendering, authentication, proxies, archive generation/rewriting, offline serving, and release packaging remain unimplemented.
