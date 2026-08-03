# Invalid Frontmatter Fixtures

These design fixtures specify Phase 6 expectations. Official and repository layers are deliberately separate. A repository producer failure does not automatically mean the same file is nonconformant official OKF.

## IFM-001 — Missing Frontmatter

- **Artifact category:** Concept
- **Invalid content:** `# Queue`
- **Expected severity:** `ERROR`
- **Validation layer:** Official conformance
- **Expected message:** `Concept is missing a YAML frontmatter block.`
- **Reason:** Every non-reserved Markdown file requires parseable frontmatter.

## IFM-002 — Malformed YAML

- **Artifact category:** Concept
- **Invalid YAML:** `---\ntype: [Workflow\n---`
- **Expected severity:** `ERROR`
- **Validation layer:** Official conformance
- **Expected message:** `Frontmatter is not parseable YAML.`
- **Reason:** Official conformance requires parseable YAML.

## IFM-003 — Missing Type

- **Artifact category:** Concept
- **Invalid YAML:** `---\ntitle: Queue\n---`
- **Expected severity:** `ERROR`
- **Validation layer:** Official conformance
- **Expected message:** `Required field type is missing.`
- **Reason:** `type` is the only always-required official key.

## IFM-004 — Empty Type

- **Artifact category:** Concept
- **Invalid YAML:** `---\ntype: ""\n---`
- **Expected severity:** `ERROR`
- **Validation layer:** Official conformance
- **Expected message:** `Field type must be a non-empty string.`
- **Reason:** Empty does not satisfy the official requirement.

## IFM-005 — Unknown Repository Type

- **Artifact category:** Concept
- **Invalid YAML:** `type: VERIFIED`
- **Expected severity:** `ERROR` repository; official pass
- **Validation layer:** Repository producer policy
- **Expected message:** `Type VERIFIED is not in the approved taxonomy.`
- **Reason:** Official consumers tolerate unknown types, but this repository has a closed producer taxonomy.

## IFM-006 — Wrong Type Data Type

- **Artifact category:** Concept
- **Invalid YAML:** `type: [Workflow]`
- **Expected severity:** `ERROR`
- **Validation layer:** Official conformance
- **Expected message:** `Field type must be a non-empty string.`
- **Reason:** A sequence is not an identifying type string.

## IFM-007 — Missing Repository Title

- **Artifact category:** Concept
- **Invalid YAML:** `type: Workflow\ndescription: A queue workflow.\nstatus: stable`
- **Expected severity:** `ERROR`
- **Validation layer:** Repository producer policy
- **Expected message:** `Required repository field title is missing.`
- **Reason:** Title is required for deterministic display/indexing.

## IFM-008 — Title/H1 Mismatch

- **Artifact category:** Concept
- **Invalid content:** Frontmatter `title: Queue` followed by `# Persistent Queue`
- **Expected severity:** `ERROR`
- **Validation layer:** Repository producer policy
- **Expected message:** `Frontmatter title must equal the first H1.`
- **Reason:** Two title authorities would drift.

## IFM-009 — Missing Description

- **Artifact category:** Concept
- **Invalid YAML:** Required fields except `description`
- **Expected severity:** `ERROR`
- **Validation layer:** Repository producer policy
- **Expected message:** `Required repository field description is missing.`
- **Reason:** Directory indexes/search previews need a stable summary.

## IFM-010 — Invalid Lifecycle Status

- **Artifact category:** Concept
- **Invalid YAML:** `status: VERIFIED`
- **Expected severity:** `ERROR`
- **Validation layer:** Repository lifecycle policy
- **Expected message:** `Status must be draft, stable, or deprecated.`
- **Reason:** Project evidence status cannot occupy official lifecycle.

## IFM-011 — Invalid Timestamp

- **Artifact category:** Generated Concept
- **Invalid YAML:** `generated: { by: offlinewebarchiver-okf/1.0.0, at: yesterday }`
- **Expected severity:** `ERROR`
- **Validation layer:** Repository producer policy
- **Expected message:** `generated.at must be a UTC ISO 8601 date-time.`
- **Reason:** Relative time is nondeterministic.

## IFM-012 — Invalid Actor

- **Artifact category:** Concept with verification
- **Invalid YAML:** `verified: [{ by: Jane Doe, at: "2026-08-02T10:00:00Z" }]`
- **Expected severity:** `ERROR`
- **Validation layer:** Repository actor policy
- **Expected message:** `Actor does not match an approved actor form.`
- **Reason:** It is neither human, process, nor producer/version syntax.

## IFM-013 — Invalid Sources Structure

- **Artifact category:** Concept
- **Invalid YAML:** `sources: docs/product/PROJECT_SCOPE.md`
- **Expected severity:** `ERROR`
- **Validation layer:** Repository provenance policy
- **Expected message:** `Sources must be a non-empty sequence of mappings.`
- **Reason:** Official source family uses entries.

## IFM-014 — Source Missing Resource

- **Artifact category:** Concept
- **Invalid YAML:** `sources: [{ id: scope, title: Product scope }]`
- **Expected severity:** `ERROR`
- **Validation layer:** Repository/official source-family policy
- **Expected message:** `Every source entry requires resource.`
- **Reason:** `resource` is required within an official source entry.

## IFM-015 — Duplicate Source ID

- **Artifact category:** Concept
- **Invalid YAML:** Two source entries both use `id: scope`
- **Expected severity:** `ERROR`
- **Validation layer:** Repository provenance policy
- **Expected message:** `Source IDs must be unique within a Concept.`
- **Reason:** Footnote attribution would be ambiguous.

