# Target Bundle Architecture

## Phase 4 execution amendment

The Phase 2 design below remains the historical target-state proposal. `OKF-P4-A001` records that the first production migration slice is realized at `okf/` because the Phase 4 execution contract explicitly requires `okf/index.md`, while the repository and current validator already use `okf/` as their root. The Phase 4 implementation is additive and limited to the handoff set; it does not make the remaining legacy Markdown or extension artifacts conformant. Phase 5 must reconcile the final extension boundary before consumer cutover or cleanup.

> Phase 2 design only. None of the paths below is created or activated by this phase.

> Superseded by Phase 1: the implemented official bundle root is `okf/`, and
> the implemented project extension root is `okf-extension/`. The proposed
> `okf/bundle/` examples below are retained as historical design evidence only.

## Executive Summary

The final design makes `okf/bundle/` the root of the official Google Open Knowledge Format v0.2 bundle and keeps every OfflineWebArchiver-specific artifact in the sibling `okf-extension/` tree. This physical boundary prevents private JSON contracts and extension documentation from becoming accidental official Concepts. Official authored Concepts remain understandable as Markdown without loading a registry. Extension indexes may be generated from the Concepts, never the reverse.

The hierarchy is intentionally shallow. Stable subject areas contain Concepts directly, while `history/` is the only phase-numbered area because phase identity is intrinsic to historical records. The design omits an official `log.md`: Git history and dedicated Phase Record Concepts already provide change history without maintaining a second chronology.

## Revalidated Phase 1 Baseline

Phase 2 began on branch `main` at commit `dd0fb00fd869dee2a808f48fc157f45c00c98cb0`. The working tree contained the expected untracked `docs/okf-migration/` directory with all 11 Phase 1 documents and no other reported change.

Repository revalidation found:

- 58 Markdown files and 11 JSON files under the current `okf/` tree;
- the custom manifest, eight registry JSON files, and two validation schemas described by the Phase 1 inventory;
- validator entry points `tools/okf/validate.mjs` and `tools/okf/migrate.mjs`, exposed by `okf:validate` and `okf:migrate`, plus the `test:okf` suite;
- a stricter independent documentation-link consumer at `tools/docs/validate.mjs`;
- no `.github/` directory and therefore no current repository CI workflow consuming `okf/` paths;
- no production package under `apps/` or `packages/` reading `okf/`; the observed path dependencies are repository tooling, tests, package scripts, and documentation;
- unchanged HEAD and an internally consistent Phase 1 count/inventory at the start of design.

The official v0.2 specification was refreshed from its normative Google repository during Phase 2. No Phase 1 inventory correction was required. The earlier target-state sketch is refined by this document: its unresolved physical boundary is now fixed as sibling official and extension roots.

## Architectural Principles

1. The official bundle is a self-contained human-readable knowledge layer.
2. A Concept's path is its identity; paths describe stable subjects, not status or ownership.
3. Official Concepts are authoritative for migrated knowledge; generated extensions consume them.
4. Project-only traceability, evidence, schemas, and reports remain explicit extensions.
5. Generated artifacts never become independent authorities.
6. Indexes disclose one level of navigation and do not duplicate Concept bodies.
7. Migration remains additive until compatibility checks prove that legacy consumers can switch.
8. Official conformance and project policy validation are separate results.

## Complete Proposed Directory Tree

```text
okf/
  bundle/                                  # official OKF bundle root; authoritative
    index.md                               # authored reserved root index
    product/
      index.md                             # generated directory index
      overview.md                          # Project Overview
      requirements/                        # future Product Requirement Concepts
        index.md                           # generated when the directory is populated
    architecture/
      index.md
      overview.md                          # future Architecture Overview
      application-service.md
      browser-runtime.md
      cli.md
      contracts.md
      desktop-interface.md
      platform.md
    data/
      index.md
      database.md
      persistence.md
      project-format.md
      render-results.md
    workflow/
      index.md
      job-attempts.md
      job-state-machine.md
      queue.md
      rendering.md
      scope-engine.md
      site-profile.md
    recovery/
      index.md
      artifact-checkpoints.md
      checkpoint-recovery.md
      completed-output.md
      fencing.md
      heartbeats.md
      leases.md
      partial-files.md
      pause-resume.md
      run-control.md
    security/
      index.md
      runtime-network.md
      security-boundaries.md
    operations/
      index.md
      migration.md
      observability.md
      packaging.md
    testing/
      index.md
      test-strategy.md
    history/
      index.md
      phase-01.md
      phase-02.md
      phase-03.md
      phase-04.md
      phase-05.md
      phase-06.md
      phase-07.md
      phase-08.md
    references/
      index.md                             # authored catalogue; initially may be empty

  extensions/                              # not part of the official bundle
    README.md                              # authored boundary and consumer guidance
    manifest.json                          # authored project configuration
    registry/
      domains.json                         # authored project vocabulary
      evidence.json                        # authored evidence identities
      nodes.json                           # generated Concept index
      relationships.json                   # generated relationship index
      phases.json                          # generated Phase Record index
      decisions.json                       # generated decision index
      risks.json                           # generated risk index
      changes.json                         # authored migration/change ledger
    evidence/
      builds.md
      decisions.md
      runtime.md
      source.md
      tests.md
    maps/
      dependencies.md
      domains.md
      system.md
      traceability.md
    reports/
      decisions.md
      evidence.md
      risks.md
    validation/
      rules/
        semantic-rules.md
      schemas/
        manifest.schema.json
        registry.schema.json
      reports/
        phase-03-migration-report.md
        official-conformance.json           # generated in Phase 6+
        extension-validation.json           # generated in Phase 6+
    generated/                              # disposable derived outputs only
    compatibility/
      legacy-path-map.json                  # generated transition map

  legacy/                                   # optional temporary home after cutover
    README.md                               # transition notice, outside bundle root
```

