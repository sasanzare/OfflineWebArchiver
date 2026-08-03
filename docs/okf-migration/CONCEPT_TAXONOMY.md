# Concept Taxonomy

## Approved Taxonomy

The repository uses 14 semantic Concept types. Type names describe why a Concept exists, not its file format, completion state, verification state, or implementation phase. Phase 3 must serialize these canonical names exactly but will define the frontmatter syntax separately.

Phase 3 has now frozen that serialization: values use the exact capitalization below, singular names, and no aliases. Unknown non-empty values remain consumable under official OKF but are repository producer errors until an evidence-backed taxonomy amendment updates the decisions, schema enumeration, examples, mapping, and migration handoff. Directory placement is a recommendation except where the Phase 2 migration map fixes a target path.

| Canonical type | Primary mode | Typical target location | Generated? |
|---|---|---|---|
| Project Overview | Descriptive | `product/` | No |
| Product Requirement | Normative | `product/requirements/` | No |
| Architecture Overview | Descriptive | `architecture/` | No |
| Architecture Component | Descriptive | `architecture/` | No |
| Architecture Decision | Normative | `architecture/` | No |
| Workflow | Descriptive and normative | `workflow/` | No |
| Data Model | Descriptive and normative | `data/` | No |
| Security Control | Normative | `security/` | No |
| Operational Runbook | Operational | `operations/` | No |
| Recovery Procedure | Operational and normative | `recovery/` | No |
| Test Strategy | Normative | `testing/` | No |
| Quality Policy | Normative | `testing/` or the relevant subject area | No |
| Phase Record | Referential and historical | `history/` | No |
| Reference | Referential | `references/` | Usually no; a declared source mirror may be generated |

## Type Definitions

### Project Overview

- **Definition:** A stable explanation of the product's identity, users, scope, capabilities, and boundaries.
- **Purpose:** Orient readers before they enter detailed product or technical knowledge.
- **Inclusion criteria:** Product mission, supported use cases, exclusions, major capabilities, or durable vocabulary shared across the product.
- **Exclusion criteria:** Testable individual obligations, implementation status, phase plans, component internals, or operator steps.
- **Expected content:** Problem statement, audience, scope, non-goals, capability summary, and links to requirements and architecture.
- **Typical relationships:** Links to Product Requirements, Architecture Overview, Workflows, and References.
- **Existing repository examples:** `okf/knowledge/product/README.md` plus stable scope material from `okf/knowledge/product/NEXT_PHASE.md`.
- **Target location:** `bundle/product/overview.md`.
- **Authored/generated policy:** Human-authored only.
- **Common classification mistakes:** Treating a roadmap, phase status summary, or README navigation list as a Project Overview.

### Product Requirement

- **Definition:** A durable, testable statement of product behavior, constraint, or acceptance obligation.
- **Purpose:** State what the product must do and why, independent of its current implementation state.
- **Inclusion criteria:** Identifiable obligations, user-visible constraints, acceptance expectations, and stable non-functional requirements.
- **Exclusion criteria:** Implementation design, current completion status, test results, risks, or project planning tasks.
- **Expected content:** Requirement statement, rationale, scope, acceptance references, and relationships to workflows or controls.
- **Typical relationships:** Links to Project Overview, Workflow, Security Control, Test Strategy, and external acceptance authority.
- **Existing repository examples:** Requirement narratives referenced by `okf/maps/traceability/README.md`; current canonical requirements remain in `docs/product/PROJECT_SCOPE.md` until migrated.
- **Target location:** `bundle/product/requirements/`.
- **Authored/generated policy:** Human-authored; traceability indexes are generated extensions.
- **Common classification mistakes:** Using this type for a task, risk, implementation claim, or phase acceptance report.

### Architecture Overview

- **Definition:** A system-level explanation of major boundaries, responsibilities, dependency direction, and deployment shape.
- **Purpose:** Provide the map that makes individual component Concepts understandable.
- **Inclusion criteria:** Cross-component structure, layer boundaries, major data/control flows, and architectural constraints.
- **Exclusion criteria:** A single component's design, a decision and its alternatives, or an operational procedure.
- **Expected content:** Context, major components, dependency direction, boundaries, diagrams where useful, and links to detailed components.
- **Typical relationships:** Links to Architecture Components, Data Models, Workflows, Security Controls, and Architecture Decisions.
- **Existing repository examples:** System-level material in `okf/knowledge/architecture/PHASE_03_ARCHITECTURE_RECORD.md` and `okf/maps/system/README.md`.
- **Target location:** `bundle/architecture/overview.md`.
- **Authored/generated policy:** Human-authored.
- **Common classification mistakes:** Relabeling a phase architecture record as a living overview without removing its historical framing.

