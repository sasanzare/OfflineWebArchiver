# Phase 5 — Legacy Cleanup and Maintainer Documentation

**Status:** Complete for the scoped repository work; final hosted CI and
branch-protection certification remain outside this phase.

## 1. Phase objective

Archive obsolete OKF bootstrap and migration material without losing historical
traceability, remove active dependencies on deprecated roots, and establish a
small authoritative maintainer-documentation surface for the official Google
OKF v0.2 Bundle and the OfflineWebArchiver extension layer.

No validator architecture redesign, broad Concept rewrite, application
refactor, final external audit, commit, push, or staging was performed.

## 2. Starting branch and commit

| Item | Value |
|---|---|
| Branch | `main` |
| Starting HEAD | `b273bf3e22a50262d77c46b5061d140ed8c81229` |
| Remote relation | `main` was ahead of `origin/main` by one pre-existing commit |
| Repository | `sasanzare/OfflineWebArchiver` |

## 3. Pre-existing Git state

The initial `git status --short --untracked-files=all` output was empty. There
were no staged, modified, renamed, deleted, or untracked files before Phase 5.
The existing local build outputs and dependency directories were ignored by
the repository and were not treated as user changes. The pre-existing local
HEAD commit was preserved.

The task forbade staging. `git mv` was attempted but could not write
`.git/index.lock`; the tracked files were moved with explicit non-destructive
workspace moves instead. The final unstaged diff is rename-detectable once a
maintainer stages it in the normal commit workflow.

## 4. Previous phase status

- Phase 1 bundle separation is committed in `0c323a5` and its audit record is
  retained in `docs/okf-conformance/PHASE_01_BUNDLE_SEPARATION.md`.
- Phase 2 Concept normalization, Phase 3 strict validator hardening, and Phase
  4 conformance/CI contracts are present in the committed active reports and
  current validator/test surface. The latest local strict-validation commit
  is `b273bf3`; its focused and full baseline checks passed.
- The repository had no unexplained Phase 4 validation failure at the start of
  Phase 5. Hosted CI execution and branch protection remain unverified from
  local evidence and are not claimed as complete here.

## 5. Legacy inventory

| Inventory | Files | Formats | Initial disposition result |
|---|---:|---|---|
| `okf-bootstrap/` | 15 | 15 Markdown | All archived individually |
| `docs/okf-migration/` | 90 | 82 Markdown, 8 JSON schemas | All archived individually |
| Other legacy-looking files inspected | 3 | migration wrapper, extension report, official history record | Deprecated or retained with explicit reason |

The complete per-file ledger is
[`PHASE_05_LEGACY_DISPOSITION.csv`](PHASE_05_LEGACY_DISPOSITION.csv).

## 6. Classification methodology

Each legacy file was classified against operational use, active references,
historical evidence, duplication, generated-output risk, and safe removal. The
allowed dispositions were `KEEP_ACTIVE`, `ARCHIVE`, `DELETE`, `MERGE`,
`REPLACE_WITH_REDIRECT_NOTE`, and `DEFER`. Historical content was not rewritten
to make old claims appear current. The archive retains the original reports,
inventories, plans, schemas, and evidence; only README banners and narrow
navigation/clarification fixes were added.

The CSV uses `active_reference_count=0` after the cutover for the archived
legacy files. Historical reference counts are `unknown` where old path text is
deliberately retained inside historical records; this avoids presenting a
literal occurrence count as an operational dependency.

## 7. Files kept active

- `okf/` official Concepts, indexes, logs, and history remain active.
- `okf-extension/` manifest, registries, schemas, maps, evidence, and the
  historical extension report remain active extension inputs.
- `tools/okf/` layered validator sources remain active.
- `tests/okf/` validator and regression tests remain active.
- `docs/okf-conformance/` is the active documentation entry point.
- `okf/history/phase-02.md` remains active official historical content; its
  current archive path was corrected while its immutable historical source URL
  was preserved.

## 8. Files archived

All 15 files formerly under `okf-bootstrap/` moved to
`docs/archive/okf/bootstrap/`. All 90 files formerly under
`docs/okf-migration/` moved to `docs/archive/okf/migration/`. The moves
preserve the original file contents and Git comparison can detect them as
renames after staging.

## 9. Files deleted

No files were deleted. The two former source directories were empty after the
file moves and were removed as empty directory entries only. Git history and
the archive retain all file content.

## 10. Files merged

No historical report was merged or rewritten. Selected current guidance was
written into the new active maintainer documents; the original reports remain
in the archive as independent records.

## 11. Redirect notes created