`okf/log.md` and `okf/bundle/log.md` are intentionally absent. `okf/legacy/` is created only if Phase 5 needs retained copies after paths move; the current tree stays in place until that decision is implemented.

## Major Directory Contracts

| Directory | Purpose and permitted content | Prohibited content | Authority and production | Index policy | Owner phase |
|---|---|---|---|---|---|
| `okf/bundle/` | Official v0.2 Concepts and reserved files only | Private registries, schemas, compatibility data, generated reports | Concepts and root index are authored authorities; directory indexes are derived | Root `index.md` required | 3-4 |
| `bundle/product/` | Product identity and stable requirements | Phase status, implementation evidence | Authored; requirements may continue linking to external product authorities during transition | Index required | 4-5 |
| `bundle/architecture/` | System shape, components, interfaces, decisions | Run instructions and transient rollout notes | Authored | Index required | 4-5 |
| `bundle/data/` | Persistent models, formats, and result structures | Operational incident history | Authored | Index required | 4-5 |
| `bundle/workflow/` | End-to-end behavioral processes and state transitions | Component inventories or evidence ledgers | Authored | Index required | 4-5 |
| `bundle/recovery/` | Failure recovery, concurrency safety, and resumability procedures | General architecture unrelated to recovery | Authored | Index required | 4-5 |
| `bundle/security/` | Trust boundaries, network controls, and security requirements | Generic operational notes | Authored | Index required | 5 |
| `bundle/operations/` | Packaging, observability, migrations, and operator procedures | Product requirements | Authored | Index required | 5 |
| `bundle/testing/` | Test and quality strategy | Individual generated test results | Authored; derived results stay in extensions | Index required | 5 |
| `bundle/history/` | Historical Phase Record Concepts | Current product requirements or live operational status | Authored historical records | Index required and generated | 4-5 |
| `bundle/references/` | Curated reference entries or source mirrors needed to understand Concepts | Registries, reports, arbitrary attachments | Authored unless a source mirror is explicitly generated | Index required before references are added | 5 |
| `okf-extension/` | Project-specific machine data, evidence guides, maps, schemas, reports, and compatibility artifacts | Official Concepts presented as extension authorities | Mixed; every family is classified in `EXTENSION_BOUNDARY.md` | Its README is not an official reserved index | 5-6 |
| `extensions/generated/` | Reproducible, disposable generated outputs | Hand-authored facts | Generated and non-authoritative | None | 6 |
| `extensions/compatibility/` | Temporary mappings for legacy paths and consumers | Permanent Concept identity | Generated from migration decisions | None | 5-8 |
| `okf/legacy/` | Optional retained pre-cutover artifacts | New knowledge or long-term authority | Migration-only, read-only | No official index | 5-8 |

An empty proposed directory need not exist. Its index becomes required only when the directory is created as part of the bundle, except the bundle root which always has an index.

## Official-Layer Boundary

The official boundary is exactly the subtree rooted at `okf/bundle/`. Within it, every non-reserved Markdown file is a Concept, every Concept has the Phase 3 metadata contract including a non-empty `type`, and only its root `index.md` may declare `okf_version: "0.2"`. Consumers can traverse ordinary Markdown links without consulting extension JSON.

Non-Markdown attachments may be linked when justified, but extension registries and reports are not copied into this subtree. Official validation reports only on the official subtree.

## Extension-Layer Boundary

The sibling `okf-extension/` subtree is explicitly outside the official bundle root. It may contain Markdown documentation, JSON, schemas, generated data, and reports governed by project rules. Those Markdown files are not official Concepts because they are outside `okf/bundle/`. Extension validation may require stricter link, evidence, path, and traceability rules than the official specification.