### Architecture Component

- **Definition:** A durable description of one structural subsystem, service, interface, or runtime boundary.
- **Purpose:** Explain responsibility, public contracts, dependencies, and constraints for a coherent component.
- **Inclusion criteria:** Component responsibility, interfaces, dependency rules, failure boundaries, and implementation-neutral structure.
- **Exclusion criteria:** End-to-end workflow, persistent schema, decision rationale, or step-by-step operator action.
- **Expected content:** Responsibilities, inputs/outputs, collaborators, invariants, failure behavior, and relevant source links.
- **Typical relationships:** Links to Architecture Overview, other components, Workflows, Data Models, and decisions.
- **Existing repository examples:** `application-service`, `browser-runtime`, `cli`, `contracts`, `desktop-interface`, and `platform` knowledge.
- **Target location:** `bundle/architecture/`.
- **Authored/generated policy:** Human-authored.
- **Common classification mistakes:** Calling every technical topic a component, including workflows such as rendering or models such as database schema.

### Architecture Decision

- **Definition:** A decision record that captures a consequential architectural choice, alternatives, rationale, and consequences.
- **Purpose:** Preserve why architecture took its current shape.
- **Inclusion criteria:** A stable decision with meaningful alternatives and architectural consequences.
- **Exclusion criteria:** A summary of many decision IDs, an implementation detail with no tradeoff, or a current status report.
- **Expected content:** Context, decision, alternatives, rationale, consequences, status in the decision authority, and supersession links.
- **Typical relationships:** Links to affected Architecture Components, Data Models, Security Controls, and authoritative ADRs.
- **Existing repository examples:** ADR-backed decisions summarized by `okf/knowledge/product/DECISIONS.md`; the summary itself remains extension documentation rather than a Concept.
- **Target location:** `bundle/architecture/` using subject names, or `bundle/architecture/decisions/` when multiple official decision Concepts justify an index.
- **Authored/generated policy:** Human-authored; never generated from a decision registry.
- **Common classification mistakes:** Converting a generated decision list into a decision Concept or confusing a current policy with its historical rationale.

### Workflow

- **Definition:** A coherent end-to-end sequence of behavior, state transition, or orchestration involving multiple steps or components.
- **Purpose:** Explain how the product performs a process and which invariants hold across it.
- **Inclusion criteria:** Triggers, stages, state transitions, participants, success/failure paths, and workflow-level invariants.
- **Exclusion criteria:** Static component design, data schema alone, recovery-only instructions, or UI task instructions.
- **Expected content:** Preconditions, sequence or state model, outputs, failure paths, idempotency, and component/data relationships.
- **Typical relationships:** Links to Architecture Components, Data Models, Recovery Procedures, Security Controls, and Test Strategy.
- **Existing repository examples:** `queue`, `job-attempts`, `job-state-machine`, `rendering`, `scope-engine`, and `site-profile` knowledge.
- **Target location:** `bundle/workflow/`.
- **Authored/generated policy:** Human-authored.
- **Common classification mistakes:** Classifying an individual queue table as a Workflow or a lease-recovery algorithm as ordinary workflow.

### Data Model

- **Definition:** A durable description of stored or exchanged data structures, invariants, ownership, and evolution.
- **Purpose:** Make persistence and format contracts explicit independently of code layout.
- **Inclusion criteria:** Entities, fields at an appropriate semantic level, relationships, constraints, durability, serialization, and migration rules.
- **Exclusion criteria:** Component responsibilities, runtime sequences, or a one-time database migration procedure.
- **Expected content:** Model boundaries, identities, invariants, lifecycle, compatibility, and links to implementation authority.
- **Typical relationships:** Links to Workflows, Architecture Components, Recovery Procedures, and References.
- **Existing repository examples:** `database`, `persistence`, `project-format`, and `render-results` knowledge.
- **Target location:** `bundle/data/`.
- **Authored/generated policy:** Human-authored; generated schema dumps remain references or extensions.
- **Common classification mistakes:** Using Data Model for database operations or for any document that merely mentions SQLite.

### Security Control

