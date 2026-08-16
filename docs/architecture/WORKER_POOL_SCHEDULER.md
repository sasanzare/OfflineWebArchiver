# Worker Pool and Rate-Limit Scheduler

## Purpose

Product Phase 16 adds the bounded Worker Pool and network scheduling boundary.
Archive Core owns reservation, proxy selection, origin budgets, cooldowns,
sticky Session affinity, circuit breakers, backpressure, and safe outcome
classification. Browser Runtime remains the only Playwright owner; SQLite
stores the durable origin cooldown snapshot.

The scheduler is deliberately an execution boundary, not a crawler. It does
not discover links, download archive assets, rewrite HTML, capture/replay API
responses, or serve archived content.

## Enforced dimensions

Every reservation is checked against all applicable dimensions before a Worker
starts:

- global active Worker count;
- per-origin Page/Context count;
- per-proxy Worker count, additionally bounded by proxy metadata capacity;
- per-origin in-flight network requests;
- optional per-origin request rate and burst size; and
- origin-wide cooldown state, independent of the selected proxy.

The default policy is conservative: one global Worker, one Worker per proxy,
one Page per origin, eight in-flight requests per origin, and a 30-second
fallback cooldown for an unqualified `429`. All limits are versioned and
validated before use.

## Proxy and Session policy

Proxy selection is deterministic and priority-first. Within the highest
priority eligible set, the scheduler supports weighted round-robin,
least-loaded, and sticky selection. Health, enabled state, Secret Store
availability, per-proxy capacity, and the proxy circuit breaker are checked
before reservation.

An authenticated Session carries an explicit proxy affinity. A conflicting
requested proxy is rejected, an unavailable bound proxy returns no
reservation, and direct mode rejects any proxy-bound Job. There is no silent
direct fallback or substitution of another proxy for authenticated work.

## Rate-limit and anti-evasion policy

`429` responses create an origin-wide cooldown. A valid delta-seconds or
HTTP-date `Retry-After` value is bounded by the configured maximum; missing,
invalid, or disabled-header handling uses the conservative fallback. `503`
responses use the bounded temporary-error cooldown. The cooldown is keyed by
canonical HTTP Origin, so selecting another proxy cannot bypass it.

The scheduler exposes `observeResponse` to Worker executors and Browser Runtime
receives an `OriginNetworkRequestBudget` for each Page operation. GET/HEAD
requests acquire and release origin permits; non-GET requests remain blocked by
the existing Browser Runtime method policy. Long-lived EventSource/WebSocket
requests are not held in a finite-request permit and remain subject to the
existing runtime policy.

## Ownership and durability

`WorkerPoolScheduler.run()` owns bounded reservations, heartbeat callbacks,
completion/failure classification, cancellation, and observable wait reasons.
`createDurableWorkerQueuePort()` adapts the existing Queue and Recovery ports
for callers that need durable claim, heartbeat, complete, and fail operations;
it does not duplicate the Queue state machine.

Migration `011_add_scheduler_state` adds the Project/Run-scoped
`origin_rate_limits` ledger. Only canonical origins, bounded status codes,
cooldown timestamps, and safe timestamps are persisted. State is restored before
dispatch and persistence failures surface as `SCHEDULER_PERSISTENCE_FAILED`.

## Browser lifecycle boundary

The owned Chromium process may host multiple isolated Worker Contexts while its
page/lifetime rotation bounds are not exceeded. Restart is refused while any
Page Context or Authentication Session is active. Closing a Page releases all
origin permits, and Browser Runtime health exposes one deterministic active Job
identifier for the existing transport/UI surface.

## Source and validation

- Core policy: `packages/archive-core/src/scheduler.ts` and
  `packages/archive-core/src/concurrency.ts`.
- Browser integration: `packages/browser-runtime/src/index.ts`.
- SQLite adapter and migration: `packages/persistence-sqlite/src/scheduler.ts`
  and `packages/persistence-sqlite/src/migrations.ts`.
- Unit evidence: `tests/unit/scheduler.test.ts`.
- Persistence evidence: `tests/integration/scheduler-lifecycle.test.ts`.
- Browser lifecycle evidence: `tests/browser/browser-runtime.test.ts`.

Full target-site, multi-day soak, downloader, discovery, replay, and
cross-platform release evidence remain later-phase or release-scope work.
