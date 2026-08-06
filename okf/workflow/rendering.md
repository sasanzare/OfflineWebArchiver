---
type: Workflow
title: Rendering
description: Defines bounded browser rendering, stability evaluation, final DOM extraction, and artifact handling.
tags: [workflow, rendering, browser, artifacts]
status: stable
sources:
  - id: rendering-authority
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/docs/architecture/RENDERING_ENGINE.md
    title: Rendering architecture authority
  - id: rendering-source
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/packages/rendering/src/index.ts
    title: Render Engine production source
  - id: rendering-tests
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/tests/integration/render-lifecycle.test.ts
    title: Render lifecycle integration tests
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-RENDER-001, FR-RENDER-002, NFR-PERF-001]
  acceptance_ids: [AC-P08-007, AC-P08-009, AC-P08-015]
  decision_ids: [OD-071, OD-072, OD-075]
  risk_ids: [R-009, R-095, R-100]
  evidence_ids: [OKF-EV-P08-RENDER, OKF-EV-P08-INTEGRATION, OKF-EV-P08-FAULTS]
  legacy_ids: [OKF-DOM-058]
---

# Rendering

Render Engine 1 implements bounded navigation, a combined DOM and network stability model 1, final DOM extraction, safe evidence, and opt-in PNG for one queued Job. Rendering starts only from an eligible Job in the [Queue](queue.md); the [Application Service](../architecture/application-service.md) claims it, persists stage events and checkpoints, heartbeats and renews the Lease, observes Pause, and fences every mutation.

Artifact-first writes followed by one fenced transaction and result replay prevent false or duplicate completion. The [Browser Runtime](../architecture/browser-runtime.md) supplies the owned process and fresh Context/Page. The partial [Human-Paced Interaction](interaction.md) workflow is bounded and approved-plan-only; Link Discovery and SPA route discovery remain the prerequisite planned workflow, and a complete archive remains planned.
