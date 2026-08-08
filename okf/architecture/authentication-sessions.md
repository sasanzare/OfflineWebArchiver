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
  acceptance_ids: [AC-P12-001, AC-P12-002, AC-P12-003, AC-P12-004, AC-P12-005, AC-P12-006, AC-P12-007, AC-P12-008, AC-P12-009, AC-P12-010, AC-P12-011, AC-P12-012, AC-P12-013]
  risk_ids: [R-108, R-109, R-110]
  evidence_ids: [OKF-EV-P12-DOMAIN, OKF-EV-P12-BROWSER, OKF-EV-P12-BOUNDARY, OKF-EV-P12-TESTS]
---

# Authentication Sessions

Product Phase 12 provides an explicit Manual Login and Secure Session Manager.
The user authenticates in a visible headed Chromium Context. The application
does not observe form values or automate CAPTCHA, MFA, or OTP challenges. Save
is an explicit validated action; only protected Storage State is handed to the
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
