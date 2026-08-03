# Valid Frontmatter Examples

All timestamps, actors, IDs, and target files below are design examples. They do not assert that the production bundle or evidence exists. Examples use canonical repository output, which is stricter than minimum official conformance.

## VFM-001 — Authored Project Overview

This also represents Codex-assisted but human-owned content: `generated` is absent after substantive human ownership review.

```markdown
---
type: Project Overview
title: Offline Web Archive Builder
description: Defines the product scope, users, capabilities, and durable exclusions.
tags:
  - product
status: stable
verified:
  - by: human:product-owner
    at: "2026-08-02T10:00:00Z"
sources:
  - id: product-scope
    resource: docs/product/PROJECT_SCOPE.md
    title: Product scope authority
owa:
  verification_status: verified
  requirement_ids:
    - NFR-KNOW-001
---
# Offline Web Archive Builder
```

## VFM-002 — Product Requirement

```markdown
---
type: Product Requirement
title: Portable Project Identity
description: Requires every exported Project to preserve its stable identity across supported hosts.
tags:
  - portability
  - project-format
status: stable
sources:
  - id: project-scope
    resource: docs/product/PROJECT_SCOPE.md
    title: Product requirement authority
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids:
    - FR-PROJECT-001
  acceptance_ids:
    - AC-PROJECT-001
  evidence_ids:
    - OKF-EV-P04-TESTS
---
# Portable Project Identity
```

## VFM-003 — Architecture Overview

```markdown
---
type: Architecture Overview
title: Application Architecture
description: Explains the principal layers, dependency direction, and process boundaries.
tags:
  - architecture
status: stable
verified:
  - by: human:architecture-owner
    at: "2026-08-02T10:10:00Z"
sources:
  - id: architecture-record
    resource: docs/architecture/ARCHITECTURE.md
    title: Architecture authority
stale_after: "2027-02-02"
---
# Application Architecture
```

## VFM-004 — Architecture Decision

```markdown
---
type: Architecture Decision
title: Persistent Queue State Machine
description: Records the choice of a closed durable state machine for page jobs.
tags:
  - queue
  - sqlite
status: stable
sources:
  - id: queue-adr
    resource: docs/project/adr/ADR-025-job-state-machine.md
    title: Job state-machine decision
owa:
  governance_status: resolved
  decision_ids:
    - OD-038
---
# Persistent Queue State Machine
```

## VFM-005 — Architecture Component

```markdown
---
type: Architecture Component
title: Application Service
description: Defines the transport-neutral orchestration boundary shared by CLI and desktop adapters.
tags:
  - application-service
status: stable
sources:
  - resource: packages/application-service/src/index.ts
    title: Application service source
owa:
  implementation_status: implemented
  verification_status: verified
---
# Application Service
```

## VFM-006 — Workflow

```markdown
---
type: Workflow
title: Persistent Queue
description: Describes enqueue, claim, transition, retry, and terminal-history behavior.
tags:
  - queue
status: stable
sources:
  - resource: packages/queue/src/index.ts
    title: Queue domain source
owa:
  implementation_status: implemented
  evidence_ids:
    - OKF-EV-P06-DOMAIN
---
# Persistent Queue
```

## VFM-007 — Data Model with Multiple Sources

```markdown
---
type: Data Model
title: Project Persistence
description: Defines the portable Project metadata and SQLite persistence invariants.
tags:
  - persistence
  - sqlite
status: stable
sources:
  - id: persistence-source
    resource: packages/persistence-sqlite/src/index.ts
    title: SQLite persistence source
  - id: format-source
    resource: packages/project-format/src/index.ts
    title: Project format source
owa:
  verification_status: verified
  evidence_ids:
    - OKF-EV-P04-FORMAT
    - OKF-EV-P04-PERSISTENCE
---
# Project Persistence
```

## VFM-008 — Security Control with Verification and Freshness

```markdown
---
type: Security Control
title: Runtime Network Authorization
description: Requires every browser request and redirect to pass pre-dispatch scope authorization.
tags:
  - browser
  - network-security
status: stable
verified:
  - by: process:security-validation
    at: "2026-08-02T10:20:00Z"
  - by: human:security-reviewer
    at: "2026-08-02T11:00:00Z"
sources:
  - id: security-review
    resource: docs/architecture/PHASE_08_SECURITY_REVIEW.md
    title: Phase 8 security review
stale_after: "2026-11-02"
owa:
  implementation_status: implemented
  verification_status: verified
  risk_ids:
    - R-096
    - R-097
---
# Runtime Network Authorization
```

## VFM-009 — Operational Runbook

```markdown
---
type: Operational Runbook
title: Validate Database Migrations
description: Provides the safe procedure for validating ordered SQLite migration definitions.
tags:
  - migrations
  - operations
status: stable
sources:
  - resource: tools/migrations/validate.mjs
    title: Migration validation command
stale_after: "2026-11-02"
---
# Validate Database Migrations
```

## VFM-010 — Recovery Procedure

