---
type: Architecture Component
title: Service Worker Policy
description: Defines the versioned Site Profile policy for blocking, explicitly allowing, or explicitly resolving Service Workers by profile.
tags: [architecture, browser, service-worker, security]
status: stable
owa:
  implementation_status: implemented
  verification_status: partial
  requirement_ids: [NFR-SEC-003, NFR-TEST-001]
  acceptance_ids: [AC-P13-011, AC-P13-012, AC-P19-012]
  decision_ids: [OD-080, OD-088]
  risk_ids: [R-101, R-122]
  evidence_ids: [OKF-EV-P13-POLICY, OKF-EV-P13-BROWSER, OKF-EV-P19-SERVICE-WORKER, OKF-EV-P19-BROWSER]
---

# Service Worker Policy

Service Worker Policy v1 has `block`, `allow`, and `profile-specific` modes. The
default for old and new Site Profiles is `block`; allowing registration is a
reviewable profile choice. `profile-specific` requires an explicit `profileMode`
of `block` or `allow`, and Browser Runtime never infers that value from a
Chromium default or a target page. The policy is passed into Context creation.

Pure contract and profile compatibility evidence exists. The approved Windows
Chromium fixture verifies real block/allow registration behavior, activation,
controller acquisition, and fetch routing; Phase 19 also verifies the explicit
profile-specific decision path and replay interaction. The current release
still requires clean committed Windows 11 x64 promotion. Linux and macOS native
evidence is deferred future-version work and is not a current Service Worker
acceptance blocker.
