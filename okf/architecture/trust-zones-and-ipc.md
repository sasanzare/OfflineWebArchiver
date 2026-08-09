---
type: Architecture Component
title: Trust Zones and IPC
description: Defines the trusted UI, privileged service, and untrusted archive boundaries for local desktop transport.
tags: [architecture, security, ipc, trust-zones]
status: draft
owa:
  implementation_status: implemented
  verification_status: partial
  requirement_ids: [NFR-SEC-003, NFR-MAINT-001]
  acceptance_ids: [AC-P13-004, AC-P13-005]
  decision_ids: [OD-077]
  risk_ids: [R-089, R-090, R-101]
  evidence_ids: [OKF-EV-P13-BOUNDARY, OKF-EV-P13-SECURITY]
---

# Trust Zones and IPC

Phase 13 names three zones: the trusted local UI, the privileged Application
Service/Desktop main boundary, and a future untrusted archive runtime. The
current renderer can invoke only the approved bridge methods; main-process
sender, frame, origin, navigation, path, and command-type checks remain
independent gates. The current product does not load archived HTML/JS, so no
archive content receives trusted-window privileges.

The future archive runtime must use a separate window/process baseline with
context isolation, no Node integration, sandboxing, no preload bridge, no
webview, no external navigation, and no IPC to the privileged service. This
document records the boundary without implementing that later runtime.
