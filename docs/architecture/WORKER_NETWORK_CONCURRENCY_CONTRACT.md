# Worker and Network Concurrency Contract

Phase 13 defines, but does not implement, a Worker Pool scheduler. The version 1
policy in Archive Core fixes the dimensions that a later scheduler must enforce:

- global Worker concurrency;
- per-Proxy Worker concurrency;
- per-origin Page concurrency;
- per-origin in-flight request concurrency;
- per-origin request rate and cooldown;
- bounded `Retry-After` and origin cooldown delays.

Proxy count must not multiply the per-origin budget. The origin key is the
canonical HTTP/HTTPS origin. `Retry-After` is parsed into a bounded delay and
must not create unbounded sleep or retry storms. Every admission, wait, retry,
and cooldown decision must be observable without URL credentials or sensitive
headers.

No Worker Pool, downloader, proxy manager, or scheduler is implemented in this
phase.

