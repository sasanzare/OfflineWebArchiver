---
type: Security Control
title: Authentication Session Security
description: Defines the no-capture, protected-storage, validation, and isolation controls for Manual Login Sessions.
tags: [security, authentication, sessions, privacy]
status: stable
sources:
  - id: authentication-sessions-security-review
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/840f348b1dca1d4d981d6f876dbc2eadd3529381/docs/architecture/PHASE_11_SECURITY_REVIEW.md
    title: Phase 11 security boundary baseline used by local Session controls
  - id: authentication-sessions-runtime
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/840f348b1dca1d4d981d6f876dbc2eadd3529381/packages/browser-runtime/src/index.ts
    title: Browser Runtime security baseline at the Phase 12 starting commit
stale_after: "2026-11-07"
owa:
  implementation_status: implemented
  verification_status: partial
  requirement_ids: [FR-AUTH-001, FR-AUTH-002, NFR-SEC-002, NFR-SEC-003, NFR-PRIV-001]
  acceptance_ids: [AC-P12-002, AC-P12-003, AC-P12-004, AC-P12-005, AC-P12-007, AC-P12-008, AC-P12-009, AC-P12-010, AC-P12-011, AC-P12-013]
  risk_ids: [R-108, R-109, R-110]
  evidence_ids: [OKF-EV-P12-SECURITY, OKF-EV-P12-BOUNDARY, OKF-EV-P12-TESTS]
---

# Authentication Session Security

Manual Login is a visible user-controlled operation. No password, OTP, CAPTCHA
answer, MFA value, or form value is read by the application. Save requires a
literal confirmation and an explicit validation URL/origin/path with an
optional marker.

Serialized Storage State is treated as sensitive and is available only inside a
declared Phase 11 Secret Store callback. Normal SQLite, IPC, CLI, Desktop,
logs, diagnostics, screenshots, and ordinary exports receive safe metadata or
redacted projections only. Project ownership, Profile compatibility, format
versions, and optimistic revisions are checked before restore. A failed
reauthentication does not remove the last valid protected reference.
