---
type: Phase Record
title: Product Phase 18 - HTML Rewriter, Route Map, and Dependency Map
description: Records the deterministic stored-content transformation and future Phase 19 handoff boundary.
tags: [history, phase-record, rewrite, route-map, dependency-map, phase-18]
status: stable
sources:
  - id: phase-eighteen-report
    resource: Phase 18 implementation report in the repository
    title: Phase 18 implementation report
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-ARCHIVE-001, FR-ARCHIVE-002, NFR-TEST-001, NFR-KNOW-001, NFR-KNOW-002, NFR-KNOW-003, NFR-KNOW-004]
  acceptance_ids: [AC-P18-001, AC-P18-006, AC-P18-009, AC-P18-013]
  decision_ids: [OD-085]
  risk_ids: [R-089, R-115, R-116, R-117, R-118, RISK-KNOW-001]
  evidence_ids: [OKF-EV-P18-DOCS, OKF-EV-P18-TESTS]
---

# Product Phase 18 - HTML Rewriter, Route Map, and Dependency Map

Phase 18 adds a pure, bounded transformation over stored rendered pages and
completed Phase 17 Asset mappings. It produces rewritten HTML/CSS references,
deterministic Route and Original Resource maps, and an observable External
Dependency Map. Rewritten HTML is a separate atomic derived artifact.

The phase stops before Network Replay, strict offline enforcement, isolated
runtime serving, Service Worker runtime behavior, and full validation/reporting.
The [Phase 18 validation](../testing/phase-18-validation.md) and repository
implementation/security records provide the current evidence boundary.
