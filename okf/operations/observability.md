---
type: Operational Runbook
title: Observability
description: Defines structured event fields and recursive redaction for operational diagnostics.
tags: [operations, observability, logging, redaction]
status: stable
sources:
  - id: logging-architecture
    resource: docs/architecture/LOGGING_AND_OBSERVABILITY.md
    title: Logging and observability architecture
stale_after: "2026-11-01"
owa:
  implementation_status: implemented
---

# Observability

Structured JSON events carry component, correlation ID, command ID, event name, level, and an optional error code. Secret-like metadata keys are recursively redacted before output.

The [Platform Adapter](../architecture/platform.md) provides the narrow runtime configuration boundary for this behavior.
