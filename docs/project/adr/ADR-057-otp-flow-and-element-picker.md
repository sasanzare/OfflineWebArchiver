# ADR-057: Visible OTP Flow and Temporary Element Picker

- **Status:** Accepted for Product Phase 14 implementation; phase promotion is
  conditional on the Phase 13 release gate.
- **Date:** 2026-08-12
- **Decision owners:** Product/Application Service architecture

## Context

The existing Session boundary supports direct-user visible authentication and
protected Session persistence, but it did not provide a versioned description
for common OTP login controls or a bounded way to identify those controls.
Phase 14 requires single-field and segmented OTP participation while keeping
phone and OTP data outside durable storage and general transport.

## Decisions

1. **Use versioned additive descriptors.** Locator, Login Flow, Element Picker,
   and OTP policy contracts are versioned independently from transport
   contract `1.10.0`. Strategies, frame context, URLs, conditions, segment
   counts, timeouts, and resend bounds are parsed strictly and serialized
   canonically.
2. **Keep Playwright access in Browser Runtime.** Core owns pure policy and
   transitions; Browser Runtime owns native Page/FrameLocator resolution and
   field interaction. No Playwright handle or DOM object crosses the service
   boundary.
3. **Make the Picker temporary and metadata-only.** The picker is installed
   only on the current Page, highlights candidate elements, and removes its
   listeners/overlay on selection, stop, navigation, close, or error. It
   returns only a bounded locator and semantic kind; it does not return a
   value, text content, DOM snapshot, screenshot, or capability token.
4. **Keep OTP input ephemeral.** Phone and OTP values are typed visibly into
   configured controls and held only in bounded local variables. OTP fields
   are cleared after use and termination. No value is written to SQLite,
   Secret Store metadata, Session metadata, result/event/log/trace payloads,
   screenshots, diagnostics, HANDOFF, or OKF.
5. **Reuse the existing Run and Session boundaries.** Application Service
   marks the current Run `waiting_for_auth`, starts the flow against the
   existing Session, saves and validates through the existing protected
   Session command, and returns the same Run to `running`. Cancel and browser
   close preserve a recoverable state rather than creating a replacement Run.
6. **Do not automate bypasses.** SMS interception, CAPTCHA solving, password
   capture, stealth/evasion, and automatic challenge bypass are explicitly
   outside the feature.

## Consequences

The feature can be tested deterministically with fake interactions and a local
Chromium fixture while preserving the privileged Browser Runtime boundary.
Login Flow configuration is portable Profile JSON and requires no SQLite
migration. Because final phase status is tied to the Phase 13 prerequisite,
focused Phase 14 passes do not independently promote the product release.

## Validation

See [Phase 14 implementation report](../PHASE_14_OTP_FLOW_ELEMENT_PICKER.md),
[Phase 14 security review](../../architecture/PHASE_14_SECURITY_REVIEW.md),
and [AC-P14-001 through AC-P14-013](../../product/ACCEPTANCE_MATRIX.md).