- **Definition:** A required trust boundary, protective behavior, threat mitigation, or security constraint.
- **Purpose:** State security expectations in a reviewable and testable form.
- **Inclusion criteria:** Threat context, protected assets, control behavior, failure mode, assumptions, and verification links.
- **Exclusion criteria:** General architecture with no security obligation, a vulnerability report, or transient implementation status.
- **Expected content:** Threat or boundary, control, rationale, limitations, verification approach, and incident implications.
- **Typical relationships:** Links to Product Requirements, Architecture Components, Workflows, Test Strategy, and decisions.
- **Existing repository examples:** `okf/knowledge/security/README.md` and `okf/knowledge/runtime-network/README.md`.
- **Target location:** `bundle/security/`.
- **Authored/generated policy:** Human-authored.
- **Common classification mistakes:** Treating all network behavior as security, or recording test evidence as the control itself.

### Operational Runbook

- **Definition:** Actionable guidance for building, packaging, observing, migrating, diagnosing, or operating the product.
- **Purpose:** Enable a maintainer to perform a repeatable operational task safely.
- **Inclusion criteria:** Preconditions, ordered actions, validation, failure handling, rollback, and escalation boundaries.
- **Exclusion criteria:** Product behavior, recovery algorithms embedded in the application, architectural rationale, or historical execution logs.
- **Expected content:** Goal, prerequisites, steps, verification, rollback, hazards, and owner.
- **Typical relationships:** Links to Architecture Components, Data Models, Recovery Procedures, References, and evidence.
- **Existing repository examples:** `migration`, `observability`, and `packaging` knowledge.
- **Target location:** `bundle/operations/`.
- **Authored/generated policy:** Human-authored.
- **Common classification mistakes:** Calling a descriptive operations overview a runbook when it provides no actionable procedure.

### Recovery Procedure

- **Definition:** A failure-focused behavior or procedure that restores safe progress, preserves consistency, or arbitrates concurrent ownership.
- **Purpose:** Make crash recovery and concurrency guarantees explicit and operable.
- **Inclusion criteria:** Failure trigger, persisted checkpoint, lease/fencing rule, recovery decision, invariants, and unsafe cases.
- **Exclusion criteria:** Normal happy-path workflow, general operational deployment steps, or static data schema.
- **Expected content:** Failure model, state inspection, decision procedure, atomicity/idempotency, validation, and fallback.
- **Typical relationships:** Links to Workflows, Data Models, Architecture Components, Security Controls, and tests.
- **Existing repository examples:** `artifact-checkpoints`, `checkpoint-recovery`, `completed-output`, `fencing`, `heartbeats`, `leases`, `partial-files`, `pause-resume`, and `run-control` knowledge.
- **Target location:** `bundle/recovery/`.
- **Authored/generated policy:** Human-authored.
- **Common classification mistakes:** Classifying every error path as a separate Recovery Procedure or hiding a core workflow inside recovery documentation.

### Test Strategy

- **Definition:** The planned approach for demonstrating behavior and controlling test coverage across levels.
- **Purpose:** Define what is tested, at which boundary, with which fixtures, and what remains out of scope.
- **Inclusion criteria:** Test layers, representative cases, environment constraints, determinism, and evidence expectations.
- **Exclusion criteria:** A single test result, build log, implementation status, or general quality rule unrelated to testing.
- **Expected content:** Scope, test types, fixtures, negative cases, environment, commands, and evidence links.
- **Typical relationships:** Links to Product Requirements, Workflows, Security Controls, Recovery Procedures, and evidence extensions.
- **Existing repository examples:** `okf/knowledge/testing/README.md`.
- **Target location:** `bundle/testing/test-strategy.md`.
- **Authored/generated policy:** Human-authored; results are derived extension reports.
- **Common classification mistakes:** Treating a test execution report as strategy or embedding evidence registry data in the Concept.

### Quality Policy

- **Definition:** A normative cross-cutting rule for documentation, validation, compatibility, release, or engineering quality.
- **Purpose:** State durable gates and responsibilities that are broader than one test strategy.
- **Inclusion criteria:** Mandatory quality constraints, review rules, compatibility guarantees, and validation responsibilities.
- **Exclusion criteria:** Tool-specific implementation details, generated reports, test plans, or general architecture.
- **Expected content:** Policy scope, normative rules, exceptions, enforcement boundary, ownership, and verification.
- **Typical relationships:** Links to Test Strategy, Operational Runbooks, References, and extension validation policy.
- **Existing repository examples:** No current `okf/knowledge/` file maps directly; future official quality policy may summarize approved portions of `okf/validation/rules/SEMANTIC_RULES.md` without absorbing project-only rules.
- **Target location:** `bundle/testing/` or the subject directory governed by the policy.
- **Authored/generated policy:** Human-authored only.
- **Common classification mistakes:** Promoting every validator implementation rule to an official Quality Policy.

