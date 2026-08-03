# Phase 4 Conformance Report

Normative reference: [Google Open Knowledge Format v0.2 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).

## Result summary

Phase 4 is a partial migration, not a full-bundle conformance release. The 21 migrated normal Concepts and seven reserved indexes pass the approved Phase 3 producer contract in manual checks. The remaining 58 legacy Markdown files are preserved and are not yet conformant Concepts, so repository-wide official conformance is **NOT ACHIEVED**. Existing project-extension validation remains separate and still passes.

## Official mandatory and reserved-file checks

| Check | Result | Evidence / limitation |
|---|---|---|
| Root reserved index exists | PASS | `okf/index.md` exists under `OKF-P4-A001`. |
| Root index frontmatter | PASS | The only key is `okf_version: "0.2"`; no Concept fields or status are present. |
| Non-root indexes | PASS | Six directory indexes have no frontmatter and contain the approved generated-file marker. |
| Concept frontmatter delimiters | PASS | 21/21 normal Concepts begin and close with one frontmatter block. |
| Non-empty approved `type` | PASS | 21/21 types are in the closed 14-type producer enumeration. |
| `title` and H1 equality | PASS | 21/21 titles match the first H1. |
| Required repository fields | PASS | Every Concept has `type`, `title`, `description`, and explicit lowercase lifecycle `status`. |
| Canonical field order | PASS | Present top-level fields follow `type`, `title`, `description`, `resource`, `tags`, `status`, `generated`, `verified`, `sources`, `usage_window`, `stale_after`, `owa`. |
| Lifecycle mapping | PASS | All migrated Concepts use `stable`; no uppercase legacy state is copied into official `status`. Stable describes Concept lifecycle, not implementation completion or human verification. |
| Actor and verification records | PASS | No `generated` or `verified` record was fabricated; no actor or timestamp was invented. Project verification remains in `owa` and evidence registries. |
| Source resources | PASS | 80/80 source resources exist, use portable repository-relative identifiers, and have unique local IDs. |
| Absolute-path prohibition | PASS | No drive, UNC, `file:`, home, or environment path appears in new frontmatter or source metadata. |
| Markdown relationships | PASS | 95/95 new internal links resolve. |
| Official log | PASS | No `log.md` was created, as required by the frozen decision. |

## Repository metadata policy

| Policy area | Result | Finding |
|---|---|---|
| Project state separation | PASS | Implementation and verification are represented only under approved `owa` children; official lifecycle is independent. |
| Evidence bridge | PASS | Registry-backed IDs are preserved in `owa.evidence_ids`; evidence JSON remains unchanged. |
| Legacy bridge | PASS | Current paths and selected registry IDs are retained in `owa.legacy_paths` and `owa.legacy_ids`. |
| Source-of-truth direction | PASS WITH TRANSITION | New Concepts are future semantic representations; specialized product, ADR, source, test, and registry authorities remain upstream until cutover. |
| Generated ownership | PASS WITH LIMITATION | Directory indexes carry the frozen marker, but Phase 6 generation tooling does not yet exist; no generator was wired. |
| Language and whitespace | PASS | New and modified Phase 4 migration content is English-only with no trailing whitespace. |

## Extension and compatibility validation

- `npm run okf:validate` passes with all eight existing registries, zero orphaned critical requirements, and zero broken registry references.
- The manifest, registry JSON, evidence JSON, relationship JSON, phase JSON, validation schemas, and current `tools/okf/` validator are unchanged.
- `npm run docs:validate` passes with 124 required artifacts and 261 relative links.
- No application source, tests, package script, or CI workflow changed.
- The current custom validator does not implement the Phase 3 frontmatter contract; manual checks are therefore recorded here until Phase 6 delivers separate official and extension validators.

## Remaining non-conformance

The current `okf/` tree still contains the 58 legacy Markdown files counted at the Phase 4 baseline. They include evidence guides, maps, reports, custom policy, and knowledge files without official frontmatter, and they remain operational for current consumers. Those files are not silently declared official Concepts. Remaining extension Markdown is still physically under the transitional `okf/` root; Phase 5 must complete the compatibility bridge and final extension-boundary decision.

Because the explicit Phase 4 root is `okf/`, the historical `okf/bundle/` proposal is not created in parallel. `OKF-P4-A001` is documented in both decision records and the handoff. This keeps one production root while openly reporting the remaining full-bundle gap.

## Conformance disposition

| Layer | Disposition |
|---|---|
| Migrated core Concepts | Conformant with the approved Phase 3 repository contract and official reserved/source behavior |
| Root and directory indexes | Conformant with reserved-file rules |
| Project extensions | Preserved and current custom validation passes |
| Remaining legacy Markdown | Not yet conformant; unchanged and scheduled for Phase 5 |
| Full `okf/` bundle | Not achieved; no full-conformance claim is made |
