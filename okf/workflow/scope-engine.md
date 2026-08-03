---
type: Workflow
title: Scope Engine
description: Defines URL normalization, identity, classification, limits, and private-network preparation.
tags: [workflow, scope, url-normalization, security]
status: stable
sources:
  - id: scope-engine-source
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/packages/scope-engine/src/index.ts
    title: Scope Engine source
  - id: scope-engine-golden-evidence
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/tests/fixtures/scope/normalization.golden.json
    title: Scope normalization golden fixture
owa:
  implementation_status: partial
  verification_status: verified
  evidence_ids: [OKF-EV-P05-ENGINE, OKF-EV-P05-GOLDEN]
---

# Scope Engine

Scope Engine 1 defines normalization, contextual discovery inputs, identity, rule precedence, canonical and redirect classification, limits, sensitive query and fragment removal, and literal-address SSRF preparation. Local golden, unit, integration, CLI, and Electron evidence supports these boundaries.

Persistent discovered identities, Jobs, DNS resolution, and dispatch remain planned. [Site Profile](site-profile.md) supplies the portable policy authority, and [Runtime Network Policy](../security/runtime-network.md) re-evaluates the result before runtime dispatch.
