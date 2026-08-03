# Metadata Contract

## Purpose and Authority

This document records the final producer contract for Concepts under the realized `okf/` root. Early references to a proposed `okf/bundle/` root are historical and are superseded by the Phase 4 root decision and Phase 8 closure. The production implementation uses the pinned YAML 1.2 parser and layered validator under `tools/okf/`.

Rules are labeled by validation layer:

- **Official:** required for OKF v0.2 conformance.
- **Repository:** an additional rule for OfflineWebArchiver producers.
- **Extension:** a project-only rule under the `owa` namespace.
- **Quality:** advisory authoring or freshness guidance.

Official consumers remain permissive where v0.2 requires it even when this repository's producer policy is stricter.

## Governing Principles

1. `type` is the only field required by official v0.2 for every Concept.
2. OfflineWebArchiver additionally requires `title`, `description`, and explicit `status` on every produced Concept.
3. Lifecycle, implementation, verification, and governance are separate dimensions.
4. Official Concepts remain understandable without parsing `owa` or extension JSON.
5. Generated and verified records state facts; they never imply lifecycle or implementation state.
6. Portable metadata never contains a machine-specific absolute local path.
7. Ordinary Markdown links carry human-readable relationships; registries index rather than replace them.
8. Unknown types/fields do not fail official conformance. Repository-owned unknown fields fail the producer contract so typos cannot silently persist.

## Field Categories

Every approved top-level field has one primary contract category.

| Field | Primary category | Official status | Summary |
|---|---|---|---|
| `type` | `OFFICIAL_REQUIRED` | Required | Non-empty canonical Concept type |
| `title` | `REPOSITORY_REQUIRED` | Recommended | Display name and exact H1 text |
| `description` | `REPOSITORY_REQUIRED` | Recommended | Plain one-sentence summary |
| `resource` | `OFFICIAL_OPTIONAL` | Recommended when bound to an asset | Canonical portable URI/path for the described asset |
| `tags` | `REPOSITORY_RECOMMENDED` | Recommended | Cross-cutting lowercase labels |
| `status` | `REPOSITORY_REQUIRED` | Optional lifecycle family | Explicit `draft`, `stable`, or `deprecated` |
| `generated` | `REPOSITORY_CONDITIONAL` | Optional trust family | Required only when current Concept content is fully tool/agent-generated |
| `verified` | `REPOSITORY_RECOMMENDED` | Optional trust family | Independent verification events |
| `sources` | `REPOSITORY_CONDITIONAL` | Optional provenance family | Required when content derives from identifiable sources and for specified Concept types |
| `usage_window` | `OFFICIAL_OPTIONAL` | Optional provenance signal | Shared time window for source usage counts |
| `stale_after` | `REPOSITORY_CONDITIONAL` | Optional lifecycle/freshness family | Required for volatile operational/security knowledge selected by policy |
| `owa` | `PROJECT_EXTENSION` | Producer-defined extension | Minimal project state and stable traceability identifiers |
| `okf_version` | `RESERVED_FILE_ONLY` | Root index only | Exactly `"0.2"` in root `index.md` |
| `timestamp` | `DEPRECATED_LEGACY` | v0.1 fallback | Never produced; migrate to `generated.at` only when it truly represented content generation |

Nested record fields inherit the category of their parent except official required children: `generated.by`, `verified[].by`, `verified[].at`, and `sources[].resource`. Repository production also requires `generated.at`.

## Minimum Contracts by Artifact

| Artifact | Required metadata | Conditional/recommended metadata | Notes |
|---|---|---|---|
| Normal authored Concept | `type`, `title`, `description`, `status` | `tags`, `verified`, `sources`, `stale_after`, `owa` as applicable | No `generated` for human-owned editing |
| Generated Concept | Normal fields plus `generated.by` and `generated.at` | `sources` normally required; `verified` independent | Body is not manually edited |
| Reference Concept | Normal fields | `resource` required when mirroring one underlying asset; `sources` required when derived | May be generated only for an explicitly reproducible mirror |
| Historical Phase Record | Normal fields; `type: Phase Record` | `sources` required; `owa.legacy_ids` when a stable registry identity is retained | No `stale_after`; historical correction uses an amendment |
| Operational Runbook | Normal fields; `type: Operational Runbook` | `sources` and `stale_after` required; verification recommended | Freshness warning affects operator trust, not official conformance |
| Security Control | Normal fields | `sources` and `stale_after` required; verification strongly recommended | Missing required repository metadata is a policy error |
| Architecture Decision | Normal fields; `type: Architecture Decision` | `sources` required; `owa.decision_ids` required when bridging current IDs | Lifecycle is not ADR decision status |
| Product Requirement | Normal fields; `type: Product Requirement` | `sources` required; `owa.requirement_ids` required for migrated requirements | Implementation state stays in `owa` |
| Directory `index.md` | No frontmatter | Maintained-navigation body marker | Reserved navigation file, not a Concept |
| Root `index.md` | Only `okf_version: "0.2"` | No other frontmatter | Authored body and top-level navigation |
| `log.md` | No frontmatter | Not used by this repository | If later adopted, body follows official date grouping |
| Extension documentation | No official contract | Project documentation conventions | It is under `okf-extension/`, outside normal Concept classification |

## Canonical Field Order

Repository-produced Concept frontmatter uses this order:

```yaml
---
type:
title:
description:
resource:
tags:
status:
generated:
verified:
sources:
usage_window:
stale_after:
owa:
---
```

