---
type: Operational Runbook
title: Rate-Limit Compliance
description: Operational safeguards for shared Origin cooldowns, Retry-After handling, proxy affinity, and scheduler backpressure.
tags: [operations, rate-limit, cooldown, proxy, security]
status: stable
sources:
  - id: phase-sixteen-report
    resource: Phase 16 implementation working tree
    title: Phase 16 implementation report
stale_after: "2026-11-01"
---

# Rate-Limit Compliance

Before dispatch, the Worker Pool validates explicit global, Origin, proxy,
in-flight, and optional token-bucket bounds. A `429` or temporary `503` is
recorded against the canonical Origin. Valid `Retry-After` values are bounded;
missing or invalid values use the configured conservative fallback. A healthy
alternate proxy does not make the Origin eligible while the shared cooldown is
active.

Authenticated work keeps its proxy affinity. Proxy loss, unavailable
credentials, an open circuit, or a direct-mode affinity conflict stops or
blocks the work rather than silently changing network identity. Persistent
cooldown state is Project/Run scoped and contains no credentials or payloads.

Implementation and limitations are recorded in the repository's Phase 16
implementation report and security review at
`docs/project/PHASE_16_IMPLEMENTATION_REPORT.md` and
`docs/architecture/PHASE_16_SECURITY_REVIEW.md`.
