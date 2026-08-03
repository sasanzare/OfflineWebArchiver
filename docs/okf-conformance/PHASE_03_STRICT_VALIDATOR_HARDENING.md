# Phase 3 — Strict OKF Validator Hardening

## Phase status

`COMPLETE`. No commit, push, stage, branch change, reset, rebase, stash, or discard was performed.

## Objective and specification basis

This phase rebuilds the validation boundary between the official Google Open Knowledge Format bundle (`okf/`) and the OfflineWebArchiver extension layer (`okf-extension/`). The authoritative source is [GoogleCloudPlatform/knowledge-catalog `okf/SPEC.md`](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md), revision `3fcbb9f828c2f23d109c855ee403c3a4c81f3a96` ([upstream revision](https://github.com/GoogleCloudPlatform/knowledge-catalog/commit/3fcbb9f828c2f23d109c855ee403c3a4c81f3a96)). The current upstream document remains OKF v0.2 at that revision.

Official blocking rules are limited to the v0.2 conformance requirements: every non-reserved Markdown file has parseable top-level YAML and a non-empty string `type`; `index.md` and `log.md` use their reserved structures; the root index may carry only `okf_version: "0.2"`; and an `Attested Computation` declares its required `runtime`. Unknown types, unknown frontmatter keys, missing optional metadata, missing directory indexes, and broken cross-links are not converted into official conformance errors.

Reference checks are an independent official-support layer. They validate source URI/path syntax, local target safety/existence, immutable GitHub permalink shape, and Markdown link targets. Broken cross-links emit `OKF-LINK-BROKEN` as a warning by default because OKF v0.2 explicitly requires consumers to tolerate them; `--strict-warnings` makes that warning blocking. Remote existence is never required by default.

OWA taxonomy, title/H1, required project metadata, source ID conventions, `owa` shape, reachability, manifest, registry, evidence, authority, and traceability checks remain project-specific. They are emitted under `quality`, `format`, or `extension`, never as official Google OKF rules.

## Starting state and inventory

- Branch: `main`
- Starting and current baseline commit: `0c323a593dbec974676dc3233dcee8b442150c43`
- `origin/main` was synchronized with that commit.
- Phase 1 is committed in the starting commit. Phase 2 remained uncommitted and was preserved as pre-existing working-tree state.
- Independent official inventory at the start: 50 Markdown files, 40 Concepts, 9 directory indexes, 1 root index, and 0 logs.
- Independent extension inventory at the start: 26 files, including 15 Markdown and 11 JSON files.
- Pre-existing Phase 2 state: 41 modified official Markdown files and two untracked Phase 2 conformance reports. No staged files, deletions, renames, or unrelated changes were present.

## Previous architecture and false-positive mechanisms

The previous top-level validator combined official discovery, OWA policy, quality, format, artifact safety, and the extension validator into one report. Its main false-positive or false-negative mechanisms were:

1. Discovery classified a Markdown file as an unknown artifact when it lacked frontmatter. That allowed a historical/custom classification path to avoid the Concept frontmatter rule.
2. Special content such as `Transitional Legacy Artifact` could change discovery classification.
3. The active orchestrator imported the legacy extension validator and wrapped all of its string errors as one generic extension diagnostic.
4. Official validation did not produce a structured diagnostic for a missing root index or missing `okf/` root.
5. Non-Markdown artifacts and filesystem links were routed through extension artifact safety rather than official bundle structure.
6. Source portability policy rejected every absolute URL, including valid official HTTPS sources and immutable GitHub permalinks.
7. Source existence, link reachability, and project quality preferences were mixed with official semantics.
8. JSON output represented one aggregate result without explicit layer summaries.
9. Unexpected exceptions were not converted into a clear non-zero internal diagnostic at the CLI boundary.

The corrections are recorded individually in [PHASE_03_FALSE_POSITIVE_REGRESSIONS.md](PHASE_03_FALSE_POSITIVE_REGRESSIONS.md).

## Validator architecture

### Official OKF Structure

`tools/okf/discovery.mjs` recursively scans only `okf/`. Every `.md` file is classified by exact reserved filename (`index.md` or `log.md`) or as a Concept; arbitrary directory names and legacy phrases do not create exemptions. Discovery also detects missing roots/indexes, case-insensitive collisions, `.md` directories, unreadable/binary Markdown, non-Markdown artifacts, and symlink/junction boundaries.

`tools/okf/official.mjs` validates Concept frontmatter/type, root and directory indexes, logs, and the official filesystem boundary. Unknown Concept types and extension fields are accepted.

### Official OKF References

`tools/okf/references.mjs` is separate from structural parsing. It validates `sources[].resource` and the other official path-valued resource fields, distinguishes scope descriptors from paths, resolves bundle-relative and file-relative paths safely, rejects outside-bundle traversal and absolute filesystem paths, checks regular-file targets, parses URL syntax, and reports source status without claiming remote verification.

GitHub blob URLs are checked structurally as `https://github.com/{owner}/{repository}/blob/{full-commit-sha}/{path}`. Same-repository sources use Git where the runtime permits it (`git remote`, `git cat-file`, and `git ls-tree`). The status is explicitly one of `locally-verified`, `path-not-found-locally`, `commit-not-present-locally`, `local-check-unavailable`, `not-local-repository`, or `syntactically-valid-not-checked`. In this Windows sandbox, Node child-process spawning may return `EPERM`; that state is reported as `local-check-unavailable`, not as local verification.

The default mode never performs network requests. `--remote` enables bounded HTTP(S) HEAD checks with a five-second timeout, redirect following, and explicit 404/auth/rate-limit/timeout/network outcomes. It is not used by standard CI.

### OWA Extension Layer

`tools/okf/extension.mjs` validates only `okf-extension/`. It validates the manifest shape and schema reference, all extension JSON files, the eight registries, schema references, project statuses, global IDs, authority mappings, repository paths, evidence references/orphans, relationships, phase/change records, critical requirement mappings, canonical artifacts, and extension Markdown links. Extension Markdown is never counted as an official Concept.

The historical `okf/extensions/`, `okf/manifest.json`, `okf/registry/`, and `okf/validation/` locations are not used by active validator code. Historical migration reports may mention them as migration evidence.

### OWA Quality

`tools/okf/policy.mjs` retains repository-specific taxonomy, metadata, H1/title, producer-safe YAML, source ID, `owa`, lifecycle, and reachability checks under the `quality` layer. Formatting checks remain under `format`. These checks remain available without being mislabeled as official OKF conformance.

### Orchestrator

`tools/okf/validate-all.mjs` runs each requested layer independently and preserves layer identity. A filtered official run does not inspect the extension root. Layer failures and unexpected exceptions are structured and sorted deterministically.

## Diagnostics, CLI, and exit behavior

Diagnostics contain `layer`, `severity`, `ruleId`/`code`, `file`, optional line/column, message, and optional correction/detail fields. Severities are `error`, `warning`, and `info`. Rule families are `OKF-STRUCT-*`, `OKF-FRONTMATTER-*`, `OKF-TYPE-*`, `OKF-INDEX-*`, `OKF-LOG-*`, `OKF-SOURCE-*`, `OKF-LINK-*`, `OWA-EXT-*`, `OWA-QUALITY-*`, `OWA-FORMAT-*`, and `OKF-INTERNAL-*`.

- `0`: selected validation has no errors; warnings are allowed unless strict warnings are enabled.
- `1`: selected validation has an error, or `--strict-warnings` is enabled and a warning exists.
- `2`: invalid command-line syntax or unknown layer/option.
- Unexpected exceptions produce `OKF-INTERNAL-UNEXPECTED-EXCEPTION` and exit `1`; they are never hidden behind success output.

Commands:

```text
npm run okf:validate
npm run okf:validate:official
npm run okf:validate:references
npm run okf:validate:extension
npm run okf:validate:extensions       # compatibility alias
npm run okf:validate:quality
npm run okf:validate:format
npm run okf:validate:remote
npm run okf:validate:json
node tools/okf/cli.mjs validate --strict-warnings
node tools/okf/cli.mjs validate --help
```

Human output names each layer (`Official OKF Structure`, `Official OKF References`, `OWA Extension Layer`, `OWA Quality`, and `OWA Formatting`) and reports an overall result. JSON output is one machine-readable document with layer summaries, artifacts, reference statuses, diagnostics, counts, and exit code. The previous vague `CONFORMANT` label is not used.

## Fixtures and tests

The static base fixture is `tests/okf/fixtures/official-valid/` and contains a root index, a directory index, one Concept with unknown metadata, and a valid reserved log. Tests copy it into isolated temporary directories and never mutate the live bundle. Extension tests copy the current extension and only the repository slices needed for path/authority checks.

Positive coverage includes the current official bundle, the minimal valid bundle, unknown fields/types, reserved indexes/logs, current immutable source references, external URL syntax, current extension data, combined validation, JSON output, warning-only behavior, and official-only independence.

Negative and regression coverage includes all 16 required scenarios: missing frontmatter, malformed YAML, missing/empty type, invalid/missing root index, arbitrary nested Markdown, copied extension documentation, broken local source, traversal source, invalid GitHub permalink, mutable branch URL, broken internal link, invalid manifest, removed registry path, and injected unexpected exception. Each focused test asserts its diagnostic rule, not merely exit code.

## CI integration

`.github/workflows/okf-validation.yml` now runs official structure, official references, OWA extension, OWA quality, formatting, and OKF unit/regression tests as separately named steps. Documentation, lint, and typecheck gates remain. Standard CI does not require remote URL checks. The JSON conformance artifact is still uploaded after the validation steps.

## Files changed in Phase 3

Created:

- `tools/okf/paths.mjs`
- `tools/okf/references.mjs`
- `tools/okf/extension.mjs`
- `tests/okf/strict-validator.test.ts`
- `tests/okf/fixtures/official-valid/index.md`
- `tests/okf/fixtures/official-valid/concept.md`
- `tests/okf/fixtures/official-valid/area/index.md`
- `tests/okf/fixtures/official-valid/log.md`
- `docs/okf-conformance/PHASE_03_STRICT_VALIDATOR_HARDENING.md`
- `docs/okf-conformance/PHASE_03_RULE_MATRIX.csv`
- `docs/okf-conformance/PHASE_03_FALSE_POSITIVE_REGRESSIONS.md`

Modified:

- `tools/okf/diagnostics.mjs` — structured diagnostic model and deterministic sort.
- `tools/okf/frontmatter.mjs` — strict top-of-file block extraction and duplicate-key parsing.
- `tools/okf/discovery.mjs` — exhaustive official discovery and filesystem safety classification.
- `tools/okf/official.mjs` — strict official structural rules.
- `tools/okf/policy.mjs` — OWA quality/format separation and URL-compatible policy.
- `tools/okf/validate-all.mjs` — layer-isolated orchestrator and exception boundary.
- `tools/okf/validate.mjs` — compatibility adapter for the migration command, delegating to the extension validator.
- `tools/okf/cli.mjs` — layer-aware human/JSON CLI, remote policy, strict warnings, and exit codes.
- `tools/okf/README.md` — current layer and command documentation.
- `tests/okf/layered-validator.test.ts` — updated assertions for the new diagnostic contract.
- `package.json` — separate validation scripts and strict test inclusion.
- `.github/workflows/okf-validation.yml` — separate deterministic CI steps.

No live official Concept, extension document, application source, database file, or runtime architecture file was intentionally changed in Phase 3.

## Commands and validation results

Baseline before edits:

- `npm run okf:validate` — PASS with the previous aggregate validator.
- `npm run test:okf` — PASS, 18 tests before the Phase 3 test expansion.

Final Phase 3 checks:

- `npm run okf:validate:official` — PASS; official structure only.
- `npm run okf:validate:references` — PASS; official references only.
- `npm run okf:validate:extension` — PASS; OWA extension only.
- `npm run okf:validate:extensions` — compatibility alias retained.
- `npm run okf:validate:quality` — PASS; OWA quality only.
- `npm run okf:validate:format` — PASS.
- `npm run okf:validate` — PASS; all named layers and internal-error layer PASS.
- `npm run okf:validate:json` — PASS; valid JSON, 50 artifacts, 81 reference checks, 0 diagnostics.
- `npm run test:okf` — PASS; 29 tests, 29 passed.
- Positive, negative, and regression fixture checks — PASS within the 29 OKF tests; all 16 required negative scenarios assert their expected rule IDs.
- `npm run format:check` — PASS.
- `npm run lint` — PASS.
- `npm run typecheck` — PASS.
- `npm run docs:validate` — PASS; 124 required artifacts and 316 relative links.
- `npm run test` — PASS; 111 tests, 111 passed, 0 failed.
- `npm run build` — PASS; desktop main/preload/renderer and production workspace build.
- `git diff --check HEAD` — PASS (exit code 0). Git emitted only existing LF-to-CRLF conversion warnings; no whitespace errors.
- Active-validator legacy-path scan — PASS; no old extension paths, exemption markers, or `CONFORMANT` label in active tools/tests/package/CI.

The first default-sandbox `npm run test` attempt returned esbuild `spawn EPERM`. The unchanged command passed when rerun with the required execution permission. Default validation remains network-free; optional `npm run okf:validate:remote` was intentionally not used in standard validation.

## Known limitations and deferred work

- Local Git verification depends on the runtime being allowed to spawn Git. When unavailable, the validator reports `local-check-unavailable` and does not claim local verification.
- Default source validation does not contact external servers. Remote checks are optional and bounded.
- Broken Markdown cross-links remain non-blocking warnings by default because that is the official OKF v0.2 consumer rule.
- The extension schema remains a project contract; it is not part of official Google OKF conformance.
- Phase 4 or later may improve remote checks, richer Markdown parsing/anchors, schema validation depth, and CI artifact presentation.
- Deferred work includes taxonomy redesign, broad Concept rewriting, legacy cleanup, final certification, unrelated refactoring, and application security work.

## Final Git state

- Branch: `main`
- Starting commit: `0c323a593dbec974676dc3233dcee8b442150c43`
- Ending commit: `0c323a593dbec974676dc3233dcee8b442150c43`
- `origin/main` remains synchronized.
- Pre-existing Phase 2 state remains intact: 41 modified official Markdown files plus the two Phase 2 reports.
- Phase 3 added/modified only validator tools, OKF tests/fixtures, package scripts, the OKF workflow, and three Phase 3 reports. No live `okf/**/*.md` or `okf-extension/**/*.md` document was changed by Phase 3.
- Current working tree has 53 modified files (41 pre-existing official files plus 12 Phase 3 tracked files) and 13 untracked files (2 Phase 2 reports plus 11 Phase 3 files). The untracked fixture directory is intentionally inside `tests/okf/fixtures/`.
- Staged files: none.
- Commit/push: none.
- Reset/rebase/stash/discard: none.

## Acceptance criteria

| Criterion | Result |
|---|---|
| Official and extension validation are logically separated | PASS |
| Official validation scans every Markdown file under `okf/` | PASS |
| No arbitrary directory name can exempt official Markdown | PASS |
| Reserved indexes are distinguished from Concepts | PASS |
| Every Concept requires valid frontmatter and non-empty `type` | PASS |
| Invalid YAML is rejected | PASS |
| Missing root index is rejected | PASS |
| Invalid root index is rejected | PASS |
| Broken local sources are rejected | PASS |
| Unsafe path traversal is rejected | PASS |
| Immutable GitHub permalink syntax is validated | PASS |
| Mutable branch URLs are not reported as immutable | PASS |
| Remote existence status is distinguished from syntax validation | PASS |
| Default validation does not depend on uncontrolled network access | PASS |
| Extension Markdown is not counted as official Concepts | PASS |
| Extension JSON and schemas are validated separately | PASS |
| Errors, warnings, and informational diagnostics are distinguishable | PASS |
| Errors produce non-zero exit status | PASS |
| Unexpected internal exceptions produce non-zero exit status | PASS |
| Positive, negative, and regression tests exist | PASS |
| Every required false-positive scenario has a focused automated test | PASS |
| Existing useful quality checks remain under the correct layer | PASS |
| CI runs deterministic validation layers separately | PASS |
| Current official bundle passes strict validation | PASS |
| Current extension root passes extension validation | PASS |
| No broad Concept rewrite occurred | PASS |
| No unrelated application code was modified | PASS |
| All required repository checks pass | PASS |
| No commit, push, reset, stash, or rebase occurred | PASS |
| Phase 3 reports are complete and truthful | PASS |
