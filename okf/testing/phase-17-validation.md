---
type: Test Strategy
title: Phase 17 Validation
description: Records deterministic validation for Asset identity, storage, resume, concurrency, scheduler integration, and path safety.
tags: [testing, phase-17, assets, recovery, security, concurrency]
status: stable
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [NFR-TEST-001, NFR-REL-002, NFR-PORT-002, NFR-KNOW-001]
  acceptance_ids: [AC-P17-003, AC-P17-006, AC-P17-007, AC-P17-008, AC-P17-014]
  decision_ids: [OD-084]
  risk_ids: [R-012, R-016, R-082, R-083, R-084]
  evidence_ids: [OKF-EV-P17-DOMAIN, OKF-EV-P17-PERSISTENCE, OKF-EV-P17-SECURITY, OKF-EV-P17-TESTS]
---

# Phase 17 Validation

`npm run test:phase17` runs seven deterministic tests covering Core URL/path
identity and resume decisions, SQLite source idempotency and active fencing,
content deduplication, Page↔Asset relations, durable Range resume after a
stream interruption, and root/symlink safety. The fixture network is an
in-memory `AssetNetworkPort`; it does not contact an external host.

The broader repository gates remain separate. Focused evidence does not promote
Phase 9 discovery, production HTTP/Browser adapter wiring, target-site capture,
rewriting, replay, or clean-HEAD release status.
