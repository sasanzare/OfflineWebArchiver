# Phase 5 Handoff

## Starting point

Phase 4 leaves an additive core migration at `okf/` under `OKF-P4-A001`. It creates 21 Concepts and seven reserved indexes, preserves all current sources and registries, and leaves 34 of the original 58 map rows for Phase 5. The new Concepts are future semantic representations during overlap; no consumer cutover or legacy deletion occurred.

## Remaining Markdown source rows

The following list is the complete deferred set from `CONTENT_MIGRATION_MAP.md`. The historical proposed `okf/bundle/` paths are shown where useful, but Phase 5 must first confirm the final physical extension boundary and realize any new targets consistently under the amended production root.

### Evidence documentation (five rows; extension documentation)

| Source | Proposed disposition |
|---|---|
| `okf/evidence/builds/README.md` | Extension evidence guide (`evidence/builds.md`) |
| `okf/evidence/decisions/README.md` | Extension evidence guide (`evidence/decisions.md`) |
| `okf/evidence/runtime/README.md` | Extension evidence guide (`evidence/runtime.md`) |
| `okf/evidence/source/README.md` | Extension evidence guide (`evidence/source.md`) |
| `okf/evidence/tests/README.md` | Extension evidence guide (`evidence/tests.md`) |

### Remaining living Concepts (19 rows)

| Source | Proposed type | Historical target |
|---|---|---|
| `okf/knowledge/artifact-checkpoints/README.md` | Recovery Procedure | `okf/bundle/recovery/artifact-checkpoints.md` |
| `okf/knowledge/cli/README.md` | Architecture Component | `okf/bundle/architecture/cli.md` |
| `okf/knowledge/completed-output/README.md` | Recovery Procedure | `okf/bundle/recovery/completed-output.md` |
| `okf/knowledge/desktop-interface/README.md` | Architecture Component | `okf/bundle/architecture/desktop-interface.md` |
| `okf/knowledge/heartbeats/README.md` | Recovery Procedure | `okf/bundle/recovery/heartbeats.md` |
| `okf/knowledge/job-attempts/README.md` | Workflow | `okf/bundle/workflow/job-attempts.md` |
| `okf/knowledge/migration/README.md` | Operational Runbook | `okf/bundle/operations/migration.md` |
| `okf/knowledge/observability/README.md` | Operational Runbook | `okf/bundle/operations/observability.md` |
| `okf/knowledge/packaging/README.md` | Operational Runbook | `okf/bundle/operations/packaging.md` |
| `okf/knowledge/partial-files/README.md` | Recovery Procedure | `okf/bundle/recovery/partial-files.md` |
| `okf/knowledge/pause-resume/README.md` | Recovery Procedure | `okf/bundle/recovery/pause-resume.md` |
| `okf/knowledge/platform/README.md` | Architecture Component | `okf/bundle/architecture/platform.md` |
| `okf/knowledge/render-results/README.md` | Data Model | `okf/bundle/data/render-results.md` |
| `okf/knowledge/run-control/README.md` | Recovery Procedure | `okf/bundle/recovery/run-control.md` |
| `okf/knowledge/runtime-network/README.md` | Security Control | `okf/bundle/security/runtime-network.md` |
| `okf/knowledge/scope-engine/README.md` | Workflow | `okf/bundle/workflow/scope-engine.md` |
| `okf/knowledge/security/README.md` | Security Control | `okf/bundle/security/security-boundaries.md` |
| `okf/knowledge/site-profile/README.md` | Workflow | `okf/bundle/workflow/site-profile.md` |
| `okf/knowledge/testing/README.md` | Test Strategy | `okf/bundle/testing/test-strategy.md` |

### Product reports and maps (seven rows; extension documentation)

| Source | Proposed disposition |
|---|---|
| `okf/knowledge/product/DECISIONS.md` | Extension decision report |
| `okf/knowledge/product/EVIDENCE.md` | Extension evidence report |
| `okf/knowledge/product/RISKS.md` | Extension risk report |
| `okf/maps/dependencies/README.md` | Extension dependency map |
| `okf/maps/domains/README.md` | Extension domain map |
| `okf/maps/system/README.md` | Extension system map |
| `okf/maps/traceability/README.md` | Extension traceability map |

### Current root and validation documentation (three rows; extension documentation)

| Source | Proposed disposition |
|---|---|
| `okf/README.md` | Extension boundary and consumer README |
| `okf/validation/reports/PHASE_03_OKF_MIGRATION_REPORT.md` | Extension validation report |
| `okf/validation/rules/SEMANTIC_RULES.md` | Extension validation policy |

## Required Phase 5 work

1. **Extension bridge and physical boundary.** Resolve the final relationship between the Phase 4 execution root `okf/`, the historical `okf/bundle/` proposal, and the extension root before moving any Markdown. Create a complete legacy-path compatibility map before consumer changes.
2. **Concept migration.** Apply the frozen metadata contract to all 19 remaining living Concepts. Preserve source facts, map status dimensions, add portable sources, add links, and create every required security, operations, testing, and data/workflow/recovery index without frontmatter.
3. **Extension documentation.** Relocate or realize all five evidence guides, three product reports, four map documents, and three root/validation documents as project extensions. Keep extension Markdown out of the final official Concept boundary.
4. **Registry synchronization.** Preserve all eight JSON registry families and the manifest, then reconcile domains, nodes, phases, decisions, risks, changes, relationships, and registry path consumers against target Concepts. Do not hand-edit generated outputs without an authored input policy.
5. **Evidence synchronization.** Preserve every existing evidence ID, path, method, and status. Add source and `owa.evidence_ids` bridges only after checking the referenced artifact; report evidence that has no target Concept rather than dropping it.
6. **Source-of-truth cleanup.** Reconcile product scope, ADRs, source, tests, phase records, Concepts, and registries. Mark each duplicate as authoritative, read-only, or generated. Do not silently promote a summary over an upstream implementation or governance authority.
7. **Relationship parity.** Reconcile all typed `relationships.json` edges into meaningful Markdown links and minimal extension annotations where Markdown cannot preserve a project-only relation. Validate both endpoints and avoid frontmatter graph fields.
8. **Legacy cleanup.** Do not delete current sources until every consumer, path, registry, evidence record, and documentation link has a passing compatibility check. Any removal must be recoverable, explicitly approved, and recorded in the change ledger.
9. **Index completion.** Add the remaining populated `security`, `operations`, `testing`, and any nested indexes required by the final tree. Regenerate deterministic indexes from Concepts after Phase 6 tooling exists; keep the root index authored and keep `log.md` omitted unless the decision is superseded.

## Required acceptance gates

- Every one of the 58 original map rows has an implemented disposition and a reviewed authority/cutover state.
- Every new Concept has valid frontmatter, an approved type, canonical order, portable sources, truthful lifecycle/state mapping, and resolved links.
- Every extension file has a declared project-extension owner and machine authority.
- All manifest and registry consumers are mapped before path changes; no JSON/evidence row is lost.
- Official conformance and extension validation are separate commands and separate results.
- Generated indexes and compatibility maps are deterministic, stale-checkable, and protected from authored-file overwrite.
- Existing custom validator parity is proven before any consumer cutover.
- Full-bundle conformance is assessed only after legacy Markdown, extension boundaries, indexes, links, sources, and registries are reconciled.
- Cleanup remains deferred until an explicit final audit and approval.

## Phase 5 non-goals

Do not redesign the 14-type taxonomy, metadata contract, status model, actor syntax, source model, or relationship representation. Do not introduce a new official log, delete registries, change application code, or claim conformance based only on the existence of the Phase 4 core.

