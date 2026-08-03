# Phase 3 Metadata Decisions

## Phase 4 Execution Amendment

`OKF-P4-A001` is the recorded implementation amendment to the Phase 2 physical-root decision. Phase 4 creates the production slice at `okf/` because its approved execution contract requires `okf/index.md`, while the Phase 2 design had reserved `okf/bundle/`. No Phase 3 metadata, lifecycle, actor, source, evidence, or reserved-file semantics change: the root index still has only `okf_version: "0.2"`, directory indexes still have no frontmatter, and Concepts still use the frozen canonical field order.

The amendment applies only to the selected Phase 4 paths and keeps every legacy source, registry, and current validator consumer untouched. Phase 5 must complete the extension bridge and decide the final location of extension Markdown before any cleanup or consumer cutover.

## Decision Register

| ID | Title | Status | Context | Decision | Alternatives considered | Rationale / consequences | Migration impact | Future phase |
|---|---|---|---|---|---|---|---|---:|
| OKF-P3-D001 | Repository minimum fields | ACCEPTED | Officially only `type` is always required; repository indexes/review need stable summaries | Require `type`, `title`, `description`, and explicit `status` | Require only type; require all optional families | Small authoring burden prevents ambiguous titles and implicit lifecycle | Phase 4 supplies four fields | 4-7 |
| OKF-P3-D002 | Optional and conditional families | ACCEPTED | Trust/provenance/freshness are officially optional | Make `sources`, `generated`, and `stale_after` conditional; tags/verified recommended | Globally require all; leave unconstrained | Preserves feasibility and official absence semantics | Per-artifact matrix drives migration | 4-7 |
| OKF-P3-D003 | Closed 14-type producer enum | ACCEPTED | Phase 2 fixed a taxonomy; official consumers tolerate unknown types | Exact canonical values, no aliases; unknown is repository error but official pass | Warning only; aliases | Stops taxonomy drift without false official strictness | Schema enum and fixtures | 4-7 |
| OKF-P3-D004 | Title equals H1 | ACCEPTED | Two display authorities would drift | Exact equality after surrounding-whitespace normalization | Prefer metadata; prefer body; warning | One editable title fact and deterministic index labels | Phase 4 reconciles current H1 | 4-6 |
| OKF-P3-D005 | Explicit lifecycle status | ACCEPTED | Official absence defaults stable, unsafe during migration | Repository always writes draft/stable/deprecated | Rely on default | Explicit review prevents accidental stable migration | Current uppercase status not copied | 4-6 |
| OKF-P3-D006 | Three project state fields | ACCEPTED | Current statuses mix implementation, verification, governance | Use only `owa.implementation_status`, `owa.verification_status`, `owa.governance_status` | One overloaded field; six fields | Three orthogonal dimensions cover actual evidence with minimum fields | Contextual mapping required | 4-6 |
| OKF-P3-D007 | Actor grammar | ACCEPTED | Official actor convention needs deterministic local syntax | Lowercase `human:`, `process:`, producer/version grammar | Emails/names; free strings | Stable, private, machine-testable identities | Unknown historical actors are omitted | 4-7 |
| OKF-P3-D008 | AI-assisted human ownership | ACCEPTED | Tool assistance is not always full generation | Omit `generated` when a human substantively owns/reviews current content; record full generation honestly | Mark every tool edit generated; never disclose AI | Reflects semantic ownership without false human verification | Phase 4 review determines origin | 4-7 |
| OKF-P3-D009 | Generated record | ACCEPTED | Official requires `by`; at carries recency | Repository requires both `by` and UTC `at`; no manual edits | Allow missing at; timestamps on every format edit | Deterministic meaningful-change provenance | Generated Concepts only; indexes use body marker | 4-7 |
| OKF-P3-D010 | Verification record | ACCEPTED | Official accepts mapping/list and derives trust | Consume both, produce list; each event only `by`/`at`; method/evidence elsewhere | Add custom method/evidence children | Preserves official structure and evidence separation | Material changes invalidate current events | 4-7 |
| OKF-P3-D011 | Source structure | ACCEPTED | Official defines source fields and footnote join | Use official record; require resource; local ID for cited claims | Custom citation objects | Portable and interoperable | Current evidence paths reviewed into sources | 4-6 |
| OKF-P3-D012 | Evidence registry bridge | ACCEPTED | Official sources do not cover project evidence identity/method/traceability | Keep authored evidence registry; bridge selected IDs with `owa.evidence_ids` | Copy registry into frontmatter; discard registry | No evidence loss and Concepts remain readable | Reconcile all evidence in Phase 5 | 5-7 |
| OKF-P3-D013 | Absolute local path prohibition | ACCEPTED | Portable bundles cannot rely on machine paths | Reject drive, UNC, file URI, home/env paths in portable metadata | Allow during migration | Prevents leakage and broken consumers | Legacy paths stay repository-relative | 4-7 |
| OKF-P3-D014 | Freshness date | ACCEPTED | Official defines absolute date | Quoted YYYY-MM-DD; conditional by type; stale warning | Relative TTL; mandatory everywhere | Matches official plain comparison and avoids historical noise | Runbook/security horizons required | 4-7 |
| OKF-P3-D015 | Single `owa` namespace | ACCEPTED | Unknown fields allowed, but typo/control boundary needed | Put approved project fields under closed `owa` map | Flat top-level project fields; arbitrary map | Clear ignore/preserve boundary | Schema validates extension independently | 4-7 |
| OKF-P3-D016 | Canonical field order | ACCEPTED | Stable diffs/readability | Fixed order ending in `owa`; absent fields omitted | Alphabetical; no rule | Human-readable family order | Formatting info, not official error | 4-7 |
| OKF-P3-D017 | Unknown fields | ACCEPTED | Official consumers cannot reject them | Official pass/preserve; repository producer error outside approved namespace | Ignore typos; official failure | Separates interoperability from local quality | Dual validator must preserve layer | 6-7 |
| OKF-P3-D018 | Root index metadata | ACCEPTED | Official permits only root index version frontmatter | Only `okf_version: "0.2"`; no Concept fields | Add title/generated/extensions | Exact official reserved boundary | Root created in Phase 4 | 4-6 |
| OKF-P3-D019 | Directory index metadata | ACCEPTED | Official forbids frontmatter | No frontmatter; generated marker in body | Generated frontmatter | Keeps generated policy conformant | Generator procedural check | 4-7 |
| OKF-P3-D020 | Log metadata | ACCEPTED | Phase 2 omits optional log | No production log/schema; document official no-frontmatter/date structure | Create generated log | Avoid duplicate history | Invalid/valid design examples only | 4-8 |
| OKF-P3-D021 | Relationship representation | ACCEPTED | Official links are untyped; current graph is typed | Human-needed relation in Markdown prose/link; project-only types may use extension annotation input and generated graph | Frontmatter graph; discard types | Readability plus traceability retention | Edge-by-edge Phase 5 reconciliation | 5-7 |
| OKF-P3-D022 | Severity separation | ACCEPTED | Official permissiveness conflicts with strict project rules | Four layers with ERROR/WARNING/INFO and preserved labels | One strict “official” result | Avoids false conformance claims | Phase 6 API/report design input | 6-7 |
| OKF-P3-D023 | Modular Draft 2020-12 schemas | ACCEPTED | Records are reused and reserved files differ | Eight local-ref schemas; no log schema | One monolith; production integration now | Reviewable design and clear procedural limits | Wire only in Phase 6 | 6 |
| OKF-P3-D024 | Legacy timestamp/citations | ACCEPTED | v0.2 supersedes them | Never produce `timestamp`; migrate only when semantics/actor known; sources/footnotes replace citations | Mechanical rename | Prevents false provenance | Phase 4-6 compatibility | 4-6 |

## Phase 2 Amendments

No Phase 2 architecture, taxonomy, path, reserved-file, or dependency decision is amended. Phase 3 specifies the required metadata details that Phase 2 explicitly delegated.

## Decision Completeness

All required metadata topics have an ACCEPTED decision. No decision is `REQUIRES_OWNER_DECISION`, and Phase 4 is not blocked.
