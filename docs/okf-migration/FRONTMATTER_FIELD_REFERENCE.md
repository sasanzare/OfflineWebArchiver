# Frontmatter Field Reference

## Reading the Reference

Categories describe OfflineWebArchiver's primary contract obligation. “Official status” separately records how Google OKF v0.2 treats the field. `ERROR` values below name the repository producer layer unless explicitly labeled official.

## Top-Level Fields

| Field | Category | Type and allowed values | Required conditions / default | Source of truth and authoring | Severity | Official status | Example | Migration source |
|---|---|---|---|---|---|---|---|---|
| `type` | `OFFICIAL_REQUIRED` | Non-empty string; exactly one of 14 canonical types | Every Concept; no default | Taxonomy; human/migration producer; tools do not overwrite | Official `ERROR` if absent/empty; repository `ERROR` if unknown | Only always-required key | `type: Workflow` | Content migration map/type classification |
| `title` | `REPOSITORY_REQUIRED` | String 1-120 characters | Every Concept; no default; exact first H1 text | Concept author; generator may derive only for fully generated Concept | Repository `ERROR` | Official recommended | `title: Persistent Queue` | Current H1/title |
| `description` | `REPOSITORY_REQUIRED` | Plain string 1-240 characters; one sentence; no Markdown/link/list/status | Every Concept; no default | Concept author; source for generated index snippets | Repository `ERROR`; quality warning for weak sentence | Official recommended | `description: Describes durable page-job scheduling and transitions.` | Authored summary of body |
| `resource` | `OFFICIAL_OPTIONAL` | Portable URI, bundle path, relative path, or scope descriptor | Required by repository only when Concept describes one canonical underlying asset | Subject owner; tools preserve | Repository `ERROR` for Windows/UNC path | Official recommended when asset-bound | `resource: ../references/project-format.schema.json` | Current source/asset reference |
| `tags` | `REPOSITORY_RECOMMENDED` | Unique array, max 12, lowercase kebab-case strings max 48 | Omit when none; never status/type/owner | Concept author; tools may normalize ordering only in explicit format mode | `WARNING` if useful tags absent; `ERROR` if malformed | Official recommended | `tags: [persistence, sqlite]` | Current domain vocabulary, reviewed not copied |
| `status` | `REPOSITORY_REQUIRED` | `draft`, `stable`, `deprecated` | Explicit on every repository Concept; official absence means `stable` | Concept lifecycle owner; never derived from registry `VERIFIED` alone | Repository `ERROR` if missing/unknown | Official optional lifecycle | `status: stable` | Semantic lifecycle review |
| `generated` | `REPOSITORY_CONDITIONAL` | Generated record | Required for fully tool/agent-generated current content; absent for human-owned content | Generating actor; generator may update both children only after meaningful regeneration | Repository `ERROR` if required/malformed | Official optional trust | See nested fields | Generator/migration provenance |
| `verified` | `REPOSITORY_RECOMMENDED` | Verification record or non-empty list; canonical output is list | Absence means unverified; never inferred from stable | Verifier appends after actual check; material change invalidates/removes prior current verification | `WARNING` if expected and absent/stale; malformed is repository `ERROR` | Official optional trust | See nested fields | Current evidence/review, not status alone |
| `sources` | `REPOSITORY_CONDITIONAL` | Non-empty list of source records | Required for Product Requirement, Architecture Decision, Phase Record, derived/generated Concept, and source-dependent controls/runbooks | Concept author or migration producer; source records are provenance | Repository `ERROR` when condition unmet/malformed | Official optional provenance | See source fields | Evidence registry, ADRs, product/source docs |
| `usage_window` | `OFFICIAL_OPTIONAL` | `{from, to}` dates | Present only when framing one or more `sources[].usage_count`; entry-level value overrides | Producer measuring usage | Repository `ERROR` if used without count or invalid range | Official optional credibility signal | `usage_window: { from: "2026-07-01", to: "2026-07-31" }` | No current mapping by default |
| `stale_after` | `REPOSITORY_CONDITIONAL` | Quoted absolute date `YYYY-MM-DD` | Required for volatile Operational Runbook and Security Control; policy-based elsewhere; absent means no automatic staleness | Knowledge owner sets absolute review horizon | Stale is `WARNING`; malformed/required-missing is repository `ERROR` | Official optional freshness | `stale_after: "2026-11-01"` | Review schedule; never relative TTL |
| `owa` | `PROJECT_EXTENSION` | Closed mapping defined below | Present only when project state, traceability, or compatibility data exists | Relevant project authority; official consumers may ignore | Extension `ERROR` if malformed/unknown | Official producer-defined extension | `owa: { verification_status: verified }` | Current registries and migration map |
| `okf_version` | `RESERVED_FILE_ONLY` | String constant `"0.2"` | Required by repository only in `okf/index.md` for the Phase 4 execution slice; forbidden elsewhere | Root-index author | Reserved-file `ERROR` | Official root-index-only optional declaration | `okf_version: "0.2"` | Target architecture and `OKF-P4-A001` |
| `timestamp` | `DEPRECATED_LEGACY` | Legacy datetime | Never produced; no default | Read-only v0.1 fallback | Repository `ERROR` in new files | Superseded by `generated.at` | Invalid in new content | No current v0.2 production source |

