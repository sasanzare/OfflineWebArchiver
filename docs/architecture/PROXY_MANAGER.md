# Proxy Manager and Health Monitor

## Scope

Product Phase 15 adds a metadata-first Proxy Manager for authorized outbound
connections. Archive Core owns the validated model and deterministic policy;
Application Service owns command orchestration and Secret Store access;
SQLite owns durable metadata; Browser Runtime owns Playwright routing and
connectivity checks. Worker scheduling, proxy rotation, origin rate limits,
and downloader integration remain Phase 16 or later boundaries.

## Supported protocols

The validated protocols are `http`, `https`, and `socks5`. A proxy identity is
the canonical tuple `(projectId, protocol, normalizedHost, port)`. Labels,
bypass hosts, weight, priority, concurrency, enabled state, health state,
latency, counters, cooldown, and a safe last-error summary are metadata. A
raw username/password is never part of `ProxyMetadata`.

## Health and eligibility

New enabled proxies start `degraded` until a connectivity check succeeds.
Successful checks record latency and move the proxy to `healthy`. Consecutive
failures increase the failure counter; the configured threshold moves the proxy
to `cooldown` until the cooldown deadline, and a disabled proxy is always
`disabled`. Eligibility requires enabled state, `healthy` state, a non-expired
cooldown, and an available credential reference when authentication is needed.
The current phase records health; it does not schedule background probes.

## Secret and runtime boundary

The Application Service writes raw credentials only through the scoped Secret
Store purpose `proxy_connection`, retains the opaque reference, and resolves
the bytes only while creating a runtime configuration or executing a test.
SQLite rows, IPC results, logs, imports, evidence, and Session metadata contain
no secret bytes. Browser Runtime creates an isolated context for `testProxy`
and never retries a failed proxy through a direct connection.

## Session affinity

`session.open`, `session.reauthenticate`, and `session.restore` resolve the
recorded `proxyId` and require eligibility. `session.setProxyAffinity` is an
explicit change; an active Authentication Browser cannot be rebound, and a
changed affinity requires reauthentication. Disabled, unhealthy, cooldown,
missing-secret, and runtime failures fail closed.

## Phase 16 boundary

This component does not claim a Worker Pool, global/origin/proxy token bucket,
`429`/`Retry-After` coordination, automatic proxy rotation, sticky worker
assignment, or download/replay execution. Those are deliberately reserved for
the next scheduling phase.
