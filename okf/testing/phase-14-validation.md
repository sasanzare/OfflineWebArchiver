---
type: Test Strategy
title: Phase 14 Validation
description: Records focused OTP/Picker tests, leakage controls, Run continuation, and the Phase 13 prerequisite gate.
tags: [testing, authentication, otp, browser, security]
status: draft
owa:
  implementation_status: implemented
  verification_status: partial
  requirement_ids: [NFR-TEST-001, NFR-SEC-002, NFR-SEC-003, NFR-KNOW-001, NFR-KNOW-002, NFR-KNOW-003, NFR-KNOW-004]
  acceptance_ids: [AC-P14-008, AC-P14-009, AC-P14-010, AC-P14-011, AC-P14-012, AC-P14-013]
  risk_ids: [R-090, R-101, RISK-KNOW-001]
  evidence_ids: [OKF-EV-P14-DOMAIN, OKF-EV-P14-CONTRACTS, OKF-EV-P14-INTEGRATION, OKF-EV-P14-BROWSER, OKF-EV-P14-SECURITY, OKF-EV-P14-DOCS, OKF-EV-P14-GATE]
---

# Phase 14 Validation

Focused validation covers the pure authentication contract, transport
schemas, Profile compatibility, Application Service ownership, SQLite
integration, and a local real Chromium OTP/Picker fixture. The relevant source
and test records are:

- `packages/archive-core/src/authentication.ts`
- `packages/contracts/src/index.ts`
- `packages/application-service/src/index.ts`
- `packages/browser-runtime/src/authentication-interaction.ts`
- `tests/unit/authentication.test.ts`
- `tests/integration/otp-flow.test.ts`
- `tests/browser/otp-flow.test.ts`

The registered command set is `npm run typecheck`,
`npm run contracts:check`, `npm run test:unit`, `npm run test:integration`,
`npm run test:browser`, `npm run security:check`,
`npm run migrations:validate`, `npm run docs:validate`, and
`npm run okf:validate`. The Phase 14 evidence runner records exit status,
runtime facts, and bounded command summaries under `.artifacts/`; its output
is redaction-scanned and excludes raw browser state and sensitive input.

Assertions cover locator strictness, versioning, single/segmented OTP,
success/invalid/expired/timeout/cancel/close outcomes, resend cooldown,
field clearing, Session validation, same-Run `waiting_for_auth` continuation,
temporary picker teardown, and absence of phone/OTP markers from snapshots,
results, logs, and persistence.

The current worktree's focused Phase 14 unit, integration, and browser checks
are passing. This is not a Phase 13 release promotion: the required clean
committed Windows 11 x64/native evidence gate remains blocked and is recorded
as `OKF-EV-P14-GATE` and `AC-P14-013`.
