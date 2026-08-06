---
type: Architecture Component
title: Contracts
description: Defines the versioned command, result, event, and error boundary across application layers.
tags: [architecture, contracts, ipc, cli]
status: stable
sources:
  - id: contracts-source
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/packages/contracts/src/index.ts
    title: Contracts production source
  - id: contracts-report
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/docs/project/PHASE_08_IMPLEMENTATION_REPORT.md
    title: Phase 8 contract implementation report
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [NFR-MAINT-001, FR-CLI-001]
  acceptance_ids: [AC-P07-036, AC-P07-038, AC-P08-017]
  decision_ids: [OD-048, OD-052, OD-066]
  risk_ids: [R-070, R-089, R-091]
  evidence_ids: [OKF-EV-P08-INTERFACES, OKF-EV-P06-DOMAIN]
  legacy_ids: [OKF-DOM-056]
---

# Contracts

The contract surface is versioned at 1.6.0. It includes strict Browser information, validation, health, and restart commands, Render start/status/result/events/cancel commands, and bounded Interaction Profile, Plan, Run, and Trace commands/results. Raw typed text, Playwright handles, and arbitrary scripts remain outside the contract.

Render start identifies an existing Job and bounded policy. It exposes no URL override, executable path, raw Browser handle, headers, bodies, cookies, or launch arguments. Error and progress envelopes retain version and correlation fields. The [Application Service](application-service.md) is the single orchestration consumer, while Desktop and CLI are transport adapters.

The contract boundary constrains the [Queue](../workflow/queue.md), [Rendering](../workflow/rendering.md), and [Browser Runtime](browser-runtime.md) relationships without making transport details part of those Concepts.