Omit absent optional fields; do not emit nulls, empty strings, or empty arrays. Field ordering is repository formatting policy, not official conformance.

## YAML Normalization

- UTF-8 without BOM; `---` delimiters alone on their lines; one frontmatter block starting at byte zero.
- Two-space indentation; spaces only; no tabs; no duplicate mapping keys; no YAML anchors, aliases, merge keys, or custom tags.
- Use block arrays and mappings. A bare `verified` mapping must be consumed as one entry per v0.2, but repository producers emit a list.
- Quote timestamps and dates with double quotes. Quote strings that YAML could coerce to boolean, null, date, or number, or that contain leading/trailing whitespace, `: `, or ` #`.
- Emit booleans as `true`/`false`; emit integers in base 10. This contract currently has no nullable field.
- Tags and enum values use lowercase canonical forms; Concept type values preserve exact title capitalization.
- Sort tags and ID arrays lexically using ordinal comparison. Preserve `sources` and `verified` order when it communicates relevance or chronology; otherwise sources are stable by `id/resource` and verification is oldest first.
- Timestamps use RFC 3339/ISO 8601 UTC form ending in `Z`; dates use quoted `YYYY-MM-DD`.

Noncanonical order or style is a formatting failure/`INFO`, never an official-conformance error.

## Unknown-Field and Unknown-Type Behavior

| Situation | Official validator | Repository producer validator | Round-trip consumer |
|---|---|---|---|
| Unknown non-empty `type` | Pass; tolerate as generic Concept | `ERROR` for repository-owned bundle until taxonomy is amended | Preserve value |
| Unknown top-level field | Pass | `ERROR`; producer extensions must live under an approved namespace | Preserve key/value |
| Unknown `owa` field | Not evaluated officially | Extension `ERROR` | Preserve if acting as generic OKF consumer |
| Missing optional official family | Pass | Apply only documented conditional/recommended rule | Preserve absence |
| Broken Markdown link | Pass officially | Repository link `ERROR` under existing project policy | Preserve link |

The proposed producer schema is intentionally closed. That closure must never be reported as an official OKF conformance rule.

## Extension Policy

All Concept-level project metadata is under the single `owa` mapping. Approved children are three independent project state fields and six ID arrays: requirements, acceptance criteria, decisions, risks, evidence, and stable legacy identities. The migration-only path bridge was retired in Phase 8. Full relationship graphs, evidence methods/details, risk/decision bodies, and migration ledger state remain in extension JSON rather than Concept frontmatter.

Official consumers may ignore `owa`. Phase 6 extension validation treats unknown `owa` keys as errors and validates referenced IDs. The body must express any relationship needed for human understanding.

## Authored and Generated Boundaries

Human-authored and human-owned AI-assisted Concepts omit `generated`; Git records editing history. A fully generated Concept carries `generated` and is regenerated, not manually patched. A materially transformed migration output carries a migration producer actor until a human takes ownership through substantive review; human verification does not erase its generation provenance.

Reserved directory indexes cannot carry `generated` frontmatter. The final indexes are human-maintained navigation and use the marker specified in `AUTHORING_AND_GENERATION_POLICY.md`. The root index is also authored.

## Validation Layers and Severities

| Layer | `ERROR` examples | `WARNING` examples | `INFO` examples |
|---|---|---|---|
| Official conformance | No/malformed frontmatter; missing/empty `type`; invalid reserved-file structure | Optional-family semantic concern where official wording is `SHOULD` | Trust tier and staleness observations |
| Repository policy | Missing title/description/status; unknown repository type; invalid canonical enum; local absolute resource | Missing recommended tags/verification; stale Concept | Noncanonical ordering/style |
| Project extension | Invalid `owa` field/value; unresolved required traceability ID | Stable legacy identity requiring review | Extension coverage summary |
| Quality | Not applicable | Weak summary, old source, broken project link | Suggestions and derived trust tier |

One finding has one primary layer. Aggregate commands preserve layer and severity rather than relabeling project policy as official failure.

## Compatibility Rules

- The 58 transitional Markdown paths and every `owa.legacy_paths` entry were removed in Phase 8 after canonical cutover.
- Historical uppercase status values were transformed according to `STATUS_AND_LIFECYCLE_MODEL.md`; they are never copied into official `status`.
- Evidence IDs remain extension authority and may be referenced by `owa.evidence_ids`.
- `owa.legacy_ids` may retain a stable registry identity; it is not a path or alternate authority.
- Canonical Concept paths and the final source-of-truth map control all future renames.

## Contract Versioning and Change Control

This design contract is `owa-okf-metadata/1.0.0` targeting OKF `0.2`. Phase 4 may not change semantics. A change requires official or repository evidence, a `PHASE_03_DECISIONS.md` amendment, schema/example/mapping updates, validation impact analysis, and a version decision:

- patch: clarification with no accepted-instance change;
- minor: backward-compatible optional extension;
- major: required-field, enum, or semantic break.

The official `okf_version` remains independent from this repository contract version.

## Procedural Validation Limits

JSON Schema cannot alone prove file location/reserved status, H1/title equality, duplicate YAML keys before parsing, source-ID uniqueness, footnote joins, resource existence, type-directory recommendations, link integrity, material-change verification invalidation, generated/authored consistency, registry ID resolution, or migration cutover. Phase 6 implements those as explicitly layered checks.
