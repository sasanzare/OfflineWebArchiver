---
type: Workflow
title: Site Profile
description: Defines the portable Site Profile policy authority and its immutable revision evidence.
tags: [workflow, profile, scope, persistence]
status: stable
sources:
  - id: site-profile-authority
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/docs/architecture/SITE_PROFILE.md
    title: Site Profile architecture authority
  - id: profile-lifecycle-evidence
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/tests/integration/profile-lifecycle.test.ts
    title: Profile lifecycle tests
owa:
  implementation_status: implemented
  verification_status: verified
  evidence_ids: [OKF-EV-P05-ENGINE, OKF-EV-P05-PERSISTENCE]
---

# Site Profile

The portable Site Profile file is the current policy authority. Profile schema 1, ADR-015, and its lifecycle evidence define normalized Base URL behavior; the manifest mirrors that value and SQLite retains immutable revision and integrity evidence.

Semantic no-op updates are rejected. Secrets and network authorization are excluded from the Profile; [Scope Engine](scope-engine.md) and [Runtime Network Policy](../security/runtime-network.md) apply those separate controls.
