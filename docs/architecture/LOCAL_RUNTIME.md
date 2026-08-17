# Phase 19 Local Runtime Server

The Local Runtime Server is a small loopback-only HTTP adapter for an already
prepared Project Revision. It is not a crawler, downloader, proxy, or trusted
UI surface.

## Binding and origin

The server binds only to `127.0.0.1` on an ephemeral port and exposes one exact
origin. Host and optional `Origin` headers must match that assigned origin.
`localhost`, other loopback addresses, external hosts, credentials, and
cross-origin navigation are not blanket-trusted. Only `GET` and `HEAD` are
served.

## Map-bounded serving

`RouteMap` resolves page routes, including explicit SPA entry-document fallback
metadata. `OriginalResourceMap` and an explicit additional-resource allowlist
resolve static resources. `ExternalDependencyMap` remains provenance and does
not grant a file-serving capability. Unknown, unresolved, collided, or unsafe
paths return a bounded error and emit a structured event.

Every resolved path is checked with the shared canonical path policy. When a
Project root reader is used, the reader also rejects symlinked ancestors and
non-regular files. The server never concatenates an arbitrary URL path into a
filesystem path and never serves a path absent from the active maps.

## Untrusted preview boundary

Archived HTML/JS is served only through a separate Browser Context/window
baseline. The Desktop trusted renderer remains isolated with
`contextIsolation=true`, `nodeIntegration=false`, `sandbox=true`, and no
archive preload or IPC bridge. The archive preview has no Node integration,
preload, IPC bridge, privileged file access, or external navigation. A Local
Runtime process does not expose Project databases, Secret Store payloads, or
transport commands.

## Relationship to replay

The Local Runtime origin is the sole local exception in Strict Offline mode.
Network Replay fulfills captured external GETs by deterministic identity; an
uncaptured external request is recorded as leakage and aborted. Local Runtime
requests continue through the existing authorization and budget checks after
the replay adapter marks them as local. Service Worker registration is blocked
by default or resolved from an explicit profile decision, and does not bypass
the replay boundary.

## Related records

- [Network Replay](NETWORK_REPLAY.md)
- [Trust Zones and IPC](TRUST_ZONES_AND_IPC.md)
- [Canonical Path Safety](CANONICAL_PATH_SAFETY.md)
- [Phase 19 security review](PHASE_19_SECURITY_REVIEW.md)
- [Phase 19 ADR](../project/adr/ADR-062-api-capture-replay-and-isolated-runtime.md)
