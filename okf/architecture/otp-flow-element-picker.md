---
type: Architecture Component
title: OTP Flow and Element Picker
description: Defines versioned Login Flow descriptors, visible OTP participation, and temporary native element selection.
tags: [architecture, authentication, otp, picker, security]
status: draft
owa:
  implementation_status: implemented
  verification_status: partial
  requirement_ids: [FR-AUTH-001, FR-AUTH-002, FR-RECOVERY-001, NFR-SEC-002, NFR-SEC-003, NFR-PRIV-001, NFR-TEST-001]
  acceptance_ids: [AC-P14-001, AC-P14-002, AC-P14-003, AC-P14-004, AC-P14-005, AC-P14-006, AC-P14-007, AC-P14-008, AC-P14-009, AC-P14-010, AC-P14-011, AC-P14-012, AC-P14-013]
  risk_ids: [R-108, R-109, R-110, RISK-KNOW-001]
  evidence_ids: [OKF-EV-P14-DOMAIN, OKF-EV-P14-CONTRACTS, OKF-EV-P14-INTEGRATION, OKF-EV-P14-BROWSER, OKF-EV-P14-SECURITY, OKF-EV-P14-DOCS, OKF-EV-P14-GATE]
---

# OTP Flow and Element Picker

Product Phase 14 extends the existing visible Manual Login and protected
Session boundary. Archive Core owns versioned Locator, Login Flow, Element
Picker, OTP policy, transitions, outcomes, and the `OtpFlowEngine`. The
transport surface is contract `1.10.0`; Locator, Login Flow, and Element Picker
descriptors are version `1`.

The Login Flow is optional canonical Profile JSON. It contains only bounded
metadata: a safe login URL, locator strategies, optional same-page/frame
context, success/failure conditions, phone/country-code controls, OTP mode,
and bounded timeout/resend/attempt policy. Unsafe URLs, dynamic/value
attributes, unbounded CSS, invalid segment counts, and unsafe timing are
rejected.

The Browser Runtime resolves descriptors through native Playwright APIs. The
Element Picker is page-local and temporary. It highlights selectable controls,
returns only a safe locator and semantic kind, and tears down listeners and
overlay state on selection, stop, navigation, close, or error. No DOM handle,
raw form value, screenshot, or renderer bridge crosses the boundary.

The OTP state machine supports single and segmented fields, visible phone and
country-code interaction, request/resend, invalid/expired/success outcomes,
timeout, cancellation, and browser close. OTP fields are cleared after use and
termination. Phone and OTP values are never persisted or emitted in SQLite,
Secret Store metadata, Session metadata, results, events, logs, traces,
screenshots, diagnostics, evidence, or OKF records. SMS interception, CAPTCHA
solving, password capture, and automatic challenge bypass are not supported.

Application Service runs the flow against the existing Session and current
Crawl Run. The Run becomes `waiting_for_auth`; only a validated Session save
returns the same Run to `running`. Cancellation or browser closure preserves
a recoverable state and does not create a replacement Run.

Related concepts:

- [Authentication Sessions](authentication-sessions.md)
- [Contracts](contracts.md)
- [Browser Runtime](browser-runtime.md)
- [Phase 14 Validation](../testing/phase-14-validation.md)
- Phase 14 implementation report: `docs/project/PHASE_14_OTP_FLOW_ELEMENT_PICKER.md`
