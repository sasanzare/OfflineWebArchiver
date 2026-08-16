---
type: Data Model
title: Route, Original Resource, and External Dependency Maps
description: Defines the deterministic traceability maps produced by the Phase 18 stored-content transformation.
tags: [data, route-map, dependency-map, provenance, spa, phase-18]
status: stable
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-ARCHIVE-001, FR-ARCHIVE-002, NFR-PORT-002, NFR-REL-002, NFR-TEST-001]
  acceptance_ids: [AC-P18-004, AC-P18-006, AC-P18-007, AC-P18-008, AC-P18-009, AC-P18-012]
  decision_ids: [OD-081, OD-085]
  risk_ids: [R-031, R-045, R-115, R-117]
  evidence_ids: [OKF-EV-P18-REWRITER, OKF-EV-P18-MAPS, OKF-EV-P18-TESTS]
---

# Route, Original Resource, and External Dependency Maps

Route Map entries connect original and normalized Page URLs to portable local
routes, Page identity, route type, resolution state, and optional SPA fallback
metadata. Extensionless routes remain navigation routes and are not treated as
physical filenames. Stable ordering and explicit collision records cover
trailing slash, case, Unicode, and route-key ambiguity.

Original Resource Map preserves the relationship between original URL identity,
archived entity, and local representation for Pages and completed Assets.
External Dependency Map entries retain bounded source Page, raw reference,
resolved URL, element/attribute, resource kind, and classification. Missing,
external, blocked, unsupported, and future-replay references remain observable
and are never local success merely because a path-shaped value exists.
