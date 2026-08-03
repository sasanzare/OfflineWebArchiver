# Phase 4 — Correct OKF Conformance Semantics and Harden CI Contracts

## Phase objective

Phase 4 separates normative Google OKF v0.2 conformance from OfflineWebArchiver reference integrity, provenance, extension, quality, and format policy. It corrects the Phase 3 treatment of optional reserved files, makes broken links soft for official conformance, prevents scope descriptors from becoming guessed filesystem paths, and gives every validation layer stable diagnostics, exit codes, JSON output, regression tests, and CI visibility.

No live Concept, extension document, application source, or historical migration document was broadly rewritten.

## Starting branch, commit, and Git state

- Branch: main
- Starting HEAD: eb0e5ea1d0675721ed9f0e2c479e2a204cf48c2a
- The requested prompt example expected 0c323a593dbec974676dc3233dcee8b442150c43, but the actual repository already contained the Phase 3 commit eb0e5ea.
- Phase 2 and Phase 3 work is committed in the existing history; the starting worktree had no staged, modified, deleted, renamed, or untracked files.
- No commit, push, stage, branch change, reset, rebase, stash, or discard was performed by Phase 4.

## Normative baseline

The validator uses OKF v0.2, specification revision 3fcbb9f828c2f23d109c855ee403c3a4c81f3a96. The implementation crosswalk is in PHASE_04_NORMATIVE_RULE_CROSSWALK.csv.

Relevant sections are:

- §3 and §3.1: a bundle is a Markdown directory tree and index.md/log.md are reserved filenames.
- §4.1: type is the only always-required Concept key; unknown types and additional producer keys must be tolerated.
- §5.1: sources[].resource is required within an entry, but may be a concrete artifact or a population/scope descriptor.
- §6.1: broken concept links must be tolerated.
- §6.2: path-valued fields accept URLs, bundle-relative paths, and relative paths.
- §8: index.md may appear at any directory level, including the root, and is optional; only a root okf_version declaration may use index frontmatter.
- §9: log.md may appear at any level and is optional; present logs use ISO date headings.
- §11: the three structural conformance rules apply to present files; optional metadata, unknown types/keys, broken links, and missing indexes are soft.
- §12: a root index may declare OKF version 0.2.

## Incorrect Phase 3 assumptions discovered

Phase 3 synthesized an official missing-root-index error, treated full-SHA GitHub provenance as an OKF reference requirement, returned source existence and link failures under OKF rule IDs, and did not provide an independent provenance layer. Its source heuristic rejected whitespace-bearing scope descriptors and attempted to resolve arbitrary path-like strings. The CLI also lacked a provenance command, a dedicated conformance name, the requested JSON contract, and exit code 3 for internal failures.

## Specification corrections

### Root and directory indexes

The root index is optional. A missing root index is valid, an existing valid root index is valid, and an existing malformed root index is invalid. Directory indexes are also optional. Existing directory indexes are validated as reserved files, are never Concepts, and do not require descriptions for every entry.

### Logs

Logs are optional at every level. A present log must not use Concept frontmatter and must contain ISO 8601 date headings. No live log was added to satisfy a test.

### Links and source existence

Broken normal Markdown links produce OWA-REF-LINK-BROKEN with warning severity by default. Official conformance does not inspect link existence. Local reference absence, traversal, unsafe links, and malformed reference syntax belong to OWA Reference Integrity. HTTP availability, GitHub API access, authentication, rate limits, and remote resource existence are never prerequisites for official conformance.

### Source classification

The reference layer classifies values as absolute URLs, recognized GitHub blob permalinks, bundle-relative paths, relative paths, local absolute paths, or scope descriptors. Scope descriptors with natural-language whitespace are retained as scope descriptors and are not resolved. A path is resolved only after classification and only within the official bundle boundary.

Reference check status data distinguishes local-target-verified, remote-target-verified, remote-target-not-checked, reference-target-missing, reference-target-unsafe, local-absolute-path, and scope-descriptor. Provenance check status data separately records OWA policy violations and local verification availability.

### Official versus OWA policy

Official conformance validates present Markdown and reserved-file structure only. OWA provenance enforces HTTPS GitHub blob URLs pinned to full commit SHAs for current concrete sources, rejects mutable refs and developer-local absolute paths, and verifies same-repository commit/path pairs when Git is available. A branch URL can therefore be valid official URL syntax and an OWA provenance violation at the same time.

## Validation layers and CLI contract

| Command | Layer | Responsibility |
|---|---|---|
| npm run okf:validate:conformance | Official OKF v0.2 Conformance | Present-file structure, frontmatter, type, indexes, logs, UTF-8 |
| npm run okf:validate:references | OWA Reference Integrity | Local links/paths, traversal, reference syntax and statuses |
| npm run okf:validate:provenance | OWA Provenance Policy | Immutable GitHub source policy and optional local commit/path verification |
| npm run okf:validate:extension | OWA Extension Validation | Only okf-extension/ |
| npm run okf:validate:quality | OWA Quality Validation | Project taxonomy, metadata, reachability, and quality rules |
| npm run okf:validate:format | OWA Format Validation | Project formatting conventions |
| npm run okf:validate | Combined Repository Policy | Runs all configured layers and preserves each result |
| npm run okf:validate:remote | Optional remote mode | Bounded remote checks; not required by standard CI |
| npm run test:okf | OKF tests | Unit, regression, fixture, isolation, and CLI contract tests |

