---
type: Test Strategy
title: Phase 13 Validation
description: Records Phase 13 focused evidence, blocked browser gates, and closure requirements.
tags: [testing, security, browser, acceptance]
status: draft
owa:
  implementation_status: implemented
  verification_status: partial
  requirement_ids: [NFR-TEST-001, NFR-SEC-003, NFR-KNOW-001, NFR-KNOW-002, NFR-KNOW-003, NFR-KNOW-004]
  acceptance_ids: [AC-P13-002, AC-P13-012, AC-P13-016, AC-P13-020, AC-P13-022]
  risk_ids: [R-090, R-101, RISK-KNOW-001]
  evidence_ids: [OKF-EV-P13-TESTS, OKF-EV-P13-BROWSER, OKF-EV-P13-SECURITY, OKF-EV-P13-DOCS]
---

# Phase 13 Validation

Focused pure, contract, scope, persistence, and authentication-policy suites
provide local evidence for the hardening changes. The registered real
Chromium Session fixture (`tests/browser/session.test.ts`) and Service Worker
fixture (`tests/browser/service-worker-policy.test.ts`) remain `BLOCKED`:
normal execution cannot bind the loopback fixture server (`listen EPERM`),
while escalated execution binds but the repository-owned browser is missing or
cannot launch (`BROWSER_INSTALLATION_MISSING` / `BROWSER_LAUNCH_FAILED`).
Native platform validation is also blocked.

Phase 13 closure requires rerunning those registered browser fixtures with the
pinned runtime, executing the claimed platform matrix, and then rerunning the
full repository gates. Fake-runtime evidence must remain labeled separately.
