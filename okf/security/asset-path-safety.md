---
type: Security Control
title: Asset Path Safety
description: Defines the canonical Project-root, symlink, lock, and atomic-promotion controls for Asset files.
tags: [security, assets, paths, symlinks, portability]
status: stable
sources:
  - id: asset-path-safety-review
    resource: Phase 17 Asset path safety review in the repository
    title: Phase 17 security review
stale_after: 2027-08-16
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-PROJECT-004, NFR-PORT-002, NFR-SEC-003]
  acceptance_ids: [AC-P17-005, AC-P17-006, AC-P17-012]
  decision_ids: [OD-081, OD-084]
  risk_ids: [R-031, R-045, R-088, R-096, R-097]
  evidence_ids: [OKF-EV-P17-SECURITY, OKF-EV-P17-TESTS]
---

# Asset Path Safety

Asset source, content-object, partial, and lock names are generated through
the shared canonical Project-relative mapper. Persistence resolves each path
under the trusted Project root and rejects symlinked ancestors and targets.
Partial files are created with exclusive access, content locks are bounded and
never removed by guessing at stale ownership, and only a verified regular file
can be atomically promoted to a content-object path.

The policy forbids absolute/drive/UNC paths, traversal, encoded separators,
reserved device names, control/non-portable characters, non-NFC paths, and
case-collision ambiguity. The focused path fixture covers root escape and
symlink-ancestor attempts on the supported Windows environment.
