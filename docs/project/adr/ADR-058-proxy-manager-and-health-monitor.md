# ADR-058: Proxy Manager and Health Monitor

## Status

Accepted for Product Phase 15 within the declared Proxy Manager and Health
Monitor scope.

## Context

The existing Session and Browser Runtime boundaries had no validated proxy
inventory, protected proxy credential lifecycle, health state, or explicit
authenticated Session proxy affinity. Adding proxy behavior without a clear
adapter and failure boundary could leak credentials or silently bypass a
required proxy.

## Decision

Archive Core owns protocol/identity normalization, health transitions,
eligibility, affinity, and deterministic CSV/JSON import policy. Application
Service owns proxy commands, scoped Secret Store resolution, persistence
coordination, and Session validation. SQLite schema 10 stores only proxy
metadata and health counters. Browser Runtime is the sole Playwright owner and
performs real connectivity checks in isolated contexts. Contract 1.11 exposes
metadata-only results. A configured proxy is fail-closed: no direct fallback,
implicit rotation, or worker scheduling is part of this phase.

## Consequences

Proxy CRUD and import are portable and revision-safe. Health state is
observable and deterministic, but no background scheduler or rate-limit token
bucket is implied. Authenticated Sessions preserve a selected proxy until an
explicit affinity command changes it; the change requires reauthentication.

## Alternatives

- Put Playwright proxy setup in Application Service: rejected because it would
  violate the Browser Runtime ownership boundary.
- Store credentials beside proxy rows: rejected because SQLite is not the
  Secret Store and ordinary exports/results must remain metadata-only.
- Fall back to direct routing when a proxy fails: rejected because it can
  violate authorization, account affinity, and user expectations.
- Add a worker scheduler in this phase: rejected because it would mix proxy
  inventory/health with the separate Phase 16 rate-limit boundary.

## Security Impact

Raw credentials enter only the scoped Secret Store write path and are resolved
only inside a short-lived callback. Metadata, logs, IPC, imports, evidence,
and Session records contain no credential bytes. Proxy failure, cooldown,
disabled state, missing Secret Store material, and IP-check failure do not
trigger direct routing. The generated local HTTPS fixture uses a test-only,
environment-gated certificate exception; production contexts remain strict.

## Portability Impact

HTTP, HTTPS, and SOCKS5 are represented as portable metadata and mapped to
Playwright at the Browser Runtime boundary. The current native evidence target
is Windows 11 x64; Linux/macOS native evidence remains a future release gate.

## Testing Impact

Core unit tests cover normalization, import, health, cooldown, eligibility,
and affinity. Integration tests cover SQLite persistence, Secret Store
references, import, command results, and Session restore. Real Chromium tests
cover HTTP, HTTPS, SOCKS5, authenticated routing, dead-proxy failure, and no
direct fallback. Security, contract, migration, documentation, and OKF checks
remain required gates.

## Migration Impact

Migration `010_add_proxies` advances SQLite schema from 9 to 10 and adds the
Project-owned `proxies` metadata table with a unique canonical identity. No
existing table is rewritten destructively; old projects are upgraded through
the existing forward-only migration path and existing manifests remain
readable.

## Evidence

The repository-owned runner is
`tools/testing/run-phase15-evidence.mjs`. The final native bundle and exact-HEAD
validator are under `.artifacts/phase15-evidence/final-native-windows-11-x64`.

## Phase Impact

This decision implements Phase 15 Proxy Manager and Health Monitor. It does not
implement Phase 16 Worker Pool/rate-limit compliance, automatic proxy rotation,
downloader, rewrite, replay execution, or target-site acceptance.

## Traceability

See AC-P15-001 through AC-P15-018 in the [Acceptance Matrix](../../product/ACCEPTANCE_MATRIX.md),
the [Phase 15 security review](../../architecture/PHASE_15_SECURITY_REVIEW.md),
the [Proxy Manager architecture](../../architecture/PROXY_MANAGER.md), and
the OKF Phase 15 record under `okf/history/phase-15.md`.
