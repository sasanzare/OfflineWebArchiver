# OKF Maintenance Guide

**Status:** Active maintainer guidance

This guide is the current entry point for maintaining the repository's Google
Open Knowledge Format (OKF) v0.2 Bundle and the OfflineWebArchiver (OWA)
extension layer. The [validation contract](VALIDATION_CONTRACT.md) defines the
validator boundaries; this document defines the day-to-day workflow.

## Authority and ownership

The official Bundle is the Markdown knowledge tree under `okf/`. It is owned by
the repository maintainers as a Google OKF v0.2 artifact. OWA-specific
metadata, registries, evidence, maps, schemas, and validation policy are owned
by the project and live under `okf-extension/`; they are not official OKF
requirements.

| Path | Purpose | Status | Affects official conformance | Expected maintainers |
|---|---|---|---|---|
| `okf/` | Official Bundle, Concepts, reserved indexes, and logs | Active official content | Yes | OKF/content maintainers |
| `okf-extension/` | OWA manifest, registries, maps, evidence, schemas, and extension docs | Active project extension | No, validated separately | OWA policy and validator maintainers |
| `tools/okf/` | Read-only layered validator and CLI | Active tooling | The official layer does; OWA layers do not | Validator maintainers |
| `tests/okf/` | Focused official, OWA, and regression tests | Active tests | Tests both boundaries | Validator maintainers |
| `docs/okf-conformance/` | Active contracts, structure, workflows, and phase audit records | Active maintainer docs | No direct Bundle content | Repository maintainers |
| `docs/archive/okf/` | Historical bootstrap and migration records | Non-authoritative archive | No | Maintainers preserving history |
| `.github/workflows/okf-validation.yml` | CI enforcement and report artifact workflow | Active CI | Runs official and OWA checks | CI and repository maintainers |

The active structure is summarized in [CURRENT_STRUCTURE.md](CURRENT_STRUCTURE.md).

## Official Bundle rules

Google OKF v0.2 defines the official semantics. Every non-reserved Markdown
file discovered under `okf/` is a Concept and needs parseable top-level YAML
with a non-empty string `type`. Root indexes, directory indexes, and logs are
reserved files with their own rules when present. Unknown Concept types and
producer-defined fields are allowed by the official layer. Missing optional
metadata, broken cross-links, and unavailable remote sources are not official
conformance failures.

Do not place OWA registries, evidence IDs, typed graph relationships, or
project-only policy in `okf/`. Put those records in `okf-extension/` and link
or reference them without presenting them as Google OKF requirements.

## Concept authoring workflow

1. Choose the correct subject directory and a stable kebab-case filename.
2. Add the smallest valid OKF frontmatter: a non-empty `type`, a matching
   `title`, useful `description`, lifecycle `status`, and only needed fields.
3. Write a standalone H1 body whose title matches the frontmatter `title`.
4. Add meaningful Markdown links to related Concepts and update the affected
   directory index, plus `okf/index.md` when top-level navigation changes.
5. Add or update OWA metadata only when the project needs traceability; keep it
   under the documented `owa` namespace and do not imply that it is official.
6. Add evidence and registry mappings in `okf-extension/` when a change needs
   requirements, decisions, risks, phases, or verification traceability.
7. Run the focused tests and the official validator before broader repository
   checks.

When changing a Concept, treat its path as identity. Update inbound links,
indexes, source records, extension mappings, and tests together. Preserve
historical phase records as historical records; do not rewrite them to hide an
old path or conclusion.

## Sources and provenance

Select the most authoritative portable source available: the relevant source
code, test, design record, or official external specification. For current
concrete repository sources, use an HTTPS GitHub blob permalink containing the
full commit SHA and the repository-relative path. Do not use drive paths, UNC
paths, home-directory paths, traversal, or developer-specific absolute paths.

The references layer checks local Markdown and source shapes. The provenance
layer checks immutable GitHub URL shape, same-repository commit/path evidence
when available, and local-path rejection. Default validation does not perform
remote requests; a full-SHA external source can be reported as not checked.
Use `--remote` only for the bounded optional remote checks.

When changing a permalink, verify the commit, path, and claim still match;
update the Concept source entry, affected provenance evidence, and any
extension mapping. A mutable branch URL may be structurally valid official
source data but is not acceptable as current OWA provenance.

## Verification and generated metadata

`owa.verification_status` (`verified`, `partial`, or an explicitly documented
unknown state) is project metadata describing evidence quality. It is not a
Google OKF requirement and must not be used to change official conformance.
Update it only when new evidence supports the change; retain partial or
unknown status rather than manufacturing certainty.

