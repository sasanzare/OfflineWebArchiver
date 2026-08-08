---
type: Architecture Component
title: Browser Runtime
description: Defines the owned Chromium runtime, context lifecycle, and browser security boundary.
tags: [architecture, browser, chromium, security]
status: stable
sources:
  - id: browser-runtime-docs
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/docs/architecture/BROWSER_RUNTIME.md
    title: Browser runtime architecture authority
  - id: browser-runtime-source
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/packages/browser-runtime/src/index.ts
    title: Browser runtime production source
  - id: browser-runtime-evidence
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/tests/integration/render-lifecycle.test.ts
    title: Browser lifecycle integration evidence
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-RENDER-001, NFR-PORT-001, NFR-REL-001]
  acceptance_ids: [AC-P08-001, AC-P08-006, AC-P08-016, AC-P12-001, AC-P12-004, AC-P12-006]
  decision_ids: [OD-066, OD-067, OD-068, OD-069, OD-070, OD-076]
  risk_ids: [R-090, R-091, R-092, R-093, R-094, R-101]
  evidence_ids: [OKF-EV-P08-BROWSER, OKF-EV-P08-SECURITY, OKF-EV-P08-PROCESS-KILL]
  legacy_ids: [OKF-DOM-057]
---

# Browser Runtime

The owned runtime uses Playwright 1.56.1 with Chromium 141.0.7390.37, revision 1194. The runtime has a versioned manifest model, Context profile 1, one active Job, no system-browser fallback, no normal-launch download, and an explicit Chromium Sandbox.

Each attempt receives a fresh deterministic Context and Page. Windows real-browser and process-kill evidence is recorded as verified; Linux and macOS packaging remains planned. Browser lifecycle is consumed by the [Rendering](../workflow/rendering.md) workflow and is started by the [Application Service](application-service.md) only for an eligible queued Job.

The renderer does not receive a raw Browser privilege from the application boundary. The partial [Browser-Native Human-Paced Interaction](browser-interaction.md) component is the only approved-plan input boundary; it reuses the fixed Context and keeps raw handles inside Browser Runtime. Product Phase 12 adds a separate headed manual Authentication Context and a fresh headless restored Context. Both use the approved Profile, sandbox, HTTPS validation, disabled downloads, and explicit document-origin authorization; only the authentication Context may remain visible for user-driven provider redirects. Storage State capture/restoration stays behind the Browser Runtime port and Phase 11 Secret Store boundary. Network authorization and result persistence remain governed by the [Contracts](contracts.md), [Queue](../workflow/queue.md), and [Checkpoint Recovery](../recovery/checkpoint-recovery.md) Concepts.
