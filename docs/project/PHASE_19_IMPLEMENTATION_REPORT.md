# Product Phase 19 — API Capture, Network Replay, and Isolated Local Runtime

## Status

Phase 19 is **IMPLEMENTED/VALIDATED within the selective GET capture, replay,
map-bounded Local Runtime, and isolated preview boundary**. This report does
not claim a full crawl/archive, automatic discovery, authorized target-site
acceptance, or Phase 20 security/reporting closure.

## Delivered

- Versioned Archive Core replay identity with Project/Run/Revision scope,
  normalized query parameters, selected headers, safe URL redaction, capture
  eligibility, sensitive-body detection, replay miss classification, and
  Service Worker profile-specific resolution.
- SQLite migration 013 with replay snapshot and runtime-event ledgers.
- Content-addressed response bodies under `api/responses/`, atomic writes,
  SHA-256 verification, duplicate idempotency, ambiguity detection, and
  Project/Run/Revision ownership checks.
- Browser Runtime adapter connected to both Playwright Context routing and CDP
  `Fetch.requestPaused` so strict fulfillment/abort behavior covers actual
  browser fetch/XHR traffic.
- Loopback-only Local Runtime Server with exact origin checks, Route Map and
  Original Resource Map resolution, explicit additional resources, SPA entry
  fallback metadata, canonical path/symlink checks, bounded MIME responses,
  and structured error events.
- Runtime scope checks keep Route, Original Resource, and External Dependency
  maps on one Project/Run/Revision boundary; collision/unresolved mapped
  resources cannot be reached through a direct resource path. Classified
  External Dependency entries remain observable in replay-miss reasons.
- Replay capture finalization verifies the owned Project/Run/Revision scope and
  binds body reads to the persisted identity, content digest, canonical body
  path, and complete snapshot state.
- Replay and Local Runtime unit, integration, and pinned-Chromium tests.
- Explicit Service Worker `block`, `allow`, and `profile-specific` behavior;
  profile-specific mode requires an explicit `profileMode`.

## Important boundaries

Capture never persists authorization/cookie/proxy secrets and never captures
POST/PUT/PATCH/DELETE. Strict Offline aborts unknown external dependencies,
ambiguous snapshots, unsafe identities, and body-integrity failures. The Local
Runtime does not serve arbitrary Project paths or provide preload/IPC/Node
capabilities to untrusted archived content.

## Version and migration state

SQLite schema and Project schema are now `13`; migration `013_add_network_replay`
is forward-only. Project format remains `1.1.0`, transport remains `1.11.0`,
and Playwright/Chromium pins remain unchanged. Replay, capture, and Local Runtime
contracts are version `1`.

## Validation record

The focused Phase 19 command passed **7/7** tests on the pinned repository-owned
Chromium environment:

- `tests/unit/network-replay.test.ts`
- `tests/integration/replay-persistence.test.ts`
- `tests/integration/local-runtime.test.ts`
- `tests/browser/service-worker-policy.test.ts`
- `tests/browser/network-replay.test.ts`

The command was `npm run test:phase19`; it also built the Desktop artifacts and
compiled the repository/test TypeScript projects. Broader repository gates are
recorded below after they were actually run.

The final full regression `npm test` passed **217/217** tests with no failures,
cancellations, or skips. The dedicated Browser Runtime gate passed **13/13**;
the dedicated Electron gate passed **1/1**; Unit passed **97/97**; Integration
passed **36/36**; Concurrency passed **7/7**; Recovery passed **11/11**;
Process-kill passed **4/4**; Phase 17 passed **7/7**; and Phase 18 passed
**9/9**. Typecheck, build, lint, format, architecture, contracts, migration,
Project Format, security, docs, and OKF validation gates also passed on the
final worktree. These are local deterministic/fixture gates, not authorized
target-site or cross-platform release evidence.

## Remaining work

Application Service orchestration still needs a later increment to assemble a
complete persisted archive preview from production rewrite maps and to expose
any approved user-facing controls. Phase 20 must handle broader security,
privacy, retention, and reporting hardening. No Phase 20 work is included here.

## Related records

- [Network Replay architecture](../architecture/NETWORK_REPLAY.md)
- [Local Runtime architecture](../architecture/LOCAL_RUNTIME.md)
- [Phase 19 security review](../architecture/PHASE_19_SECURITY_REVIEW.md)
- [ADR-062](adr/ADR-062-api-capture-replay-and-isolated-runtime.md)
- [Acceptance Matrix](../product/ACCEPTANCE_MATRIX.md)
- [Current handoff](../../HANDOFF.md)
