---
type: Architecture Component
title: Platform Adapter
description: Defines the narrow platform adapter for normalized runtime facts and allowlisted configuration.
tags: [architecture, platform, configuration]
status: stable
sources:
  - id: platform-legacy-knowledge
    resource: okf/knowledge/platform/README.md
    title: Legacy platform knowledge
  - id: platform-source
    resource: packages/platform/src/index.ts
    title: Platform adapter source
owa:
  implementation_status: implemented
  legacy_paths: [okf/knowledge/platform/README.md]
---

# Platform Adapter

The platform package returns minimal normalized runtime and operating-system facts. It reads only the allowlisted `OWAB_LOG_LEVEL` configuration variable; platform-specific behavior stays behind this adapter.

Application layers consume this narrow interface rather than platform APIs directly, preserving the dependency direction described by [Application Service](application-service.md).
