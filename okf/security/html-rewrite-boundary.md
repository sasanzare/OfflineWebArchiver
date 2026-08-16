---
type: Security Control
title: HTML Rewrite Boundary
description: Constrains Phase 18 rewriting of untrusted archived content, URL references, local mappings, and derived output.
tags: [security, rewrite, untrusted-content, paths, phase-18]
status: stable
sources:
  - id: phase-18-security-review
    resource: Phase 18 HTML Rewriter security review in the repository
    title: Phase 18 security review
stale_after: 2027-08-16
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-PROJECT-004, NFR-PORT-002, NFR-SEC-003, NFR-TEST-001]
  acceptance_ids: [AC-P18-010, AC-P18-011, AC-P18-012]
  decision_ids: [OD-081, OD-085]
  risk_ids: [R-031, R-045, R-088, R-096, R-115, R-116, R-117]
  evidence_ids: [OKF-EV-P18-SECURITY, OKF-EV-P18-TESTS]
---

# HTML Rewrite Boundary

Archived HTML, CSS, and JavaScript are untrusted content. The rewriter has no
network, browser, filesystem, Secret Store, proxy, or privileged IPC
capability. It does not execute scripts, evaluate inline code, fetch external
references, or convert file URLs into local file access.

Local physical output is accepted only through the shared canonical path
contract or a validated portable Page route. The original rendered artifact is
kept intact; derived output is written separately and atomically. Unresolved
references retain bounded provenance and explicit policy classification for
later validation and replay.
