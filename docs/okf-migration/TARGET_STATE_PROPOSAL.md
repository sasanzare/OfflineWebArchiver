# Target-State Proposal

> Approved Phase 2 design, not an implemented structure. `TARGET_BUNDLE_ARCHITECTURE.md` is the detailed architecture contract.

## Final Boundary

```text
okf/
  bundle/        # official Google OKF v0.2 root
  extensions/    # OfflineWebArchiver-specific data, docs, schemas, and reports
  legacy/        # optional migration-only retention after cutover
```

The official layer contains human-readable Markdown Concepts and reserved indexes. The extension layer contains the manifest, registries, evidence policy and IDs, maps, schemas, validation reports, generated indexes, and compatibility artifacts. Official Concepts can be read without parsing extension JSON.

## Final Official Hierarchy

```text
okf/bundle/
  index.md
  product/
  architecture/
  data/
  workflow/
  recovery/
  security/
  operations/
  testing/
  history/
  references/
```

Populated directories have one-level `index.md` navigation. Living subjects use stable names; only historical Phase Record paths contain phase numbers. The exact Concept targets are fixed in `CONTENT_MIGRATION_MAP.md`.

## Concept Taxonomy

The 14 approved types are Project Overview, Product Requirement, Architecture Overview, Architecture Component, Architecture Decision, Workflow, Data Model, Security Control, Operational Runbook, Recovery Procedure, Test Strategy, Quality Policy, Phase Record, and Reference.

Lifecycle, implementation, verification, evidence, risk, and migration states are not Concept types. Phase 3 defines their metadata placement without changing the taxonomy.

## Reserved Files

`okf/bundle/index.md` is human-authored, declares `okf_version: "0.2"`, describes scope, and links to populated top-level indexes. Directory indexes are generated and contain shallow navigation. The project omits official `log.md` because Git and Phase Record Concepts already preserve history.

## Authority and Generation

Official authored Concepts are the semantic knowledge authority after an explicit migration cutover, except where the source-of-truth map preserves an external product, governance, code, or test authority. Extension indexes and reports are derived. The manifest, project domain vocabulary, evidence identities, and migration change ledger remain authored extensions.

## Validator Boundary

The future official validator reads only `okf/bundle/`. The extension validator reads project data, checks bridge references and stronger repository policies, and reports separately. Neither validator silently rewrites files, and official success does not imply extension-policy success.

## Compatibility

Current paths and validator behavior remain in place through core migration. Before consumers change, Phase 5 generates a complete old-to-new compatibility map. Current registries and evidence are not removed until generated parity, consumer migration, tests, and the Phase 8 audit support an explicit cleanup decision.

## Superseded Phase 1 Questions

Phase 2 resolved the physical registry location, lifecycle-versus-project state ownership boundary, phase-report treatment, index/log policy, generation ownership, and long-term evidence preservation. There is no critical unresolved item blocking Phase 3.
