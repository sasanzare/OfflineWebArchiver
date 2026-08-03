# Phase 1 Migration Map

This map records the structural relocation completed in Phase 1. The previous
paths are historical source locations; the new paths are the only active
extension locations. Official Concepts remain under okf/.

| Previous path | New path | Classification | Reason |
|---|---|---|---|
| okf/extensions/ | okf-extension/ | Extension directory | Project-specific documentation root moved outside the official bundle. |
| okf/extensions/README.md | okf-extension/README.md | Extension documentation | Defines the physical and validation boundary. |
| okf/extensions/evidence/ | okf-extension/evidence/ | Extension directory | Evidence guides are project support material. |
| okf/extensions/evidence/builds.md | okf-extension/evidence/builds.md | Extension documentation | Build evidence guidance is not an OKF Concept. |
| okf/extensions/evidence/decisions.md | okf-extension/evidence/decisions.md | Extension documentation | Decision evidence guidance is project-specific. |
| okf/extensions/evidence/runtime.md | okf-extension/evidence/runtime.md | Extension documentation | Runtime evidence guidance is project-specific. |
| okf/extensions/evidence/source.md | okf-extension/evidence/source.md | Extension documentation | Source evidence guidance is project-specific. |
| okf/extensions/evidence/tests.md | okf-extension/evidence/tests.md | Extension documentation | Test evidence guidance is project-specific. |
| okf/extensions/maps/ | okf-extension/maps/ | Extension directory | Maps are project traceability views. |
| okf/extensions/maps/dependencies.md | okf-extension/maps/dependencies.md | Extension documentation | Dependency mapping is outside the official bundle. |
| okf/extensions/maps/domains.md | okf-extension/maps/domains.md | Extension documentation | Domain mapping is outside the official bundle. |
| okf/extensions/maps/system.md | okf-extension/maps/system.md | Extension documentation | System mapping is project infrastructure. |
| okf/extensions/maps/traceability.md | okf-extension/maps/traceability.md | Extension documentation | Traceability mapping is project infrastructure. |
| okf/extensions/reports/ | okf-extension/reports/ | Extension directory | Reports are project evidence and status views. |
| okf/extensions/reports/decisions.md | okf-extension/reports/decisions.md | Extension documentation | Decision coverage is project-specific. |
| okf/extensions/reports/evidence.md | okf-extension/reports/evidence.md | Extension documentation | Evidence coverage is project-specific. |
| okf/extensions/reports/risks.md | okf-extension/reports/risks.md | Extension documentation | Risk coverage is project-specific. |
| okf/extensions/validation/ | okf-extension/validation/ | Extension directory | Validation policy and reports are not official OKF requirements. |
| okf/extensions/validation/rules/semantic-rules.md | okf-extension/validation/rules/semantic-rules.md | Extension validation policy | These are OfflineWebArchiver rules, not Google OKF rules. |
| okf/extensions/validation/reports/phase-03-migration-report.md | okf-extension/validation/reports/phase-03-migration-report.md | Historical extension report | Retained as project migration evidence. |
| okf/manifest.json | okf-extension/manifest.json | Extension manifest | The manifest declares project extension data, not official bundle structure. |
| okf/registry/ | okf-extension/registry/ | Extension directory | Registries are project-specific machine data. |
| okf/registry/changes.json | okf-extension/registry/changes.json | Extension registry | Change identifiers and history are project infrastructure. |
| okf/registry/decisions.json | okf-extension/registry/decisions.json | Extension registry | Decision identifiers and mappings are project infrastructure. |
| okf/registry/domains.json | okf-extension/registry/domains.json | Extension registry | Domain identifiers and mappings are project infrastructure. |
| okf/registry/evidence.json | okf-extension/registry/evidence.json | Extension registry | Evidence identifiers and paths are project infrastructure. |
| okf/registry/nodes.json | okf-extension/registry/nodes.json | Extension registry | Stable project node identifiers are not official OKF metadata. |
| okf/registry/phases.json | okf-extension/registry/phases.json | Extension registry | Product phase identifiers are project infrastructure. |
| okf/registry/relationships.json | okf-extension/registry/relationships.json | Extension registry | Typed project relationships exceed the official link model. |
| okf/registry/risks.json | okf-extension/registry/risks.json | Extension registry | Risk identifiers and mappings are project infrastructure. |
| okf/validation/schemas/ | okf-extension/validation/schemas/ | Extension directory | Project JSON schemas are separate from OKF Markdown rules. |
| okf/validation/schemas/manifest.schema.json | okf-extension/validation/schemas/manifest.schema.json | Extension schema | Validates the project manifest contract. |
| okf/validation/schemas/registry.schema.json | okf-extension/validation/schemas/registry.schema.json | Extension schema | Validates project registry data shapes. |

No compatibility copies, aliases, symlinks, or placeholders were retained in
okf/. The old okf/extensions/ path was not retained; the canonical name is
okf-extension/.

## Phase 5 archive mappings

Phase 1 mappings above are preserved unchanged. Phase 5 moved completed
bootstrap and migration material out of the active documentation surface; the
archive is historical and non-authoritative.

| Previous path | New path | Classification | Reason |
|---|---|---|---|
| `okf-bootstrap/` (15 files) | `docs/archive/okf/bootstrap/` | Historical archive | Root-level bootstrap planning, evidence, and governance records are no longer operational inputs. |
| `docs/okf-migration/` (90 files) | `docs/archive/okf/migration/` | Historical archive | Completed migration plans, ledgers, schemas, audits, reports, and handoffs remain available without competing with active maintainer documentation. |
| `tools/okf/migrate.mjs` | `tools/okf/migrate.mjs` | Deprecated compatibility command | The package command remains callable for old workflows but no longer reads legacy paths or performs migration work. |

The two former source directories are absent after the move. Current
maintenance starts at `docs/okf-conformance/`; historical reports should be
read from `docs/archive/okf/`.
