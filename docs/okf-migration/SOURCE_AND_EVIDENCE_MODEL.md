# Source and Evidence Model

## Official Source Structure

`sources` is a non-empty list when present. Every entry contains `resource`; `id`, `title`, `author`, `usage_count`, `last_modified`, and entry-level `usage_window` are optional official fields. A shared top-level `usage_window` may frame all usage counts.

```yaml
sources:
  - id: queue-state-adr
    resource: docs/project/adr/ADR-025-job-state-machine.md
    title: Persistent queue state-machine decision
    last_modified: "2026-07-31"
```

`id` is required by repository policy when a body footnote uses the source. IDs are unique within one Concept, lowercase kebab-case, and stable across reordering.

## Portable Resource Forms

| Source kind | `resource` form | Example | Additional detail |
|---|---|---|---|
| Repository document/source/test | Repository-relative path with `/` | `packages/queue/src/index.ts` | Symbol/line details in body or anchor when stable |
| Bundle Concept | Bundle-root or relative path | `/workflow/queue.md` | This is also a graph edge |
| Reference asset | Relative/reference path | `../references/sqlite-durability.md` | Reference convention, not requirement |
| External public source | Absolute `https` URL | `https://www.sqlite.org/wal.html` | Prefer durable canonical page |
| GitHub source at revision | HTTPS blob URL with full commit | `https://github.com/example/repo/blob/0123456789abcdef/path/file.ts` | Commit gives immutability |
| Issue/commit | Canonical HTTPS URL | `https://github.com/example/repo/issues/123` | Do not use UI-local shorthand as sole identifier |
| Scope descriptor | Plain descriptive string | `all Phase 8 browser integration tests` | Allowed officially but repository prefers a concrete report/path |

Forbidden canonical resources include drive-letter paths, UNC paths, `file:` URIs, home-relative paths, environment variables, secrets, authenticated URLs, expiring signed URLs, and paths with traversal outside the intended root.

## Code Symbols, Lines, Anchors, and Commits

Portable repository paths stay in `resource`. A stable Markdown anchor or URL fragment may be included. Volatile line numbers and source symbols are described in the body or evidence registry unless a durable URL/anchor exists. Commit hashes belong in immutable external Git URLs or derived validation reports, not in every living Concept source path.

## Source Ordering and Removal

Order sources by claim relevance, then stable `id`/resource; do not use position as identity. Merge exact duplicate resources unless entries represent different measured windows. Removing a source requires removing its footnote join and confirming remaining provenance still supports the claims. Broken external or repository sources do not invalidate official conformance, but repository validation reports `ERROR` for missing internal paths and `WARNING` for unreachable external URLs when a network check is explicitly run.

## Evidence Registry Integration

The authored extension evidence registry remains authoritative for evidence IDs, paths, methods, and project traceability. Official `sources` provides portable reader-facing provenance. `owa.evidence_ids` bridges selected Concepts to registry entries. They are complementary:

```text
Concept claim and readable source
        |
        +--> sources[] (official portable provenance)
        |
        +--> owa.evidence_ids (project identity bridge)
                    |
                    v
        authored evidence registry -> generated coverage report
```

Do not copy method, test outcome, requirement mapping, path-safety state, or all 54 registry records into frontmatter. A Concept remains understandable when `owa` is ignored. Generated evidence reports never become source authority.

## Test, Build, Phase, and Decision Evidence

- Test/source/build evidence uses a concrete repository-relative path in `sources[].resource`; command/method lives in the body or evidence registry.
- A phase report can be a source for historical facts, but a living technical claim should cite current source/ADR/test authority too.
- ADRs/decision records use their repository path and a source title; `owa.decision_ids` preserves project identity.
- Product requirements use the product authority path plus `owa.requirement_ids`; acceptance IDs remain extension traceability.
- Private/inaccessible sources may be referenced only with a non-secret stable identifier and an access limitation in the body. Never embed credentials or local filesystem paths.

## Per-Claim Attribution

Use Markdown footnotes whose label equals `sources[].id`. The prose surrounding normal Markdown links conveys relationship type. Do not duplicate the same relationship in an official frontmatter graph. Project-only typed relationships that cannot be recovered from prose may remain authored extension annotations and generated registry edges.

## Normalizing Current Evidence Paths

Current evidence paths are already repository-relative. Migration converts `\` to `/`, rejects absolute/traversal paths, preserves exact case, verifies existence at cutover, and either uses the path as `sources[].resource` or keeps it solely in the evidence registry when it is too detailed for Concept-level provenance. Evidence IDs retain exact current spelling in `owa.evidence_ids`.

## Validation Layer

- Missing `sources[].resource`, malformed structure, duplicate source ID, unmatched footnote ID, forbidden local path, or missing required sources: repository `ERROR`.
- Unknown optional source key: official pass; repository producer `ERROR` because source records are closed in this contract.
- Broken internal source: repository `ERROR`; broken external source: quality `WARNING` unless an explicit offline policy says no check.
- Absent optional credibility signals: no error.
- Usage count without a valid shared/entry window: repository `ERROR`.
