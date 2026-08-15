---
type: Architecture Component
title: Authentication Sessions
description: Defines the Manual Login Context, protected Storage State lifecycle, and Project/Profile isolation.
tags: [architecture, authentication, sessions, security]
status: stable
sources:
  - id: authentication-sessions-source
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/840f348b1dca1d4d981d6f876dbc2eadd3529381/packages/archive-core/src/index.ts
    title: Archive Core public boundary at the Phase 12 starting commit
  - id: authentication-sessions-architecture
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/840f348b1dca1d4d981d6f876dbc2eadd3529381/docs/architecture/BROWSER_RUNTIME.md
    title: Browser Runtime architecture baseline at the Phase 12 starting commit
owa:
  implementation_status: implemented
  verification_status: partial
  requirement_ids: [FR-AUTH-001, FR-AUTH-002, NFR-SEC-002, NFR-SEC-003, NFR-PRIV-001]
  acceptance_ids: [AC-P12-001, AC-P12-002, AC-P12-003, AC-P12-004, AC-P12-005, AC-P12-006, AC-P12-007, AC-P12-008, AC-P12-009, AC-P12-010, AC-P12-011, AC-P12-012, AC-P12-013, AC-P14-003, AC-P14-004, AC-P14-005, AC-P14-006, AC-P14-007, AC-P14-008]
  risk_ids: [R-108, R-109, R-110]
  evidence_ids: [OKF-EV-P12-DOMAIN, OKF-EV-P12-BROWSER, OKF-EV-P12-BOUNDARY, OKF-EV-P12-TESTS, OKF-EV-P14-DOMAIN, OKF-EV-P14-INTEGRATION, OKF-EV-P14-BROWSER, OKF-EV-P14-SECURITY]
---

# Authentication Sessions

Product Phase 12 provides an explicit Manual Login and Secure Session Manager.
The user authenticates in a visible headed Chromium Context. Phase 14 adds a
separate configured OTP interaction boundary for phone/country-code controls,
single-field OTP, and bounded segmented OTP. The application does not
intercept SMS, solve CAPTCHA, capture passwords, or bypass challenges. Save is
an explicit validated action; only protected Storage State is handed to the
Phase 11 Secret Store.

Session metadata is Project-owned and Profile-bound. It records lifecycle,
validation, format, capability, affinity, and revision information while
excluding raw browser state from normal SQLite, transport, logs, exports, and
diagnostics. Restore resolves the protected reference only after ownership and
Profile checks, creates a fresh controlled Context, validates the configured
URL/marker, and closes the Context. Failed reauthentication preserves the last
completed reference until a new validated save succeeds.

`sessionStorage` is not persisted. Future proxy affinity is represented only by
a versioned nullable identifier; proxy selection and routing are later-phase
responsibilities.

Phase 14 Login Flow descriptors are optional Profile JSON and contain only
bounded locator/policy metadata. The temporary Element Picker runs in the
native Browser Runtime page, returns a locator and semantic kind, and tears
down its listeners and overlay on every exit. Phone and OTP values remain in
visible browser fields and bounded ephemeral variables only; they are not
stored in SQLite, Session metadata, Secret Store metadata, results, logs,
traces, screenshots, diagnostics, evidence, or knowledge records. OTP fields
are cleared after use and termination. The existing Crawl Run is marked
`waiting_for_auth` during the flow and returns to `running` only after Session
validation; no replacement Run is created.
