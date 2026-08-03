# Freshness and Verification Policy

## Verification Contract

`verified` records who or what confirmed current content against its `sources` or `resource`, and when. It is independent of `generated`, lifecycle `status`, and project implementation state. `status: stable` does not mean verified; verification does not make a Concept stable.

Canonical repository form:

```yaml
verified:
  - by: process:docs-validation
    at: "2026-08-02T10:00:00Z"
  - by: human:architecture-owner
    at: "2026-08-02T11:00:00Z"
```

A valid event requires actor and UTC timestamp. Official consumers accept a single mapping; repository producers write a list. Multiple entries are independent checks. Trust tier is derived officially: no events is unverified, non-human events only is machine-confirmed, and at least one `human:` event is human-reviewed.

## Material-Change Invalidation

A material change alters a claim, requirement, invariant, procedure, source interpretation, decision, or relationship on which verification relied. It invalidates prior current verification. The author must remove stale current events or preserve them only in Git/history and add new events after rechecking. Formatting, spelling, or link-label changes that preserve meaning do not invalidate.

Phase 6 must compare content/source digests or require an explicit review workflow; JSON Schema cannot determine materiality. A verification timestamp older than `generated.at` is allowed by official syntax but triggers a repository `WARNING` and cannot count as current verification without documented non-material generation.

## `stale_after` Contract

`stale_after` is a quoted absolute date `YYYY-MM-DD`. The Concept is stale when `today >= stale_after`. Durations such as `90d`, timestamps, and relative expressions are invalid. Absence means the contract sets no automatic staleness date; it does not prove perpetual freshness.

Staleness normally produces a quality `WARNING`, not an official or repository schema error. It never changes lifecycle automatically. A stale deprecated Concept does not need a freshness warning. A generated Concept still follows the same date rule; regeneration may compute a new reviewed absolute date from authoritative policy but may not use read time as hidden state.

## Policy by Concept Type

| Type/category | `verified` policy | `stale_after` policy | Recommended review horizon |
|---|---|---|---|
| Operational Runbook | Recommended before stable use | Required when commands/dependencies can change | 90 days unless owner documents another horizon |
| Security Control | Strongly recommended | Required for runtime/platform-dependent control | 90 days; shorter for active external threat dependency |
| Architecture Overview | Recommended after architecture review | Recommended when deployment/dependency graph changes frequently | 180 days |
| Architecture Component/Data Model/Workflow/Recovery | Recommended for critical invariants | Conditional on volatility | 180 days for volatile runtime contracts |
| Product Requirement | Recommended when promoted | Usually omit; review via product governance | Product review cadence |
| Architecture Decision | Recommended against authoritative ADR | Omit; decision validity is lifecycle/supersession | Review on supersession evidence |
| Phase Record | Optional historical verification | Omit | Immutable history; amend corrections |
| Reference | Recommended for curated summary | Required for volatile external/reference mirror; omit for immutable snapshot | Based on upstream cadence |
| Test Strategy/Quality Policy | Recommended | Recommended when toolchain/policy changes | 180 days |
| Generated report (extension) | Process verification/report digest | Report-specific expiry outside Concept schema | Every generation |

These horizons are repository recommendations. The stored value is always an explicit absolute date chosen at authoring/review time.

## Expiration and Reverification

Reverification appends a new event after checking current content and sources, removes invalid current events from frontmatter where necessary, and advances `stale_after` only through explicit policy. Older verification remains discoverable in Git or extension audit reports. A source change without Concept review yields a warning even before `stale_after` when detectable.

## Validation and Future CI

- Malformed event/date/actor or missing required freshness field: repository `ERROR`.
- Stale date, verification older than meaningful generation, or expected verification absent: `WARNING`.
- A future date in `verified.at` or `generated.at`: repository `ERROR` beyond an allowed clock-skew tolerance defined in Phase 6.
- `status: stable` without verification is allowed officially and by repository schema; high-risk type policy may warn.
- Phase 7 CI runs deterministic date comparison using UTC date supplied by the runner, emits warnings separately, and does not rewrite dates or verification events.
