# Phase 2 Architecture Decisions

## Decision Status Vocabulary

- **ACCEPTED:** Fixed input to later phases.
- **PROPOSED:** Preferred but awaiting evidence or implementation validation.
- **DEFERRED:** Intentionally assigned to a later phase without blocking it.
- **REQUIRES_OWNER_DECISION:** Cannot be resolved from repository evidence.
- **REJECTED:** Considered and not selected.

## OKF-P2-D001 — Physical Official/Extension Boundary

- **Status:** ACCEPTED
- **Context:** Every non-reserved Markdown file inside an official bundle is a Concept, while the repository has private Markdown, JSON registries, schemas, and reports.
- **Decision:** Define `okf/bundle/` as the official root and `okf/extensions/` as a sibling outside that root.
- **Alternatives considered:** Use `okf/` as the official root with an extension subtree; store extensions outside `okf/`; encode extensions in frontmatter.
- **Rationale:** A sibling boundary is easy for people and tools to identify, keeps related assets under `okf/`, and prevents extension Markdown from becoming accidental Concepts.
- **Consequences:** Validator commands must declare `okf/bundle/` as their root. Current paths need a compatibility bridge.
- **Migration impact:** Phase 5 moves extension artifacts only after the bridge exists.
- **Affected future phase:** 3-8.

## OKF-P2-D002 — Target Root Hierarchy

- **Status:** ACCEPTED
- **Context:** Current knowledge uses one directory per topic and mixes product summaries, phases, evidence, and validation.
- **Decision:** Use the stable top-level categories `product`, `architecture`, `data`, `workflow`, `recovery`, `security`, `operations`, `testing`, `history`, and `references` under `okf/bundle/`.
- **Alternatives considered:** Preserve current per-topic directories; fully flat bundle; deeper component/decision/runbook subtrees.
- **Rationale:** The selected hierarchy supports progressive disclosure with limited nesting and maps all current living knowledge without duplicate homes.
- **Consequences:** Current topic READMEs become directly named Concept files. Empty future directories need not be created.
- **Migration impact:** The target paths in `CONTENT_MIGRATION_MAP.md` are fixed.
- **Affected future phase:** 3-5.

## OKF-P2-D003 — Fourteen-Type Concept Taxonomy

- **Status:** ACCEPTED
- **Context:** Official v0.2 requires a non-empty `type` but tolerates project-defined types. Current material spans product, architecture, workflows, data, recovery, security, operations, testing, and history.
- **Decision:** Approve 14 canonical types: Project Overview, Product Requirement, Architecture Overview, Architecture Component, Architecture Decision, Workflow, Data Model, Security Control, Operational Runbook, Recovery Procedure, Test Strategy, Quality Policy, Phase Record, and Reference.
- **Alternatives considered:** Use directory names as types; keep a broad generic Knowledge type; add Evidence, Risk, Glossary, Interface, and Status types.
- **Rationale:** Fourteen types cover observed semantic roles while keeping evidence and project state out of Concept identity.
- **Consequences:** Phase 3 must define exact serialization and validation without inventing additional types casually.
- **Migration impact:** All current Markdown classifications use this taxonomy or an explicit non-Concept disposition.
- **Affected future phase:** 3-8.

## OKF-P2-D004 — Root Index Ownership

- **Status:** ACCEPTED
- **Context:** The root reserved index identifies the bundle, version, and top-level navigation.
- **Decision:** `okf/bundle/index.md` is required, human-authored, declares `okf_version: "0.2"`, and links to every populated top-level directory index.
- **Alternatives considered:** Generate the whole root index; use current `okf/README.md`; place the root at `okf/index.md`.
- **Rationale:** Bundle purpose and scope require editorial control, while the nested root preserves the physical extension boundary.
- **Consequences:** Generators must denylist this file. It must not duplicate Concept bodies or registry state.
- **Migration impact:** Phase 4 creates it after the Phase 3 metadata contract.
- **Affected future phase:** 3-4 and 6-7.