## IFM-016 — Invalid Tags Structure

- **Artifact category:** Concept
- **Invalid YAML:** `tags: queue`
- **Expected severity:** `ERROR`
- **Validation layer:** Repository producer policy
- **Expected message:** `Tags must be a unique sequence of lowercase kebab-case strings.`
- **Reason:** Official `tags` is a YAML list.

## IFM-017 — Status Encoded as Tag

- **Artifact category:** Concept
- **Invalid YAML:** `tags: [verified, queue]`
- **Expected severity:** `ERROR`
- **Validation layer:** Repository producer policy
- **Expected message:** `Tag verified is reserved for structured state semantics.`
- **Reason:** Tags cannot replace verification/lifecycle fields.

## IFM-018 — Invalid Generated Structure

- **Artifact category:** Generated Concept
- **Invalid YAML:** `generated: { at: "2026-08-02T10:00:00Z" }`
- **Expected severity:** `ERROR`
- **Validation layer:** Repository/official generated-family policy
- **Expected message:** `generated.by is required.`
- **Reason:** Official v0.2 requires the actor inside `generated`.

## IFM-019 — Invalid Verified Structure

- **Artifact category:** Concept
- **Invalid YAML:** `verified: [human:reviewer]`
- **Expected severity:** `ERROR`
- **Validation layer:** Repository/official verification-family policy
- **Expected message:** `Each verification event requires by and at.`
- **Reason:** Strings are not verification records.

## IFM-020 — Invalid Stale-After

- **Artifact category:** Operational Runbook
- **Invalid YAML:** `stale_after: 90d`
- **Expected severity:** `ERROR`
- **Validation layer:** Repository freshness policy
- **Expected message:** `stale_after must be an absolute YYYY-MM-DD date.`
- **Reason:** Official semantics rejects relative TTL meaning.

## IFM-021 — Forbidden Local Absolute Path

- **Artifact category:** Concept source
- **Invalid YAML:** `sources: [{ resource: 'D:\\All projects\\OfflineWebArchiver\\README.md' }]`
- **Expected severity:** `ERROR`
- **Validation layer:** Repository portability policy
- **Expected message:** `Resource must not be a machine-specific absolute path.`
- **Reason:** The identifier is not portable and leaks local layout.

## IFM-022 — Unknown Restricted Field

- **Artifact category:** Repository-produced Concept
- **Invalid YAML:** `tytle: Queue`
- **Expected severity:** `ERROR` repository; official pass/preserve
- **Validation layer:** Repository producer policy
- **Expected message:** `Unknown top-level field tytle; extensions must use an approved namespace.`
- **Reason:** Closed production fields catch typos without changing official permissiveness.

## IFM-023 — Invalid Root Index Metadata

- **Artifact category:** Root `index.md`
- **Invalid YAML:** `okf_version: "0.2"\ntype: Project Overview`
- **Expected severity:** `ERROR`
- **Validation layer:** Reserved-file policy
- **Expected message:** `Root index frontmatter may contain only okf_version.`
- **Reason:** Root index is reserved navigation, not a Concept.

## IFM-024 — Invalid Directory Index Metadata

- **Artifact category:** Non-root `index.md`
- **Invalid YAML:** `generated: { by: process:indexer, at: "2026-08-02T10:00:00Z" }`
- **Expected severity:** `ERROR`
- **Validation layer:** Official reserved-file conformance
- **Expected message:** `Non-root index.md must not contain frontmatter.`
- **Reason:** Official v0.2 permits index frontmatter only at bundle root.

## IFM-025 — Invalid Log Format

- **Artifact category:** `log.md`
- **Invalid content:** `## August 2, 2026` followed by entries in oldest-first order
- **Expected severity:** `ERROR`
- **Validation layer:** Official reserved-file conformance
- **Expected message:** `Log date headings must be YYYY-MM-DD and newest first.`
- **Reason:** Official log structure requires ISO date headings and descending chronology.

## IFM-026 — Conflicting Lifecycle and Extension Semantics

- **Artifact category:** Concept
- **Invalid YAML:** `status: deprecated` with `owa.implementation_status: implemented` and no replacement/retirement body statement
- **Expected severity:** `ERROR`
- **Validation layer:** Repository/extension semantic policy
- **Expected message:** `Deprecated Concept requires an explicit replacement or retirement rationale.`
- **Reason:** Implementation can remain real after Concept deprecation, but the document needs a clear lifecycle explanation.

## IFM-027 — Duplicate YAML Key

- **Artifact category:** Concept
- **Invalid YAML:** Two top-level `status` keys
- **Expected severity:** `ERROR`
- **Validation layer:** Repository parser policy
- **Expected message:** `Duplicate YAML mapping key status is forbidden.`
- **Reason:** Parser-dependent last-value behavior is unsafe.

## IFM-028 — Empty Required Value

- **Artifact category:** Concept
- **Invalid YAML:** `description: null`
- **Expected severity:** `ERROR`
- **Validation layer:** Repository producer policy
- **Expected message:** `Description must be a non-empty string.`
- **Reason:** Null/empty required metadata is not a valid summary.

## Coverage Summary

The **28** fixtures cover missing/malformed frontmatter, required fields, type data/enumeration, title/H1, lifecycle, timestamps, actors, sources, source IDs, tags, generated/verified records, freshness, local paths, unknown fields, root/directory indexes, log structure, conflicting semantics, duplicate keys, and empty values.
