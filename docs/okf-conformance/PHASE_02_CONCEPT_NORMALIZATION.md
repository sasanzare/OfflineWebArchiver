# Phase 2 — Official OKF Concept Normalization

## Phase status

COMPLETE

Phase 2 audited every official Concept under `okf/`, corrected all source references to immutable repository permalinks, corrected demonstrably stale current-language statements, and preserved the official/custom metadata boundary. No commit, push, branch operation, reset, rebase, stash, or discard was performed.

## Specification basis

The authoritative sources inspected were the [Google OKF directory](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf) and [OKF v0.2 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md). The inspected specification revision is commit [3fcbb9f828c2f23d109c855ee403c3a4c81f3a96](https://github.com/GoogleCloudPlatform/knowledge-catalog/commit/3fcbb9f828c2f23d109c855ee403c3a4c81f3a96), authored 2026-07-24.

Interpretation decisions:

- OKF v0.2 requires only a non-empty `type`; unknown producer fields are preserved.
- Official lifecycle values are `draft`, `stable`, and `deprecated`. All current Concepts were already `stable` and evidence did not justify changing that value.
- `sources[].resource` accepts absolute URLs, bundle-relative paths, and relative paths. Because the repository's source materials live outside the `okf/` bundle and the local policy rejects parent traversal, the 81 repository resources now use immutable GitHub `blob/<Phase 2 baseline commit>/...` URLs.
- `owa.verification_status` is a project extension. It was not translated into official `verified` metadata.
- `index.md` files remain reserved indexes: only the root index carries `okf_version: "0.2"`; directory indexes have no frontmatter.

## Git baseline and state

- Branch: `main`
- Starting commit: `0c323a593dbec974676dc3233dcee8b442150c43`
- Ending commit: `0c323a593dbec974676dc3233dcee8b442150c43`
- Phase 1: committed at the starting commit as `refactor(okf): separate project extensions from official bundle`.
- Pre-existing changes: none; the working tree was clean before Phase 2.
- Phase 2 changes: official Concept source metadata, five current Concept bodies, one directory index, and the two Phase 2 conformance artifacts.
- Staging/commit/push: no Phase 2 files were staged, committed, or pushed.

## Official bundle inventory

| Classification | Count |
|---|---:|
| Markdown files | 50 |
| Root index | 1 |
| Directory indexes | 9 |
| Reserved logs | 0 |
| Concepts | 40 |
| Source records | 81 |

Concept types were already descriptive and consistent; no type values changed:

| Type | Count |
|---|---:|
| Architecture Component | 6 |
| Data Model | 4 |
| Operational Runbook | 3 |
| Phase Record | 8 |
| Project Overview | 1 |
| Recovery Procedure | 9 |
| Security Control | 2 |
| Test Strategy | 1 |
| Workflow | 6 |

## Audit methodology and metadata results

Every official Markdown file was enumerated and classified independently. Each Concept frontmatter block was parsed with duplicate-key detection, required-field checks, source-entry checks, and explicit searches for legacy paths, absolute local paths, verification/generation metadata, lifecycle language, and migration claims. Relative Markdown targets were resolved from their containing file; directory links were checked against the current bundle tree.

- Frontmatter: 40/40 valid; no duplicate keys, malformed blocks, missing `type`, or body/frontmatter boundary errors.
- `type`: 40/40 non-empty; no changes required.
- `status`: 40/40 `stable`; no unsupported or demonstrably stale status values.
- `stale_after`: five Concepts use the future date `2026-11-01`; none is stale on the audit date.
- `sources`: all 81 resources target existing repository files at the baseline commit and are now immutable HTTPS permalinks; source IDs are unique within every Concept.
- Official `verified`: no Concept contains this field; no unsupported verification event was fabricated.
- Custom verification: 34 `verified`, 4 `partial`, and 2 absent `owa.verification_status` values were preserved as project metadata.
- `generated`: no Concept contains generated metadata; none was added merely because maintenance was performed.
- Legacy/absolute-path search: no official file contains `okf/extensions`, `okf/manifest.json`, `okf/registry`, `okf/validation`, or a developer-specific absolute path.

The complete per-Concept audit is in [PHASE_02_CONCEPT_AUDIT.csv](PHASE_02_CONCEPT_AUDIT.csv).

## Source corrections

All 40 Concept files had source metadata corrected. The previous repository-root-looking values such as `docs/product/PROJECT_SCOPE.md` did not resolve from their containing Concept under OKF relative-path semantics. Each is now an immutable URL under:

`https://github.com/sasanzare/OfflineWebArchiver/blob/0c323a593dbec974676dc3233dcee8b442150c43/`

The CSV records the source count, resolution result, verification decision, and change reason for every Concept. `docs/okf-conformance/MIGRATION_MAP.md` was intentionally not rewritten because this was metadata normalization, not a Phase 1 structural relocation.

## Semantic corrections

The following Concept bodies changed for factual currency:

- `okf/architecture/application-service.md`: removed completed Product Phase 8 framing from the current service description.
- `okf/operations/packaging.md`: replaced stale Product Phase 3 wording with the current development-artifact and release-packaging boundary.
- `okf/product/overview.md`: expanded the current capability boundary to include bounded Profile, Scope, Queue, Recovery, Browser, and Render workflows and removed the completed Phase 4 overlap claim.
- `okf/testing/test-strategy.md`: replaced completed Product Phase 8 framing with current test-program language.
- `okf/workflow/queue.md`: replaced completed Product Phase 8 framing with current rendering language.

The product directory index was also corrected: `okf/product/index.md` no longer says that authorities remain only “until Phase 5.” Historical Phase Record bodies were inspected and intentionally left historically accurate.

## Links and indexes

The root index and all nine directory indexes were checked against the OKF v0.2 index rules. The root index retains only permitted `okf_version` frontmatter; directory indexes remain frontmatter-free; no index masquerades as a Concept.

All 144 current relative Markdown targets resolve: 95 links in Concepts and 49 links in indexes. No broken target or section-fragment link was found. No official link points to the removed `okf/extensions/` tree or moved extension infrastructure.

Indexes intentionally unchanged: `okf/index.md`, `okf/architecture/index.md`, `okf/data/index.md`, `okf/history/index.md`, `okf/operations/index.md`, `okf/recovery/index.md`, `okf/security/index.md`, `okf/testing/index.md`, and `okf/workflow/index.md`. `okf/product/index.md` was corrected as noted above.

## Files created

- `docs/okf-conformance/PHASE_02_CONCEPT_NORMALIZATION.md`
- `docs/okf-conformance/PHASE_02_CONCEPT_AUDIT.csv`

## Files modified

- All 40 Concept files under `okf/architecture/`, `okf/data/`, `okf/history/`, `okf/operations/`, `okf/product/`, `okf/recovery/`, `okf/security/`, `okf/testing/`, and `okf/workflow/`: source references normalized; five also received focused body corrections.
- `okf/product/index.md`: removed stale Phase 5 timing language.
- No files under `okf-extension/`, `tools/okf/`, `tests/okf/`, `.github/workflows/`, or application source were modified.

## Final Git status

The final working tree contains 41 modified official Markdown files and the two new Phase 2 conformance documents. There are no staged entries, deletions, renames, or unrelated files. Branch and HEAD remain `main` and `0c323a593dbec974676dc3233dcee8b442150c43`.

## Validation

The following checks were executed after the Phase 2 edits:

- `node phase-02-audit.mjs` and `node phase-02-audit.mjs --phase2-check`: PASS — 50 files, 40 Concepts, valid frontmatter, 81/81 pinned sources, valid indexes, and valid links.
- `npm run test:okf`: PASS — 18 tests.
- `npm run okf:validate`: PASS.
- `npm run okf:validate:official`: PASS.
- `npm run okf:validate:extensions`: PASS.
- `npm run okf:validate:quality`: PASS.
- `npm run okf:validate:json`: PASS.
- `npm run docs:validate`: PASS — 124 required artifacts and 312 relative links.
- `npm run format:check`: PASS.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run test`: PASS — 100 tests.
- `npm run build`: PASS.
- `git diff --check HEAD`: PASS.

## Remaining known issues

- Source URLs are intentionally pinned to the Phase 2 baseline commit. A later source-authority update should change them deliberately rather than silently tracking `main`.
- The official bundle references some authoritative materials outside `okf/`; standalone distribution of those source materials is not part of this phase.
- Existing Concept content continues to document known product limits such as Link Discovery, production downloading, release packaging, DNS connection pinning, and non-Windows Browser evidence. These are current limitations, not normalization blockers.

## Phase 3 validator issues deferred

- The production OKF validator checks source shape and local Markdown link paths but does not independently verify remote source reachability or permalink target content.
- Anchor integrity and richer source provenance checks remain explicit audit work rather than strict production validation.
- No validator architecture or test framework redesign was performed in Phase 2.

## Acceptance criteria

| Criterion | Result |
|---|---|
| Every official Concept individually audited | PASS |
| Audit CSV has one row per Concept | PASS |
| All Concept frontmatter is valid | PASS |
| Every Concept has a valid non-empty `type` | PASS |
| Official status values are valid and current | PASS |
| Every source resolves or is documented | PASS |
| No developer-specific absolute source path | PASS |
| Old `okf/extensions/` references removed from active official files | PASS |
| Internal Markdown links resolve | PASS |
| Official verification is evidence-supported | PASS |
| Custom `owa` verification is not conflated | PASS |
| Generated metadata is accurate | PASS |
| Demonstrably outdated current statements corrected | PASS |
| Root and directory indexes remain valid | PASS |
| No broad validator redesign | PASS |
| No unrelated application code changed | PASS |
| Applicable checks pass | PASS |
| Validator issues deferred to Phase 3 are documented | PASS |
| No commit or push | PASS |
| Report is complete and truthful | PASS |
