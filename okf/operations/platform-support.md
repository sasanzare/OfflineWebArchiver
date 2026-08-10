---
type: Architecture Component
title: Platform Support
description: Defines platform support policy and evidence requirements without promoting unexecuted platform claims.
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

Windows 11 x64 is the primary target for the current product line. Windows 10
is a legacy compatibility target; Linux and macOS are compatibility targets
only when their own install, Electron, Browser, Secret Store, filesystem, and
SQLite evidence is available. No platform claim is promoted from source review
or a non-native run.

The Phase 13 matrix is documented, but native evidence is not available in the
current environment. The native evidence runner records the actual OS version,
architecture, locked Node/npm/Playwright/Chromium/Electron values, and native
test results in a validated bundle. Windows 11 x64 is the primary matrix row;
Windows 10 is legacy/optional, and Linux/macOS rows retain their observed
architecture rather than receiving an invented support promise. Bundles from
different Git HEADs or duplicate target rows are rejected by reconciliation.
The execution and transfer procedure is maintained in
`docs/project/PHASE_13_EVIDENCE_EXECUTION_MATRIX.md`.
The final matrix also requires one clean committed source baseline, the
matching source fingerprint, and the matching acceptance-definition hash from
`tools/testing/phase13-evidence-baseline.json`.
