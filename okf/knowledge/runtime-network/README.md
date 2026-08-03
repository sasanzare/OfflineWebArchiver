# Runtime Network Knowledge — Transitional Legacy Artifact

> This file is not authoritative. The migrated Concept is [Runtime Network Policy](../../security/runtime-network.md). It remains for legacy-path compatibility until Phase 8 cleanup.

**Status:** VERIFIED for the Phase 8 request boundary.

CDP Fetch interception re-evaluates Phase 5 scope and DNS classification before GET/HEAD requests and redirects. Public-only production addresses and exact-origin loopback fixtures are distinct construction-time policies. No header/body/cookie/proxy input exists. DNS connection pinning remains unknown and tracked by R-096/OD-073.
