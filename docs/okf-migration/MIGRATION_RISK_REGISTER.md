# Migration Risk Register

## Phase 5 update

Legacy JSON and Markdown paths remain until Phase 6 confirms consumer cutover. This avoids current-validator breakage but prevents a final whole-tree official conformance claim before Phase 8 cleanup.

## Phase 6 update

The legacy validator is retained as the extension layer. The restricted safe YAML parser rejects unsupported YAML constructs; a future dependency-based parser requires a locked, reproducible installation decision.

| Risk ID | Risk | Evidence | Probability | Impact | Severity | Phase 2 control / mitigation | Target phase |
|---|---|---|---|---|---|---|---|
| OKF-MIG-R001 | Loss of historical knowledge or bootstrap context | `okf-bootstrap/` is referenced by migration tooling | Medium | High | HIGH | Preserve bootstrap read-only through final audit; no cleanup before explicit Phase 8 approval. | 3-8 |
| OKF-MIG-R002 | Broken links after path migration | Current docs validator enforces relative link integrity | High | High | HIGH | Fixed paths and rename rules; generate complete legacy path map before consumer cutover. | 4-7 |
| OKF-MIG-R003 | Evidence traceability is lost | 54 records exist in `evidence.json` | Medium | High | HIGH | Keep evidence identities as authored extensions and reconcile every record before generated coverage reports. | 5-7 |
| OKF-MIG-R004 | Custom statuses are placed into official lifecycle `status` | Current status vocabulary mixes lifecycle, implementation, verification, evidence, and governance | High | High | CRITICAL | Taxonomy excludes state; Phase 3 must define separate state dimensions and fixtures. | 3 |
| OKF-MIG-R005 | Generated indexes are manually edited or overwrite authored prose | Directory indexes will be generated; root/Concepts are authored | Medium | High | HIGH | Generator allowlist, markers, denylist, atomic write, deterministic check mode. | 3, 6-7 |
| OKF-MIG-R006 | Invalid YAML or unsafe scalar coercion | No YAML parser or current frontmatter exists | Medium | High | HIGH | Phase 3 chooses syntax/parser contract and negative fixtures; Phase 6 pins implementation. | 3, 6 |
| OKF-MIG-R007 | Official validator becomes incorrectly strict | Official conformance tolerates unknown fields/types and broken links | High | Medium | HIGH | Report official conformance separately from project naming, link, evidence, and registry policy. | 6-7 |
| OKF-MIG-R008 | Existing strict project policy is accidentally removed | Current validator checks IDs, paths, evidence, phases, and orphan requirements | Medium | High | HIGH | Preserve behavior until extension-validator parity tests pass. | 6-7 |
| OKF-MIG-R009 | False official conformance claim | Current 58 Markdown files lack required frontmatter | Medium | High | HIGH | Keep “migration in progress” wording; validate only declared `okf/bundle/` after it exists. | 2-8 |
| OKF-MIG-R010 | Excessive fragmentation reduces useful context | Current knowledge contains coherent cross-cutting narratives | Low | Medium | MEDIUM | Migration map has zero split candidates; later splits require evidence and a superseding decision. | 4-5 |
| OKF-MIG-R011 | Concept identity becomes unstable | Official identity is path-based and current paths are consumed | Medium | High | HIGH | Freeze kebab-case target paths; require rename ledger, link updates, regeneration, and compatibility mapping. | 2-8 |
| OKF-MIG-R012 | CI or release is disrupted | No `.github/` workflow currently exists; npm scripts are local gates | Low | Medium | MEDIUM | Add CI only after Phase 6 commands and no-write generation checks are stable. | 7 |
| OKF-MIG-R013 | Custom schema inconsistency is masked | Manifest schema phase constant differs from runtime validator expectation | Medium | Medium | MEDIUM | Correct only in Phase 6 with a regression test and separate extension result. | 6 |
| OKF-MIG-R014 | Tools validate `okf/` instead of the nested official root | Final official root is `okf/bundle/`, with siblings under `okf/` | Medium | High | HIGH | Every command/report must declare the root; add a negative fixture proving sibling extensions are excluded. | 6-7 |
| OKF-MIG-R015 | Temporary duplicate paths become dual authorities | Additive migration retains current paths during compatibility | High | High | HIGH | Record per-file cutover; mark the duplicate read-only/derived; Phase 8 reconciles all overlap. | 4-8 |
| OKF-MIG-R016 | Generated registries lose project-only typed semantics | Official Markdown links are untyped while current relationships are typed | Medium | High | HIGH | Reconcile every edge and permit a minimal authored extension annotation input for non-derivable types. | 3, 5-6 |
| OKF-MIG-R017 | Phase records override living knowledge | Historical records repeat architecture and implementation statements | Medium | High | HIGH | Use Phase Record type under `history/`; link to living Concepts and merge the duplicate Phase 3 record. | 4-5 |
| OKF-MIG-R018 | Root index is overwritten or duplicates detailed content | Root index is authored while directory indexes are generated | Low | High | MEDIUM | Denylist root index in generators; restrict it to scope and top-level navigation. | 3-7 |
| OKF-MIG-R019 | Extension documentation is accidentally treated as official Concepts | Custom Markdown currently lives under the proposed broader `okf/` area | Medium | High | HIGH | Physical sibling roots: official `okf/bundle/`, extensions `okf/extensions/`; validator roots are explicit. | 4-7 |
| OKF-MIG-R020 | External authority and Concept summary drift | Product, ADR, code, migration, and test sources remain specialized authorities | Medium | High | HIGH | Phase 3 provenance/authority contract; review linked sources; later stale checks where feasible. | 3-7 |
| OKF-MIG-R021 | Generated output is nondeterministic or stale | Future indexes/reports consume changing Concept and registry inputs | Medium | Medium | MEDIUM | Deterministic ordering, no volatile timestamps, input digest/commit, CI check mode. | 6-7 |
| OKF-MIG-R022 | Legacy cleanup occurs before all consumers switch | Current validator and docs checks require current paths | Low | High | HIGH | No move before compatibility mapping; no deletion before Phase 8 audit and explicit approval. | 5-8 |
| OKF-MIG-R023 | Repository schema is misreported as complete official conformance | Proposed producer schema intentionally closes types and fields | Medium | High | HIGH | Keep official and repository result layers separate and document procedural limits. | 3, 6-8 |
| OKF-MIG-R024 | Legacy `VERIFIED` fabricates lifecycle or human trust | Current state is context-dependent and lacks actor/time in many records | High | High | CRITICAL | Contextual three-dimension mapping; no automatic stable/verified event. | 3-5 |
| OKF-MIG-R025 | YAML parser coerces dates/booleans or accepts duplicate keys | Metadata uses timestamps, dates, enums, and IDs | Medium | High | HIGH | Quote temporal values; reject duplicate keys/unsafe constructs; pin a declared parser in Phase 6. | 3, 6 |
| OKF-MIG-R026 | Source metadata leaks machine paths or secrets | Local repository is on a Windows drive; current paths are portable relative | Medium | High | HIGH | Reject drive/UNC/file/home/env forms; examples use the local path only as an invalid fixture. | 3-7 |
| OKF-MIG-R027 | Verification remains after a material content change | `verified` and `generated.at` are independent | Medium | High | HIGH | Define material-change invalidation and Phase 6 digest/workflow checks. | 3, 6-7 |
| OKF-MIG-R028 | Closed extension fields duplicate generated registries | Current graph/evidence/phase data is broad | Medium | Medium | MEDIUM | Keep only minimal state/traceability/legacy bridge in `owa`; full records remain extension JSON. | 3-6 |
| OKF-MIG-R029 | Frontmatter is added to generated directory indexes | Phase 2 indexes are generated but official non-root indexes forbid metadata | Medium | High | HIGH | Use body marker only; reserved-file schema/procedural fixture rejects delimiters. | 3-7 |

