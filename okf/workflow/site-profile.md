---
type: Workflow
title: Site Profile
description: Defines the portable Site Profile policy authority and its immutable revision evidence.
tags: [workflow, profile, scope, persistence]
status: stable
sources:
  - id: site-profile-legacy-knowledge
    resource: okf/knowledge/site-profile/README.md
    title: Legacy Site Profile knowledge
  - id: site-profile-authority
    resource: docs/architecture/SITE_PROFILE.md
    title: Site Profile architecture authority
  - id: profile-lifecycle-evidence
    resource: tests/integration/profile-lifecycle.test.ts
    title: Profile lifecycle tests
owa:
  implementation_status: implemented
  verification_status: verified
  evidence_ids: [OKF-EV-P05-ENGINE, OKF-EV-P05-PERSISTENCE]
  legacy_paths: [okf/knowledge/site-profile/README.md]
---

# Site Profile

The portable Site Profile file is the current policy authority. Profile schema 1, ADR-015, and its lifecycle evidence define normalized Base URL behavior; the manifest mirrors that value and SQLite retains immutable revision and integrity evidence.

Semantic no-op updates are rejected. Secrets and network authorization are excluded from the Profile; [Scope Engine](scope-engine.md) and [Runtime Network Policy](../security/runtime-network.md) apply those separate controls.
