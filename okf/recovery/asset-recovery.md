---
type: Recovery Procedure
title: Asset Recovery
description: Defines durable Asset progress, fencing, Range resume, content locking, and finalization recovery.
tags: [recovery, assets, checkpoints, fencing, range-requests]
status: stable
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-RECOVERY-001, FR-ASSET-002, NFR-REL-002]
  acceptance_ids: [AC-P17-007, AC-P17-008, AC-P17-009, AC-P17-011, AC-P17-012]
  decision_ids: [OD-060, OD-063, OD-084]
  risk_ids: [R-080, R-081, R-082, R-083, R-084]
  evidence_ids: [OKF-EV-P17-PERSISTENCE, OKF-EV-P17-TESTS]
---

# Asset Recovery

Asset progress is durable only at a synced partial-file boundary accompanied by
SQLite `resume_offset`, expected size, validator, and the current fencing
generation. Recovery checkpoints use the existing Lease-owned artifact
boundary. A compatible `206` response resumes at the exact durable offset;
missing or changed validators, a server `200`, an invalid `Content-Range`, or a
safe `416` path restarts from zero.

Finalization first verifies the streamed bytes and content hash, then uses an
exclusive content lock and atomic promotion. SQLite marks the source complete
only under the current owner and generation. A stale owner or incomplete file
cannot create a completed Asset record.
