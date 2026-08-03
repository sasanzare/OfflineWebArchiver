---
type: Architecture Component
title: Command-Line Interface
description: Defines the bounded command-line interface and its relationship to the application service.
tags: [architecture, cli, interfaces]
status: stable
sources:
  - id: cli-interface-evidence
    resource: tests/cli/cli-smoke.test.ts
    title: CLI smoke tests
owa:
  implementation_status: implemented
  verification_status: verified
  evidence_ids: [OKF-EV-P04-CLI, OKF-EV-P07-INTERFACES, OKF-EV-P08-INTERFACES]
---

# Command-Line Interface

The production CLI exposes Project, Profile, Scope, Queue, Recovery, Run, Lease, Checkpoint, Browser, and Render commands through the [Application Service](application-service.md). It offers human and JSON output, bounded pagination, stable validation and business-error exits, and recursive redaction of token fields.

Commands require explicit Project or Job selection where applicable. Rendering accepts no URL override: it processes one eligible queued Job and is not a discovery or crawler surface. Contract 1.5.0 keeps the CLI on the same public boundary as the Desktop interface.