The repository currently has no generated official Concepts, indexes, or
registries. `generated` is therefore not added merely because a file was
updated. If generation is introduced, the producer must declare its inputs,
owned-output allowlist, deterministic output, collision protection, no-write
check, and stale-output tests before generated artifacts become active.

## Extension workflow

Add project-specific documentation under `okf-extension/` when it explains OWA
implementation evidence, decisions, maps, registries, or validator policy.
Update `manifest.json`, the relevant registry or schema, and extension tests
when the artifact is machine-referenced. Extension files must not be copied
into `okf/` to bypass official Concept rules. An extension validation failure is
an OWA policy failure, not an official OKF failure.

## Validation commands

Run the smallest relevant command first, then the full gates before merging:

| Purpose | Command |
|---|---|
| Official Google OKF v0.2 conformance | `npm run okf:validate:conformance` |
| OWA reference integrity | `npm run okf:validate:references` |
| OWA provenance policy | `npm run okf:validate:provenance` |
| OWA extension validation | `npm run okf:validate:extension` |
| OWA quality policy | `npm run okf:validate:quality` |
| OWA format policy | `npm run okf:validate:format` |
| Combined OWA policy | `npm run okf:validate` |
| Focused OKF tests | `npm run test:okf` |
| Documentation links and required docs | `npm run docs:validate` |
| Full repository tests | `npm run test` |
| Full repository build | `npm run build` |

The compatibility aliases `npm run okf:validate:official` and
`npm run okf:validate:extensions` remain available. `npm run okf:migrate` is a
deprecated compatibility command for completed migration workflows; it does
not read or repair archived material and exits with code 2.

Warnings are visible and non-blocking by default. A validation error exits 1;
`--warnings-as-errors` makes warnings blocking; invalid CLI usage exits 2; an
unexpected internal failure exits 3. Read the selected layer result rather
than treating an OWA warning or error as an official OKF requirement.

## CI behavior

`.github/workflows/okf-validation.yml` runs the official, references,
provenance, extension, quality, format, combined, focused-test, docs,
formatting, lint, and typecheck steps on Ubuntu and Windows. A bounded remote
provenance job runs only for manual dispatch or the weekly schedule. The
workflow uploads a JSON report as an artifact, but the existence of the file
or workflow is not proof of a hosted pass. Branch protection and hosted-run
status must be verified separately.

## Review checklist

- The change has one clear owner: official Bundle, OWA extension, tooling, or
  documentation.
- Official Concepts use valid frontmatter and stable paths; reserved files are
  treated as reserved files.
- Sources are portable, claim-matched, and immutable where current OWA policy
  requires it.
- `verified` and `generated` are handled honestly and remain project metadata.
- Indexes, inbound links, registries, schemas, tests, and CI are updated for
  moves or identity changes.
- No archived path is an active code, workflow, package-script, or current-doc
  dependency.
- Official and OWA diagnostics remain in their owning layers.
- Focused and full validation results are recorded in the pull request.

## Change examples

**Adding a Concept:** add `okf/<subject>/<concept>.md`, update its index and
optional extension mappings, then run the official, reference, provenance,
quality, format, and focused-test commands.

**Changing a source permalink:** update the `sources` entry and any provenance
evidence, verify the full SHA/path, and run references plus provenance before
reviewing the Concept body.

**Adding extension documentation:** add the file below `okf-extension/`, update
the manifest or registry only if it is machine-referenced, and run extension
and format validation. Do not add it to the official Bundle.

**Adding a validator rule:** select exactly one layer, assign its stable prefix,
document it in the active contract/crosswalk, add an isolated fixture, assert
the exact diagnostic, and prove standalone-layer isolation in tests.

## Prohibited practices

Do not claim OWA metadata, immutable provenance, extension schemas, CI gates,
quality rules, formatting rules, or archive policy as official Google OKF
requirements. Do not broadly rewrite Concepts to satisfy a fixture, weaken a
validator to accommodate a bad path, create duplicate active/archive copies,
use local absolute sources, or make archived migration records active again.

## Archival policy

Completed bootstrap and migration material belongs under the single
`docs/archive/okf/` root. Archived files are historical and non-authoritative;
Git history is the ultimate record. When a file moves, update active links,
indexes, registries, manifests, tests, workflows, and package documentation,
then record the old-to-new mapping in `MIGRATION_MAP.md`. Do not rewrite
historical claims merely to match the current structure. See the [archive
README](../archive/okf/README.md) for access rules.
