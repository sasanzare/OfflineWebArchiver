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

Active controls include checksum and root-contained Browser provisioning, an explicit Chromium Sandbox, no system fallback or download, fresh Contexts, a separate headed manual Authentication Context, all-request exact-origin authorization, safe Popup, download, Dialog, Cookie Banner, and permission defaults, bounded approved browser-native input, GET and HEAD pre-dispatch authorization, redirect and DNS revalidation, bounded redacted evidence, portable bounded artifacts, renderer isolation, Project/Profile-bound Session restore, Phase 11 Secret Store purpose checks, Phase 13 command-type and trust-zone checks, Strict Offline abort behavior, Service Worker safe-default blocking, canonical path/symlink boundaries, [Lease](../recovery/leases.md) and [Fencing](../recovery/fencing.md) enforcement, and Phase 15 proxy credential references, strict protocol validation, health eligibility, explicit Session affinity, and no direct fallback.

Project and ZIP paths, Scope and private-network controls, Queue ownership, and Recovery controls remain active. Interaction targets, traces, Cookie Banner rules, Dialogs, Popups, Session validation, and proxy-required work fail closed or redact by default. Full Network Replay execution, archive HTML/JS runtime isolation, DNS connection pinning, screenshot/trace retention, hostile final-archive execution, OTP automation, Worker Pool rate compliance, automatic proxy rotation, release signing, Phase 9 discovery, and native Linux/macOS evidence remain incomplete or planned. Phase 15's generated local HTTPS certificate exception is test-only and gated by `OWAB_TEST_MODE=1`; production TLS validation remains strict.
