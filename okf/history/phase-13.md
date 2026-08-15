---
type: Phase Record
title: Product Phase 13 - Architecture and Security Hardening
description: Records the completed post-Phase-12 hardening implementation, accepted Windows 11 x64 closure, and deferred future-platform evidence.
tags: [history, phase-record, architecture, security, portability]
status: draft
sources:
  - id: phase-thirteen-worktree
    resource: Phase 13 implementation working tree
    title: Current Phase 13 source and evidence set
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [NFR-SEC-003, NFR-TEST-001, NFR-REL-001, NFR-REL-002, NFR-PORT-001, NFR-PORT-002, NFR-KNOW-001, NFR-KNOW-002, NFR-KNOW-003, NFR-KNOW-004]
  acceptance_ids: [AC-P13-001, AC-P13-002, AC-P13-003, AC-P13-004, AC-P13-005, AC-P13-006, AC-P13-007, AC-P13-008, AC-P13-009, AC-P13-010, AC-P13-011, AC-P13-012, AC-P13-013, AC-P13-014, AC-P13-015, AC-P13-016, AC-P13-017, AC-P13-018, AC-P13-019, AC-P13-020, AC-P13-021, AC-P13-022]
  decision_ids: [OD-077, OD-078, OD-079, OD-080, OD-081]
  risk_ids: [R-031, R-045, R-065, R-085, R-089, R-090, R-096, R-101, RISK-KNOW-001]
  evidence_ids: [OKF-EV-P13-DOMAIN, OKF-EV-P13-PERSISTENCE, OKF-EV-P13-BOUNDARY, OKF-EV-P13-POLICY, OKF-EV-P13-TESTS, OKF-EV-P13-BROWSER, OKF-EV-P13-RUNNER, OKF-EV-P13-SECURITY, OKF-EV-P13-DOCS, OKF-EV-P13-CLOSURE]
---

# Product Phase 13 - Architecture and Security Hardening

The accepted clean committed Windows 11 x64 bundle and reconciliation close
this phase. Historical blocked diagnostic results below are retained only for
traceability and do not override the verified status in frontmatter.

## Current release scope reconciliation — 2026-08-11

The current product version is Windows-only and targets Windows 11 x64.
Windows 10 is legacy/compatibility and non-blocking. Linux and macOS are
future-version/deferred targets; their native validation obligations remain
preserved for later support decisions but are not mandatory Phase 13 rows.

The previous native reconciliation denominator required Windows 11, Windows
10, Linux, and macOS. It was replaced by the versioned platform-support
contract in `tools/testing/phase13-evidence-baseline.json`, whose only current
required target is `windows-11-x64`. The native runtime, real Chromium,
Electron, clean-source, fingerprint, acceptance-hash, full-regression, and
secret-scan requirements remain unchanged.

Product Phase 13 closes the Phase 12 all-request Authentication Context
allowlist gap and establishes versioned contracts for Crawl Run state, Network
Replay/Strict Offline behavior, Service Worker policy, canonical paths, trust
zones, and worker/network concurrency. SQLite schema 9 persists Crawl Run state
through migration 009; the transport contract is 1.9.0.

The implementation and current-release evidence gate are complete. Tests cover the pure policies,
authentication routing, scope/profile compatibility, persistence, and contract
surfaces. The registered real pinned-Chromium Session, IndexedDB restore, and
Service Worker fixtures, Session/IndexedDB restore, native Windows 11 x64,
and the full quality/security gate. The accepted bundle and reconciliation are
recorded in the Phase 13 closure report.

Related records are maintained in `docs/project/PHASE_13_IMPLEMENTATION_REPORT.md`,
`docs/project/PHASE_13_CLOSURE_REPORT.md`,
`docs/project/PHASE_13_EVIDENCE_EXECUTION_MATRIX.md`,
`docs/project/POST_PHASE_12_BASELINE_AUDIT.md`,
`docs/architecture/PHASE_13_SECURITY_REVIEW.md`, and
`docs/product/ACCEPTANCE_MATRIX.md`.

The final runtime reconciliation on 2026-08-10 found a classification defect
in the evidence runner, not a product failure. A valid structured bundle had
reported `ENVIRONMENT_BLOCKED` at the runtime level but `PRODUCT_FAIL` for its
Desktop/native matrix status because missing Chromium was not a Desktop
environment concern and the blocker was emitted on stdout. The runner now
checks both required native runtimes and scans bounded stdout, stderr, and
spawn diagnostics. Regression coverage distinguishes missing-runtime
`ENVIRONMENT_BLOCKED` from valid-runtime `PRODUCT_FAIL`; the corrected bundle
remains diagnostic until a clean committed source baseline and all required
native rows are available.

The 2026-08-11 Windows evidence execution found and corrected a separate
runner portability defect. Direct execution of `npm.cmd` through Node child
process APIs raised `spawn EINVAL` before valid evidence collection. The
runner now resolves npm's JavaScript CLI through `npm_execpath` or the
platform's Node installation, uses explicit argument arrays without a shell,
and records synchronous spawn errors. Planner regression tests passed 63/63;
actual Windows reruns reached Chromium and Electron, while the source-change
diagnostic remained non-promotable and Phase 14 remained blocked.

The follow-up AC-P13-012 investigation on the same approved Windows Chromium
found a fixture-harness mismatch: Playwright block mode warns and leaves
`register()` pending instead of rejecting, while the production context still
has no Service Worker registration, controller, or worker-controlled fetch. The
fixture now observes that browser-level block and verifies explicit allow
activation/interception. The focused Browser Runtime suite passed 10/10 and
the unit suite passed 64/64. A generic `network` stdout token also caused a
runner environment-classification false positive; its specific-signature fix
has regression coverage. Native matrix reconciliation remains pending.
