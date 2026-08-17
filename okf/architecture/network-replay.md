---
type: Architecture Component
title: Network Replay
description: Defines selective GET capture, deterministic scoped replay, strict-offline request decisions, and bounded leakage events.
tags: [architecture, browser, network, replay, offline]
status: stable
owa:
  implementation_status: implemented
  verification_status: partial
  requirement_ids: [FR-ARCHIVE-001, NFR-SEC-002, NFR-SEC-003, NFR-PRIV-001, NFR-TEST-001]
  acceptance_ids: [AC-P13-009, AC-P13-010, AC-P19-001, AC-P19-002, AC-P19-003, AC-P19-004, AC-P19-005, AC-P19-006, AC-P19-007, AC-P19-012]
  decision_ids: [OD-079, OD-086, OD-087, OD-088]
  risk_ids: [R-096, R-101, R-119, R-120, R-121, R-122]
  evidence_ids: [OKF-EV-P13-DOMAIN, OKF-EV-P13-TESTS, OKF-EV-P19-CORE, OKF-EV-P19-PERSISTENCE, OKF-EV-P19-BROWSER, OKF-EV-P19-SECURITY]
---

# Network Replay

Replay Contract v1 derives a deterministic key from Project, Run, Project
Revision, method, normalized HTTP(S) URL, and selected non-sensitive request
headers. Tracking query keys are ignored and sensitive query keys are rejected.
Only GET/HEAD can be looked up; capture eligibility is narrower and permits only
approved JSON-like GET responses from `fetch`/`xhr`.

Persistence stores metadata in SQLite schema 13 and content-addressed bytes in
`api/responses/` with atomic writes and SHA-256 read-back verification. Browser
Runtime fulfills exact matches and aborts unsupported methods, ambiguous or
integrity-failed snapshots, and unknown external dependencies in Strict
Offline Mode. Runtime events contain bounded safe URLs and reasons; sensitive
request/response headers and body fields are not persisted.

The implementation remains separate from discovery, target-site acceptance,
full archive orchestration, and Phase 20 retention/reporting hardening.
