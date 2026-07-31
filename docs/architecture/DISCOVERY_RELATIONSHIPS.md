# Discovery Relationships

Every accepted enqueue records synthetic discovery evidence with an immutable relationship UUID, stable discovery key, optional parent Job, child Job, safe source URL, type, source/effective depth, Scope Decision reference, time, and bounded metadata. Types are seed, DOM link, canonical, redirect, sitemap, History API, navigation action, JSON discovery, and manual. They are vocabulary only; Phase 6 performs no discovery.

A Job may have many parents. The unique `(child_job_id, discovery_key)` rule makes identical relationship insertion idempotent while preserving genuinely different parent, type, source, depth, or Scope Decision evidence. Project and Run scoped composite foreign keys prevent cross-run Scope Decision linkage.

Effective depth is the minimum discovered depth. Lower-depth rediscovery updates the Job; higher-depth rediscovery cannot increase it. Every historical relationship retains its original depth. Priority is not recalculated, identity is unchanged, and completed/failed/skipped/blocked Jobs never reopen automatically.

Rejected or blocked Scope Decisions are persisted as Scope evidence but normally create no Page Job or discovery relationship. Statistics distinguish duplicate discovery evidence from logical Job count.
