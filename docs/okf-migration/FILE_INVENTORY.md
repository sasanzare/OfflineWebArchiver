# Current OKF File Inventory

This inventory is based on recursive content inspection. “Authored” means repository-maintained text; “generated candidate” means a future index/report could be generated but is currently authored. Registry fields, producer/consumer links, and migration notes are included in the final column.

## Active Custom Framework Markdown

| Path | Format | Role | Authored or generated | Current source-of-truth status | Consumers | Migration classification | Risk | Notes |
|---|---|---|---|---|---|---|---|---|
| `okf/README.md` | Markdown | Custom framework overview | Authored | Narrative authority | Humans, validator users | Project extension | High | States JSON registry authority; candidate reference, not an official index. |
| `okf/evidence/builds/README.md` | Markdown | Build evidence description | Authored | Reference-only | Humans | Evidence | Medium | Registry is the machine evidence authority. |
| `okf/evidence/decisions/README.md` | Markdown | Decision evidence description | Authored | Reference-only | Humans | Evidence | Medium | Points to decision/evidence registry model. |
| `okf/evidence/runtime/README.md` | Markdown | Runtime evidence description | Authored | Reference-only | Humans | Evidence | Medium | Describes Electron/runtime evidence. |
| `okf/evidence/source/README.md` | Markdown | Source evidence description | Authored | Reference-only | Humans | Evidence | Medium | Explains repository-source evidence. |
| `okf/evidence/tests/README.md` | Markdown | Test evidence description | Authored | Reference-only | Humans | Evidence | Medium | Does not contain official provenance metadata. |
| `okf/knowledge/application-service/README.md` | Markdown | Application-service knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | One topic; classify in Phase 4. |
| `okf/knowledge/architecture/PHASE_03_ARCHITECTURE_RECORD.md` | Markdown | Architecture phase record | Authored | Narrative reference | Docs validator | Phase record | Medium | May remain phase/reference rather than concept. |
| `okf/knowledge/artifact-checkpoints/README.md` | Markdown | Artifact checkpoint knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate operations concept. |
| `okf/knowledge/browser-runtime/README.md` | Markdown | Browser-runtime knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate architecture concept. |
| `okf/knowledge/checkpoint-recovery/README.md` | Markdown | Recovery knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate operations concept. |
| `okf/knowledge/cli/README.md` | Markdown | CLI knowledge | Authored | Narrative reference | Humans | Concept document candidate | Low | Candidate interface concept. |
| `okf/knowledge/completed-output/README.md` | Markdown | Completed-output knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate operations concept. |
| `okf/knowledge/contracts/README.md` | Markdown | Contract knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate architecture concept. |
| `okf/knowledge/database/README.md` | Markdown | Database knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate architecture concept. |
| `okf/knowledge/desktop-interface/README.md` | Markdown | Desktop knowledge | Authored | Narrative reference | Humans | Concept document candidate | Low | Candidate interface concept. |
| `okf/knowledge/fencing/README.md` | Markdown | Fencing knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate recovery concept. |
| `okf/knowledge/heartbeats/README.md` | Markdown | Heartbeat knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate recovery concept. |
| `okf/knowledge/job-attempts/README.md` | Markdown | Job-attempt knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate queue concept. |
| `okf/knowledge/job-state-machine/README.md` | Markdown | Job-state knowledge | Authored | Narrative reference | Docs validator | Concept document candidate | Medium | Candidate queue concept. |
| `okf/knowledge/leases/README.md` | Markdown | Lease knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate recovery concept. |
| `okf/knowledge/migration/README.md` | Markdown | Migration knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Avoid confusion with this migration plan. |
| `okf/knowledge/observability/README.md` | Markdown | Observability knowledge | Authored | Narrative reference | Humans | Concept document candidate | Low | Candidate operations concept. |
| `okf/knowledge/packaging/README.md` | Markdown | Packaging knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate reference/operations concept. |
| `okf/knowledge/partial-files/README.md` | Markdown | Partial-file knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate recovery concept. |
| `okf/knowledge/pause-resume/README.md` | Markdown | Pause/resume knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate recovery concept. |
| `okf/knowledge/persistence/README.md` | Markdown | Persistence knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate architecture concept. |
| `okf/knowledge/platform/README.md` | Markdown | Platform knowledge | Authored | Narrative reference | Humans | Concept document candidate | Low | Candidate reference concept. |
| `okf/knowledge/product/README.md` | Markdown | Product overview | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate product concept. |
| `okf/knowledge/product/DECISIONS.md` | Markdown | Decision summary | Authored | Derived/reference | Humans | Reference | High | JSON decision registry and project decision authority must remain traceable. |
| `okf/knowledge/product/EVIDENCE.md` | Markdown | Evidence summary | Authored | Derived/reference | Humans | Evidence | High | Must bridge to evidence registry. |
| `okf/knowledge/product/NEXT_PHASE.md` | Markdown | Phase planning summary | Authored | Derived/reference | Humans | Reference | Medium | Must not override phase-plan authority. |
| `okf/knowledge/product/PHASES.md` | Markdown | Phase summary | Authored | Derived/reference | Humans | Reference | Medium | Must not override phase registry/plan. |
| `okf/knowledge/product/RISKS.md` | Markdown | Risk summary | Authored | Derived/reference | Humans | Reference | High | Must bridge to risk registry and risk authority. |
| `okf/knowledge/project-format/README.md` | Markdown | Project-format knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate architecture concept. |
| `okf/knowledge/queue/README.md` | Markdown | Queue knowledge | Authored | Narrative reference | Docs validator | Concept document candidate | Medium | Candidate queue concept. |
| `okf/knowledge/rendering/README.md` | Markdown | Rendering knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate architecture concept. |
| `okf/knowledge/render-results/README.md` | Markdown | Render result knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate operations concept. |
| `okf/knowledge/run-control/README.md` | Markdown | Run-control knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate recovery concept. |
| `okf/knowledge/runtime-network/README.md` | Markdown | Runtime-network knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate security concept. |
| `okf/knowledge/scope-engine/README.md` | Markdown | Scope-engine knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate architecture concept. |
| `okf/knowledge/security/README.md` | Markdown | Security knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate security concept. |
| `okf/knowledge/site-profile/README.md` | Markdown | Site-profile knowledge | Authored | Narrative reference | Humans | Concept document candidate | Medium | Candidate product/architecture concept. |
| `okf/knowledge/testing/README.md` | Markdown | Testing knowledge | Authored | Narrative reference | Docs validator | Concept document candidate | Medium | Candidate testing concept. |
| `okf/maps/dependencies/README.md` | Markdown | Dependency map | Authored | Derived/reference | Humans | Index/reference | Medium | Preserve graph semantics as extension. |
| `okf/maps/domains/README.md` | Markdown | Domain map | Authored | Derived/reference | Humans | Index/reference | Medium | Registry domains remain machine authority. |
| `okf/maps/system/README.md` | Markdown | System map | Authored | Derived/reference | Humans | Index/reference | Medium | Candidate generated index or reference. |
| `okf/maps/traceability/README.md` | Markdown | Traceability map | Authored | Derived/reference | Humans | Reference | High | Must retain requirement/evidence links. |
| `okf/phases/phase-01/PHASE_01_RECORD.md` | Markdown | Phase record | Authored | Narrative record | Registry/docs users | Log/reference | Medium | Do not treat as ordinary concept without review. |
| `okf/phases/phase-02/PHASE_02_RECORD.md` | Markdown | Phase record | Authored | Narrative record | Registry/docs users | Log/reference | Medium | Historical spike evidence boundary. |
| `okf/phases/phase-03/PHASE_03_ARCHITECTURE_RECORD.md` | Markdown | Phase record | Authored | Narrative record | Registry/docs users | Log/reference | Medium | Registry phase target. |
| `okf/phases/phase-04/PHASE_04_PROJECT_FORMAT_RECORD.md` | Markdown | Phase record | Authored | Narrative record | Registry/docs validator | Log/reference | Medium | Required by docs validator. |
| `okf/phases/phase-05/PHASE_05_SCOPE_AND_NORMALIZATION_RECORD.md` | Markdown | Phase record | Authored | Narrative record | Registry/docs validator | Log/reference | Medium | Required by docs validator. |
| `okf/phases/phase-06/PHASE_06_PERSISTENT_QUEUE_RECORD.md` | Markdown | Phase record | Authored | Narrative record | Registry/docs validator | Log/reference | Medium | Required by docs validator. |
| `okf/phases/phase-07/PHASE_07_RECOVERY_RECORD.md` | Markdown | Phase record | Authored | Narrative record | Registry/docs validator | Log/reference | Medium | Required by docs validator. |
| `okf/phases/phase-08/PHASE_08_BROWSER_RENDERING_RECORD.md` | Markdown | Phase record | Authored | Narrative record | Registry/docs validator | Log/reference | Medium | Required by docs validator. |
| `okf/validation/reports/PHASE_03_OKF_MIGRATION_REPORT.md` | Markdown | Historical migration report | Authored | Historical evidence | `tools/okf/validate.mjs` | Legacy artifact | High | Required by current validator; preserve. |
| `okf/validation/rules/SEMANTIC_RULES.md` | Markdown | Custom validator policy | Authored | Reference-only | Humans | Validator policy | High | Describes custom behavior, not official conformance. |

