---
type: Data Model
title: Asset Source and Content
description: Defines the separate URL-source, verified content-object, and Page-to-Asset provenance model for Product Phase 17.
tags: [data, assets, deduplication, provenance, sqlite]
status: stable
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-ASSET-001, FR-ASSET-002]
  acceptance_ids: [AC-P17-001, AC-P17-002, AC-P17-003, AC-P17-004, AC-P17-012]
  decision_ids: [OD-084]
  risk_ids: [R-016, R-082, R-083, R-084]
  evidence_ids: [OKF-EV-P17-DOMAIN, OKF-EV-P17-PERSISTENCE, OKF-EV-P17-TESTS]
---

# Asset Source and Content

An Asset source is identified by Project, Run, revision, Page Job, asset type,
normalized URL, and the existing Scope Engine identity hash. Original URL,
meaningful query parameters, redirect provenance, relation kind, validators,
and safe status metadata remain attached to the source. Sensitive query values
are redacted and URL credentials are rejected.

Content identity is independent of URL identity: it is the SHA-256 and byte
length of the bytes that were streamed, persisted, and verified. One Project
content row and deterministic object path may be referenced by multiple source
rows. Page↔Asset relations are many-to-many, so provenance is retained without
duplicating identical bytes and without symlinks or hardlinks.