The boundary is semantic as well as physical: an official Concept may link to an extension artifact as evidence, but its meaning cannot depend on private fields in that artifact. Extension artifacts may index or validate official Concepts by stable path.

## Authored and Generated Boundaries

- Human-authored: Concept Markdown, root index, references, evidence descriptions, custom manifest, domain vocabulary, evidence identities, and change ledger.
- Generated: directory indexes, Concept-node index, relationship/phase/decision/risk indexes, compatibility path map, and validation reports.
- Mixed files are not used in the initial design. If a later generator needs a generated region inside an authored file, Phase 3 must define explicit immutable delimiters before use.
- Migration-only: compatibility mappings and any optional `legacy/` copy.

The detailed controls are defined in `AUTHORING_AND_GENERATION_POLICY.md`.

## Reserved-File Locations

### Root `index.md`

`okf/bundle/index.md` is required and human-authored. It declares `okf_version: "0.2"`, explains the bundle's scope, and links to each populated top-level directory index. It does not repeat Concept bodies, registries, detailed requirements, phase status, or generated validation results.

### Directory `index.md`

Every populated top-level directory has a generated `index.md`. A nested directory such as `product/requirements/` receives one when populated. An index provides a short purpose statement and one-level links; it does not reproduce metadata tables or substantive content. Only the bundle-root index may carry frontmatter.

### `log.md`

The project will not create an official `log.md`. Git records file evolution, while Phase Record Concepts preserve meaningful historical milestones. A second manually maintained chronology would duplicate both and create stale-data risk. This decision may be reopened only if a concrete consumer requires the official log convention.

## Transitional Compatibility Strategy

1. Phases 2-3 freeze architecture and metadata without touching current files.
2. Phase 4 creates the reviewed core at the amended production root `okf/` while current custom paths remain authoritative for existing tools; the historical `okf/bundle/` path is not created in parallel.
3. Phase 5 migrates the remaining Concepts and creates `extensions/compatibility/legacy-path-map.json` before changing consumers.
4. Phase 6 runs official and extension validation separately and checks bridge completeness.
5. Phase 7 proves deterministic regeneration and compatibility in tests.
6. Phase 8 proposes cleanup only after all consumers have switched and preservation is approved.

No current path is deleted merely because a target path exists. During overlap, the migration ledger identifies the authority and the duplicate is read-only or generated.

## Dependency Direction

```text
External product/source authorities
              |
              v
Official authored Concepts in okf/bundle/
              |
              v
Generated extension indexes and compatibility maps
              |
              v
Official conformance + project extension validation + reports
```

Authoritative external product documents may remain upstream where the source-of-truth map says so. No generated registry is allowed to overwrite a Concept or become the only place a reader can recover its meaning.

## Rejected Alternatives

| Alternative | Result | Reason |
|---|---|---|
| Use `okf/` itself as the official bundle root and place extensions beneath it | REJECTED | Extension Markdown would be inside the Concept tree and private files would blur the conformance boundary. |
| Encode project registries entirely in Concept frontmatter | REJECTED | It would make official Concepts dependent on private schemas and overload official metadata. |
| Keep JSON registries authoritative and generate all Concepts | REJECTED | Human-readable official knowledge would no longer be the authoritative knowledge layer. |
| Create an official `log.md` from phase reports | REJECTED | It duplicates Git and Phase Record Concepts without a demonstrated consumer. |
| Create one directory per current topic | REJECTED | It preserves accidental nesting and produces unnecessary indexes. |
| Flatten all Concepts into the bundle root | REJECTED | It weakens progressive disclosure and creates naming collisions. |

## Implementation Sequencing

Phase 3 defines metadata syntax and generated markers against this fixed tree. Phase 4 creates the root, indexes, product overview, core architecture/data/workflow/recovery Concepts, and early Phase Records. Phase 5 completes migration and extension relocation with a compatibility map. Phase 6 implements dual validation and generators. Phase 7 automates deterministic checks. Phase 8 audits and proposes legacy cleanup.

## Risks

- Consumers hard-coded to current paths can break if Phase 5 moves files before the compatibility map and tests exist.
- Generated indexes can become stale until Phase 6 supplies deterministic generation and freshness checks.
- Phase Record Concepts may be confused with an official log unless their distinct semantic role remains explicit.
- Current registry identifiers may not map one-to-one to path-based Concept IDs; Phase 3 must define bridge identifiers without changing target paths.
- External authorities can drift from Concept summaries; the source policy must define review and stale detection.
- A future contributor may run an official validator at `okf/` instead of `okf/bundle/`; commands and reports must always declare the validation root.
