# ADR-052: Trust Zones and Privilege Boundaries

## Status

Accepted for Product Phase 13 hardening.

## Context

The product has a trusted application UI, a privileged local Application
Service, and a Browser Runtime that handles untrusted site content. A future
archive-rendering surface will also handle untrusted archived HTML and JavaScript.
Archived content must never gain Node.js, filesystem, Secret Store, session
secret, privileged IPC, or arbitrary out-of-root access.

## Decision

Keep three explicit zones: Trusted Application UI, Privileged Application
Service, and Untrusted Archive Runtime. The current Electron window is only the
trusted renderer surface: `contextIsolation`, `sandbox`, and `webSecurity` are
enabled, `nodeIntegration` is disabled, navigation and popups are denied except
for the expected renderer URL, webviews and downloads are denied, and the
preload bridge exposes only schema-validated `execute` and bounded path
selection. IPC additionally checks the sender window, sender frame, exact
renderer origin, command allowlist, and approved path set before dispatching to
Application Service.

No archived HTML is loaded in the current desktop window. When an archive
runtime is introduced, it must use the versioned baseline exported by the
desktop boundary: no preload or IPC bridge, Node integration disabled, context
isolation and sandbox enabled, webviews disabled, and external navigation
denied. It may communicate only through persisted, non-sensitive results and
not through a privileged command channel.

## Consequences

The existing trusted UI remains a narrow adapter and the privileged service is
the only owner of Project, SQLite, Secret Store, and Browser Runtime access.
The future archive viewer requires a separate window/context rather than a
renderer mode toggle. The current product does not claim archive execution.

## Alternatives

- Load archived HTML in the trusted renderer: rejected because it would mix
  untrusted content with the privileged bridge.
- Give archived content a filtered Node API: rejected because filtering is a
  broad privilege surface and is unnecessary for offline rendering.
- Allow arbitrary renderer IPC and rely on command handlers: rejected because
  sender/origin isolation must hold before application dispatch.

## Security Impact

Positive. The boundary prevents archived content from reaching Node, fs,
secrets, session state, privileged commands, or paths outside the Project root.
The current residual limitation is that no separate archive runtime exists yet.

## Portability Impact

The policy applies to Electron on the primary Windows 11 target and is
independent of OS-specific Secret Store implementation. Future archive runtime
validation must be repeated on each supported packaged target.

## Testing Impact

Desktop smoke tests verify renderer isolation and the secure bridge. IPC tests
cover authorized and unauthorized senders. The Phase 13 security regression
matrix adds command allowlist, frame-origin, path approval, popup, webview,
download, and untrusted-runtime non-access assertions.

## Migration Impact

No database migration. The transport contract is bumped to `1.9.0` because the
run-control result now exposes the separated run state.

## Evidence

- `apps/desktop/src/main/index.ts`
- `apps/desktop/src/preload.ts`
- `apps/desktop/src/main/ipc-transport.ts`
- `tests/integration/desktop-transport.test.ts`
- `tests/electron/desktop-smoke.test.ts`
- `docs/architecture/TRUST_ZONES_AND_IPC.md`

## Phase Impact

This ADR closes the Phase 13 trust-boundary review for the existing desktop
surface and defines the future archive-runtime boundary. It does not implement
an archive viewer or any Phase 14 feature.

## Traceability

- Acceptance: `AC-P13-004`, `AC-P13-005`, `AC-P13-016`
- Security review: `docs/architecture/PHASE_13_SECURITY_REVIEW.md`
- Baseline audit: `docs/project/POST_PHASE_12_BASELINE_AUDIT.md`

