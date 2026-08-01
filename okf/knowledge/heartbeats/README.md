# Heartbeats

**Status:** VERIFIED through Product Phase 7. Heartbeat default is 15s and records liveness without changing expiry. Renewal is explicit, before expiry, and extends from renewal time. Exact expiry is `now >= expiresAt`.
