---
type: Recovery Procedure
title: Heartbeats
description: Defines Lease liveness recording, explicit renewal, and expiry semantics.
tags: [recovery, leases, heartbeats, concurrency]
status: stable
sources:
  - id: recovery-concurrency-evidence
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/tests/concurrency/recovery-concurrency.test.ts
    title: Recovery concurrency tests
owa:
  implementation_status: implemented
  verification_status: verified
  evidence_ids: [OKF-EV-P07-CONCURRENCY]
---

# Heartbeats

The default heartbeat interval is 15 seconds. A heartbeat records liveness without changing Lease expiry. Renewal is explicit, occurs before expiry, and extends expiry from renewal time.

Expiry is exact: `now >= expiresAt`. [Leases](leases.md) owns the protected state and [Fencing](fencing.md) rejects stale writers after ownership changes.
