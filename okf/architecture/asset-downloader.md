---
type: Architecture Component
title: Asset Downloader
description: Defines the explicit-descriptor, scheduler-bound Asset execution and filesystem capability boundary.
tags: [architecture, assets, downloader, scheduler, recovery]
status: stable
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-ASSET-001, FR-ASSET-002, FR-RATE-001, FR-PROXY-003, FR-RECOVERY-001]
  acceptance_ids: [AC-P17-001, AC-P17-007, AC-P17-008, AC-P17-010, AC-P17-011]
  decision_ids: [OD-083, OD-084]
  risk_ids: [R-089, R-112]
  evidence_ids: [OKF-EV-P17-DOMAIN, OKF-EV-P17-TESTS]
---

# Asset Downloader

The Asset Downloader is an Application Service executor for explicit
`AssetSourceInput` descriptors. Archive Core defines the identity, resume,
repository, network, and `AssetFileStorePort` contracts. The executor acquires
the Phase 16 Origin budget, preserves proxy/Session affinity, re-authorizes
redirects, validates Lease/fencing ownership, and streams a bounded response.

Persistence implements both the Asset SQLite repository and the filesystem
capability. The filesystem adapter owns canonical Project-root resolution,
symlink checks, exclusive content locks, streaming reads, and atomic promotion.
The scheduler is required for outbound requests; this component is not a
discovery engine and does not imply rewriting, replay, or archive serving.
