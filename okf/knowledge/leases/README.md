# Leases — Transitional Legacy Artifact

> This file is not authoritative. The migrated Concept is [Leases](../../recovery/leases.md). It remains for legacy-path compatibility until Phase 8 cleanup.

**Status:** VERIFIED through Product Phase 7. Lease configuration 1 defaults to 60s and stores a SHA-256 verifier in the Lease row. Phase 6 compatibility/idempotency ledgers retain the active credential for restart-safe identical replay, so the Project database is sensitive. One active Lease per Job is enforced; all protected writes validate scope, owner, token, generation, status and expiry.
