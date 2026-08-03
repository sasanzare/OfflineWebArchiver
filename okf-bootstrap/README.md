# OKF Bootstrap

**Project:** Offline Web Archive Builder

**OKF stage:** Historical OKF Phase 0 bootstrap; migrated and preserved

**Product status:** Product Phase 3 complete; Product Phase 4 next

**Knowledge status:** `DEPRECATED` as current structure, `VERIFIED` as preserved bootstrap/Phase 2 evidence

**Canonical activation:** Completed in Product Phase 3 at `okf/`
**Last updated:** 2026-07-31

> **Migrated in Product Phase 3.** Canonical authority is now
> [`okf/index.md`](../okf/index.md). This complete bootstrap remains preserved
> as historical governance/migration evidence. Its proposed target structure is
> superseded; unresolved questions remain active through the canonical decision
> registry and are not silently resolved.

OKF means **Open Knowledge Format** in this project. It is the structured,
evidence-backed, versioned knowledge system that connects what the repository
contains to why it exists, which requirement and decision authorize it, which
phase changed it, which test validates it, which risks affect it, and which
repository evidence supports each claim.

Traditional Markdown documents remain authoritative explanations of individual
subjects. Diagrams will remain focused views of particular relationships. OKF
adds a discoverable domain, node, relationship, evidence, phase, status, and
change model across those artifacts; it does not replace them or make unsupported
implementation claims true.

> **A product phase is not complete until its OKF impact has been reviewed and recorded.**

> **No change to code, configuration, schemas, contracts, security behavior,
> tests, build systems, platform support, or operational behavior may be
> considered complete without evaluating and updating the related OKF records.**

## Current boundary

`okf-bootstrap/` is the evidence and governance preparation area. It describes
the source hierarchy, status model, identifiers, target structure, continuous
phase contract, gaps, traceability, and activation process while the repository
has no approved production architecture to inventory.

The future canonical `okf/` will contain machine-readable registries, knowledge
nodes, relationships, evidence, phase records, maps, and validation artifacts.
It has **not** been created. Normal activation is Product Phase 3, after Product
Phase 2 supplies feasibility evidence and actual repository packages, boundaries,
contracts, and technology decisions are available. The Technical Spike is
experimental evidence, not the final architecture.

The repository now contains an isolated experimental Electron/Playwright spike,
local fixture/runtime servers, tests, and an ignored Windows package. It still
contains no production crawler, approved application architecture, database,
queue, proxy manager, authentication system, production Local Application
Service, production source, or release artifact.

## Evidence-first rule

Claims use this precedence:

1. executable repository evidence: source, tests, migrations, schemas,
   configuration, build scripts, CI, generated contracts, reproducible runtime;
2. accepted technical decisions: ADRs, contracts, schemas, phase reports, verified
   build/test evidence;
3. current product documentation;
4. proposals and historical documentation;
5. assumptions.

When current executable behavior conflicts with documentation, OKF records
`DOCUMENTATION_CODE_CONFLICT`; it does not silently select the convenient claim.
See [Evidence Policy](EVIDENCE_POLICY.md) and
[Authoritative Source Map](AUTHORITATIVE_SOURCE_MAP.md).

## Knowledge status labels

Only these labels are valid:

- `VERIFIED`
- `PLANNED`
- `PARTIAL`
- `UNKNOWN`
- `NEEDS_OWNER_CONFIRMATION`
- `DOCUMENTATION_CODE_CONFLICT`
- `DEPRECATED`
- `BLOCKED`
- `NOT_APPLICABLE`

Implementation domains are not `VERIFIED` merely because Product Phase 1
documented them. Full definitions and transition rules are in
[Status Model](STATUS_MODEL.md).

## Navigation

- [Repository Inventory](REPOSITORY_INVENTORY.md) — current and planned artifacts.
- [Authoritative Source Map](AUTHORITATIVE_SOURCE_MAP.md) — authority by knowledge category.
- [Knowledge Domain Model](KNOWLEDGE_DOMAIN_MODEL.md) — planned domains and dependencies.
- [Evidence Policy](EVIDENCE_POLICY.md) — evidence records, hierarchy, and lifecycle.
- [Status Model](STATUS_MODEL.md) — allowed states, transitions, and conflict handling.
- [Identifier Conventions](IDENTIFIER_CONVENTIONS.md) — stable identifier and naming rules.
- [Target OKF Structure](TARGET_OKF_STRUCTURE.md) — proposed canonical layout.
- [Phase Evolution Contract](PHASE_EVOLUTION_CONTRACT.md) — mandatory Product Phase 2–25 synchronization.
- [Bootstrap Gap Analysis](BOOTSTRAP_GAP_ANALYSIS.md) — expected missing evidence and drift risks.
- [Bootstrap Traceability](BOOTSTRAP_TRACEABILITY.md) — current identifiers to future domains.
- [Migration and Activation Plan](MIGRATION_AND_ACTIVATION_PLAN.md) — Product Phase 3 gate and rollback.
- [OKF Open Questions](OPEN_QUESTIONS.md) — unresolved OKF-specific decisions.
- [Phase Evidence](PHASE_EVIDENCE/README.md) — Product Phase 2 bootstrap evidence and format.

Existing product authorities remain indexed from the
[repository README](../README.md).

## Canonical activation criteria

Canonical OKF activation normally occurs in Product Phase 3 only after:

- Product Phase 2 is complete and its experimental findings are recorded;
- an actual repository or monorepo structure and package names exist;
- architectural layers and public contract boundaries are evidenced;
- blocking technology and ownership decisions are resolved;
- identifier conventions are approved;
- an initial machine-readable schema direction and validation approach are
  approved; and
- migration has a tested or reviewable rollback plan.

The detailed gate is in
[Migration and Activation Plan](MIGRATION_AND_ACTIVATION_PLAN.md). Until then,
Product Phase 2 records evidence under `okf-bootstrap/PHASE_EVIDENCE/` and updates
affected bootstrap knowledge without creating canonical `okf/`.

## Continuous maintenance

Every Product Phase 2–25 task must:

1. read this entry point or the canonical entry point after activation;
2. identify affected domains before editing;
3. inspect repository evidence;
4. update knowledge, evidence, relationships, requirements, acceptance, risks,
   decisions, conflicts, unknowns, deprecations, and the phase record as relevant;
5. validate paths and identifiers; and
6. report all OKF changes in its final response.

Future phase prompts must include a section named **OKF Synchronization
Requirements**. The complete reusable checklist and phase record fields are in
[Phase Evolution Contract](PHASE_EVOLUTION_CONTRACT.md).

## Safety and authorization

OKF does not broaden product authority. Website crawling still requires owner
authorization or another valid legal basis. Proxy use cannot bypass scope,
access controls, blocks, challenges, `429`, or `Retry-After`. CAPTCHA requires
direct user participation and is never solved or bypassed. Passwords and OTP
values are never persisted. Session, proxy, API, signing, target, and evidence
data remain protected and redacted. Repository records must use
repository-relative paths and contain no private target identity or sensitive
value.