## OKF-P2-D005 — Directory Index Generation

- **Status:** ACCEPTED
- **Context:** Directory indexes support progressive disclosure but are vulnerable to stale manual lists.
- **Decision:** Every populated first-level official directory, and every navigable populated nested directory, has a generated `index.md` listing direct children only.
- **Alternatives considered:** Hand-author all indexes; omit all optional indexes; recursively list the whole subtree in each index.
- **Rationale:** Deterministic generation prevents navigation drift and avoids content duplication.
- **Consequences:** Phase 3 defines generated markers; Phase 6 implements generation and stale checks.
- **Migration impact:** Phase 4 may initially generate or materialize indexes under the approved contract.
- **Affected future phase:** 3-7.

## OKF-P2-D006 — Official Log Omission

- **Status:** ACCEPTED
- **Context:** Official `log.md` is optional. The repository already has Git history and detailed phase records.
- **Decision:** Do not create an official `log.md`.
- **Alternatives considered:** Hand-authored update log; generated digest from Git; merge phase reports into log entries.
- **Rationale:** Each alternative duplicates an existing history source and risks either stale or overly verbose entries.
- **Consequences:** Meaningful history remains in Phase Record Concepts; file evolution remains in Git.
- **Migration impact:** No current file maps to `log.md`.
- **Affected future phase:** 4-8.

## OKF-P2-D007 — Stable Kebab-Case Paths

- **Status:** ACCEPTED
- **Context:** Concept IDs derive from paths, so volatile paths create identity and link churn.
- **Decision:** Use lowercase ASCII kebab-case, stable subject names, forward-slash links, and phase/date tokens only when intrinsic to historical identity.
- **Alternatives considered:** Preserve uppercase legacy filenames; use type or status prefixes; assign opaque IDs as filenames.
- **Rationale:** Human-readable stable paths fit current repository conventions and official path identity.
- **Consequences:** Renames require a ledger, link updates, regenerated indexes, and compatibility mapping.
- **Migration impact:** Phase 5 creates a complete old-to-new path bridge.
- **Affected future phase:** 3-8.

## OKF-P2-D008 — Authored Concepts, Generated Indexes

- **Status:** ACCEPTED
- **Context:** Current JSON and Markdown contain overlapping independently edited facts.
- **Decision:** Official Concept bodies are human-authored. Directory indexes and machine search/graph registries are deterministic generated outputs. The root index remains authored.
- **Alternatives considered:** Generate Concepts from registries; keep all registries independently authored; use mixed generated sections immediately.
- **Rationale:** This direction preserves readable official authority and eliminates dual editing for derived indexes.
- **Consequences:** Generators need ownership markers, overwrite protection, and check mode.
- **Migration impact:** Current authored registries remain until Phase 6 proves generated parity.
- **Affected future phase:** 3, 5-7.

## OKF-P2-D009 — Source-of-Truth Direction

- **Status:** ACCEPTED
- **Context:** Product scope, ADRs, source code, tests, Concepts, and registries currently describe overlapping facts.
- **Decision:** A migrated Concept is the semantic knowledge authority unless the source-of-truth map explicitly retains an upstream product, governance, or implementation authority. Derived indexes flow from those authorities and Concepts; no generated artifact is independently authoritative.
- **Alternatives considered:** Make JSON registries the universal authority; duplicate authority indefinitely; copy all external project documentation into Concepts.
- **Rationale:** The decision preserves existing governance and implementation authorities while providing one editable representation per knowledge fact.
- **Consequences:** Each migration must declare its authority cutover and linked upstream source.
- **Migration impact:** Phase 3 supplies authority/provenance fields only as needed; Phase 5 reconciles duplicates.
- **Affected future phase:** 3-8.

## OKF-P2-D010 — Phase Reports Become Phase Record Concepts

