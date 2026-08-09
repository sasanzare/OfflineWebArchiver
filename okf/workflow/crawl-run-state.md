---
type: Workflow
title: Crawl Run State
description: Defines the durable Crawl Run lifecycle independently from legacy pause-control reasons.
tags: [workflow, crawl, recovery, state-machine]
status: stable
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-RECOVERY-001, NFR-REL-002]
  acceptance_ids: [AC-P13-006, AC-P13-007]
  decision_ids: [OD-078]
  risk_ids: [R-085, R-089]
  evidence_ids: [OKF-EV-P13-DOMAIN, OKF-EV-P13-PERSISTENCE, OKF-EV-P13-TESTS]
---

# Crawl Run State

Crawl Run State v1 is a durable lifecycle vocabulary: `running`, `pausing`,
`paused`, the explicit waiting states, `cancelling`, `cancelled`, `completed`,
and `failed`. It is persisted separately from the existing pause-control
reason/status so recovery, UI status, and later schedulers do not overload one
field with incompatible meanings.

Migration 009 adds constrained state columns to `run_control` and
`run_checkpoints`. State transitions are validated in Archive Core and
persisted through the Recovery repository. This phase does not add a Worker Pool
or alter future scheduling semantics.
