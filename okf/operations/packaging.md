---
type: Operational Runbook
title: Packaging
description: Describes the current development-artifact packaging boundary and release work that remains open.
tags: [operations, packaging, release]
status: stable
sources:
  - id: packaging-legacy-knowledge
    resource: okf/knowledge/packaging/README.md
    title: Legacy Packaging knowledge
  - id: phase-three-build-evidence
    resource: tools/build/build.mjs
    title: Development build definition
owa:
  implementation_status: partial
  verification_status: partial
  evidence_ids: [OKF-EV-P03-BUILD]
  legacy_paths: [okf/knowledge/packaging/README.md]
---

# Packaging

Product Phase 3 produces runnable development artifacts but does not claim release packaging. The Phase 2 unpacked Windows package is spike evidence only.

Clean-host validation, signing, licensing, SBOM generation, multi-platform packaging, and production Browser artifact work remain open.
