---
type: Architecture Component
title: Platform Adapter
description: Defines the narrow platform adapter for normalized runtime facts and allowlisted configuration.
tags: [architecture, platform, configuration]
status: stable
sources:
  - id: platform-source
    resource: https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/packages/platform/src/index.ts
    title: Platform adapter source
owa:
  implementation_status: implemented
---

# Platform Adapter

The platform package returns minimal normalized runtime and operating-system facts. It reads only the allowlisted `OWAB_LOG_LEVEL` configuration variable; platform-specific behavior stays behind this adapter.

Application layers consume this narrow interface rather than platform APIs directly, preserving the dependency direction described by [Application Service](application-service.md).
