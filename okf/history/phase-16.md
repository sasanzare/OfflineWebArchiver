---
type: Phase Record
title: Product Phase 16 - Worker Pool and Rate-Limit Compliance
description: Records the implemented Worker Pool, shared Origin cooldown, proxy affinity, Browser Runtime permit, and SQLite scheduler-state boundary.
tags: [history, phase-record, worker, rate-limit, proxy, security]
status: stable
sources:
  - id: phase-sixteen-report
    resource: Phase 16 implementation working tree
    title: Phase 16 implementation report
---

# Product Phase 16 - Worker Pool and Rate-Limit Compliance

Phase 16 implements the bounded Worker Pool and network scheduling boundary.
Archive Core owns reservation and policy; Browser Runtime owns Playwright and
request permits; SQLite schema 11 persists Project/Run/Origin cooldown state.
`429` and bounded `Retry-After` handling is shared across proxies, and
authenticated Session affinity fails closed.

The phase does not implement discovery, downloading, rewriting, API
capture/replay, archive serving, or authorized target-site acceptance. Those
remain separate later-phase boundaries. See the [validation record](../testing/phase-16-validation.md)
and the repository records `docs/project/PHASE_16_IMPLEMENTATION_REPORT.md`,
`docs/project/adr/ADR-059-worker-pool-and-rate-limit-compliance.md`.
