# Product Phase 16 Security Review — Worker Pool and Rate-Limit Compliance

## Review status

The Phase 16 implementation review covers Worker reservation, origin-wide
network budgets, proxy selection, authenticated Session affinity, Browser
Runtime permit ownership, cooldown persistence, and fail-closed outcomes. It
does not claim authorized target-site acceptance or a release promotion from a
dirty working tree.

## Control review

| Control | Implementation | Evidence | Status |
|---|---|---|---|
| Global concurrency | `WorkerPoolScheduler` refuses reservations above the configured global bound | `tests/unit/scheduler.test.ts` | PASS |
| Origin concurrency | Page reservations and network permits use canonical Origin keys | scheduler unit tests and source review | PASS |
| Proxy concurrency | Reservations enforce the global per-proxy bound and proxy metadata capacity | scheduler unit tests | PASS |
| Request rate | Optional token bucket and burst bound are validated before dispatch | scheduler source and focused budget tests | PASS |
| Shared `429` cooldown | Missing/invalid `Retry-After` uses a bounded conservative fallback | scheduler unit tests | PASS |
| `Retry-After` safety | Delta-seconds and HTTP-date values are bounded; past dates do not create early dispatch | retry parser tests | PASS |
| Anti-evasion | Cooldown is checked before proxy selection and is keyed by Origin | alternate-proxy cooldown test | PASS |
| Session affinity | Conflicting, unavailable, or direct-mode proxy affinity fails closed | scheduler unit tests and existing Session tests | PASS |
| Proxy circuit | Repeated proxy failures open a bounded circuit and permit one half-open probe | circuit-breaker unit test | PASS |
| Browser permit ownership | GET/HEAD permits are released on response, failure, Page close, and continue failure | Browser Runtime source review and browser suite | PASS |
| Durable cooldown state | Project/Run/Origin rows use canonical keys and forward migration 011 | SQLite lifecycle and migration tests | PASS |
| Persistence failure | Asynchronous state-write failure is surfaced as a scheduler error | source contract review | PASS |

## Trust zones

Archive Core makes the pure scheduling decision. Application callers provide
Queue/Recovery ownership and Browser Runtime callbacks. Browser Runtime alone
owns Playwright/CDP and receives only the already-authorized network budget.
SQLite stores rate-limit metadata, never credentials, cookies, tokens, or
request bodies.

## Residual risks and boundaries

No critical defect is known in the implemented local scheduler boundary. A
future promotion still needs an authorized multi-proxy target fixture, exact
all-path network capture, long-running saturation evidence, and the existing
release/native gates. Those checks belong to later validation and do not justify
direct fallback or rate-limit bypass in the current runtime.
