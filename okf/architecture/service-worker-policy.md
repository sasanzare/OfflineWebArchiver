---
type: Architecture Component
title: Service Worker Policy
description: Defines the versioned Site Profile policy for blocking or explicitly allowing Service Workers.
tags: [architecture, browser, service-worker, security]
status: draft
owa:
  implementation_status: implemented
  verification_status: partial
  requirement_ids: [NFR-SEC-003, NFR-TEST-001]
  acceptance_ids: [AC-P13-011, AC-P13-012]
  decision_ids: [OD-080]
  risk_ids: [R-101]
  evidence_ids: [OKF-EV-P13-POLICY, OKF-EV-P13-BROWSER]
---

# Service Worker Policy

Service Worker Policy v1 has two modes: `block` and explicit `allow`. The
default for old and new Site Profiles is `block`; allowing registration is a
reviewable profile choice. The policy is passed into Browser Runtime Context
creation and is not inferred from a target page.

Pure contract and profile compatibility evidence exists. Real registration and
fetch routing evidence remains blocked with the current pinned-Chromium
fixture environment.
