---
type: Architecture Component
title: Trust Zones and IPC
description: Defines the trusted UI, privileged service, and untrusted archive boundaries for local desktop transport.
tags: [architecture, security, ipc, trust-zones]
status: stable
owa:
  implementation_status: implemented
  verification_status: partial
  requirement_ids: [NFR-SEC-003, NFR-MAINT-001]
  acceptance_ids: [AC-P13-004, AC-P13-005]
  decision_ids: [OD-077]
  risk_ids: [R-089, R-090, R-101]
  evidence_ids: [OKF-EV-P13-BOUNDARY, OKF-EV-P13-SECURITY, OKF-EV-P19-SECURITY, OKF-EV-P19-BROWSER]
---

# Trust Zones and IPC

Phase 13 names three zones: the trusted local UI, the privileged Application
Service/Desktop main boundary, and a future untrusted archive runtime. The
current renderer can invoke only the approved bridge methods; main-process
sender, frame, origin, navigation, path, and command-type checks remain
independent gates. The current product does not load archived HTML/JS, so no
archive content receives trusted-window privileges.

The Phase 19 archive runtime uses a separate Browser Context/window baseline
with context isolation, no Node integration, no preload bridge, no webview, no
external navigation, and no IPC to the privileged service. The exact loopback
Local Runtime serves only approved Route/Original Resource map entries; this
does not make the Local Runtime a privileged Application Service.
