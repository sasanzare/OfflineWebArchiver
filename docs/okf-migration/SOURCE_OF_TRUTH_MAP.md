# Final Source-of-Truth Map

Audit date: 2026-08-03

| Knowledge or control | Final authority | Other retained representations | Ownership | Validation |
|---|---|---|---|---|
| Human-readable product and engineering knowledge | Normal Concepts under `okf/` | README and handoff summaries; historical phase reports | Domain knowledge owners | Official, policy, quality, and format layers |
| Bundle identity and top-level navigation | `okf/index.md` | None | OKF maintainers | Reserved-root and reachability checks |
| Directory navigation | Nine maintained `okf/*/index.md` files | None | Directory knowledge owners | Reserved-file, direct-link, and reachability checks |
| Product phase history | `okf/history/phase-01.md` through `phase-08.md` | Historical project reports | Project maintainer | Concept validation plus phase registry checks |
| Extension contract and interpretation | `okf/extensions/README.md` | Migration design documents | OKF maintainers | Link and canonical-path checks |
| Extension version and registry locations | `okf/manifest.json` | Documentation summaries | Validator maintainers | Manifest schema and procedural checks |
| Stable extension identifiers | `okf/registry/nodes.json`, `domains.json`, `phases.json` | Concept `owa` references | Knowledge maintainers | Unique-ID and canonical-path checks |
| Machine-readable evidence | `okf/registry/evidence.json` | Official `sources`; extension evidence reports | Evidence owners | Evidence target, path, status, and orphan checks |
| Typed relationships | `okf/registry/relationships.json` | Human-readable Markdown links | Knowledge maintainers | Unique-edge and endpoint checks |
| Decisions and risks | Their linked project authority, indexed by `decisions.json` and `risks.json` | Concept summaries and historical reports | Project maintainers | ID resolution and schema checks |
| Extension change history | `okf/registry/changes.json` | Phase implementation reports | OKF maintainers | Schema, ID, and path checks |
| Validator behavior | `tools/okf/*.mjs` | Test expectations and maintainer documentation | Validator maintainers | `npm run test:okf` and production validation |
| Extension data shapes | Two production schemas under `okf/validation/schemas/` | Eight design schemas under `docs/okf-migration/schema/` | Validator maintainers | Parse, unique `$id`, and local `$ref` checks |
| CI enforcement | `.github/workflows/okf-validation.yml` | Phase 7 policy and Phase 8 verification report | Repository administrators | Static workflow audit and local parity |
| Migration history | `docs/okf-migration/PHASE_01_*` through final Phase 8 reports | Git history | Migration maintainers | Documentation links and final ledgers |
| Bootstrap history | `okf-bootstrap/README.md` and its historical inputs | Migration reports | Repository maintainers | Reference-only documentation checks |

## Authority rules

- Official Concepts are understandable without extension JSON; registries must not redefine Concept prose.
- Markdown links carry human-readable relationships. The relationship registry is retained only for project-specific typed edges.
- Official `sources` provide readable provenance; the evidence registry adds stable machine IDs and verification state.
- README files and `HANDOFF.md` summarize current state but do not become independent knowledge authorities.
- Historical reports preserve what was believed or implemented at a phase boundary. Final Phase 8 documents supersede their current-state claims without rewriting history.
- The 58 transitional paths and `owa.legacy_paths` were removed. No deprecated or independently editable duplicate authority remains.
- No retained artifact is marked as generated. Adding generated outputs requires an implemented deterministic producer and check mode before the marker may be used.