The historical okf:validate:official and okf:validate:extensions names remain compatibility aliases. The direct CLI accepts --layer conformance as an alias for official, --warnings-as-errors, --remote, and --format human|json.

## Diagnostic and exit-code contract

Every diagnostic contains layer, rule ID, severity, path, message, and optional line, column, remediation, and structured data. Stable prefixes are OKF-CONFORMANCE-, OWA-REF-, OWA-PROVENANCE-, OWA-EXT-, OWA-QUALITY-, OWA-FORMAT-, and INTERNAL-.

- 0: requested validation completed without errors; warnings alone pass.
- 1: a requested layer has an error, or warnings-as-errors is enabled and a warning exists.
- 2: invalid CLI usage or configuration.
- 3: unexpected internal validator failure.

Each standalone command calculates its result from only that layer, plus an internal failure if one occurs. The combined command may fail for mandatory OWA layers, but it never changes a passing Official OKF v0.2 Conformance result into an official failure.

## Fixtures and regression tests

The fixture tree now includes focused conformance-valid, conformance-invalid, references, provenance, extension, and quality cases. Tests copy fixtures into isolated temporary directories, do not mutate okf/, use no required network, and assert stable rule IDs for negative cases.

Coverage includes optional root/directory indexes and logs; malformed present reserved files; unknown type/field and missing metadata tolerance; broken-link warnings; warning-as-error behavior; URL/provenance classification; same-repository missing commit/path statuses; source path versus scope classification; traversal and developer-local paths; layer isolation; machine-readable output; and optional remote timeout/rate-limit handling.

## CI and network policy

The workflow runs named conformance, reference, provenance, extension, quality, format, combined-policy, OKF test, documentation, formatting, lint, and typecheck steps. Validator-focused checks run on ubuntu-latest and windows-latest. The default matrix never enables remote validation. A separate optional-remote job runs only for manual dispatch or the scheduled workflow.

Every matrix run emits a JSON report artifact. Reports contain relative paths only and include schema_version, specification_version, specification_revision, requested_layers, layer_results, diagnostics, counts, exit_code, network_mode, generated_at, reference_checks, and provenance_checks. Snapshot tests should normalize generated_at.

## Files created

- docs/okf-conformance/PHASE_04_CONFORMANCE_CONTRACT_AND_CI_HARDENING.md
- docs/okf-conformance/PHASE_04_NORMATIVE_RULE_CROSSWALK.csv
- docs/okf-conformance/VALIDATION_CONTRACT.md
- tools/okf/provenance.mjs
- tests/okf/fixtures/conformance-valid/
- tests/okf/fixtures/conformance-invalid/
- tests/okf/fixtures/references/
- tests/okf/fixtures/provenance/
- tests/okf/fixtures/extension/
- tests/okf/fixtures/quality/

## Files modified

- tools/okf/diagnostics.mjs — stable layer aliases, path/remediation fields, and provenance layer.
- tools/okf/discovery.mjs — no synthesized missing-root-index artifact.
- tools/okf/official.mjs — OKF-CONFORMANCE diagnostics, optional indexes/logs, and present-index validation.
- tools/okf/references.mjs — OWA reference IDs and scope-aware classification.
- tools/okf/validate-all.mjs — independent provenance orchestration and report data.
- tools/okf/cli.mjs — layer names, JSON schema, warnings-as-errors, and exit code 3.
- tools/okf/README.md — active validator commands and ownership contract.
- package.json — conformance and provenance scripts.
- tests/okf/layered-validator.test.ts — new layer/result contract assertions.
- tests/okf/strict-validator.test.ts — Phase 4 regression, classification, isolation, and CLI tests.
- .github/workflows/okf-validation.yml — named cross-platform layer steps and optional remote job.
- tools/docs/validate.mjs — excludes intentionally invalid isolated OKF fixtures from production documentation-link validation.
- docs/okf-conformance/PHASE_03_STRICT_VALIDATOR_HARDENING.md — historical erratum only.
- docs/okf-conformance/PHASE_03_RULE_MATRIX.csv — superseded historical rows marked.

## Live knowledge changes

No official Concept or extension document changed. No application code changed.

## Commands executed

Baseline: git branch --show-current; git rev-parse HEAD; git status --porcelain=v1 --untracked-files=all; git log; all existing Phase 3 OKF commands; node syntax checks; and npm run test:okf.

Phase 4 focused checks: npm run okf:validate:conformance; npm run okf:validate:references; npm run okf:validate:provenance; npm run okf:validate; node tools/okf/cli.mjs validate --format json; npm run test:okf.

Final validation completed on Windows: npm run test (125/125), npm run build, npm run lint, npm run typecheck, npm run docs:validate (124 required artifacts and 313 relative links), npm run format:check, npm run test:okf (43/43), and npm run okf:validate (all configured layers pass). Linux execution remains represented by the CI matrix.

## Remaining limitations

- Same-repository Git verification reports local-target-not-checked when the runtime cannot spawn Git; it never claims verification in that state.
- Remote checks remain optional and bounded. They are not a default or pull-request requirement.
- Markdown anchor validation remains limited to deterministic link-target handling.
- Linux execution is represented in CI; local execution in this Windows workspace cannot produce a Linux result.
- Legacy archive cleanup, final certification, broad taxonomy redesign, and Concept rewriting remain out of scope.

## Final Git state

Phase 4 changes remain unstaged in the worktree. HEAD remains eb0e5ea1d0675721ed9f0e2c479e2a204cf48c2a. No commit, push, stage, branch change, reset, rebase, stash, or discard was performed.
