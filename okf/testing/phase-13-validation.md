---
type: Test Strategy
title: Phase 13 Validation
description: Records Phase 13 focused evidence, Windows-only current-release closure, deferred platform scope, and closure requirements.
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
provide local evidence for the hardening changes. On the verified Windows host,
the registered real Chromium Session and IndexedDB fixtures pass, and the
Service Worker fixture now passes explicit `block` and `allow` registration and
fetch-routing checks. The current release gate is Windows 11 x64; its working-
tree evidence is diagnostic until the reconciliation is committed and the
Windows evidence is rerun from a clean source baseline. Windows 10 is
legacy/non-blocking, while Linux and macOS are deferred future-version work.

Phase 13 closure requires rerunning those registered browser fixtures with the
pinned runtime on the current Windows 11 target, then rerunning the full
repository gates. The canonical runner, bundle schema, status model, versioned
platform-support contract, and reconciliation commands are recorded in
`docs/project/PHASE_13_EVIDENCE_EXECUTION_MATRIX.md` and implemented by
`tools/testing/run-phase13-evidence.mjs`. The exact execution and acceptance
reconciliation are also recorded in `docs/project/PHASE_13_CLOSURE_REPORT.md`.
Deferred Linux/macOS rows remain available for later support decisions but are
not required by the current reconciliation.
Fake-runtime evidence must remain labeled separately.

Final native acceptance must use the clean committed source baseline declared
by `tools/testing/phase13-evidence-baseline.json`. Each bundle records the
deterministic source fingerprint and acceptance-definition hash; reconciliation
rejects dirty or source-mismatched bundles even when their test commands pass.

The final runtime remediation found and corrected an evidence-classification
defect: the Desktop smoke reported the missing Chromium runtime on bounded
stdout, while the runner only inspected stderr/spawn diagnostics and did not
include Chromium in the Desktop environment concerns. Regression tests now
separate `ENVIRONMENT_BLOCKED` for missing required runtimes from
`PRODUCT_FAIL` for a valid runtime with a product assertion failure. The
corrected diagnostic bundle remains non-promotable while the remediation tree
is dirty. An unassessable command is classified separately as
`TEST_INFRA_FAILURE` and is preserved during current-release aggregation.

## Windows evidence-runner compatibility

On 2026-08-11 the Windows native runner exposed a subprocess-planning defect:
both entry points passed `npm.cmd` directly to Node child-process execution,
which failed with `spawn EINVAL` before evidence collection. The incident is
`TEST_INFRA_FAILURE`, not a product result. The corrected runner uses
`process.execPath` with the npm JavaScript CLI from `npm_execpath` (or the
standard Windows installation path), explicit argument arrays, inherited
environment preservation, and no blanket shell invocation. Synchronous spawn
errors are retained as bounded diagnostics.

The focused command-planning regression covers POSIX and Windows Node/npm
commands, spaces in paths and arguments, and environment preservation. The
unit suite passed 63/63. Actual Windows reruns of both runner entry points
completed without `spawn EINVAL`; the diagnostic bundle validated and recorded
official Playwright Chromium and Electron. It remains non-promotable because
the reconciliation source is uncommitted and the current Windows 11 release
evidence must be rerun.

The same Windows diagnostic environment ran the pre-remediation full repository
suite with 168 tests: 166 passed, 2 failed, and 0 skipped. The failures were
the browser Interaction popup trace assertion and the Service Worker policy
assertion. After the Service Worker fixture remediation, the full repository
suite passed 169/169 with 0 skipped; the dirty evidence bundle remains
non-promotable until a clean commit and a fresh Windows 11 run are available.

## AC-P13-012 Service Worker remediation

The pre-remediation failure was a fixture-harness assumption, classified as
`TEST_INFRA_FAILURE`: pinned Playwright `serviceWorkers: "block"` emits
`Service Worker registration blocked by Playwright`, leaves the page's
registration promise pending, and creates no registration/controller. The
fixture had expected rejection and remained `pending`. The corrected fixture
observes the browser warning, verifies that no worker-controlled probe reaches
the fixture server, and verifies explicit allow registration, activation,
control, and interception. The runner's generic `network` stdout false
positive is also covered by a classification regression. The focused browser
suite passed 10/10 and the unit suite passed 64/64 after the remediation.
