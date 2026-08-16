# Product Phase 16 — Worker Pool and Rate-Limit Compliance

## Status

Phase 16 is implemented within its declared Worker Pool and network scheduling
boundary. Local focused validation covers the scheduler, SQLite cooldown
durability, Browser Runtime multi-Context lifecycle, migration, and project
format. Exact clean-HEAD release promotion is intentionally not claimed in this
working tree because the repository contains uncommitted implementation
changes.

## Scope delivered

- Versioned Worker Pool configuration with explicit global, per-origin,
  per-proxy, in-flight, request-rate, burst, cooldown, lease, and heartbeat
  bounds.
- Deterministic priority-first proxy selection with weighted round-robin,
  least-loaded, sticky behavior, proxy capacity, and a bounded circuit breaker.
- Canonical-Origin token/in-flight budgets and shared `429`, `Retry-After`, and
  temporary-error cooldowns that cannot be bypassed by another proxy.
- Fail-closed authenticated Session affinity and direct-mode rejection of
  proxy-bound Jobs.
- Bounded `run()` execution with heartbeat callbacks, cancellation,
  observable rate-limit backpressure, outcome categories, and Queue/Recovery
  adaptation hooks.
- Browser Runtime GET/HEAD origin permits, response observation, release on all
  terminal Page paths, and multiple isolated Worker Contexts within the owned
  Chromium process while restart/rotation remains bounded.
- SQLite schema 11 and forward-only migration `011_add_scheduler_state` for
  Project/Run/Origin cooldown metadata, with restore and persistence-failure
  handling.

## Architecture and files

Core policy is in `packages/archive-core/src/scheduler.ts` and is exported from
the package boundary. The SQLite adapter is
`packages/persistence-sqlite/src/scheduler.ts`; Browser Runtime integration is
in `packages/browser-runtime/src/index.ts`. Project format and migration
version assertions advance to schema 11. Focused tests are in
`tests/unit/scheduler.test.ts` and `tests/integration/scheduler-lifecycle.test.ts`;
the Browser Runtime lifecycle test now covers concurrent isolated Contexts.

## Acceptance reconciliation

The Phase 16 execution rows in `docs/product/ACCEPTANCE_MATRIX.md` cover the
reservation dimensions, sticky/fail-closed behavior, shared cooldowns,
`Retry-After`, persistence, Browser Runtime integration, and documentation
sync. The generic Phase 15 rows remain historical planning context; the current
user-directed numbering is recorded at the top of `docs/project/PHASE_PLAN.md`.

## Validation

The executed validation results are:

- Full regression: `195/195 PASS`.
- Unit: `83/83 PASS`; integration: `30/30 PASS`; concurrency: `6/6 PASS`.
- Archive Core scheduler package: `15/15 PASS`; SQLite package: `25/25
  PASS`; Browser Runtime/Chromium: `12/12 PASS`; Secret Store leakage suite:
  `12/12 PASS`.
- `typecheck`, `build`, lint, format, architecture, contract `1.11.0`, eleven
  immutable migrations/schema 11, project-format, security, documentation,
  OKF, browser provisioning, and `git diff --check`: PASS.

No target-site credentials, proxy credentials, request bodies, cookies, or
tokens are used by the scheduler evidence. The sandboxed environment produced
`EPERM` when `test:secret-leakage` and `browser:verify` were first invoked;
both passed when rerun with the necessary execution permission.

## Explicit non-goals

Phase 16 does not implement Link Discovery, SPA candidate extraction, asset
downloading, HTML/CSS rewriting, API capture/replay, an archive runtime, or
authorized target-site acceptance. It also does not silently change the
existing Phase 9 prerequisite or claim Linux/macOS native release evidence.

## Related records

- [Worker Pool architecture](../architecture/WORKER_POOL_SCHEDULER.md)
- [Phase 16 security review](../architecture/PHASE_16_SECURITY_REVIEW.md)
- [ADR-059](adr/ADR-059-worker-pool-and-rate-limit-compliance.md)
- [Phase 16 OKF validation](../../okf/testing/phase-16-validation.md)