```markdown
---
type: Recovery Procedure
title: Checkpoint Recovery
description: Defines explicit bounded recovery from persisted job and artifact checkpoints.
tags:
  - checkpoints
  - recovery
status: stable
sources:
  - resource: packages/persistence-sqlite/src/recovery.ts
    title: Recovery implementation authority
owa:
  implementation_status: implemented
  evidence_ids:
    - OKF-EV-P07-LIFECYCLE
---
# Checkpoint Recovery
```

## VFM-011 — Test Strategy

```markdown
---
type: Test Strategy
title: Browser and Rendering Test Strategy
description: Defines deterministic unit, integration, crash, and real-browser coverage for rendering.
tags:
  - browser
  - testing
status: stable
sources:
  - resource: tools/testing/run-tests.mjs
    title: Repository test dispatcher
---
# Browser and Rendering Test Strategy
```

## VFM-012 — Quality Policy

```markdown
---
type: Quality Policy
title: Documentation Validation Policy
description: Requires repository documentation links and mandatory artifacts to validate deterministically.
tags:
  - documentation
  - quality
status: stable
sources:
  - resource: tools/docs/validate.mjs
    title: Documentation validator
---
# Documentation Validation Policy
```

## VFM-013 — Historical Phase Record

```markdown
---
type: Phase Record
title: Product Phase 7 Recovery Record
description: Preserves the delivered recovery scope, evidence, decisions, and known limitations of Product Phase 7.
tags:
  - history
  - recovery
status: stable
sources:
  - resource: docs/project/PHASE_07_IMPLEMENTATION_REPORT.md
    title: Phase 7 implementation report
owa:
  verification_status: verified
  legacy_ids:
    - OKF-PHASE-007
---
# Product Phase 7 Recovery Record
```

## VFM-014 — Reference Concept

```markdown
---
type: Reference
title: SQLite Write-Ahead Logging Reference
description: Summarizes the SQLite write-ahead logging behavior relevant to Project persistence.
resource: https://www.sqlite.org/wal.html
tags:
  - sqlite
status: stable
sources:
  - id: sqlite-wal
    resource: https://www.sqlite.org/wal.html
    title: SQLite write-ahead logging documentation
stale_after: "2027-08-02"
---
# SQLite Write-Ahead Logging Reference
```

## VFM-015 — Fully Script-Generated Concept

```markdown
---
type: Reference
title: Contract Surface Reference
description: Lists the versioned public command contracts extracted from the authoritative contract source.
tags:
  - contracts
status: stable
generated:
  by: offlinewebarchiver-okf/1.0.0
  at: "2026-08-02T12:00:00Z"
sources:
  - resource: packages/contracts/src/index.ts
    title: Contract source
verified:
  - by: process:contract-validation
    at: "2026-08-02T12:05:00Z"
---
# Contract Surface Reference
```

## VFM-016 — Deprecated Concept

```markdown
---
type: Workflow
title: Legacy Rendering Workflow
description: Preserves the superseded rendering workflow for historical links.
tags:
  - rendering
status: deprecated
sources:
  - resource: docs/project/adr/ADR-legacy-rendering.md
    title: Legacy rendering decision
---
# Legacy Rendering Workflow

Superseded by the current rendering workflow at `/workflow/rendering.md`.
```

## VFM-017 — Root Index

```markdown
---
okf_version: "0.2"
---
# Offline Web Archive Builder Knowledge Bundle

* Product - product scope and requirements.
* Architecture - system boundaries and components.
```

Only the bundle-root index may use this frontmatter.

## VFM-018 — Generated Directory Index

```markdown
<!-- MAINTAINED NAVIGATION. Update when direct Concept children change. -->
# Workflow

* Persistent Queue - durable scheduling and transition behavior.
* Rendering - browser rendering orchestration.
```

There is intentionally no frontmatter. This is the valid generated-index representation.

## VFM-019 — Official Log Structure (Not Adopted)

```markdown
# Workflow Update Log

## 2026-08-02

* **Update**: Clarified persistent queue transition behavior.

## 2026-07-31

* **Initialization**: Established the workflow scope.
```

This is structurally valid official `log.md`, with no frontmatter and newest date first, but Phase 2 prohibits creating it in the production bundle.

## VFM-020 — Concept with Complete Project Extension Bridge

```markdown
---
type: Workflow
title: Page Job State Machine
description: Defines the closed versioned transition model for persistent page jobs.
tags:
  - queue
  - state-machine
status: stable
sources:
  - id: state-machine-adr
    resource: docs/project/adr/ADR-025-job-state-machine.md
    title: State-machine decision authority
owa:
  implementation_status: implemented
  verification_status: verified
  governance_status: resolved
  requirement_ids:
    - FR-QUEUE-003
  acceptance_ids:
    - AC-P06-014
  decision_ids:
    - OD-038
  risk_ids:
    - R-057
  evidence_ids:
    - OKF-EV-P06-DOMAIN
  legacy_ids:
    - OKF-NODE-P06-STATE-1
---
# Page Job State Machine
```

## Coverage Summary

The 20 examples cover all 14 approved types; human-authored, AI-assisted human-owned, fully generated, verified, fresh, deprecated, multi-source, and extension-bearing Concepts; root and directory indexes; and the official log structure that the repository intentionally does not adopt.
