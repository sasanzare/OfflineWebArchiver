# Phase 1 - OKF Bundle Separation

Status: COMPLETE after the validation commands recorded below.

## Phase objective

Separate the official OKF concept bundle under okf/ from all
OfflineWebArchiver-specific extension documentation and machine data. This
phase changes structure and dependent paths only; it does not redesign OKF
concepts, alter verification metadata, or rebuild validator semantics.

The authoritative reference reviewed before the move was the Google
[Open Knowledge Format specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
and its [official implementation directory](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf).
The specification defines a bundle as a directory tree of Markdown files with
YAML frontmatter, with reserved index.md and log.md meanings; it does not
require a project registry or project schema.

## Starting Git state

| Item | Value |
|---|---|
| Branch | main |
| Starting commit | d7740fa676211b675d1e2e173ad122e475f5405e |
| Working tree before Phase 1 | Clean |
| Pre-existing tracked changes | None |
| Pre-existing untracked changes | None |

No unrelated changes were present to preserve or distinguish. No commit,
branch switch, reset, rebase, stash, or push was performed.

## Classification rules

The classification used the official specification plus repository dependency
evidence:

- Markdown files with OKF frontmatter and a project subject role remain
  concepts or reserved indexes in okf/.
- The root okf/index.md is the only root index and retains only the
  okf_version declaration.
- Evidence guides, maps, reports, validation rules, manifests, registries,
  and JSON schemas are OfflineWebArchiver extension material.
- tools/okf/, tests/okf/, .github/workflows/okf-validation.yml, docs/, and
  okf-bootstrap/ are repository tooling or history outside both production
  OKF roots; they were not moved.
- Empty legacy directories under okf/ were removed after verifying that they
  contained no files. No tracked content was deleted.

The resulting official tree contains 40 Concepts, 9 directory indexes, and
the root index. The resulting extension tree contains 15 Markdown files, one
manifest, eight registries, and two validation schemas.

## Files and directories moved

All 26 tracked extension files were moved with git mv. The complete
old-to-new mapping is maintained in MIGRATION_MAP.md. The moved groups are:

- okf/extensions/ -> okf-extension/ (extension README, evidence, maps,
  reports, and validation documentation).
- okf/manifest.json -> okf-extension/manifest.json.
- okf/registry/ -> okf-extension/registry/ (eight registries).
- okf/validation/schemas/ -> okf-extension/validation/schemas/ (two
  schemas).

## References updated

- okf-extension/manifest.json now points to the extension authority and
  extension registry paths.
- tools/okf/discovery.mjs walks only okf/; extension Markdown is no longer
  classified as an official-root artifact.
- tools/okf/validate.mjs reads project JSON and schemas from okf-extension/
  while reading official Markdown only from okf/.
- tests/okf/layered-validator.test.ts now expects the 50 official-root
  artifacts and asserts that extension paths are not discovered.
- Registry path fields, extension documentation, the active maintainer
  handoff, source-of-truth map, inventories, and repository README links
  now use okf-extension/.
- okf/index.md no longer links into the extension tree and describes the
  boundary without making extension Markdown part of the official bundle.
- package.json scripts and .github/workflows/okf-validation.yml required no
  path changes because they invoke the stable tooling entry points.

## Files intentionally retained in okf/

The official bundle retains only the following populated areas:

- index.md.
- product/, architecture/, data/, workflow/, recovery/, security/,
  operations/, testing/, and history/.

The 40 Concept files in these areas were not semantically rewritten. The only
official-root Markdown change was the root index boundary text; no Concept
body, frontmatter status, identifier, or verification metadata was changed.

## Files intentionally retained outside both OKF roots

tools/okf/, tests/okf/, .github/workflows/okf-validation.yml, the application
packages, docs/okf-migration/, docs/okf-conformance/, and okf-bootstrap/
remain in their existing repository locations. Historical migration ledgers
and proposals retain old path examples where they document previous designs;
they are not runtime inputs. Current active handoff and source-of-truth
documents use the new paths.

## Tests and commands executed

The final command list and exit results are recorded here after the final
working-tree review:

- Baseline Git inspection: PASS.
- Official Google reference inspection: PASS.
- Structural inventory and stale-path searches: PASS, with historical path
  examples explicitly identified above.
- npm run test:okf: PASS (18 tests).
- npm run okf:validate: PASS (all layers, 0 errors, 0 warnings).
- npm run okf:validate:official: PASS (0 errors, 0 warnings).
- npm run okf:validate:extensions: PASS (0 errors, 0 warnings).
- npm run okf:validate:quality: PASS (0 errors, 0 warnings).
- npm run okf:validate:json: PASS (result pass, 50 official artifacts).
- npm run docs:validate: PASS (124 required artifacts, 311 relative links).
- npm run format:check: PASS.
- npm run lint: PASS.
- npm run typecheck: PASS.
- npm run test: PASS (100 tests).
- npm run build: PASS (desktop main, preload, renderer, and production workspace).

## Validation results

Structural acceptance checks completed during the phase:

- okf/ enumerates to 50 Markdown files and no JSON extension artifacts.
- okf-extension/ enumerates to 26 moved files.
- No duplicate moved file remains under okf/.
- The moved tracked files remain recognizable as Git renames.
- Official Concept files are unchanged except for the root index boundary text.

The full repository test runner initially hit a sandbox-only esbuild spawn
permission error; the unchanged command passed after process-spawn permission
was granted. The build had the same sandbox-only retry and then passed.

## Remaining known issues

### Phase 1 blockers

None identified after the final validation run.

### Historical references

docs/okf-migration/CURRENT_STATE_AUDIT.md,
docs/okf-migration/CONTENT_MIGRATION_MAP.md, and
docs/okf-migration/PHASE_08_CLEANUP_LEDGER.md retain historical old-path
entries by design. They are evidence of prior repository states, not active
consumer paths. The new migration map is the current Phase 1 authority.

### Known extension-validator issue

The pre-existing manifest JSON Schema contains its historical phase constant
and is parsed for schema integrity but is not the executable validator contract.
Phase 1 preserves that design defect and does not change extension semantics.

## Explicitly deferred

The following remain outside Phase 1:

1. Concept taxonomy, frontmatter normalization, status semantics, and
   verification/provenance changes.
2. Validator architecture redesign or deeper official-versus-extension rule
   corrections.
3. Generated report/index architecture and any new compatibility layer.
4. Strict external OKF conformance claims beyond the local checks executed
   here.

## Acceptance criteria

| Criterion | Result |
|---|---|
| okf/ contains only official OKF bundle material | PASS |
| No project-extension Markdown remains under okf/ | PASS |
| okf-extension/ exists and documents its purpose | PASS |
| Confirmed extension material moved to okf-extension/ | PASS |
| Manifest, registry, and validation paths individually classified and moved | PASS |
| Repository code and active documentation use the new paths | PASS |
| No duplicate compatibility copies remain inside okf/ | PASS |
| Existing repository tooling resolves required files | PASS |
| Validator design defects are documented rather than hidden | PASS |
| No unrelated production code was modified | PASS |
| No commit or push occurred | PASS |
| Phase 1 report and migration map are complete | PASS |

## Final Git status

| Item | Final state |
|---|---|
| Branch | main | 
| Starting commit | d7740fa676211b675d1e2e173ad122e475f5405e |
| Ending commit | d7740fa676211b675d1e2e173ad122e475f5405e |
| Pre-existing changes | None | 
| Phase 1 changes | 26 history-preserving renames, validator/test path updates, active documentation path updates, and two new conformance documents | 
| Working tree | Modified/staged Phase 1 changes only; no unrelated files | 
| Commit or push | Neither performed | 

The staged rename check reports all 26 moved files as R100. The current official
subject directories have no changes; only okf/index.md changed within the
official root.