## Active Custom JSON and Tooling

| Path | Format | Role | Authored or generated | Current source-of-truth status | Consumers | Migration classification | Risk | Notes |
|---|---|---|---|---|---|---|---|---|
| `okf/manifest.json` | JSON | Custom manifest | Authored | Machine authority | `validate.mjs`, `migrate.mjs`, humans | Manifest / project extension | High | Selects registries; not official `okf_version`. |
| `okf/registry/domains.json` | JSON | Domain registry | Authored | Machine authority | validator/maps | Registry | High | 35 items. |
| `okf/registry/nodes.json` | JSON | Knowledge-node registry | Authored | Machine authority | validator | Registry | High | 32 items; verified evidence policy. |
| `okf/registry/evidence.json` | JSON | Evidence registry | Authored | Machine authority | validator | Evidence / registry | High | 54 repository-path records. |
| `okf/registry/relationships.json` | JSON | Relationship registry | Authored | Machine authority | validator/maps | Registry | High | 61 typed edges. |
| `okf/registry/phases.json` | JSON | Phase registry | Authored | Machine authority | validator | Registry | High | 8 phase records. |
| `okf/registry/decisions.json` | JSON | Decision registry | Authored | Machine authority | validator | Registry | High | 101 items. |
| `okf/registry/risks.json` | JSON | Risk registry | Authored | Machine authority | validator | Registry | High | 102 items. |
| `okf/registry/changes.json` | JSON | Change registry | Authored | Machine authority | validator | Registry | High | 6 items. |
| `okf/validation/schemas/manifest.schema.json` | JSON Schema | Custom schema | Authored | Reference-only | Future/manual consumers | Schema | High | Stale phase-7 constant; not called by Node validator. |
| `okf/validation/schemas/registry.schema.json` | JSON Schema | Custom schema | Authored | Reference-only | Future/manual consumers | Schema | Medium | Closed custom extension schema. |
| `tools/okf/validate.mjs` | JavaScript | Custom validator | Authored | Executable authority | npm/test/migrate | Validator | Critical | Preserve behavior until dual validator is verified. |
| `tools/okf/migrate.mjs` | JavaScript | Prerequisite verifier | Authored | Executable authority | npm/test | Generator/validator bridge | High | Does not transform files. |
| `tests/okf/validator.test.ts` | TypeScript | Validator tests | Authored | Test evidence | `npm test` | CI integration candidate | High | Covers negative policy probes. |
| `package.json` | JSON | Command registration | Authored | Build authority | npm/users | CI integration | Medium | Defines `okf:validate` and `okf:migrate`. |
| `tools/testing/run-tests.mjs` | JavaScript | Test-suite dispatcher | Authored | Test authority | `npm test` | CI integration | Medium | Includes `okf` suite. |
| `tools/docs/validate.mjs` | JavaScript | Strict Markdown link validator | Authored | Documentation gate | npm/users | Project extension | High | Stricter than official broken-link tolerance. |
| `docs/project/adr/ADR-008-canonical-okf-structure-and-validation.md` | Markdown | Current custom-framework ADR | Authored | Decision authority | Humans/docs validator | Legacy artifact/reference | High | Describes custom canonical OKF decision. |
| `README.md` | Markdown | Product overview | Authored | Product overview authority | Humans | Reference | Medium | Links to canonical custom OKF. |
| `HANDOFF.md` | Markdown | Operational handoff | Authored | Operational summary | Humans | Reference | Medium | Declares current OKF synchronization. |

