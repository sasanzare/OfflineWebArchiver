# Path and Naming Conventions

## Scope

These rules govern future files in the official `okf/bundle/` tree and the project-specific `okf-extension/` tree. They freeze path design for Phase 3 and later migration. They do not rename current files.

## Normative Rules

1. Use lowercase ASCII `kebab-case` for directories and filenames.
2. Use `/` as the repository-relative separator in documents, registries, and reports.
3. Use descriptive nouns for Concept filenames; do not include status, owner, version, or current date.
4. Use plural nouns for collection directories (`requirements`, `references`) and stable category names for subject directories (`architecture`, `data`, `workflow`, `recovery`, `security`, `operations`, `testing`, `history`).
5. Keep common acronyms lowercase in paths: `cli.md`, `api-contract.md`, `url-normalization.md`.
6. Use `index.md` only for the official reserved navigation role. Do not use `README.md` inside the official bundle.
7. Do not create `log.md` under the current approved policy.
8. Use phase numbers only for historical Phase Records: `phase-01.md` through `phase-99.md`.
9. Use ISO dates (`YYYY-MM-DD`) only when date identity is intrinsic, such as an immutable dated reference snapshot; do not date living Concepts.
10. Treat the path relative to `okf/bundle/`, without `.md`, as the stable Concept identity.

## Directory Examples

| Valid | Invalid | Reason |
|---|---|---|
| `bundle/architecture/` | `bundle/Architecture/` | Uppercase is not deterministic across filesystems. |
| `bundle/product/requirements/` | `bundle/product/product-requirements-folder/` | Avoid redundant and verbose names. |
| `bundle/recovery/` | `bundle/phase-07-recovery/` | Live knowledge must not carry a temporary phase number. |
| `extensions/validation/reports/` | `bundle/validation-reports/` | Project validation output is outside the official Concept hierarchy. |

## Concept Filename Examples

| Valid | Invalid | Reason |
|---|---|---|
| `job-state-machine.md` | `JobStateMachine.md` | Use lowercase kebab-case. |
| `runtime-network.md` | `runtime-network-complete.md` | Implementation state is volatile. |
| `browser-runtime.md` | `browser-runtime-v2.md` | Frequently changing versions are not stable identity. |
| `project-format.md` | `moxfo-project-format.md` | Owner names do not belong in identity. |

A filename should name one enduring subject. A long Concept is not split solely for length; split only when sections have independent purpose, ownership, or relationships.

## Reserved Files

- `okf/bundle/index.md` is the required authored root index and the only index allowed to declare `okf_version`.
- Each populated first-level official directory has an `index.md`.
- A populated nested directory has an index when it is part of navigation, such as `product/requirements/index.md`.
- Directory indexes list their direct children only and may link upward to the root.
- `README.md` is reserved for extension or repository guidance outside the official bundle.
- `log.md` remains absent unless the Phase 2 log decision is formally superseded.

## Reference Paths

Official Reference Concepts live at `bundle/references/<subject>.md`. An immutable dated snapshot may use `bundle/references/<subject>-YYYY-MM-DD.md` only when the date distinguishes the referenced edition. Binary or large external material should remain outside the Concept tree and be linked from a Reference Concept.

Valid: `bundle/references/sqlite-durability.md`

Conditionally valid: `bundle/references/vendor-format-2026-07-01.md`

Invalid: `bundle/references/misc.md`

## Extension Paths

Extension paths begin at `okf-extension/` and use a family directory: `registry/`, `evidence/`, `maps/`, `reports/`, `validation/`, `generated/`, or `compatibility/`. They never masquerade as official Concept paths.

JSON filenames are lowercase kebab-case. Existing stable plural registry names are retained (`domains.json`, `nodes.json`, `relationships.json`). Generated reports may include a stable report name, but date-stamped outputs belong outside versioned authoritative paths unless they are intentionally immutable audit records.

## Generated Files

Generated files use semantic names, not a `.generated` filename suffix, because their path is part of consumer contracts. Their first supported comment or field must carry the generated marker defined in Phase 3. A generator writes only paths it owns.

Valid: `extensions/registry/nodes.json` with a generated marker.

Invalid: `extensions/registry/nodes-final-v3-generated.json`.

## Historical Records

Phase Record Concepts use zero-padded identifiers: `history/phase-01.md`. Their titles may retain the historical phase name. A phase number is valid here because the phase is the subject, not a transient implementation label.

Dates in headings and body text use ISO `YYYY-MM-DD`. Dates do not enter the path unless they identify an immutable historical record with no stable subject name.

## Link Style

- Use ordinary Markdown links.
- From an official Concept, prefer bundle-root links beginning with `/` when the consuming renderer supports the official recommendation; Phase 3 must select and test one canonical serialization for this repository.
- Until that implementation choice is tested, migration mapping uses repository-relative target paths and does not create links.
- Relative links inside migration documentation remain relative to the current document.
- Never encode a Windows backslash in a Markdown link.
- Link to a Concept, not to a generated registry row that merely indexes it.
- Anchor links are convenience navigation, not stable Concept identities.

## Rename Policy

A Concept may be renamed only when its subject identity is wrong, the taxonomy changes with evidence, or a collision must be resolved. Editorial changes, ownership changes, lifecycle state, verification state, or implementation completion do not justify a rename.

Every approved rename must:

1. record old and new path in the migration or change ledger;
2. update authored Markdown links and authoritative external references;
3. regenerate extension indexes;
4. retain a compatibility mapping for all active consumers;
5. pass broken-link and orphan checks;
6. identify the release or phase when the old mapping may be removed.

The old path is not silently reused for another Concept.

## Compatibility Mappings

During migration, `extensions/compatibility/legacy-path-map.json` maps each current path to a target path or non-Concept disposition. It is generated from the reviewed migration ledger. It is not an official redirect mechanism and does not change Concept identity. Consumers must eventually adopt the new path; Phase 8 decides retention.

## Validation Expectations for Later Phases

Later validators should check casing, kebab-case, reserved filenames, index placement, prohibited volatile tokens, duplicate target identities, link serialization, and compatibility-map completeness. Official errors and project naming-policy errors must be reported separately.
