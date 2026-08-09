---
type: Architecture Component
title: Network Replay
description: Defines deterministic replay lookup and request-decision semantics without implementing the replay engine.
tags: [architecture, browser, network, replay, offline]
status: draft
owa:
  implementation_status: planned
  verification_status: partial
  requirement_ids: [NFR-SEC-003, NFR-TEST-001]
  acceptance_ids: [AC-P13-009, AC-P13-010]
  decision_ids: [OD-079]
  risk_ids: [R-096, R-101]
  evidence_ids: [OKF-EV-P13-DOMAIN, OKF-EV-P13-TESTS]
---

# Network Replay

Replay Contract v1 derives a deterministic key from the normalized method and
URL. Lookup returns a bounded response descriptor or a miss; fulfillment is
explicit, and unknown external dependencies abort in Strict Offline Mode.
Sensitive request headers such as authorization, cookies, proxy credentials, and
browser handles are not persisted in replay metadata. Approved local runtime
origins are separately observable.

Phase 13 defines the contract only. Capture, storage, fulfillment execution,
revalidation, and a complete replay engine are deferred.
