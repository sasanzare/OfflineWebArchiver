# Product Phase 5 Scope and Normalization Record — Transitional Legacy Artifact

> This file is not authoritative. Its historical Concept is [Product Phase 5 Scope and Normalization Record](../../history/phase-05.md). It remains for legacy-path compatibility until Phase 8 cleanup.

## Status

`VERIFIED` on 2026-07-31. Product Phase 5 implements local Profile/Scope behavior only. Product Phase 6 is next and not started.

## Scope

Application `0.5.0`; contract `1.2.0`; Project format `1.1.0`; SQLite schema `3`; Site Profile schema `1`; Scope Engine `1`; exact MIT dependency `tldts@7.4.9`; migration `003_add_site_profiles`. Migrations 001/002 are unchanged.

## Verified nodes

- Portable `profile/config.json` authority with manifest-synchronized Base URL, semantic no-op rejection, change summaries, and immutable SQLite/Project revisions.
- Deterministic contextual URL resolution, normalization, identity URL, and SHA-256 identity v1.
- Explicit domain/path/query/fragment, depth/page, canonical-cycle/redirect-loop/downgrade policy and structured matched-rule evidence.
- Credential/sensitive query/fragment rejection or redaction and IPv4/IPv6 literal security classification.
- Contracted Application Service, contextual built CLI, and sandboxed real Electron policy-editor flows.
- Unit, golden, integration, architecture, contract, migration, format, security, docs, and OKF gates.

## Evidence boundaries

No evidence claims a request, DNS check, redirect/canonical fetch, queue/job state, crawler, browser rendering, authentication, proxy, capture, rewrite, or target-site run. AC-AUTHZ-001 and the dispatch/browser portions of AC-SCOPE-002/003 remain defined for their later phases; AC-P05-001..035 are directly evidenced.

## Decisions and risks

ADR-015..022 resolve OD-028..035. R-047..055 retain material identity, query, domain/PSL/IDN, path, relationship, SSRF/DNS, profile-divergence, rule-safety, and coverage risks.

## Next phase

Product Phase 6 — Persistent Queue and Job State Machine must persist normalized identities and Page Jobs, uniqueness, parent/depth, priority/retry counters, state transitions, claims/completion, and idempotent commits while consuming Phase 5 decisions. Leases and Crash Recovery remain Product Phase 7.

No commit, push, tag, release, or deployment is phase evidence.