## Generated and Verification Fields

| Field | Category | Type | Requirement | Ownership/default | Severity | Valid example | Invalid example |
|---|---|---|---|---|---|---|---|
| `generated.by` | `REPOSITORY_CONDITIONAL` | Actor | Required whenever `generated` exists; official requirement | Generator identity; no default | `ERROR` | `by: offline-webarchiver-okf/1.0.0` | `by: Codex` |
| `generated.at` | `REPOSITORY_CONDITIONAL` | UTC date-time ending `Z` | Repository-required whenever `generated` exists | Generator writes last meaningful content-change instant | `ERROR` | `at: "2026-08-02T12:00:00Z"` | `at: yesterday` |
| `verified[].by` | `REPOSITORY_CONDITIONAL` | Actor | Required in every verification event; official requirement | Actual verifier; no default | `ERROR` | `by: human:docs-owner` | `by: anonymous user` |
| `verified[].at` | `REPOSITORY_CONDITIONAL` | UTC date-time ending `Z` | Required in every verification event; official requirement | Actual verification instant | `ERROR` | `at: "2026-08-02T13:00:00Z"` | `at: "2026-08-02"` |

Verification method and evidence links do not extend the official record. Put the method in the body or evidence registry and identify evidence with `sources` and/or `owa.evidence_ids`.

## Source Fields

| Field | Category | Type / allowed form | Requirement / default | Source of truth | Severity | Example | Migration source |
|---|---|---|---|---|---|---|---|
| `sources[].resource` | `REPOSITORY_CONDITIONAL` | Non-empty portable resource or scope descriptor | Required in every source entry | Referenced artifact/scope | `ERROR` | `docs/project/adr/ADR-025-job-state-machine.md` | `evidence.path`, registry record paths, body citations |
| `sources[].id` | `OFFICIAL_OPTIONAL` | Lowercase kebab-case, unique in Concept | Required by repository when body footnote cites the source | Concept author | Duplicate/missing join `ERROR` | `queue-state-adr` | Evidence ID normalized where appropriate |
| `sources[].title` | `REPOSITORY_RECOMMENDED` | String 1-160 | Recommended for readable provenance | Source title | `WARNING` if opaque resource lacks title | `Persistent queue state-machine ADR` | Evidence/record name |
| `sources[].author` | `OFFICIAL_OPTIONAL` | Actor | Omit if unknown | Source producer identity | Malformed `ERROR`; absent allowed | `human:architecture-owner` | Only verified current author data |
| `sources[].usage_count` | `OFFICIAL_OPTIONAL` | Integer >= 0 | Omit unless measured; requires shared or entry usage window | Measurement system | Invalid/missing window repository `ERROR` | `usage_count: 42` | None by default |
| `sources[].last_modified` | `OFFICIAL_OPTIONAL` | Quoted date | Omit if not known reliably | Source/Git authority | Malformed `ERROR` | `last_modified: "2026-08-01"` | Verified Git/source metadata |
| `sources[].usage_window` | `OFFICIAL_OPTIONAL` | `{from, to}` quoted dates | Entry-specific override only | Measurement system | Invalid order `ERROR` | `{ from: "2026-07-01", to: "2026-07-31" }` | None by default |

