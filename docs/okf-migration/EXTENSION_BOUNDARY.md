# Official and Extension Boundary

## Boundary Contract

The official Google OKF v0.2 bundle root is `okf/bundle/`. The OfflineWebArchiver extension root is its sibling `okf/extensions/`. Only the former is submitted to official conformance validation. The latter is governed by project schemas and policies and may be stricter than the official format.

An official Concept must remain understandable without a private registry. It may link to an extension artifact for evidence or indexing. Extension artifacts may consume stable Concept paths and Markdown links. This creates the required one-way dependency:

```text
Official authored Concepts
          |
          v
Optional generated extension indexes
          |
          v
Extension validation and reporting
```

External source authorities remain upstream only where `SOURCE_OF_TRUTH_MAP.md` explicitly assigns them that role.

## Current Artifact Dispositions

| Current artifact | Current purpose | Future classification | Authority | Producer | Consumer | Dependency direction | Migration treatment | Long-term retention | Risk |
|---|---|---|---|---|---|---|---|---|---|
| `okf/manifest.json` | Selects custom registries and records framework configuration | Preserved as authored extension | Authoritative for extension configuration only | Maintainer | Extension validator and tools | Manifest config -> extension tooling; never -> Concept meaning | Move to `extensions/manifest.json` after compatibility bridge | Retain | High: current consumers use its path |
| `okf/registry/domains.json` | Defines project domain IDs | Preserved as authored extension | Authoritative for private domain vocabulary | Architecture owner | Registry generator, extension validator, maps | Domain vocabulary + Concepts -> derived mappings | Move to `extensions/registry/domains.json`; map domains to Concepts | Retain while domain IDs have consumers | High: IDs may be externally referenced |
| `okf/registry/nodes.json` | Indexes knowledge nodes and metadata | Preserved as generated extension; derived from Markdown Concepts | Derived | Phase 6 registry generator | Extension validator and search/map tools | Concepts -> nodes | Generate at target path and compare with migrated coverage | Retain as useful index | High: current version is independently authored |
| `okf/registry/evidence.json` | Defines evidence IDs, kinds, paths, and verification expectations | Preserved as authored extension | Authoritative for evidence identity/location, not implementation truth | Quality owner | Extension validator, traceability reports | Evidence sources + authored mapping -> Concepts may link to evidence IDs/paths | Move only after path bridge; retain all records | Retain | Critical: evidence loss would break traceability |
| `okf/registry/relationships.json` | Stores typed graph edges | Preserved as generated extension where derivable; project-only annotations remain authored inputs | Derived output | Phase 6 relationship generator | Maps and extension validator | Concept links + approved annotations -> relationships | Reconcile each edge, create annotation input only when Markdown cannot express the project-only type | Retain generated graph if consumers remain | High: circular authority risk |
| `okf/registry/phases.json` | Indexes eight phases and target records | Preserved as generated extension | Derived from Phase Record Concepts plus extension-only annotations | Phase 6 registry generator | Extension validator and reports | Phase Records -> phase index | Generate after all Phase Records exist; retain current until parity | Retain while tooling needs structured phase data | High: current docs validator paths depend on records |
| `okf/registry/decisions.json` | Indexes decision IDs and status | Preserved as generated extension index | Derived from authoritative ADRs/decision sources and Concept links | Phase 6 registry generator | Reports and extension validator | Decision authorities -> generated index | Reconcile IDs; do not promote summary JSON to Concept authority | Retain if useful | High: 101 records require reconciliation |
| `okf/registry/risks.json` | Indexes risk IDs and state | Preserved as generated extension index | Derived from authoritative risk sources | Phase 6 registry generator | Reports and extension validator | Risk authorities -> generated index | Reconcile IDs and retain until generated parity | Retain if useful | High: 102 records require reconciliation |
| `okf/registry/changes.json` | Records custom framework changes | Preserved as authored extension | Authoritative extension change ledger during migration | Migration owner | Extension validator and auditors | Authored ledger -> reports | Move after compatibility bridge; record official migration events | Retain through final audit; Phase 8 reviews permanent need | Medium |
| `okf/validation/schemas/manifest.schema.json` | Describes manifest shape | Preserved as authored extension schema | Policy authority only after corrected and activated | Validator owner | Extension validator and maintainers | Extension policy -> schema -> validation | Correct known phase mismatch in Phase 6 with regression test | Retain | High: currently stale and not runtime-enforced |
| `okf/validation/schemas/registry.schema.json` | Describes registry shapes | Preserved as authored extension schema | Policy authority once aligned with implementation | Validator owner | Extension validator and maintainers | Extension policy -> schema -> validation | Move and align during Phase 6, without applying it to official Concepts | Retain | Medium |
| `okf/evidence/*/README.md` | Explains five evidence families | Preserved as authored extension documentation | Reference-only; evidence registry remains authority | Quality owner | Humans | Evidence policy/registry -> documentation | Move to `extensions/evidence/*.md` in Phase 5 | Retain while evidence families exist | Medium |
| `okf/maps/*/README.md` | Human-readable domain, system, dependency, and traceability maps | Preserved as extension documentation; generate where practical | Derived/reference-only | Current maintainers, later map generator | Humans | Concepts + registries -> maps | Move to `extensions/maps/*.md`; Phase 6 decides deterministic generation per map | Retain if useful | High for traceability, medium otherwise |
| `okf/knowledge/product/DECISIONS.md` | Summarizes decision registry | Moved to extension report | Derived/reference-only | Later report generator | Humans | Decision authorities/index -> report | Move to `extensions/reports/decisions.md` and generate after parity | Retain as generated report if useful | High |
| `okf/knowledge/product/EVIDENCE.md` | Summarizes evidence coverage | Moved to extension report | Derived/reference-only | Later report generator | Humans | Evidence registry -> report | Move to `extensions/reports/evidence.md` | Retain as generated report | High |
| `okf/knowledge/product/RISKS.md` | Summarizes risk registry | Moved to extension report | Derived/reference-only | Later report generator | Humans | Risk authority/index -> report | Move to `extensions/reports/risks.md` | Retain as generated report if useful | High |
| `okf/validation/rules/SEMANTIC_RULES.md` | Documents custom validator semantics | Preserved as authored extension policy | Reference authority for extension semantics until Phase 6 contract supersedes it | Validator owner | Humans and extension validator design | Project policy -> validator | Move to `extensions/validation/rules/semantic-rules.md`; reconcile with tests | Retain | High: must not be presented as official rules |
| `okf/validation/reports/PHASE_03_OKF_MIGRATION_REPORT.md` | Historical custom migration report | Preserved as extension documentation | Historical evidence | Existing migration process | Current validator and auditors | Historical inputs -> report | Move only after validator compatibility change | Retain as historical record | High: current validator requires the path |
| Future official conformance report | Records official validator result | Generated extension report | Derived | Official validator | Maintainers and CI | Concepts -> validator -> report | Add in Phase 6 | Retain per audit policy | Medium: stale result risk |
| Future extension validation report | Records project-policy result | Generated extension report | Derived | Extension validator | Maintainers and CI | Concepts + extensions -> validator -> report | Add in Phase 6 | Retain per audit policy | Medium: must not imply official failure |
| Future legacy path map | Bridges old and new locations | Generated migration-only extension | Derived from reviewed migration map | Migration tooling | Legacy consumers and validator | Migration decisions -> compatibility map | Create before path cutover in Phase 5 | Phase 8 retention decision | High: incomplete mapping breaks consumers |

