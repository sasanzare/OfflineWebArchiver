---
type: Security Control
title: Security Boundaries
description: Defines the active product security controls and known incomplete security boundaries.
tags: [security, browser, recovery, privacy]
status: stable
sources:
  - id: security-legacy-knowledge
    resource: okf/knowledge/security/README.md
    title: Legacy Security knowledge
  - id: phase-eight-security-review
    resource: docs/architecture/PHASE_08_SECURITY_REVIEW.md
    title: Phase 8 security review
stale_after: "2026-11-01"
owa:
  implementation_status: partial
  verification_status: partial
  evidence_ids: [OKF-EV-P08-SECURITY, OKF-EV-P07-SECURITY]
  legacy_paths: [okf/knowledge/security/README.md]
---

# Security Boundaries

Active controls include checksum and root-contained Browser provisioning, an explicit Chromium Sandbox, no system fallback or download, fresh Contexts, safe popup, download, dialog, and permission defaults, GET and HEAD pre-dispatch authorization, redirect and DNS revalidation, bounded redacted evidence, portable bounded artifacts, renderer isolation, and [Lease](../recovery/leases.md) and [Fencing](../recovery/fencing.md) enforcement.

Project and ZIP paths, Scope and private-network controls, Queue ownership, and Recovery controls remain active. DNS connection pinning, screenshot retention, hostile final-archive execution, authentication and proxy secrets, release signing, and non-Windows Browser evidence remain incomplete or planned.
