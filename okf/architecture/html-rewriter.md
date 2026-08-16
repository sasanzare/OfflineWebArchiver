---
type: Architecture Component
title: HTML Rewriter
description: Defines deterministic rewriting of stored HTML and CSS references through explicit Page and completed Asset mappings.
tags: [architecture, rewrite, html, css, provenance, phase-18]
status: stable
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-ARCHIVE-001, FR-ARCHIVE-002, FR-ASSET-001, NFR-SEC-003, NFR-TEST-001]
  acceptance_ids: [AC-P18-001, AC-P18-002, AC-P18-003, AC-P18-005, AC-P18-011, AC-P18-012]
  decision_ids: [OD-081, OD-084, OD-085]
  risk_ids: [R-031, R-045, R-089, R-115, R-116]
  evidence_ids: [OKF-EV-P18-REWRITER, OKF-EV-P18-PERSISTENCE, OKF-EV-P18-SECURITY, OKF-EV-P18-TESTS]
---

# HTML Rewriter

The Phase 18 HTML Rewriter is a pure Archive Core transformation over bounded
stored HTML and CSS. It tokenizes without executing scripts, resolves explicit
URL-bearing surfaces against the original page or CSS URL, consults explicit
Page and completed Phase 17 Asset mappings, and records unresolved references
in the External Dependency Map.

The first effective original base controls resolution and is removed from
derived HTML. Canonical links are preserved as original provenance and do not
become the only route identity. Inline JavaScript is preserved, and no
unresolved resource is downloaded by the rewriter.

Persistence stores rewritten HTML separately from the original rendered
artifact. Route Map, Original Resource Map, and External Dependency Map are
versioned, deterministic values available to later runtime/replay work.