## Phase 4 execution risks

| Risk ID | Risk | Evidence | Control | Target phase |
|---|---|---|---|---:|
| OKF-MIG-P4-R001 | The explicit `okf/index.md` execution root diverges from the historical `okf/bundle/` design root. | Phase 4 contract and `OKF-P4-A001` amendment | Keep the amendment in both decision records, use one realized root for all selected targets, and require Phase 5 to reconcile the extension boundary before cutover. | 5 |
| OKF-MIG-P4-R002 | Additive target and legacy copies are mistaken for dual authorities. | New Concepts and unchanged current knowledge paths | Ledger marks target Concepts as future semantic representations and legacy sources as preserved transition artifacts; no consumer is switched in Phase 4. | 5-8 |
| OKF-MIG-P4-R003 | Core indexes become stale or are treated as authored Concepts before generator implementation. | Directory indexes are materialized before Phase 6 tooling. | Use the frozen generated-file marker, direct-child-only links, and Phase 6 deterministic regeneration checks. | 6-7 |
| OKF-MIG-P4-R004 | Partial root conformance is overstated because legacy Markdown remains under `okf/`. | 58 legacy Markdown files remain alongside the 21 new Concepts. | Report migrated-core, reserved-file, extension, and full-bundle results separately; never claim full conformance. | 4-8 |

## Phase 2 Risk Position

No critical architecture question remains open. Phase 3 may proceed with the fixed boundary, paths, taxonomy, reserved-file policy, and source direction. The highest remaining risks are implementation risks controlled by staged compatibility, separate validators, evidence preservation, and no destructive cleanup before the final audit.
