---
type: Test Strategy
title: Phase 13 Validation
description: Records Phase 13 focused evidence, closure remediation, blocked browser gates, and closure requirements.
tags: [testing, security, browser, acceptance]
status: draft
owa:
  implementation_status: implemented
  verification_status: partial
  requirement_ids: [NFR-TEST-001, NFR-SEC-003, NFR-KNOW-001, NFR-KNOW-002, NFR-KNOW-003, NFR-KNOW-004]
  acceptance_ids: [AC-P13-002, AC-P13-012, AC-P13-016, AC-P13-020, AC-P13-022]
  risk_ids: [R-090, R-101, RISK-KNOW-001]
  evidence_ids: [OKF-EV-P13-TESTS, OKF-EV-P13-BROWSER, OKF-EV-P13-RUNNER, OKF-EV-P13-SECURITY, OKF-EV-P13-DOCS, OKF-EV-P13-CLOSURE]
---

# Phase 13 Validation

Focused pure, contract, scope, persistence, and authentication-policy suites
provide local evidence for the hardening changes. The registered real
Chromium Session fixture (`tests/browser/session.test.ts`) and Service Worker
fixture (`tests/browser/service-worker-policy.test.ts`) remain `BLOCKED`:
normal execution cannot bind the loopback fixture server (`listen EPERM`),
while escalated execution binds but the repository-owned browser is missing or
cannot launch (`BROWSER_INSTALLATION_MISSING` / `BROWSER_LAUNCH_FAILED`).
Native platform validation is also blocked. The closure remediation strengthens
the local fixture to require cookie, localStorage, and IndexedDB state while
asserting that sessionStorage is not serialized; this is not promoted to real
browser evidence because the approved Chromium installation is still absent.

Phase 13 closure requires rerunning those registered browser fixtures with the
pinned runtime, executing the claimed platform matrix, and then rerunning the
full repository gates. The canonical runner, bundle schema, status model,
platform targets, and reconciliation commands are recorded in
`docs/project/PHASE_13_EVIDENCE_EXECUTION_MATRIX.md` and implemented by
`tools/testing/run-phase13-evidence.mjs`. The exact execution and acceptance
reconciliation are also recorded in `docs/project/PHASE_13_CLOSURE_REPORT.md`.
Fake-runtime evidence must remain labeled separately.

Final native acceptance must use the clean committed source baseline declared
by `tools/testing/phase13-evidence-baseline.json`. Each bundle records the
deterministic source fingerprint and acceptance-definition hash; reconciliation
rejects dirty or source-mismatched bundles even when their test commands pass.
