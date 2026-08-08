# ADR-051: Manual Login and Secure Session Manager

## Status

Accepted for the Product Phase 12 implementation; final validation remains
`PARTIAL` until the pinned repository-owned Chromium fixture can run.

## Context

Authorized users need to complete identity-provider redirects, CAPTCHA, MFA,
and OTP challenges themselves. The application must reuse a valid browser
session later without collecting credentials or writing Storage State into the
ordinary Project database, logs, exports, diagnostics, or renderer state.

## Decision

Add a dedicated Browser Runtime authentication Context with a headed manual mode
and a fresh headless restored mode. Restrict document navigation to explicit
approved origins and validate authentication against a configured URL/path and
optional marker. Capture Playwright cookies, localStorage, and supported
IndexedDB state only after an explicit `Save Session` confirmation.

Pass the serialized Storage State directly through the Phase 11 Secret Store
using a `session_storage` kind and declared purpose. Persist only versioned,
Project-owned metadata and an opaque reference in SQLite. Require Browser
Profile compatibility before restore, record a nullable future proxy affinity,
and fail closed on incompatible or malformed state. During reauthentication,
retain the completed old metadata/reference until the new state has validated
and been successfully written. Make deletion close active Contexts and remove
both protected payload and metadata idempotently.

## Consequences

Manual identity-provider interaction is supported without credential capture or
automation of security challenges. The normal CLI/Desktop boundary remains
metadata-only, and later crawl/render work can request restoration through a
narrow port. `sessionStorage` is not persisted; Phase 13/14/15 work must add
separate explicit contracts rather than expanding this boundary implicitly.

## Alternatives

- Store Playwright Storage State in SQLite: rejected because the ordinary
  Project database and export boundary must remain non-sensitive.
- Capture credentials from form fields or automate provider challenges:
  rejected because the user must remain in control of authentication and the
  application must not receive those values.
- Reuse a render Context: rejected because authentication needs a dedicated
  headed/fresh Context lifecycle and a narrower interactive policy.
- Replace an old reference when reauthentication starts: rejected because a
  failed attempt must not destroy a previously valid Session.

## Security impact

Positive: explicit consent and validation, Secret Store purpose boundaries,
Project/Profile isolation, profile fail-closed behavior, fresh restore Contexts,
safe transport projection, redacted observability, and idempotent deletion.
Residual runtime copies, filesystem remnants, browser provisioning drift, and
native provider availability remain explicit limitations.

## Migration impact

SQLite schema advances from 7 to 8 with a `browser_sessions` metadata ledger.
Existing Projects migrate forward without creating a Session or Secret Store
payload implicitly. The Project manifest/schema feature flag records the
authentication capability and remains secret-free.

## Evidence

- [Session domain](../../../packages/archive-core/src/sessions.ts)
- [Browser Runtime](../../../packages/browser-runtime/src/index.ts)
- [Session lifecycle integration](../../../tests/integration/session-lifecycle.test.ts)
- [Real Chromium fixture](../../../tests/browser/session.test.ts)
- [Phase 12 security review](../../architecture/PHASE_12_SECURITY_REVIEW.md)

## Traceability

- Acceptance: `AC-P12-001` through `AC-P12-015`
- Requirements: `FR-AUTH-001`, `FR-AUTH-002`, `NFR-SEC-002`, `NFR-SEC-003`, `NFR-PRIV-001`
- Risks: `R-108`, `R-109`, `R-110`
- OKF change: `OKF-CHG-P12-001`

