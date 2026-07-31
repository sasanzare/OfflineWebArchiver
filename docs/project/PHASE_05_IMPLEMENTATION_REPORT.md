# Product Phase 5 Implementation Report

**Phase:** Product Phase 5 — Profile, Scope, and URL Normalization
**Status:** Complete
**Date:** 2026-07-31

## Result

The repository now implements versioned Site Profiles, deterministic URL normalization/identity, domain/path/query/fragment scope rules, canonical and redirect classification, depth/page limits, SSRF preflight classification, SQLite revision persistence, contract `1.2.0`, Project format `1.1.0`, database schema `3`, application `0.5.0`, CLI flows, and a secure Phase 5 Desktop policy editor/explanation flow.

The portable authority is `profile/config.json`; its normalized Base URL is mirrored in the Project manifest, and SQLite tables `site_profiles`, `site_profile_revisions`, and `scope_rules` preserve active integrity metadata and immutable history. Semantic Profile changes advance the Project revision and use expected-revision concurrency checks; no-op drafts fail explicitly without mutation. Migration `003_add_site_profiles` is additive; migrations 001/002 were not modified.

Scope Engine `1` is pure with respect to I/O and emits deterministic decisions and SHA-256 identity hashes. It accepts explicit source/discovery/revision context, rejects stale Profile revisions, removes sensitive query/fragment values, and detects supplied canonical cycles. It uses a pinned bundled PSL (`tldts` `7.4.9`, MIT) only to describe registrable-domain relation, never to grant scope. All authorization is explicit. No queue, job, fetch, redirect request, DNS lookup, crawler, browser, authentication, proxy, capture, or rewrite capability exists.

## Evidence

Unit and golden tests cover Profile validation, Base URL normalization, discovery context, duplicates, tracking/sensitive values, relative URLs, exact/subdomain boundaries, path boundaries, IPv4/IPv6, limits, canonical cycles, redirect classification, and deterministic serialization. Integration tests prove Project/Profile/Base URL revision alignment, SQLite rows, stale/no-op update rejection, an injected post-file-replacement rollback, export/import, and tamper detection. Built CLI and real Electron smoke cover the public flows. Architecture, contract, migration, format, security, documentation, and OKF validators are release gates.

## Compatibility and limitations

Format 1.0.0 remains readable; opening applies schema 3 with a verified backup. Creating a profile upgrades the manifest to 1.1.0. DNS/network authorization remains a later dispatch concern. Profile file/database crash divergence is detected, not silently repaired. Persistent identities and jobs belong exclusively to Product Phase 6.
