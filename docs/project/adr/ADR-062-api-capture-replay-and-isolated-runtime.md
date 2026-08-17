# ADR-062: Selective API Capture, Deterministic Replay, and Isolated Local Runtime

## Status

Accepted for Product Phase 19 within the reusable runtime boundary. Full
Application Service/desktop archive-preview orchestration and Phase 20 remain
later work.

## Context

Phase 18 produces rewritten page artifacts and explicit Route, Original
Resource, and External Dependency maps, but it does not fetch, serve, or
execute archived content. A safe offline preview needs a stable replay identity,
durable response bytes, strict miss behavior, and a local origin that cannot
become a general filesystem or network proxy.

## Decision

Archive Core defines replay identity and capture eligibility. Identity is scoped
by Project, Run, Revision, method, normalized URL, and selected non-sensitive
headers. Tracking query parameters are ignored, sensitive query parameters are
rejected, and only GET/HEAD can be replayed. Capture is limited to approved
JSON-like GET responses from `fetch`/`xhr`, with a bounded body and response
header allowlist.

Persistence stores metadata in SQLite migration 013 and response bytes in
content-addressed `api/responses/<sha256>.bin` files. Body writes are atomic;
the `complete` metadata row is committed only after the bytes exist. Lookup is
Project/Run/Revision scoped and reports ambiguous identities and integrity
failures instead of guessing.

Browser Runtime attaches replay enforcement to both Playwright Context routing
and the existing CDP Fetch request stage. Exact Local Runtime requests continue
through the existing authorization and budget checks. Replay matches are
fulfilled, strict misses and mutation methods are aborted, and non-strict
misses are observable before ordinary authorization decides. Runtime events are
bounded and secret-free.

The Local Runtime binds only to `127.0.0.1` on an assigned exact origin and
serves only Route/Original Resource mapped paths plus explicit resources. It
uses canonical path and symlink checks and has no preload, Node, IPC, database,
Secret Store, or external-navigation capability in the untrusted preview
surface.

Service Worker policy v1 remains block by default. `profile-specific` requires
an explicit `profileMode`; no browser default is inferred.

## Consequences

Offline fidelity is deterministic and auditable, but dynamic or sensitive
dependencies may remain unavailable. An ambiguous or corrupted snapshot cannot
silently select a response. The server can be reused by the future desktop
preview without moving privileged filesystem or Project ownership into the
browser.

## Alternatives rejected

- Capturing all methods was rejected because POST/PUT/PATCH/DELETE may mutate
  state and cannot be safely replayed from a passive archive.
- Raw URL-only keys were rejected because they permit cross-Project/Run/Revision
  collisions and query-order ambiguity.
- Blanket loopback trust was rejected because another local listener must not
  become an archive capability.
- Serving arbitrary Project-root paths was rejected because map ownership and
  canonical path checks are the runtime boundary.
- A preload bridge or archive access through the trusted renderer was rejected
  because archived HTML/JS is untrusted content.

## Evidence

- [Phase 19 implementation report](../PHASE_19_IMPLEMENTATION_REPORT.md)
- [Network Replay architecture](../../architecture/NETWORK_REPLAY.md)
- [Local Runtime architecture](../../architecture/LOCAL_RUNTIME.md)
- [Phase 19 security review](../../architecture/PHASE_19_SECURITY_REVIEW.md)
- [Replay unit test](../../../tests/unit/network-replay.test.ts)
- [Replay persistence test](../../../tests/integration/replay-persistence.test.ts)
- [Local Runtime test](../../../tests/integration/local-runtime.test.ts)
- [Chromium replay test](../../../tests/browser/network-replay.test.ts)

## Traceability

- Acceptance: AC-P19-001 through AC-P19-014.
- Related decisions: OD-079, OD-080, OD-081, OD-086, OD-087, OD-088.
- Related risks: R-029, R-096, R-119, R-120, R-121, R-122, R-123.