- **Status:** ACCEPTED
- **Context:** Eight phase records preserve valuable historical context but are neither living architecture nor short log entries.
- **Decision:** Migrate them to `bundle/history/phase-NN.md` with type Phase Record. Merge the duplicate Phase 3 architecture record into `history/phase-03.md` while extracting living architecture separately only from authoritative current material.
- **Alternatives considered:** Convert phase records to `log.md`; leave them as extension reports; treat them as current architecture Concepts.
- **Rationale:** Historical identity is semantically stable and deserves human-readable preservation without overriding living knowledge.
- **Consequences:** The history index is generated. Amendments must be explicit.
- **Migration impact:** Phase 4 migrates the records; current required paths remain until consumers switch.
- **Affected future phase:** 4-6.

## OKF-P2-D011 — Evidence Remains a Project Extension

- **Status:** ACCEPTED
- **Context:** Official source and verification metadata cannot represent all current evidence IDs, path safety, acceptance links, and project policy.
- **Decision:** Keep evidence identities and mappings as authored extension data. Concepts may link to evidence and use official provenance metadata where semantically appropriate; reports are generated from the extension registry.
- **Alternatives considered:** Put all evidence in Concept frontmatter; convert evidence guides to Reference Concepts; discard the registry after adding source links.
- **Rationale:** The extension preserves project value without pretending private evidence semantics are official format requirements.
- **Consequences:** Official conformance success is separate from evidence-policy success.
- **Migration impact:** Phase 5 preserves every evidence record and Phase 6 validates the bridge.
- **Affected future phase:** 3, 5-8.

## OKF-P2-D012 — Legacy Compatibility Before Cutover

- **Status:** ACCEPTED
- **Context:** Current validator, documentation tooling, package scripts, and records consume current `okf/` paths.
- **Decision:** Keep current paths unchanged through core migration, generate a complete legacy path map before consumer changes, and remove or relocate legacy artifacts only after parity tests and explicit Phase 8 approval.
- **Alternatives considered:** Atomic destructive move; permanent duplicate authorities; update consumers before content migration.
- **Rationale:** Additive migration minimizes traceability loss and permits rollback.
- **Consequences:** A temporary overlap exists, but every duplicate must be labeled read-only, derived, or authoritative in the migration ledger.
- **Migration impact:** Phase 5 creates the bridge; Phase 6 switches validators safely; Phase 8 reviews cleanup.
- **Affected future phase:** 4-8.

## OKF-P2-D013 — Official and Extension Validation Stay Separate

- **Status:** ACCEPTED
- **Context:** The official format is permissive in areas where current project policy is strict.
- **Decision:** Implement separate official-conformance and extension-policy results, even if a later aggregate command runs both.
- **Alternatives considered:** One strict validator labeled official; reduce project policy to official minimums; maintain only the current validator.
- **Rationale:** Separate outcomes avoid false claims while preserving path, evidence, phase, schema, and link safeguards.
- **Consequences:** Tests and reports must identify which contract failed.
- **Migration impact:** Phase 6 creates the separation and Phase 7 automates it.
- **Affected future phase:** 6-8.

## OKF-P2-D014 — No Split Candidates in the Current 58 Files

- **Status:** ACCEPTED
- **Context:** Some current files cover broad subjects, but inspection found coherent semantic centers and no necessary multi-Concept split for the migration target.
- **Decision:** Keep 39 files as single Concepts, merge two source files into other targets, convert two navigation summaries to indexes, and move 15 project-specific documents to extensions. Split count is zero.
- **Alternatives considered:** Split by section or implementation phase; create one Concept per registry item.
- **Rationale:** Splitting by length or current headings would over-fragment context and destabilize paths without semantic benefit.
- **Consequences:** Later splits require new evidence and a superseding mapping decision.
- **Migration impact:** Phase 4-5 follows the exact migration map.
- **Affected future phase:** 4-5.

## Decision Completeness

All required Phase 2 architectural topics have an ACCEPTED decision. There are no `REQUIRES_OWNER_DECISION` items and no critical decision blocks Phase 3.
