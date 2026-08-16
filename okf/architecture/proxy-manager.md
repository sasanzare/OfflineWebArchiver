---
type: Architecture Component
title: Proxy Manager
description: Defines the Phase 15 proxy metadata, health, Secret Store, Browser Runtime, and Session affinity boundary.
tags: [architecture, proxy, health, session, security]
status: stable
---

# Proxy Manager

Phase 15 separates proxy policy from adapters. Archive Core owns HTTP, HTTPS,
and SOCKS5 validation, canonical identity, import, health/cooldown state, and
eligibility. Application Service owns proxy commands and scoped Secret Store
resolution. SQLite schema 10 stores metadata and health counters, while Browser
Runtime maps an eligible runtime configuration to Playwright and performs the
connectivity check.

Proxy metadata does not contain raw credentials. Authenticated Session affinity
is explicit and fail-closed: open, restore, and reauthentication require an
eligible bound proxy; `session.setProxyAffinity` requires reauthentication
after a change. See [Proxy Security](../security/proxy-security.md), [Proxy Metadata](../data/proxy-metadata.md), and [Phase 15 Validation](../testing/phase-15-validation.md).

Worker scheduling, automatic rotation, and rate-limit coordination remain
outside this component. The implemented Phase 16 scheduler consumes this
component's eligibility and affinity metadata; it does not own proxy
credentials. See [Worker Pool Scheduling](worker-pool-scheduling.md).
