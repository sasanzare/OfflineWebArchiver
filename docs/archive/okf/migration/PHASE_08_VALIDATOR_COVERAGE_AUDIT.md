# Phase 8 Validator Coverage Audit

Audit date: 2026-08-03

## Discovery reconciliation

| Measure | Count |
|---|---:|
| Artifacts on disk | 76 |
| Artifacts discovered | 76 |
| Artifacts validated by at least one layer | 76 |
| Intentionally ignored | 0 |
| Unknown | 0 |
| Official Concepts | 40 |
| Reserved files | 10 |
| Extension documentation | 15 |
| Manifest | 1 |
| Registries | 8 |
| Production schemas | 2 |

Discovery records symlinks as unsafe artifacts instead of following or silently skipping them. Paths are emitted with `/` separators on Windows and POSIX. Unknown Markdown, unknown non-Markdown, parent traversal, drive, UNC, root-absolute, and symlink cases have focused coverage.

## Diagnostic catalog

There are 45 active codes and zero duplicate or undocumented codes.

| Layer | Count | Active codes | Coverage |
|---|---:|---|---|
| Official | 12 | `OKF-OFFICIAL-001..008`, `010..013` | Every active code has a negative fixture |
| Policy | 26 | `OKF-POLICY-001..026` | Every active code has a negative fixture |
| Extension | 3 | `OKF-EXT-001..003` | Legacy error wrapping, symlink, and unknown artifact fixtures |
| Quality | 2 | `OKF-QUALITY-001..002` | Broken-link and unreachable-Concept fixtures |
| Format | 2 | `OKF-FORMAT-001..002` | Field-order and trailing-whitespace fixtures |
| Internal | 0 | None | Internal exceptions fail the command rather than masquerading as conformance diagnostics |

`OKF-OFFICIAL-009` is intentionally unassigned; it was never emitted and is reserved to avoid renumbering stable codes. Phase 8 supersedes the historical Phase 6 range summary with this catalog.

## YAML and schema coverage

Official frontmatter parsing uses the pinned `yaml` 2.9.0 YAML 1.2 parser with duplicate-key checking, strict parsing, string keys, and bounded alias expansion. It performs no execution. Repository producer policy separately rejects tabs, aliases, anchors, merge keys, and explicit tags. A valid alias fixture proves this layer separation.

Ten schemas parse, all ten `$id` values are unique, and all 28 `$ref` occurrences resolve or are approved external metaschema references. The set comprises two production extension schemas and eight design producer schemas. Procedural validation remains responsible for paths, reserved filenames, bodies, links, identifiers, evidence, relationships, and lifecycle rules that JSON Schema cannot establish alone.

## Test result

`npm run test:okf` executes 18 tests: 18 passed, 0 failed, 0 skipped. It covers valid and invalid frontmatter, YAML safety separation, official/policy separation, CLI payload shape, deterministic ordering, exit codes, paths, links, reachability, artifact classification, production discovery, extension error mapping, and production validation.
