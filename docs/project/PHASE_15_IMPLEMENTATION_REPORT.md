# Product Phase 15 — Proxy Manager and Health Monitor

## Status

Phase 15 is implemented within its declared scope. The final completion claim
is supported by the clean committed native evidence bundle at
`.artifacts/phase15-evidence/final-native-windows-11-x64`; its validator is the
authoritative exact-HEAD gate.

## Scope delivered

- HTTP, HTTPS, and SOCKS5 proxy identity and strict validation in Archive Core.
- Proxy CRUD, deterministic CSV/JSON import, metadata-only persistence, and
  revision-safe updates in Application Service and SQLite schema 10.
- Secret Store-backed proxy credentials using `scopeType: "proxy"` and an
  opaque `credential_ref`; raw credentials are not persisted or returned.
- Deterministic `healthy`, `degraded`, `cooldown`, and `disabled` state policy,
  latency/success/failure counters, cooldown expiry, and eligibility checks.
- Real Browser Runtime connectivity checks through HTTP, HTTPS, and SOCKS5
  proxies, optional safe outbound-IP verification, and no direct fallback.
- Explicit authenticated Session proxy affinity, including fail-closed restore
  and reauthentication after an explicit affinity change.
- Contract 1.11.0 commands/results/errors and project/SQLite schema 10.

## Architecture and migration

The domain model is in `packages/archive-core/src/proxy.ts`; the persistence
adapter is `packages/persistence-sqlite/src/proxy.ts`; orchestration is in
`packages/application-service/src/index.ts`; the Playwright adapter is in
`packages/browser-runtime/src/index.ts`; and the transport surface is in
`packages/contracts/src/index.ts`. Migration `010_add_proxies` adds the
metadata-only `proxies` table. Existing project manifests are upgraded
losslessly and advertise the proxy feature at schema 10.

## Validation

The evidence runner executes the complete suite sequentially, focused package
suites, real Chromium proxy fixtures, build/typecheck/lint/format, architecture,
contract, migration, project-format, browser-resource, security, secret
leakage, documentation, and OKF gates. The local proxy fixtures generate their
TLS key material at test runtime; no private key is stored in the repository.

The HTTPS certificate-ignore option is strictly test-only: it requires both
the test fixture option and `OWAB_TEST_MODE=1`. Production rendering,
authentication, and proxy connections retain normal certificate validation.

## Explicit non-goals / Phase 16 boundary

Phase 15 does not implement a Worker Pool, global/origin/proxy rate-limit
coordination, `429`/`Retry-After` handling, automatic rotation, sticky worker
assignment, downloader, archive rewriting, replay execution, or a background
health scheduler. These remain explicit Phase 16 or later work.

## Related records

- [Phase 15 security review](../architecture/PHASE_15_SECURITY_REVIEW.md)
- [Proxy Manager architecture](../architecture/PROXY_MANAGER.md)
- [ADR-058](adr/ADR-058-proxy-manager-and-health-monitor.md)
- [Acceptance Matrix](../product/ACCEPTANCE_MATRIX.md)
- [Phase 15 evidence runner](../../tools/testing/run-phase15-evidence.mjs)
