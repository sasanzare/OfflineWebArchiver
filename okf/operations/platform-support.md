---
type: Architecture Component
title: Platform Support
description: Defines the Windows-only current release policy and preserves deferred Linux/macOS evidence obligations without promoting unexecuted platform claims.
tags: [operations, platform, portability, validation]
status: draft
owa:
  implementation_status: planned
  verification_status: partial
  requirement_ids: [NFR-PORT-001, NFR-TEST-001]
  acceptance_ids: [AC-P13-015, AC-P13-016]
  risk_ids: [R-002, R-090, R-101]
  evidence_ids: [OKF-EV-P13-BROWSER, OKF-EV-P13-RUNNER, OKF-EV-P13-DOCS]
---

# Platform Support

The current product release is Windows-only with Windows 11 x64 as the
mandatory native target. Windows 10 is legacy/compatibility, best-effort, and
non-blocking. Linux and macOS are future-version/deferred targets; their
native evidence is preserved as roadmap work and is not a current Phase 13
acceptance gate. No platform claim is promoted from source review or a
non-native run.

The Phase 13 runner records authoritative Windows release metadata, actual OS
version and architecture, locked Node/npm/Playwright/Chromium/Electron values,
and native test results in a validated bundle. Reconciliation derives required
rows from the versioned platform-support contract in
`tools/testing/phase13-evidence-baseline.json`: the current contract requires
only `windows-11-x64`, retains Windows 10 as optional legacy evidence, and
marks Linux/macOS as future-version patterns. Bundles from different Git HEADs
or duplicate target rows are rejected. The execution procedure is maintained
in `docs/project/PHASE_13_EVIDENCE_EXECUTION_MATRIX.md`.

Final current-release evidence still requires a clean committed source
baseline, the matching source fingerprint, and the matching
acceptance-definition hash. Portability abstractions remain active so future
platform versions can add native gates without weakening the Windows policy.

The 2026-08-10 runtime reconciliation corrected a runner classification defect:
a diagnostic bundle had an `ENVIRONMENT_BLOCKED` runtime but a `PRODUCT_FAIL`
matrix status because the Desktop classifier omitted the Chromium prerequisite
and ignored blocker text on stdout. The corrected runner classifies runtime
blockers as `ENVIRONMENT_BLOCKED`; this changes no security requirement and
does not promote a deferred platform. Harness failures remain
`TEST_INFRA_FAILURE` and are not promoted to product failures.
A new clean committed baseline is required before native matrix execution.

The 2026-08-11 Windows diagnostic confirmed that the runner itself can reach
the native gates after its subprocess correction. The host reported Windows
11 x64, Node 24, npm 11, official Playwright Chromium revision 1194/build
141.0.7390.37, and Electron 43.2.0; browser verification, the remediated
10/10 Browser Runtime suite, and Desktop smoke executed. The dirty source tree
prevents acceptance promotion; the deferred Linux/macOS rows are not a
current-release blocker. The original direct `npm.cmd` spawn failure is
recorded as `TEST_INFRA_FAILURE`, and the Service Worker fixture assumption is
recorded as a separate `TEST_INFRA_FAILURE`; neither changes platform
requirements.
