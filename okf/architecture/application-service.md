---
type: Architecture Component
title: Application Service
description: Defines the application-service orchestration boundary for local commands and rendering.
tags: [architecture, application-service, orchestration]
status: stable
sources:
  - id: application-service-source
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/packages/application-service/src/index.ts
    title: Application Service production source
  - id: application-service-tests
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/tests/integration/application-service.test.ts
    title: Application Service integration tests
owa:
  implementation_status: partial
  verification_status: verified
  requirement_ids: [NFR-MAINT-001, FR-CLI-001, FR-PROJECT-002]
  acceptance_ids: [AC-MAINT-001, AC-CLI-001, AC-P04-023]
  decision_ids: [OD-009, OD-013]
  risk_ids: [R-002, R-029, R-013]
  evidence_ids: [OKF-EV-P03-SOURCE, OKF-EV-P03-TESTS]
  legacy_ids: [OKF-DOM-005]
---

# Application Service

The Application Service is the orchestration boundary for the versioned command surface. Contract 1.5 commands are authorized and composed here. The service composes scope policy, the [Queue](../workflow/queue.md), [Leases](../recovery/leases.md), [Checkpoint Recovery](../recovery/checkpoint-recovery.md), [Browser Runtime](browser-runtime.md), and [Rendering](../workflow/rendering.md) capabilities through ports and adapters.

`render.start` accepts an existing queued Job rather than an ad-hoc URL. The service owns stage events, heartbeat and lease renewal, pause observation, fenced commit or failure, error translation, and cleanup. Desktop and CLI invoke the same service. Raw Browser, Playwright, and SQLite handles do not cross the service boundary.

Automatic discovery, automatic enqueue, and later network workflows remain planned. This Concept is the authoritative human-readable application-service knowledge source; production code remains authoritative for executable behavior.
