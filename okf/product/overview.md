---
type: Project Overview
title: Product Overview
description: Describes the durable product scope and current capability boundary.
tags: [product, scope, capabilities]
status: stable
sources:
  - id: product-scope
    resource: docs/product/PROJECT_SCOPE.md
    title: Product scope authority
  - id: product-acceptance
    resource: docs/product/ACCEPTANCE_MATRIX.md
    title: Product acceptance authority
  - id: legacy-product-overview
    resource: okf/knowledge/product/README.md
    title: Legacy product knowledge
  - id: legacy-next-phase
    resource: okf/knowledge/product/NEXT_PHASE.md
    title: Legacy durable next-phase scope
owa:
  implementation_status: partial
  verification_status: verified
  evidence_ids: [OKF-EV-P01-SCOPE, OKF-EV-P01-ACCEPTANCE]
  legacy_paths: [okf/knowledge/product/README.md, okf/knowledge/product/NEXT_PHASE.md]
---

# Product Overview

OfflineWebArchiver is a local product whose current scope includes `system.describe` and local Project lifecycle, validation, and transfer commands. Network and crawler capability remains planned; this Concept does not imply a downloader, discovery engine, or target-site run.

The product foundation now includes the reviewed Project and SQLite model, profile and scope policy, persistent queue, recovery ownership, and browser rendering layers. The relationships are described by the [Application Service](../architecture/application-service.md), [Project Format](../data/project-format.md), [Queue](../workflow/queue.md), and [Checkpoint Recovery](../recovery/checkpoint-recovery.md) Concepts. Browser-specific behavior is described by the [Browser Runtime](../architecture/browser-runtime.md) and [Rendering](../workflow/rendering.md) Concepts.

Phase navigation is preserved as historical context in the [Phase Record index](../history/index.md). The legacy product files contain volatile next-phase statements; those statements are intentionally not copied as a current lifecycle claim. The legacy files remain available through their portable source paths during the Phase 4 overlap.