### Phase Record

- **Definition:** An immutable historical account of a bounded product phase, its decisions, delivered scope, evidence, and known gaps.
- **Purpose:** Preserve project history without mixing it into living Concepts or an official chronological log.
- **Inclusion criteria:** Phase-specific objectives, outcomes, decisions, verification summary, deviations, and follow-up context.
- **Exclusion criteria:** Current product overview, living architecture, future requirement, or a list of phase statuses.
- **Expected content:** Phase identity, scope, outcome, evidence links, decisions, risks, and amendment notes.
- **Typical relationships:** Links to living Concepts affected by the phase, external phase plan, and extension evidence.
- **Existing repository examples:** The eight files under `okf/phases/` and the phase-03 architecture record.
- **Target location:** `bundle/history/phase-NN.md`.
- **Authored/generated policy:** Human-authored and historically stable; the history index is generated.
- **Common classification mistakes:** Using Phase Record as the current authority for architecture or converting it into `log.md` entries that lose context.

### Reference

- **Definition:** A curated explanation or local representation of an external or supporting source that is useful to multiple Concepts.
- **Purpose:** Preserve provenance and reader context without misclassifying source material as repository policy.
- **Inclusion criteria:** External standards, vendor behavior, terminology sources, immutable source snapshots, or bibliographic guidance.
- **Exclusion criteria:** Living project knowledge, extension reports, registries, generated maps, or documents moved merely because they are hard to classify.
- **Expected content:** Source identity, relevance, attribution, retrieval or snapshot details, limitations, and links to consuming Concepts.
- **Typical relationships:** Is linked from any Concept that relies on the source.
- **Existing repository examples:** No current Markdown file requires conversion; existing source evidence guides remain extension documentation.
- **Target location:** `bundle/references/`.
- **Authored/generated policy:** Human-authored by default; an explicitly marked immutable mirror may be generated.
- **Common classification mistakes:** Treating `references/` as a miscellaneous archive or moving project-specific validation documentation there.

## Classification Decision Tree

1. Is the document only navigation for a directory? Use reserved `index.md`, not a Concept type.
2. Is it private registry/evidence/validation/compatibility documentation? Keep it outside the bundle as extension documentation.
3. Is its subject a completed project phase? Use **Phase Record**.
4. Does it state a testable product obligation? Use **Product Requirement**.
5. Does it orient the whole product without individual obligations? Use **Project Overview**.
6. Does it record a choice and alternatives? Use **Architecture Decision**.
7. Does it describe system-wide structure? Use **Architecture Overview**.
8. Does it describe one structural subsystem or interface? Use **Architecture Component**.
9. Does it primarily define stored/exchanged structure and invariants? Use **Data Model**.
10. Does it describe a multi-step normal behavior or state flow? Use **Workflow**.
11. Does it focus on restoring safety or progress after failure/concurrency conflict? Use **Recovery Procedure**.
12. Does it impose a threat mitigation or trust-boundary rule? Use **Security Control**.
13. Does it tell an operator how to perform a task? Use **Operational Runbook**.
14. Does it define test approach? Use **Test Strategy**.
15. Does it define a broader durable quality gate? Use **Quality Policy**.
16. Is it chiefly a curated external/supporting source? Use **Reference**.
17. If none applies, do not invent a type: re-examine whether the file is an extension artifact or contains multiple Concepts.

## Rejected or Merged Candidate Types

- **Glossary** is not approved because no current standalone glossary exists; durable terms belong in Project Overview until evidence justifies a dedicated type.
- **Evidence** is not an official Concept type because evidence identities and results remain project extensions or source metadata.
- **Risk**, **Decision Summary**, and **Migration Status** are not types; current summaries are extension reports, while a real architectural decision uses Architecture Decision.
- **Interface** is included in Architecture Component.
- **Queue**, **Rendering**, and **Scope** are subjects classified as Workflow, not types.
- **Persistence** and **Project Format** are subjects classified as Data Model.
- **Operations Overview** is unnecessary; actionable material uses Operational Runbook, while structural material uses architecture types.
