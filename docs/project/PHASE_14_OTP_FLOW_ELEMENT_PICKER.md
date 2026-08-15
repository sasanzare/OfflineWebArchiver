# Product Phase 14 — OTP Flow and Element Picker

## Status

**PARTIAL** — the Phase 14 implementation boundary, focused tests, integration
coverage, and real Chromium fixture pass in the current worktree. Final phase
promotion remains blocked by the pre-existing Phase 13 clean-committed
Windows 11 x64/native evidence gate. This report does not authorize Phase 15
proxy implementation by itself.

## Scope

Phase 14 adds explicit, visible user participation for configured OTP login
flows. It covers:

- versioned Locator, Login Flow, Element Picker, and OTP policy contracts;
- role/label/placeholder/test-id/attribute/CSS locators with bounded frame
  context and safe URL/condition descriptors;
- a temporary page-local native Playwright Element Picker that returns only a
  safe locator and semantic element kind;
- phone and country-code controls, single-field OTP, and bounded segmented OTP;
- resend cooldown, attempt/expiry/timeout outcomes, cancel, and browser-close
  handling;
- the Core authentication state machine and Application Service ownership;
- `waiting_for_auth` on the existing Crawl Run, with the same Run returning to
  `running` only after Session validation;
- protected Session save and validate through the existing Session boundary;
- Phase 13 security regressions, redaction, and privacy assertions.

It does not add SMS interception, CAPTCHA solving, password capture, proxy
routing, Worker Pool scheduling, discovery, downloading, rewriting, replay
execution, or a final desktop configuration surface.

## Architecture and contracts

`packages/archive-core/src/authentication.ts` owns the pure versioned
descriptors, strict bounds, transitions, outcomes, and `OtpFlowEngine`.
`packages/contracts/src/index.ts` exposes contract `1.10.0` command/result/error
schemas for `otp.*` and `elementPicker.*`. Login Flow configuration is an
optional canonical Profile field; old Profiles remain compatible when the
field is absent.

`packages/browser-runtime/src/authentication-interaction.ts` is the only
Playwright adapter for Locator resolution, field interaction, condition
checks, and picker lifecycle. The Picker uses a temporary page-local overlay
and native page events. It has no preload bridge, capability token, DOM handle,
form-value metadata, or general renderer-to-service channel.

`packages/application-service/src/index.ts` starts and owns the flow against
the current Session. It sets the same Run to `waiting_for_auth`, keeps safe
flow metadata in the result boundary, saves the validated Session through the
existing protected command, and restores the same Run to `running`. Cancel or
browser close leaves the Run recoverable and does not create a new Run.

## Authentication lifecycle

The Core state machine covers `unauthenticated`, `authenticating`,
`authenticated`, `expired`, and `re_auth_required`. OTP outcomes distinguish
success, invalid code, expired code, timeout, resend cooldown, cancellation,
and browser closure. A single OTP field or a bounded ordered segment set is
cleared after use and on flow termination. Snapshot and result types contain
state, attempt counters, deadlines, and safe identifiers only.

The flow never reads or persists a phone or OTP value outside the visible
configured browser fields and ephemeral local variables. Phone and OTP values
are excluded from SQLite, Secret Store metadata, transport results, logs,
interaction traces, screenshots, diagnostics, evidence bundles, HANDOFF, and
OKF records. This is a privacy invariant, not a redaction-after-persistence
strategy.

## Persistence and migration

No SQLite migration was added. The optional Login Flow descriptor is stored in
the existing canonical Profile JSON and is included in the Profile hash only
when explicitly configured. OTP input and phone input have no database schema,
Session metadata field, export field, or Secret Store payload. Protected
Storage State remains owned by the existing Secret Store boundary; Phase 14
only reuses Session save/validate operations.

## Validation and evidence

Focused validation covers Core, contract schemas, Application Service,
persistence integration, and a local Chromium fixture. The registered checks
are:

- `npm run typecheck`
- `npm run contracts:check`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:browser`
- `npm run security:check`
- `npm run migrations:validate`
- `npm run docs:validate`
- `npm run okf:validate`

The repository-owned `npm run test:phase14:evidence` command records a
redacted, same-HEAD evidence summary under `.artifacts/phase14-evidence/`.
The bundle records command status, runtime facts, and the unresolved Phase 13
prerequisite; it never records phone/OTP values or raw browser state.

## Acceptance mapping

The authoritative rows are [AC-P14-001 through AC-P14-013](../product/ACCEPTANCE_MATRIX.md).
AC-P14-001 through AC-P14-012 are locally evidenced by source, focused tests,
the security check, and documentation validators. AC-P14-013 remains
`BLOCKED` until the Phase 13 clean committed Windows 11 x64/native evidence
bundle is inspected and reconciled.

## Known limitations and next step

The current environment can execute the focused real Chromium fixture, but
that result is not a substitute for the Phase 13 release-promotion procedure,
which requires clean committed source, the approved native matrix, and
inspection of the registered evidence bundle. The next safe step is to close
that Phase 13 gate. After that product decision, the next user-requested phase
is **Phase 15 — Proxy Manager and Health Monitor**; no proxy code is included
in Phase 14.

Related records:

- [Phase 14 security review](../architecture/PHASE_14_SECURITY_REVIEW.md)
- [Phase 14 ADR](adr/ADR-057-otp-flow-and-element-picker.md)
- [Authentication Sessions architecture](../architecture/AUTHENTICATION_SESSIONS.md)
- [Browser Interaction architecture](../architecture/BROWSER_INTERACTION.md)
- [Phase 13 closure report](PHASE_13_CLOSURE_REPORT.md)
