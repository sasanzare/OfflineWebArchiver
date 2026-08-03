# Final Migration Risk Register

Closure date: 2026-08-03

Every Phase 2 and Phase 4 migration risk was re-evaluated against the final repository. `CLOSED` means the migration condition no longer exists. `MITIGATED` means an ongoing maintenance or administrative exposure has a control, owner, and review trigger. No risk is open, accepted without control, critical, or blocking.

| Risk ID | Original concern | Final status | Closure evidence or control | Residual severity | Owner | Review trigger / rationale |
|---|---|---|---|---|---|---|
| OKF-MIG-R001 | Loss of history or bootstrap context | CLOSED | `okf-bootstrap/` and all historical migration reports retained | None | Repository maintainer | Reopen only if historical retention policy changes |
| OKF-MIG-R002 | Broken links after migration | CLOSED | 159 internal links checked; zero broken | None | Knowledge maintainers | Normal link validation protects future changes |
| OKF-MIG-R003 | Evidence traceability loss | CLOSED | All 54 evidence records reconciled and retained | None | Evidence owners | Evidence changes require registry validation |
| OKF-MIG-R004 | Project state mixed with official lifecycle | CLOSED | Lifecycle and three `owa` state dimensions are separate and tested | None | Metadata owner | Metadata-contract change |
| OKF-MIG-R005 | Generated indexes overwritten or hand-edited | CLOSED | Indexes are explicitly maintained navigation; no nonexistent generator is claimed | None | Directory owners | Reopen if generation is introduced |
| OKF-MIG-R006 | Invalid YAML or unsafe coercion | CLOSED | Pinned YAML 1.2 parser, strict duplicate-key handling, bounded aliases, negative tests | None | Validator maintainer | YAML dependency or parser-policy change |
| OKF-MIG-R007 | Official validator incorrectly strict | CLOSED | Official and project policy layers are separate; permissive behavior tested | None | Validator maintainer | Official spec or layer-boundary change |
| OKF-MIG-R008 | Strict project policy lost | CLOSED | 26 active policy diagnostics and regression coverage | None | Validator maintainer | Policy diagnostic retirement |
| OKF-MIG-R009 | False official conformance claim | CLOSED | Independent audit and production validator agree on current 40 Concepts | None | OKF maintainer | Official version or artifact-classification change |
| OKF-MIG-R010 | Excessive Concept fragmentation | CLOSED | Final 40-Concept taxonomy reviewed; no unresolved split | None | Knowledge owners | Major taxonomy revision |
| OKF-MIG-R011 | Unstable Concept identity | CLOSED | Canonical paths and registry mappings resolve; rename workflow documented | None | Knowledge maintainers | Any Concept rename |
| OKF-MIG-R012 | CI or release disruption | MITIGATED | Least-privilege workflow and local parity pass; hosted run and branch protection remain unverified | Medium | Repository administrator | Verify next hosted run and repository protection settings |
| OKF-MIG-R013 | Manifest/schema inconsistency | CLOSED | Manifest and schema use extension 1.0.0, OKF 0.2, activated phase 8 | None | Extension maintainer | Manifest or schema version change |
| OKF-MIG-R014 | Validator targets wrong official root | CLOSED | Discovery classifies the realized `okf/` root and all 76 artifacts | None | Validator maintainer | Root-layout change |
| OKF-MIG-R015 | Duplicate paths become dual authorities | CLOSED | All 58 transitional paths removed; canonical replacements documented | None | Knowledge maintainers | Compatibility path reintroduction |
| OKF-MIG-R016 | Typed relationship semantics lost | CLOSED | All 61 typed edges retained and endpoints resolved | None | Graph owner | Relationship registry change |
| OKF-MIG-R017 | Phase records override living knowledge | CLOSED | History records link to living Concepts and remain historical | None | Project maintainer | New phase record |
| OKF-MIG-R018 | Root index overwritten or duplicated | CLOSED | Root is maintained, concise, validated navigation | None | OKF maintainer | Top-level structure change |
| OKF-MIG-R019 | Extension docs treated as Concepts | CLOSED | All 15 extension documents have explicit classification and separate validation | None | Extension maintainer | Discovery-rule change |
| OKF-MIG-R020 | External authority and Concept summary drift | MITIGATED | Portable sources and source-of-truth map identify authority; review remains human | Low | Domain knowledge owners | Material source change or stale review date |
| OKF-MIG-R021 | Generated output nondeterministic or stale | CLOSED | No final OKF artifact claims generated ownership | None | OKF maintainer | Reopen before adding any generator |
| OKF-MIG-R022 | Cleanup before consumer cutover | CLOSED | Replacement, inbound link, registry, and validation checks preceded 58 deletions | None | Migration maintainer | Migration is closed |
| OKF-MIG-R023 | JSON Schema misreported as full conformance | CLOSED | Schema and procedural responsibilities are documented separately | None | Validator maintainer | Schema documentation change |
| OKF-MIG-R024 | Legacy `VERIFIED` fabricates trust or lifecycle | CLOSED | Official verification actors and project verification states are separated | None | Evidence owners | Verification-model change |
| OKF-MIG-R025 | YAML dates/booleans coerced or duplicate keys accepted | CLOSED | YAML 1.2 core parsing and duplicate-key rejection have focused tests | None | Validator maintainer | Parser upgrade |
| OKF-MIG-R026 | Sources expose machine paths or secrets | CLOSED | Drive, UNC, root, home, environment, and traversal paths are rejected | None | Validator maintainer | Path-policy change |
| OKF-MIG-R027 | Verification survives material content change | MITIGATED | Maintainer workflow requires invalidation and re-verification; policy validates record shape | Low | Concept owner and verifier | Any material verified-Concept edit |
| OKF-MIG-R028 | Extension fields duplicate registries | CLOSED | Closed `owa` bridge contains only state and IDs; full records remain in registries | None | Extension maintainer | Extension-contract change |
| OKF-MIG-R029 | Directory index receives frontmatter | CLOSED | Nine indexes have none; reserved-file tests reject it | None | Directory owners | Index edit |
| OKF-MIG-P4-R001 | Realized root diverges from early `okf/bundle/` design | CLOSED | Final root is consistently `okf/`; early design remains historical | None | OKF maintainer | Root-layout change |
| OKF-MIG-P4-R002 | Additive target and legacy copies appear co-authoritative | CLOSED | Transitional copies removed after canonical cutover | None | Migration maintainer | Migration is closed |
| OKF-MIG-P4-R003 | Core indexes stale before generator implementation | CLOSED | Final indexes are maintained, linked, nonempty, and not represented as generated | None | Directory owners | Direct-child Concept change |
| OKF-MIG-P4-R004 | Partial root conformance overstated | CLOSED | Final enumeration has zero transitional or unknown Markdown and an independent full audit | None | OKF maintainer | Artifact-classification change |

## Closure totals

| State | Count |
|---|---:|
| Closed | 30 |
| Mitigated | 3 |
| Accepted without control | 0 |
| Open | 0 |
| Critical open | 0 |

The two unverified administrative facts under R012 are tracked as `ADMIN-CI-001` and `ADMIN-BP-001` in the final reports. R020 and R027 are ordinary continuing knowledge-maintenance duties, not incomplete migration work.