No compatibility redirect files were created for the old directory names.
`tools/okf/migrate.mjs` remains as a `REPLACE_WITH_REDIRECT_NOTE` compatibility
command: it reports that migration is complete, performs no discovery or
repair, and exits 2. The archive README and root README provide the current
navigation instead of maintaining duplicate old paths.

## 12. Deferred files

None. The disposition of every file in the two required legacy roots was
determined. Hosted CI and branch protection are known external audit items,
not deferred file dispositions.

## 13. Old-to-new path mappings

- `okf-bootstrap/` → `docs/archive/okf/bootstrap/` (15 files).
- `docs/okf-migration/` → `docs/archive/okf/migration/` (90 files).
- Active extension `bootstrapHistory` and 18 historical decision `recordPath`
  values now point to `docs/archive/okf/bootstrap/...`.
- Active project documentation links and references now use the archive path.
- The Phase 1 `okf/extensions/` → `okf-extension/` mappings in
  `MIGRATION_MAP.md` were not modified; Phase 5 mappings were appended.

## 14. Active references corrected

The search covered `okf-bootstrap`, `docs/okf-migration`, `okf/extensions`,
`okf/manifest.json`, `okf/registry`, `okf/validation`, migration/bootstrap
command names, package scripts, tools, tests, docs, and workflows. Concrete
active dependencies were corrected in the extension manifest, extension
decision registry, current project/product docs, the official Phase 2 history
body, the strict-test fixture root list, and the migration wrapper.

No active code, workflow, package script, or current maintainer link depends on
the removed roots. Remaining matches are intentionally historical audit text,
immutable historical source URLs, Phase 1–4 reports, the archive itself, or
the contributor search checklist.

## 15. Historical references intentionally preserved

Historical migration reports retain their original paths, conclusions, test
counts, and timelines. `okf/history/phase-02.md` retains the immutable GitHub
permalink to the pre-archive commit. Phase 1–4 conformance reports, ADR-008,
and the historical extension migration report retain old-path examples with
superseded/ historical context. These references are not active configuration
or current maintenance instructions.

## 16. README changes

`README.md` now identifies Google OKF v0.2, the official `okf/` Bundle,
`okf-extension/`, `tools/okf/`, `tests/okf/`, and active maintainer docs. It
separates official conformance from OWA policy validation, lists current
commands, links the archive policy, and no longer presents migration closure
documents as the active entry point.

## 17. Maintainer-documentation changes

Created or finalized:

- `docs/okf-conformance/MAINTENANCE_GUIDE.md`
- `docs/okf-conformance/CURRENT_STRUCTURE.md`
- `docs/okf-conformance/CONTRIBUTING_OKF.md`
- `docs/archive/okf/README.md`
- `docs/okf-conformance/PHASE_05_LEGACY_CLEANUP_AND_DOCUMENTATION.md`
- `docs/okf-conformance/PHASE_05_LEGACY_DISPOSITION.csv`

Updated `VALIDATION_CONTRACT.md` with the narrow archive policy and updated
`MIGRATION_MAP.md` with the Phase 5 mappings. Archived bootstrap and migration
README files received non-authoritative banners and corrected navigation to
the active docs.

## 18. Package-script changes

No active validation script was removed. `okf:validate:*`, `test:okf`, and all
current repository scripts remain available. `okf:migrate` is explicitly
deprecated through its compatibility wrapper and no longer reads bootstrap or
migration paths. The final active command surface is documented in the
maintainer guide and `tools/okf/README.md`.

## 19. CI changes

`.github/workflows/okf-validation.yml` already referenced only active commands
and paths, so no workflow step was removed or weakened. The workflow still
runs independent official, reference, provenance, extension, quality, format,
combined, test, docs, formatting, lint, and typecheck gates. Archive handling
is implemented narrowly in `tools/docs/validate.mjs`, which reads archived
Markdown for readability but excludes only its historical relative links from
active link failure classification.

## 20. Documentation-validation policy

Active Markdown links and required artifacts remain fully validated. Markdown
under the single `docs/archive/okf/` root is read as UTF-8/readability input,
but historical relative links are not active failures because old paths are
part of the evidence being preserved. The policy is documented in
`VALIDATION_CONTRACT.md`, `MAINTENANCE_GUIDE.md`, and the archive README. No
active documentation root is excluded.

## 21. Commands executed and validation results

### Baseline before Phase 5 changes

