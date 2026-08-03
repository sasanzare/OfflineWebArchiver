# Official Google OKF v0.2 Requirements

## Source and Interpretation Boundary

This summary is derived from the official [OKF v0.2 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md), especially sections 3 through 12. It distinguishes normative requirements from recommendations and does not add repository policy.

## Mandatory Conformance Requirements

| ID | Requirement | Official source |
|---|---|---|
| OKF-REQ-001 | A bundle is a directory tree of Markdown files. | SPEC §3 |
| OKF-REQ-002 | Every non-reserved `.md` file must have parseable YAML frontmatter. | SPEC §4.1, §11 |
| OKF-REQ-003 | Every concept frontmatter block must have a non-empty `type`. | SPEC §4.1, §11 |
| OKF-REQ-004 | Reserved filenames must follow their defined structure when present. | SPEC §3.1, §8, §9, §11 |
| OKF-REQ-005 | `generated.by` and every `verified[].by`, when used, follow actor conventions. | SPEC §5.2, §7 |
| OKF-REQ-006 | `sources[].resource`, when `sources` is used, is required within each source entry. | SPEC §5.1 |
| OKF-REQ-007 | An `Attested Computation` must declare `runtime` when that type is used. | SPEC §10.2 |

## Reserved File Rules

- `index.md` and `log.md` are reserved at every directory level and must not be used as concept documents.
- `index.md` is optional, normally contains no frontmatter, and lists directory contents for progressive disclosure. Only a bundle-root `index.md` may have frontmatter, limited to an `okf_version` declaration.
- `log.md` is optional. Its date headings must use `YYYY-MM-DD`; entries are newest-first prose.
- Missing indexes, broken concept links, missing optional metadata, unknown types, and unknown extension keys must not cause a consumer to reject a bundle.

## Recommended Metadata

`title`, `description`, `resource`, and `tags` are recommended for concepts. `status`, `generated`, `verified`, `sources`, and `stale_after` are optional metadata families with defined semantics when present.

## Optional Metadata

- `status`: `draft`, `stable`, or `deprecated`; absent means `stable`.
- `generated`: `by` is required within the object; `at` records meaningful content change time.
- `verified`: one mapping or a list of `{ by, at }` events; a bare mapping is treated as a one-element list.
- `sources`: each source has required `resource`; `id`, `title`, `author`, `usage_count`, and `last_modified` are optional.
- `stale_after`: absolute `YYYY-MM-DD` date.

## Extension Behavior

Producers may include arbitrary extra frontmatter keys. Consumers must preserve unknown keys when round-tripping and must not reject unknown fields or unknown `type` values. This permits OfflineWebArchiver-specific metadata without falsely placing it in official lifecycle fields.

## Markdown Links and Progressive Disclosure

Concept relationships use ordinary Markdown links. Bundle-relative links beginning with `/` are recommended; relative links are also supported. Broken links are tolerated. `index.md` enables progressive disclosure by listing a directory's immediate contents.

## Quality Recommendations

Use UTF-8 Markdown, structural body sections, concise descriptions in indexes, stable source IDs when body footnotes attribute claims, and an explicit actor convention: `<producer>/<version>`, `human:<id>`, or `process:<id>`.

## Phase 3 Interpretation Freeze

Phase 3 rechecked the current official specification and freezes these distinctions:

- `type` is the only always-required Concept key; OfflineWebArchiver's additional title/description/status requirements are repository policy.
- Official consumers must tolerate unknown non-empty types, unknown extra keys, missing optional families, broken links, and missing indexes. The closed proposed producer schema is not an official conformance schema.
- `status` absence means `stable`; repository producers nevertheless write it explicitly to avoid unsafe migration defaults.
- `generated.by` is required when `generated` appears. Repository policy additionally requires `generated.at` and UTC canonical form.
- `verified` may officially be one mapping or a list; repository output uses a list while consumers accept both.
- `stale_after` is an absolute date, stale on or after that day, never a relative duration.
- Shared/entry `usage_window` frames source `usage_count`; lineage remains Markdown links rather than a dedicated official field.
- Only bundle-root `index.md` may carry frontmatter, limited here to `okf_version: "0.2"`; non-root indexes and logs carry none.
- Official v0.1 `timestamp` and body citations are legacy fallbacks superseded by `generated.at` and `sources`/footnotes.
