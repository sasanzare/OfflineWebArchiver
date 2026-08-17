# Network Replay Contract

Phase 19 implements replay contract version 1 across three boundaries:

- Archive Core owns deterministic identity. The key is scoped by Project, Run,
  Project Revision, method, normalized HTTP(S) URL, and a small allowlist of
  request headers (`accept`, `accept-language`, and `content-type`). Tracking
  parameters are removed; sensitive query parameters are rejected rather than
  persisted.
- Persistence owns SQLite metadata and content-addressed bodies under
  `api/responses/<sha256>.bin`. Bodies are written atomically before the
  `complete` row is committed. Lookup distinguishes no-capture, ambiguous,
  revision-scoped, and integrity-failure results.
- Browser Runtime owns Playwright Context routing and CDP Fetch enforcement.
  Exact Local Runtime requests are allowed, matching snapshots are fulfilled,
  unsupported methods and strict-offline misses are aborted, and non-strict
  misses are observable before the existing authorization policy decides.

Capture is selective and deny-by-default: only JSON-like GET responses from
`fetch`/`xhr` are eligible, with an 8 MiB limit. POST/PUT/PATCH/DELETE are never
captured or replayed. Sensitive headers and recognizable JSON secret fields are
rejected; response headers use an allowlist and exclude cookies, transfer and
encoding metadata. Runtime events contain bounded safe URLs and reasons only.

Phase 19 does not implement automatic discovery, a target-site run, a full
archive build, or Phase 20 validation/reporting. Phase 18 rewrite maps remain
the explicit source of Local Runtime route/resource ownership.

