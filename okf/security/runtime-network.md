---
type: Security Control
title: Runtime Network Policy
description: Defines runtime request authorization, redirect revalidation, and constrained network inputs.
tags: [security, network, ssrf, rendering]
status: stable
sources:
  - id: runtime-network-policy
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/docs/architecture/RUNTIME_NETWORK_POLICY.md
    title: Runtime network policy authority
  - id: browser-security-review
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/docs/architecture/PHASE_08_SECURITY_REVIEW.md
    title: Browser security review
stale_after: "2026-11-01"
owa:
  implementation_status: implemented
  verification_status: partial
  risk_ids: [R-096]
  decision_ids: [OD-073]
  evidence_ids: [OKF-EV-P08-SECURITY]
---

# Runtime Network Policy

CDP Fetch interception re-evaluates [Scope Engine](../workflow/scope-engine.md) classification and DNS classification before GET and HEAD requests and redirects. Public-only production addresses and exact-origin loopback fixtures are separate construction-time policies.

No header, body, cookie, or proxy input is accepted. DNS connection pinning remains unknown and is tracked by R-096 and OD-073.
