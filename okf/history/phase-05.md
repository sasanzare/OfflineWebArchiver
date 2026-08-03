---
type: Phase Record
title: Product Phase 5 Scope and Normalization Record
description: Preserves the historical Product Phase 5 Profile, Scope, and URL Normalization result.
tags: [history, phase-record, scope, normalization]
status: stable
sources:
  - id: phase-05-legacy-record
    resource: okf/phases/phase-05/PHASE_05_SCOPE_AND_NORMALIZATION_RECORD.md
    title: Legacy Product Phase 5 record
  - id: phase-05-report
    resource: docs/project/PHASE_05_IMPLEMENTATION_REPORT.md
    title: Product Phase 5 implementation report
  - id: phase-05-security
    resource: docs/architecture/PHASE_05_SECURITY_REVIEW.md
    title: Product Phase 5 security review
owa:
  verification_status: verified
  evidence_ids: [OKF-EV-P05-ENGINE, OKF-EV-P05-GOLDEN, OKF-EV-P05-PERSISTENCE, OKF-EV-P05-RECORD]
  legacy_ids: [OKF-PHASE-005]
  legacy_paths: [okf/phases/phase-05/PHASE_05_SCOPE_AND_NORMALIZATION_RECORD.md]
---

# Product Phase 5 Scope and Normalization Record

## Historical project result

The record was marked `VERIFIED` on 2026-07-31. Product Phase 5 implemented local Profile and Scope behavior only. Product Phase 6 was recorded as next.

## Scope

Application 0.5.0, contract 1.2.0, Project format 1.1.0, SQLite schema 3, Site Profile schema 1, Scope Engine 1, and exact MIT dependency `tldts@7.4.9` were delivered with migration `003_add_site_profiles`.

## Verified nodes and evidence boundaries

The phase verified portable `profile/config.json` authority with manifest-synchronized Base URL, semantic no-op rejection, change summaries, and immutable SQLite and Project revisions. It verified deterministic contextual URL resolution, normalization, identity URL, SHA-256 identity v1, explicit domain/path/query/fragment and depth/page policy, canonical-cycle and redirect-loop handling, downgrade policy, structured matched-rule evidence, sensitive query and fragment rejection or redaction, IPv4 and IPv6 security classification, and contracted Application Service, CLI, and sandboxed Electron flows.

No evidence claims a request, DNS check, redirect or canonical fetch, queue or Job state, crawler, browser rendering, authentication, proxy, capture, rewrite, or target-site run. AC-AUTHZ-001 and the dispatch/browser portions of AC-SCOPE-002 and AC-SCOPE-003 remained defined for later phases. The [Queue](../workflow/queue.md) later consumes normalized identities; this record does not claim that behavior for Phase 5.

## Decisions and limitations

ADR-015 through ADR-022 resolved OD-028 through OD-035. Risks R-047 through R-055 retained material identity, query, domain and PSL/IDN, path, relationship, SSRF/DNS, profile-divergence, rule-safety, and coverage concerns. No commit, push, release, or deployment was phase evidence.

