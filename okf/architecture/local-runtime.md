---
type: Architecture Component
title: Isolated Local Runtime
description: Serves only mapped Project Revision resources through an exact loopback origin for untrusted archive preview.
tags: [architecture, runtime, loopback, isolation, security]
status: stable
---

# Isolated Local Runtime

The Local Runtime Server binds only to `127.0.0.1` on an assigned exact origin.
Host and optional Origin headers must match that origin, and only GET/HEAD are
served. Route Map and Original Resource Map entries, plus explicit additional
resource paths, define the serving allowlist. External Dependency Map entries
remain provenance and do not grant filesystem access.

Canonical relative-path validation, Project ownership checks, and symlink/
regular-file checks protect the Project root reader. Unknown, collided,
unresolved, or unsafe requests produce bounded responses and structured events.
The untrusted preview has no preload, IPC bridge, Node integration, database,
Secret Store access, or external navigation.

See [Network Replay](network-replay.md) and [Phase 19 validation](../testing/phase-19-validation.md).
