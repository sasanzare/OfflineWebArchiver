# ADR-059: Worker Pool and Rate-Limit Compliance

## Status

Accepted for Product Phase 16 within the declared Worker Pool and network
scheduling boundary.

## Context

Phase 15 introduced proxy identity, health, connectivity, and authenticated
Session affinity but intentionally stopped before Worker dispatch. A scheduler
that counted only proxy workers could multiply traffic across proxies, bypass a
target-wide cooldown, or silently replace an authenticated proxy with direct
routing.

## Decision

Archive Core owns a versioned Worker Pool policy with global, per-origin,
per-proxy, in-flight, and optional token-bucket request limits. Origin cooldown
is keyed by canonical Origin and is checked before proxy selection. `429` and
bounded `Retry-After` values create shared cooldowns; malformed or absent values
use a conservative fallback. Proxy selection is priority-first, then the
configured deterministic policy, with a per-proxy circuit breaker.

Authenticated Session affinity is mandatory when present. A conflict, missing
bound proxy, or direct-mode proxy-bound Job fails closed. Browser Runtime is
given the origin budget and releases permits on every terminal request/Page
path. SQLite migration `011_add_scheduler_state` persists only Project/Run/
Origin cooldown metadata.

Queue and Recovery remain the owners of durable Page Job state and Lease
fencing. `createDurableWorkerQueuePort()` is an adapter, not a second state
machine. Discovery, downloading, rewriting, API capture/replay, and target-site
acceptance remain outside this ADR.

## Consequences

Traffic cannot be multiplied by selecting alternate proxies during a shared
Origin cooldown. Backpressure and cooldown waits are observable, but a proxy
that is unavailable or circuit-open may block non-session work until a later
approved scheduling decision. The existing Browser Runtime transport/UI
surface remains compatible while multiple isolated Worker Contexts are allowed
inside one owned Chromium process.

## Alternatives rejected

- Maintain rate state separately per proxy: rejected because it permits Origin
  multiplication and anti-evasion failures.
- Let Browser Runtime own scheduling: rejected because policy and persistence
  would be coupled to Playwright rather than remaining portable Core behavior.
- Retry direct when a proxy fails: rejected because it breaks authorization and
  authenticated Session identity.
- Add downloader/replay behavior here: rejected because those are separate
  product boundaries with different data and security contracts.

## Evidence

The implementation is covered by `tests/unit/scheduler.test.ts`,
`tests/integration/scheduler-lifecycle.test.ts`, the Browser Runtime suite,
and migration/project-format validation. See the [Phase 16 implementation
report](../PHASE_16_IMPLEMENTATION_REPORT.md) and [security review](../../architecture/PHASE_16_SECURITY_REVIEW.md).