## Official Links and Typed Relationships

Ordinary Markdown links in Concepts are the authoritative human-readable relationship expression. The official layer does not require a reader to understand custom edge types. When the project needs typed edges, Phase 3 may define a small authored extension annotation input, but the registry output remains generated. An edge must never exist only in a generated registry when it changes the meaning of a Concept.

## Evidence Representation

Official source/provenance metadata and Markdown links may identify sources where appropriate. They do not replace the evidence registry's project-specific IDs, repository path rules, acceptance mapping, or verification policy. The Concept states the claim and links to evidence; the authored extension registry identifies and governs the evidence object; generated reports summarize coverage.

## Validation Separation

Official validation checks the v0.2 representation rules at `okf/bundle/`, including Concept frontmatter and reserved-file rules. Extension validation checks naming conventions, local link integrity, registry schemas, evidence existence, path safety, typed traceability, phase policy, and generated freshness.

A project-policy failure must not be labeled an official-format failure. Conversely, official success does not imply that project traceability or evidence gates pass. Phase 6 provides distinct commands/results; Phase 7 may combine them only in a top-level quality command that preserves both categories.

## Reverse Dependencies

The design permits only two explicit upstream sources outside the official bundle:

1. source code, ADRs, product scope, acceptance, and test artifacts that remain authoritative for implementation or governance facts;
2. authored extension vocabularies and evidence identities that define project-only identifiers.

Neither makes a Concept unreadable. Any bridge field added in Phase 3 points outward; private JSON is not required to parse the Concept's narrative or official metadata.

## Phase 3 Concept Metadata Namespace

Concept-level project metadata uses one closed `owa` mapping. Approved children are `implementation_status`, `verification_status`, `governance_status`, `requirement_ids`, `acceptance_ids`, `decision_ids`, `risk_ids`, `evidence_ids`, `legacy_ids`, and `legacy_paths`. Official consumers may ignore and preserve it; extension validation resolves its IDs and paths.

Full evidence methods, generated registry synchronization, typed graph edges, phase/change ledgers, and report state remain extension JSON rather than Concept frontmatter. This keeps dependency direction unchanged and prevents registry structure from becoming necessary to read a Concept.
