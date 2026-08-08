---
type: Phase Record
title: Product Phase 12 - Manual Login and Secure Session Manager
description: Records the implemented Manual Login and protected Session lifecycle with the remaining real-browser validation limitation.
tags: [history, phase-record, authentication, sessions, security, privacy]
status: draft
sources:
  - id: phase-twelve-report
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/840f348b1dca1d4d981d6f876dbc2eadd3529381/docs/project/PHASE_11_IMPLEMENTATION_REPORT.md
    title: Phase 11 baseline report that precedes the local Phase 12 work
  - id: phase-twelve-adr
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/840f348b1dca1d4d981d6f876dbc2eadd3529381/docs/project/adr/ADR-050-secret-store-and-sensitive-data-protection.md
    title: Phase 11 Secret Store decision used by the local Phase 12 work
owa:
  implementation_status: implemented
  verification_status: partial
  requirement_ids: [FR-AUTH-001, FR-AUTH-002, FR-CLI-001, NFR-SEC-002, NFR-SEC-003, NFR-PRIV-001, NFR-MAINT-001, NFR-TEST-001]
  acceptance_ids: [AC-P12-001, AC-P12-002, AC-P12-003, AC-P12-004, AC-P12-005, AC-P12-006, AC-P12-007, AC-P12-008, AC-P12-009, AC-P12-010, AC-P12-011, AC-P12-012, AC-P12-013, AC-P12-014, AC-P12-015]
  risk_ids: [R-108, R-109, R-110]
  evidence_ids: [OKF-EV-P12-DOMAIN, OKF-EV-P12-PERSISTENCE, OKF-EV-P12-BOUNDARY, OKF-EV-P12-TESTS, OKF-EV-P12-BROWSER, OKF-EV-P12-SECURITY, OKF-EV-P12-DOCS]
---

# Product Phase 12 - Manual Login and Secure Session Manager

Product Phase 12 implements a Project-scoped Manual Login and Secure Session
Manager. The user authenticates inside a dedicated headed Chromium Context and
explicitly confirms Save only after a configured URL/path/marker validation.
The application does not capture credentials, OTP values, CAPTCHA answers, MFA
values, or raw browser handles.

Playwright cookies, localStorage, and supported IndexedDB state are captured
only through the Browser Runtime port and passed directly to the Phase 11
Secret Store as protected `session_storage` data. SQLite stores versioned safe
metadata and an opaque reference, never serialized Storage State. Restore
creates a fresh compatible Context and validates it; valid, expired, invalid,
unavailable, configuration-missing, corrupt, and incompatible-profile results
are distinguished. Manual reauthentication preserves the last completed state
until a new validated save succeeds. Delete closes active Contexts, removes
protected data and metadata, and is idempotent.

The transport contract is 1.8.0 and SQLite schema 8 adds `browser_sessions`.
Session format, Storage State format, and affinity are version 1. `sessionStorage`
is explicitly unsupported, and proxy affinity is a future nullable contract
only. Unit and fake-runtime lifecycle evidence is present. Real pinned
Chromium evidence remains partial because the approved Playwright download
hosts were unavailable in the validation environment.
