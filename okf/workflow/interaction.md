---
type: Workflow
title: Human-Paced Interaction
description: Defines the approved-plan workflow for bounded browser-native input and redacted interaction traces.
tags: [workflow, interaction, browser, recovery]
status: draft
sources:
  - id: rendering-architecture-baseline
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/1e54a436777f028d8c1154ed51ffdb4662dc4de1/docs/architecture/RENDERING_ENGINE.md
    title: Rendering architecture baseline
  - id: render-lifecycle-baseline
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/1e54a436777f028d8c1154ed51ffdb4662dc4de1/tests/integration/render-lifecycle.test.ts
    title: Browser lifecycle evidence baseline
owa:
  implementation_status: partial
  verification_status: partial
  requirement_ids: [FR-RENDER-003, FR-RECOVERY-001, FR-SCOPE-003]
  acceptance_ids: [AC-P10-006, AC-P10-009, AC-P10-013, AC-P10-015, AC-P10-016]
  risk_ids: [R-103, R-104, R-105, R-107]
  evidence_ids: [OKF-EV-P10-TRACE, OKF-EV-P10-DISCOVERY-GATE]
---

# Human-Paced Interaction

The workflow loads a validated Interaction Profile, receives an explicitly
approved bounded Plan, claims the existing Page Job ownership, executes real
browser input, checks resulting navigation, and persists a redacted Trace.
Action, timing, scrolling, Tab, Dialog, Popup, and Trace budgets are finite.
Pause, cancellation, timeout, and Browser failure produce structured outcomes;
an uncertain Browser boundary is never replayed automatically.

Cookie Banner behavior is `no_action` unless an explicit profile rule matches.
All resulting destinations remain under the existing [Scope Engine](scope-engine.md)
and request authorization policy. Phase 9 discovery and Queue integration are
required before an interaction can become a production discovery workflow.
The official Bundle boundary follows the [Google OKF v0.2 reference](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf).
