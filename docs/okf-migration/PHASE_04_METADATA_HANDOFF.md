# Phase 4 Metadata Handoff

## Execution Contract

Phase 4 creates the reviewed core under `okf/bundle/` without editing or removing any current `okf/` artifact. It follows this contract and the Phase 2 target paths exactly. It may not redesign metadata semantics for convenience.

Contract version: `owa-okf-metadata/1.0.0`; official target: OKF `0.2`.

## Approved Fields and Categories

| Category | Fields |
|---|---|
| `OFFICIAL_REQUIRED` | `type` |
| `REPOSITORY_REQUIRED` | `title`, `description`, `status` |
| `OFFICIAL_OPTIONAL` | `resource`, `usage_window` |
| `REPOSITORY_CONDITIONAL` | `generated`, `sources`, `stale_after` |
| `REPOSITORY_RECOMMENDED` | `tags`, `verified` |
| `PROJECT_EXTENSION` | `owa` and approved children |
| `RESERVED_FILE_ONLY` | `okf_version` |
| `DEPRECATED_LEGACY` | `timestamp` |

Canonical Concept order is `type`, `title`, `description`, `resource`, `tags`, `status`, `generated`, `verified`, `sources`, `usage_window`, `stale_after`, `owa`.

## Type Enumeration

Exact values, no aliases: `Project Overview`, `Product Requirement`, `Architecture Overview`, `Architecture Component`, `Architecture Decision`, `Workflow`, `Data Model`, `Security Control`, `Operational Runbook`, `Recovery Procedure`, `Test Strategy`, `Quality Policy`, `Phase Record`, `Reference`.

Unknown values pass official consumption but are repository producer errors.

## Lifecycle and Current-Status Mapping

Official lifecycle is only `draft`, `stable`, `deprecated`; repository output is explicit. Never copy uppercase legacy state into it.

- `VERIFIED` -> normally `owa.verification_status: verified`; official `verified` only with real actor/time.
- `PLANNED` -> `owa.implementation_status: planned`.
- `PARTIAL` -> implementation or verification `partial` by context.
- `UNKNOWN` -> verification or governance `unknown` by context.
- `NEEDS_OWNER_CONFIRMATION` -> governance `needs-owner-confirmation`.
- `DOCUMENTATION_CODE_CONFLICT` -> verification `conflict` and explicit body warning.
- `DEPRECATED` -> lifecycle deprecated only for a superseded Concept.
- `BLOCKED` -> governance or implementation blocked by context.
- `NOT_APPLICABLE` -> governance or implementation not-applicable with authority.

## Actors, Generation, Verification, and Sources

Actors are lowercase `human:<id>`, `process:<id>`, or `<producer>/<version>`. Human-owned AI-assisted content omits `generated`. Fully generated content requires `generated.by` and quoted UTC `generated.at`. Verification events require actor/time and canonical list form; material changes invalidate current verification.

Every source record requires portable `resource`; local absolute/UNC/file/home/env paths are forbidden. Source IDs are lowercase kebab-case and unique when used by body footnotes. Evidence methods/details stay in the extension evidence registry; selected identities use `owa.evidence_ids`.

## Reserved Files

- Create authored `okf/bundle/index.md` with only `okf_version: "0.2"` frontmatter.
- Generated directory indexes have no frontmatter and contain one-level navigation plus generated body marker.
- Do not create any `log.md`.

## Exact Core Migration Set

Phase 4 migrates these targets first, in this order, using the source dependencies in `CONTENT_MIGRATION_MAP.md`:

1. `okf/bundle/index.md`.
2. `okf/bundle/product/index.md` and `okf/bundle/product/overview.md` from product README plus durable `NEXT_PHASE` scope only.
3. `okf/bundle/architecture/index.md`, `application-service.md`, `browser-runtime.md`, and `contracts.md`.
4. `okf/bundle/data/index.md`, `project-format.md`, `database.md`, and `persistence.md`.
5. `okf/bundle/workflow/index.md`, `queue.md`, `job-state-machine.md`, and `rendering.md`.
6. `okf/bundle/recovery/index.md`, `leases.md`, `fencing.md`, and `checkpoint-recovery.md`.
7. `okf/bundle/history/index.md` and `phase-01.md` through `phase-08.md`, including the documented Phase 3 merge.

All current source paths remain operational. Remaining mapped Concepts and extension relocations stay in Phase 5.

## Minimums by Selected Content

- Product Overview/components/data/workflows/recovery: four required fields; sources when derived; relevant legacy IDs/paths during bridge.
- Queue/state/recovery safety Concepts: sources and verification recommended; `stale_after` when runtime-sensitive.
- Phase Records: sources required, no `stale_after`, stable only after historical reconciliation.
- Indexes: reserved-file rules, never Concept `type`.

## Valid and Invalid Inputs

Use `VALID_FRONTMATTER_EXAMPLES.md` and `INVALID_FRONTMATTER_FIXTURES.md` as the design corpus. Proposed schemas under `schema/` are producer-design aids, not production validators. Phase 4 must perform reviewed/manual validation until Phase 6 tools exist.

## Prohibited Redesigns

Do not add types, aliases, state fields, arbitrary `owa` children, frontmatter relationships, relative TTLs, local paths, mixed generated regions, index metadata, or an official log. Do not infer human verification, producer identity, timestamp, stable lifecycle, or implementation completion from current `VERIFIED` text.

## Migration Acceptance

Each migrated target must:

1. match its fixed path/type and exact title/H1;
2. contain valid normalized metadata and readable body;
3. record portable sources and extension IDs without data loss;
4. distinguish lifecycle, implementation, verification, and governance;
5. preserve current paths/consumers and record authority cutover state;
6. pass design-schema checks plus procedural checks;
7. preserve official versus repository validation labels;
8. leave current registries/evidence untouched.

Any deviation requires official specification evidence, repository evidence, a Phase 3 decision amendment, updated schemas/examples/mappings, and validation impact analysis before implementation.
