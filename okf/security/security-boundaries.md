---
type: Security Control
title: Security Boundaries
description: Defines the active product security controls and known incomplete security boundaries.
tags: [security, browser, recovery, privacy]
status: stable
sources:
  - id: phase-eight-security-review
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/docs/architecture/PHASE_08_SECURITY_REVIEW.md
    title: Phase 8 security review
stale_after: "2026-11-01"
owa:
  implementation_status: partial
  verification_status: partial
  evidence_ids: [OKF-EV-P08-SECURITY, OKF-EV-P07-SECURITY, OKF-EV-P10-SECURITY]
---

# Security Boundaries

Active controls include checksum and root-contained Browser provisioning, an explicit Chromium Sandbox, no system fallback or download, fresh Contexts, safe Popup, download, Dialog, Cookie Banner, and permission defaults, bounded approved browser-native input, GET and HEAD pre-dispatch authorization, redirect and DNS revalidation, bounded redacted evidence, portable bounded artifacts, renderer isolation, and [Lease](../recovery/leases.md) and [Fencing](../recovery/fencing.md) enforcement.

Project and ZIP paths, Scope and private-network controls, Queue ownership, and Recovery controls remain active. Interaction targets, traces, Cookie Banner rules, Dialogs, and Popups fail closed or redact by default. DNS connection pinning, screenshot/trace retention, hostile final-archive execution, authentication and proxy secrets, release signing, Phase 9 discovery, and non-Windows Browser evidence remain incomplete or planned.
