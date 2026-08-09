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
  evidence_ids: [OKF-EV-P08-SECURITY, OKF-EV-P07-SECURITY, OKF-EV-P10-SECURITY, OKF-EV-P12-SECURITY]
---

# Security Boundaries

Active controls include checksum and root-contained Browser provisioning, an explicit Chromium Sandbox, no system fallback or download, fresh Contexts, a separate headed manual Authentication Context, all-request exact-origin authorization, safe Popup, download, Dialog, Cookie Banner, and permission defaults, bounded approved browser-native input, GET and HEAD pre-dispatch authorization, redirect and DNS revalidation, bounded redacted evidence, portable bounded artifacts, renderer isolation, Project/Profile-bound Session restore, Phase 11 Secret Store purpose checks, Phase 13 command-type and trust-zone checks, Strict Offline abort behavior, Service Worker safe-default blocking, canonical path/symlink boundaries, and [Lease](../recovery/leases.md) and [Fencing](../recovery/fencing.md) enforcement.

Project and ZIP paths, Scope and private-network controls, Queue ownership, and Recovery controls remain active. Interaction targets, traces, Cookie Banner rules, Dialogs, Popups, and Session validation fail closed or redact by default. Full Network Replay execution, archive HTML/JS runtime isolation, DNS connection pinning, screenshot/trace retention, hostile final-archive execution, OTP automation, proxy secrets/routing, release signing, Phase 9 discovery, and native platform evidence remain incomplete or planned. Real Phase 12/13 Chromium fixture evidence is environment-blocked until the pinned browser and loopback fixture environment are available.
