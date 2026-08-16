# Worker and Network Concurrency Contract

Product Phase 16 implements the version 1 Worker Pool scheduler in Archive Core.
The policy fixes and enforces these dimensions:

- global Worker concurrency;
- per-Proxy Worker concurrency;
- per-origin Page concurrency;
- per-origin in-flight request concurrency;
- per-origin request rate and cooldown;
- bounded `Retry-After` and origin cooldown delays.

Proxy count must not multiply the per-origin budget. The origin key is the
canonical HTTP/HTTPS origin. `Retry-After` is parsed into a bounded delay;
missing or malformed values use a conservative fallback and must not create
unbounded sleep or retry storms. Every admission, wait, retry, and cooldown
decision is observable without URL credentials or sensitive headers. A shared
Origin cooldown is checked before proxy selection, so alternate proxies cannot
bypass a target-wide block.

The implementation is in `packages/archive-core/src/scheduler.ts`. Browser
Runtime receives origin permits and observes `429`/`503` responses; SQLite
migration `011_add_scheduler_state` persists Project/Run/Origin cooldown
metadata. Discovery, downloader, rewrite, replay, and target-site acceptance
remain outside this contract.

