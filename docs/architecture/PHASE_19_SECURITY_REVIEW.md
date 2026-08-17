# Product Phase 19 Security Review

Phase 19 is implemented within the selective GET capture, deterministic replay,
map-bounded Local Runtime, and isolated preview boundaries. It does not claim
automatic discovery, a production target-site run, or Phase 20 security
hardening/reporting closure.

## Controls reviewed

| Area | Control | Evidence |
|---|---|---|
| Capture scope | Only GET JSON-like `fetch`/`xhr` responses are eligible; mutations are rejected | `packages/archive-core/src/network.ts`; `tests/unit/network-replay.test.ts` |
| Secret minimization | Sensitive query names, headers, and recognizable JSON secret fields are rejected; persisted headers are allowlisted | Core unit tests; SQLite replay integration |
| Identity isolation | Replay keys include Project, Run, Revision, method, normalized URL, and selected headers | Core unit and SQLite isolation tests |
| Content integrity | SHA-256 body identity, atomic body write, bounded size, ownership and read-back verification | `packages/persistence-sqlite/src/replay.ts`; replay persistence test |
| Strict Offline | Browser Context routing plus CDP Fetch fulfills matches and aborts misses, mutations, invalid identities, and integrity failures | `packages/browser-runtime/src/network-replay.ts`; real Chromium test |
| Leakage evidence | Runtime events carry bounded safe URLs, reason, match state, scope identifiers, and no raw body/header values | replay event contract and browser evidence assertions |
| Local Runtime | `127.0.0.1` exact origin, Host/Origin checks, GET/HEAD only, map-bounded resources, canonical path and symlink checks | Local Runtime integration test |
| Preview isolation | No preload/IPC/Node in the untrusted archive runtime; trusted Desktop renderer remains sender- and URL-validated | `apps/desktop/src/main/index.ts`; desktop smoke tests; trust-zone docs |
| Service Workers | Default block; explicit allow or explicit profile-specific decision; no inferred browser default | Service Worker unit and pinned Chromium tests |

## Residual risks

- Dynamic JavaScript URL construction can remain an external dependency. Strict
  Offline mode blocks it unless a matching safe GET snapshot exists.
- A response that depends on runtime credentials or a non-public session is
  rejected or may fail replay; the system does not capture those secrets to
  improve fidelity.
- Cross-platform native Chromium evidence and authorized target-site evidence
  remain outside this local Phase 19 gate.
- The application-service production path does not yet automatically assemble
  a full archive Preview session from persisted rewrite maps; the reusable Core,
  Persistence, Browser Runtime, and Local Runtime seams are implemented for the
  next orchestration increment.

## Decision

No control is weakened to make a replay pass. Unknown external dependencies,
non-GET methods, unsafe paths, ambiguous snapshots, and body-integrity failures
fail closed in Strict Offline mode.

See [ADR-062](../project/adr/ADR-062-api-capture-replay-and-isolated-runtime.md)
and the [Phase 19 implementation report](../project/PHASE_19_IMPLEMENTATION_REPORT.md).