## Historical Bootstrap Inputs

All 15 files below are authored historical inputs under `okf-bootstrap/`. They are referenced by `tools/okf/migrate.mjs` or current OKF narrative and must remain preserved until a later owner-approved disposition.

| Path | Format | Role | Authored or generated | Current source-of-truth status | Consumers | Migration classification | Risk | Notes |
|---|---|---|---|---|---|---|---|---|
| `okf-bootstrap/README.md` | Markdown | Bootstrap overview | Authored | Historical | migrate/narrative | Legacy artifact | High | Preserve. |
| `okf-bootstrap/AUTHORITATIVE_SOURCE_MAP.md` | Markdown | Authority mapping | Authored | Historical | migrate | Legacy artifact | High | Source mapping input. |
| `okf-bootstrap/BOOTSTRAP_GAP_ANALYSIS.md` | Markdown | Gap analysis | Authored | Historical | migrate | Legacy artifact | Medium | Historical planning. |
| `okf-bootstrap/BOOTSTRAP_TRACEABILITY.md` | Markdown | Traceability | Authored | Historical | migrate | Legacy artifact | High | Traceability preservation. |
| `okf-bootstrap/EVIDENCE_POLICY.md` | Markdown | Evidence policy | Authored | Historical | migrate | Legacy artifact | High | Policy reference. |
| `okf-bootstrap/IDENTIFIER_CONVENTIONS.md` | Markdown | Identifier rules | Authored | Historical | migrate | Legacy artifact | Medium | Naming history. |
| `okf-bootstrap/KNOWLEDGE_DOMAIN_MODEL.md` | Markdown | Domain model | Authored | Historical | migrate | Legacy artifact | Medium | Taxonomy input. |
| `okf-bootstrap/MIGRATION_AND_ACTIVATION_PLAN.md` | Markdown | Migration plan | Authored | Historical | migrate | Legacy artifact | High | Explicit prerequisite. |
| `okf-bootstrap/OPEN_QUESTIONS.md` | Markdown | Open questions | Authored | Historical | migrate/registry | Legacy artifact | High | Still referenced for decisions. |
| `okf-bootstrap/PHASE_EVIDENCE/README.md` | Markdown | Evidence folder overview | Authored | Historical | migrate | Legacy artifact | Medium | Preserve. |
| `okf-bootstrap/PHASE_EVIDENCE/PHASE_02_FEASIBILITY_EVIDENCE.md` | Markdown | Phase 2 evidence | Authored | Historical | migrate | Evidence | High | Historical test/spike boundary. |
| `okf-bootstrap/PHASE_EVOLUTION_CONTRACT.md` | Markdown | Phase evolution policy | Authored | Historical | migrate | Legacy artifact | High | Explicit prerequisite. |
| `okf-bootstrap/REPOSITORY_INVENTORY.md` | Markdown | Bootstrap inventory | Authored | Historical | migrate | Legacy artifact | Medium | Superseded but retained. |
| `okf-bootstrap/STATUS_MODEL.md` | Markdown | Status model | Authored | Historical | migrate | Legacy artifact | Critical | Origin of custom status vocabulary. |
| `okf-bootstrap/TARGET_OKF_STRUCTURE.md` | Markdown | Former target proposal | Authored | Historical | migrate | Legacy artifact | Medium | Superseded proposal. |
