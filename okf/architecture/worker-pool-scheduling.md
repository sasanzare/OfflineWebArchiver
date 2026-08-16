---
type: Architecture Component
title: Worker Pool Scheduling
description: Versioned Worker reservation, proxy assignment, origin budget, cooldown, and backpressure boundary for Product Phase 16.
tags: [architecture, worker, scheduling, rate-limit, proxy, security]
status: stable
---

# Worker Pool Scheduling

Product Phase 16 adds a portable Archive Core scheduler that coordinates
global, per-origin, per-proxy, in-flight, and optional request-rate limits.
Origin cooldown is shared across proxies and authenticated Session affinity is
fail-closed. Browser Runtime receives only the resulting reservation and
origin network budget; SQLite persists bounded Project/Run/Origin cooldown
metadata through schema migration 011.

The scheduler is an execution boundary. Discovery, downloading, rewriting, API
capture/replay, and archive serving are separate concepts and are not implied
by this document. See the [Phase 16 validation](../testing/phase-16-validation.md)
and [Phase 16 record](../history/phase-16.md); the repository architecture
record is `docs/architecture/WORKER_POOL_SCHEDULER.md`.
