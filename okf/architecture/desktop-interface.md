---
type: Architecture Component
title: Desktop Interface
description: Defines the sandboxed Electron interface and its constrained bridge to the application service.
tags: [architecture, desktop, electron, interfaces]
status: stable
sources:
  - id: desktop-interface-legacy-knowledge
    resource: okf/knowledge/desktop-interface/README.md
    title: Legacy desktop interface knowledge
  - id: desktop-interface-evidence
    resource: tests/electron/desktop-smoke.test.ts
    title: Desktop smoke tests
owa:
  implementation_status: implemented
  verification_status: verified
  evidence_ids: [OKF-EV-P04-DESKTOP, OKF-EV-P06-CLI-DESKTOP, OKF-EV-P07-INTERFACES, OKF-EV-P08-INTERFACES]
  legacy_paths: [okf/knowledge/desktop-interface/README.md]
---

# Desktop Interface

The Electron renderer is sandboxed and context-isolated. Its approved preload bridge exposes only `execute` and `selectPath`; sender authorization and exact Project-path grants constrain mutations. The renderer neither displays, lists, nor logs ephemeral ownership tokens.

The interface provides Profile, Scope, Queue, Recovery, Run, Lease, Checkpoint, Browser, and Render flows through the [Application Service](application-service.md). Navigation, permissions, downloads, webviews, remote content, renderer filesystem access, SQLite primitives, and renderer network primitives are denied and directly tested.
