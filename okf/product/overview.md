---
type: Project Overview
title: Product Overview
description: Describes the durable product scope and current capability boundary.
tags: [product, scope, capabilities]
status: stable
sources:
  - id: product-scope
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/docs/product/PROJECT_SCOPE.md
    title: Product scope authority
  - id: product-acceptance
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/docs/product/ACCEPTANCE_MATRIX.md
    title: Product acceptance authority
owa:
  implementation_status: partial
  verification_status: verified
  evidence_ids: [OKF-EV-P01-SCOPE, OKF-EV-P01-ACCEPTANCE]
---

# Product Overview

OfflineWebArchiver is a local product whose current scope includes `system.describe`, local Project lifecycle, validation, and transfer commands, plus bounded Profile, Scope, Queue, Recovery, Browser, and Render workflows. Network and crawler capability remains planned; this Concept does not imply a downloader, discovery engine, or target-site run.

The product foundation now includes the reviewed Project and SQLite model, profile and scope policy, persistent queue, recovery ownership, and browser rendering layers. The relationships are described by the [Application Service](../architecture/application-service.md), [Project Format](../data/project-format.md), [Queue](../workflow/queue.md), and [Checkpoint Recovery](../recovery/checkpoint-recovery.md) Concepts. Browser-specific behavior is described by the [Browser Runtime](../architecture/browser-runtime.md) and [Rendering](../workflow/rendering.md) Concepts.

Phase navigation is preserved as historical context in the [Phase Record index](../history/index.md). The source documents contain volatile next-phase statements; those statements are intentionally not copied as a current lifecycle claim. The source documents remain available at their repository locations for authority and historical context, outside the official `okf/` bundle.
