---
type: Test Strategy
title: Phase 18 Validation
description: Records deterministic validation for HTML/CSS rewriting, route/dependency maps, path safety, and atomic derived output.
tags: [testing, phase-18, rewrite, route-map, dependency-map, security]
status: stable
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [NFR-REL-002, NFR-PORT-002, NFR-SEC-003, NFR-TEST-001, NFR-KNOW-001]
  acceptance_ids: [AC-P18-001, AC-P18-006, AC-P18-009, AC-P18-010, AC-P18-012, AC-P18-013]
  decision_ids: [OD-085]
  risk_ids: [R-031, R-088, R-115, R-117, R-118]
  evidence_ids: [OKF-EV-P18-REWRITER, OKF-EV-P18-MAPS, OKF-EV-P18-PERSISTENCE, OKF-EV-P18-SECURITY, OKF-EV-P18-TESTS]
---

# Phase 18 Validation

The focused Phase 18 suite exercises URL resolution, base handling, Page and
Phase 17 Asset mapping, canonical provenance, missing and special-scheme
dependencies, srcset, CSS URL base resolution, route serialization,
extensionless and SPA metadata, case/Unicode collisions, canonical path
rejection, idempotence, and atomic derived output.

The suite uses local deterministic fixtures only. Broader repository gates
remain separate. This validation does not claim discovery, production network
adapter wiring, Network Replay, Strict Offline runtime, Local Runtime serving,
or target-site acceptance.
