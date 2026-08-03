# Final Extension Artifact Inventory

Audit date: 2026-08-03

The final extension layer contains 11 JSON artifacts. All are authored and reviewed project artifacts; none claims to be generated. Official Concepts remain the authority for human-readable knowledge. Registries are authoritative only for the project-specific identifiers and typed traceability they uniquely represent.

| Path | Purpose | Classification | Producer | Consumer | Validation responsibility | Retention |
|---|---|---|---|---|---|---|
| `okf/manifest.json` | Declares extension version, official OKF version, status, and registry locations | Authoritative extension configuration | OKF maintainers | Validator and auditors | Manifest schema plus exact path/version checks | Retain permanently |
| `okf/registry/changes.json` | Records extension and migration changes | Authoritative extension ledger | Migration and OKF maintainers | Auditors and validator | Schema, unique IDs, portable paths | Retain permanently as history |
| `okf/registry/decisions.json` | Indexes project decision IDs and authorities | Authoritative extension index | Project maintainers | Concepts, reports, and validator | Schema, unique IDs, referenced IDs | Retain while IDs are used |
| `okf/registry/domains.json` | Maps domain IDs to canonical knowledge paths | Authoritative extension map | Knowledge maintainers | Validator and navigation audits | Schema, unique IDs, canonical paths | Retain while domain IDs are used |
| `okf/registry/evidence.json` | Preserves machine-readable evidence identity and verification state | Authoritative extension evidence ledger | Evidence owners | Concepts, reports, and validator | Schema, IDs, target/source paths, orphan checks | Retain permanently unless records are superseded explicitly |
| `okf/registry/nodes.json` | Maps stable project node IDs to canonical Concepts | Authoritative extension identity map | Knowledge maintainers | Validator and traceability consumers | Schema, IDs, Concept paths | Retain while `owa` node IDs are used |
| `okf/registry/phases.json` | Maps product phases to canonical Phase Records | Authoritative extension phase map | Project maintainers | Handoff, reports, and validator | Schema, IDs, Phase Record paths | Retain as product history |
| `okf/registry/relationships.json` | Preserves typed relationships not expressible by plain Markdown links | Authoritative extension graph | Knowledge maintainers | Validator and graph consumers | Schema, unique edges, source/target resolution | Retain while typed graph semantics are needed |
| `okf/registry/risks.json` | Indexes project risk IDs and authorities | Authoritative extension index | Project maintainers | Concepts, reports, and validator | Schema, unique IDs, referenced IDs | Retain while IDs are used |
| `okf/validation/schemas/manifest.schema.json` | Defines manifest structure | Authoritative validation policy | Validator maintainers | Validator, editors, and reviewers | Schema parse, unique `$id`, local `$ref` checks | Retain with manifest version 1.x |
| `okf/validation/schemas/registry.schema.json` | Defines the eight registry families | Authoritative validation policy | Validator maintainers | Validator, editors, and reviewers | Schema parse, unique `$id`, local `$ref` checks | Retain with registry version 1.x |

The 15 Markdown files under `okf/extensions/` are extension documentation, not non-Markdown extension artifacts. The retired compatibility Markdown and `owa.legacy_paths` bridge are recorded in `PHASE_08_CLEANUP_LEDGER.md`.
