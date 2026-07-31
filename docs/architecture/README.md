# Production Architecture

Product Phase 3 establishes the production repository and executable architecture foundation. The only implemented use case is transport-neutral `system.describe`; crawler, database, authentication, proxy, browser-rendering, archive-generation, final UI, and release packaging capabilities remain unimplemented.

Start with [System Context](SYSTEM_CONTEXT.md), [Container Architecture](CONTAINER_ARCHITECTURE.md), [Component Boundaries](COMPONENT_BOUNDARIES.md), and [Dependency Rules](DEPENDENCY_RULES.md). Runtime, contracts, errors, logging, configuration, security, testing, and spike disposition have dedicated records in this directory. Accepted decisions are ADR-001 through ADR-008 under `docs/project/adr/`.
