---
type: Data Model
title: Canonical Path Safety
description: Defines the shared canonical portable path contract and deterministic collision key used by filesystem consumers.
tags: [data, paths, security, portability]
status: stable
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-PROJECT-004, NFR-PORT-002, NFR-SEC-003]
  acceptance_ids: [AC-P13-013, AC-P13-014]
  decision_ids: [OD-081]
  risk_ids: [R-031, R-045, R-089]
  evidence_ids: [OKF-EV-P13-DOMAIN, OKF-EV-P13-PERSISTENCE, OKF-EV-P13-TESTS]
---

# Canonical Path Safety

Canonical Path Contract v1 rejects absolute, drive, UNC, traversal, encoded and
double-encoded traversal, invalid percent encoding, non-NFC, control,
non-portable, reserved, ambiguous, and overlong paths. Accepted paths produce
a normalized relative value and a case/separator-normalized collision key.

Project Format, Recovery, SQLite import/output verification, and atomic writes
consume the shared helper. Trusted-root writes additionally reject symlinked
ancestors so a valid-looking relative path cannot escape the Project root.
