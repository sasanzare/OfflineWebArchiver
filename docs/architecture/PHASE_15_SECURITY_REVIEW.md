# Product Phase 15 Security Review — Proxy Manager and Health Monitor

## Review status

The Phase 15 review covers the proxy model, transport, persistence, Secret
Store, Browser Runtime, Session affinity, import path, and evidence boundary.
The final status is bound to the clean committed evidence bundle referenced by
the Phase 15 implementation report.

## Control review

| Control | Implementation | Evidence | Status |
|---|---|---|---|
| Credential storage | Secret Store scope `proxy`, kind `proxy_credential`, purpose `proxy_connection`; SQLite keeps only `credential_ref` | Application Service and proxy lifecycle tests | PASS |
| Metadata-only transport | Contract 1.11 proxy metadata/results omit username/password and secret bytes | contract validator, result/log redaction assertions | PASS |
| Protocol validation | Core accepts only HTTP, HTTPS, and SOCKS5 with strict host/port/identity rules | proxy unit tests and contract schemas | PASS |
| Proxy-required routing | Browser Runtime maps configured proxy only; connectivity failure is terminal | Browser Runtime HTTP/HTTPS/SOCKS5 fixture and dead-proxy test | PASS |
| No direct fallback | `failOpenToDirect` is fixed false and no fallback branch exists | security boundary check and application/browser tests | PASS |
| Health state machine | Success, failure threshold, cooldown expiry, disable, and eligibility are deterministic | Core health tests and persistence integration | PASS |
| Session affinity | Open/restore/re-auth resolve eligible proxy; explicit change requires reauthentication | Session affinity integration test | PASS |
| Import safety | CSV/JSON parsing is bounded and deterministic; per-record failures do not leak credentials | proxy import integration and redaction scan | PASS |
| TLS trust | Normal contexts keep strict HTTPS validation; generated local HTTPS fixture bypass is test-only and env-gated | Browser Runtime source/security check | PASS |
| Migration safety | Migration 010 adds metadata-only `proxies` table and preserves existing ledgers | migration and project lifecycle tests | PASS |

## Trust zones

The renderer/transport zone can request metadata commands but cannot read Secret
Store bytes or Playwright objects. Application Service is the only orchestration
zone that can request scoped secret resolution. Browser Runtime is the only
Playwright/network adapter. SQLite is a durable metadata ledger, not a secret
store.

## Residual risks

No critical Phase 15 security defect is known in the implemented scope. A
future release still needs real authorized multi-worker/rate-limit evidence,
proxy-provider compatibility testing, and platform-native validation. These
are Phase 16 or release-scope risks, not silent direct-fallback behavior.
