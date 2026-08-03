---
type: Test Strategy
title: Test Strategy
description: Defines the local evidence strategy for product behavior, browser rendering, and fault recovery.
tags: [testing, strategy, browser, recovery]
status: stable
sources:
  - id: test-architecture
    resource: docs/architecture/TEST_ARCHITECTURE.md
    title: Test architecture authority
  - id: render-integration-evidence
    resource: tests/integration/render-lifecycle.test.ts
    title: Render lifecycle tests
owa:
  implementation_status: partial
  verification_status: verified
  evidence_ids: [OKF-EV-P08-INTEGRATION, OKF-EV-P08-FAULTS, OKF-EV-P08-PROCESS-KILL]
---

# Test Strategy

The test program combines unit, integration, independent-connection concurrency, process-kill, built CLI, real Electron, security, architecture, contract, migration, documentation, and OKF evidence. Phase 8 adds pure Render policy tests, real Playwright and Chromium lifecycle/render fixtures, actual Page and Browser process termination, artifact and SQLite fault injection, and Browser and Render validators.

Network fixtures are deterministic exact-origin loopback. Real targets and other desktop operating systems are not claimed.