| Command | Result |
|---|---|
| `npm run okf:validate:conformance` | PASS; 0 errors, 0 warnings |
| `npm run okf:validate:references` | PASS; 0 errors, 0 warnings |
| `npm run okf:validate:provenance` | PASS; 0 errors, 0 warnings |
| `npm run okf:validate:extension` | PASS; 0 errors, 0 warnings |
| `npm run okf:validate:quality` | PASS; 0 errors, 0 warnings |
| `npm run okf:validate:format` | PASS; 0 errors, 0 warnings |
| `npm run okf:validate` | PASS; all layers pass |
| `npm run test:okf` | PASS; 43 tests |
| `npm run docs:validate` | PASS; 124 required artifacts and 313 links |
| `npm run format:check` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test` | PASS; 125 tests |
| `npm run build` | PASS |

The first sandboxed full-test attempt hit `spawn EPERM` while starting
esbuild; the approved process-spawn rerun passed. This was an execution
environment constraint, not a repository failure.

### Phase 5 final checks

The final command results are recorded below after the final documentation and
reference audit:

| Command | Result |
|---|---|
| `npm run okf:validate:conformance` | PASS |
| `npm run okf:validate:references` | PASS |
| `npm run okf:validate:provenance` | PASS |
| `npm run okf:validate:extension` | PASS |
| `npm run okf:validate:quality` | PASS |
| `npm run okf:validate:format` | PASS |
| `npm run okf:validate` | PASS |
| `npm run test:okf` | PASS |
| `npm run okf:migrate -- --self-test` | EXPECTED DEPRECATED EXIT 2; no legacy-path access |
| `npm run docs:validate` | PASS; archive readability policy applied |
| `npm run format:check` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test` | PASS |
| `npm run build` | PASS |
| `git diff --check` | PASS |
| Explicit legacy-path, archive readability, duplicate-copy, active-link, and current-structure checks | PASS |

## 22. Remaining known issues

### Phase 5 blockers

None found in the scoped repository work.

### Final audit items

- A hosted `OKF Validation` run and GitHub branch-protection configuration were
  not observable locally; they remain unverified administrative controls.
- Final external conformance certification is intentionally out of scope for
  this cleanup phase.

### Optional future cleanup

- A future major cleanup may remove the deprecated `okf:migrate` compatibility
  command after downstream callers confirm they have moved to `okf:validate`.
- Historical archive links can be repaired selectively when a maintainer wants
  navigation improvements, but doing so is not required for active validation.

## 23. Final Git state

| Item | Final value |
|---|---|
| Branch | `main` |
| Ending HEAD | `b273bf3e22a50262d77c46b5061d140ed8c81229` |
| Starting HEAD changed | No |
| Pre-existing changes | None in the initial worktree; local branch was already one commit ahead of origin |
| Phase 5 changes | Unstaged archive moves, active documentation, reference updates, archive policy, validator docs policy, and focused test/wrapper updates |
| Staged state | Nothing staged |
| Commit | None |
| Push | None |
| Reset/rebase/stash | None |

## 24. Live knowledge changes

One file under the official Bundle changed: `okf/history/phase-02.md`. Only its
current archive path description was corrected; its historical source URL and
phase claims were preserved. Two extension data files changed because active
manifest/registry paths had to follow the archive move:
`okf-extension/manifest.json` and `okf-extension/registry/decisions.json`.
No Concept taxonomy, validator semantics, or application source was changed.

## Acceptance criteria

| Criterion | Result |
|---|---|
| Every `okf-bootstrap/` file individually classified | PASS |
| Every `docs/okf-migration/` file individually classified | PASS |
| Obsolete root bootstrap material archived or justified | PASS |
| Completed migration documents archived or explicitly retained | PASS |
| Active documentation has a clear authoritative entry point | PASS |
| Archived documentation is non-authoritative | PASS |
| Official Bundle and extension boundaries documented | PASS |
| Validation layer contract documented | PASS |
| Concept maintenance workflow documented | PASS |
| Provenance-update workflow documented | PASS |
| Extension contribution workflow documented | PASS |
| Active deprecated-path references removed | PASS |
| Historical references preserved with context | PASS |
| No active tooling depends on archived paths | PASS |
| No duplicate obsolete structure remains active | PASS |
| Useful historical evidence preserved | PASS |
| Deletions justified | PASS; no files deleted |
| Rename history preserved where possible | PASS; unstaged moves are diff-rename-detectable; staging was forbidden |
| Root README accurately describes current OKF implementation | PASS |
| CI uses active paths and commands | PASS |
| Archive policy documented | PASS |
| Disposition CSV covers every inspected legacy file | PASS |
| Phase 5 report complete | PASS |
| Official conformance passes | PASS |
| OWA reference integrity passes | PASS |
| OWA provenance policy passes | PASS |
| Extension validation passes | PASS |
| Quality and format checks pass | PASS |
| All OKF tests pass | PASS |
| Full repository checks pass | PASS |
| No broad Concept rewrite occurred | PASS |
| No unrelated application code modified | PASS |
| No commit or push occurred | PASS |