## `owa` Project Extension Fields

| Field | Necessity and type | Allowed values / structure | Source of truth | Migration source | In frontmatter? | Generated? | Validation and retention |
|---|---|---|---|---|---|---|---|
| `owa.implementation_status` | Separates capability progress from lifecycle | `planned`, `partial`, `implemented`, `blocked`, `not-applicable`, `unknown` | Product/implementation authorities | Current contextual status claims and applicable node/domain state | Yes when relevant | No | Extension `ERROR` for invalid value; retain while consumers need state |
| `owa.verification_status` | Preserves claim/evidence disposition | `unverified`, `partial`, `verified`, `conflict`, `unknown` | Evidence review plus extension validator | Current `VERIFIED`, `PARTIAL`, `UNKNOWN`, conflict status by context | Yes when relevant | May be derived only after Phase 6 defines inputs | Does not replace official `verified`; retain long-term if useful |
| `owa.governance_status` | Preserves owner/decision disposition | `open`, `needs-owner-confirmation`, `resolved`, `blocked`, `not-applicable`, `unknown` | Decision/risk/product authority | Current decision/owner statuses | Yes for governance-bearing Concepts | No | Extension `ERROR`; do not infer implementation |
| `owa.requirement_ids` | Traceability IDs | Unique non-empty ID array | Product requirement authority | `requirementIds` | Yes when Concept maps requirements | No | Resolve in extension validation; retain while IDs authoritative |
| `owa.acceptance_ids` | Acceptance traceability | Unique non-empty ID array | Acceptance authority | `acceptanceIds` | Yes when mapped | No | Resolve in extension validation |
| `owa.decision_ids` | Decision traceability | Unique non-empty ID array | ADR/decision authority | `decisionIds` | Yes when mapped | No | Resolve in extension validation |
| `owa.risk_ids` | Risk traceability | Unique non-empty ID array | Risk authority | `riskIds` | Yes when mapped | No | Resolve in extension validation |
| `owa.evidence_ids` | Evidence bridge | Unique non-empty ID array | Authored evidence registry | `evidenceIds` and evidence mappings | Yes for selected evidence links | No | Registry resolution `ERROR`; evidence details stay JSON |
| `owa.legacy_ids` | Compatibility identity | Unique non-empty ID array | Migration mapping/change ledger | Registry `id` values | Conditional during migration | Migration-generated | Retain until Phase 8 compatibility decision |
| `owa.legacy_paths` | Compatibility path | Unique portable repository-relative path array | Content migration map | Current paths/recordPath | Conditional during migration | Migration-generated | Local absolute/traversal `ERROR`; Phase 8 retention review |

No `evidence_status`, `migration_status`, `phase`, registry synchronization hash, relationship graph, or generic arbitrary metadata field is approved in Concept frontmatter. Those facts already have another authority or belong in generated extension JSON.

## Title, Description, and Tags Rules

- Title uses natural title capitalization, is unique within its directory where practical, and exactly matches the first body H1 after trimming surrounding whitespace. A mismatch is a repository `ERROR`; there is no silent precedence rule.
- Description is independently understandable, one sentence, and excludes Markdown, links, status, verification claims, temporary owners, dates that will immediately age, and “This document...” filler.
- Tags are cross-cutting discovery labels. They never represent lifecycle, implementation, verification, phase completion, file format, or owner. Arbitrary new tags are allowed if lowercase kebab-case and semantically useful; Phase 6 may warn on single-use near-duplicates.

## Type Contract

Canonical values use exact capitalization and singular names. Aliases are not accepted from repository producers. Unknown non-empty types pass official conformance but fail repository production until an evidence-backed taxonomy amendment. Type-directory mismatch is normally a repository `WARNING`; it becomes an `ERROR` only where the Phase 2 target map fixes a migrated path. Generated Concepts may use any approved type whose semantics fit, although current Phase 2 Concepts are primarily authored.

Type deprecation requires a replacement or retirement rationale, migration mapping, compatibility impact, schema update, examples/fixtures, and a superseding decision. Type values never encode state, phase, format, or verification.
