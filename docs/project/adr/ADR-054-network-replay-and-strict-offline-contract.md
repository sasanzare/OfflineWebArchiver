# ADR-054: Network Replay and Strict Offline Contract

## Status

Accepted as a Phase 13 architecture contract; replay execution remains future
work.

## Context

Deterministic offline rendering will need a replayable response store and a
strict policy for unresolved external dependencies. Context-level interception
must remain separate from page orchestration and must not expose sensitive
headers or permit accidental network leakage.

## Decision

Define version 1 pure interfaces for replay request keys, captured responses,
lookup, and outcomes. The future implementation will intercept at Browser
Context scope, canonicalize only HTTP/HTTPS GET/HEAD requests, look up a
deterministic method-plus-URL key, fulfill an exact match, and expose an
observable abort for unknown dependencies in Strict Offline Mode. Approved
loopback/local-runtime origins remain allowed by explicit policy. Non-strict
mode may allow network only as an explicitly recorded outcome.

Request headers are normalized for deterministic comparison but sensitive
headers (`Authorization`, cookies, proxy authorization, API keys, CSRF tokens,
and response `Set-Cookie`) are excluded from replay identity and persisted
metadata. HTML rewrite and Service Worker handling are separate consumers:
rewrite changes references after capture, while replay governs Context network
fulfillment; Service Worker policy is selected independently by Site Profile.

## Consequences

The contract supports deterministic matching, observable misses, and a clean
path for offline render metrics without implementing a downloader or replay
store in Phase 13. Unknown dependencies cannot silently disappear in strict
mode.

## Alternatives

- Intercept only individual pages: rejected because popups, workers, and
  subresources can bypass page-local policy.
- Include all request headers in the key: rejected because credentials make
  replay records sensitive and unstable.
- Silently fall back to live network: rejected because it invalidates strict
  offline evidence.

## Security Impact

Positive. Strict mode aborts unmatched external requests, local runtime access
is explicit, and sensitive headers are excluded. The full engine will still
need response-body limits, cache integrity, and persistence isolation.

## Portability Impact

The pure key/policy contract is platform-neutral. Browser interception details
must be validated against the pinned Chromium line on each supported platform.

## Testing Impact

Pure tests cover deterministic keys, sensitive-header filtering, replay hits,
strict misses, and approved local origins. Future browser tests must cover
Context interception, redirects, workers, Service Workers, fulfillment/abort,
and no-network assertions.

## Migration Impact

No migration. The contract version is `1`; no replay database or archive format
is added in Phase 13.

## Evidence

- `packages/archive-core/src/network.ts`
- `tests/unit/archive-core.test.ts`
- `docs/architecture/NETWORK_REPLAY.md`
- `docs/architecture/STRICT_OFFLINE_MODE.md`

## Phase Impact

This ADR defines the architecture only. It explicitly defers the replay store,
full interception engine, downloader, HTML rewrite, and archive import runtime.

## Traceability

- Acceptance: `AC-P13-009`, `AC-P13-010`
- Security review: `docs/architecture/PHASE_13_SECURITY_REVIEW.md`

