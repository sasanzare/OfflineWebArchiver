# Current OKF Structure

This is the active repository map. Paths under `okf/` and `okf-extension/` are
kept separate deliberately; the archive is not an alternative configuration
root.

```text
.
├── okf/
├── okf-extension/
├── tools/
│   └── okf/
├── tests/
│   └── okf/
├── docs/
│   ├── okf-conformance/
│   └── archive/
│       └── okf/
│           ├── bootstrap/
│           └── migration/
└── .github/
    └── workflows/
        └── okf-validation.yml
```

| Path | Purpose | Ownership | Official or project-specific status | Affects official conformance | Expected maintainers |
|---|---|---|---|---|---|
| `okf/` | Google OKF v0.2 Bundle: Concepts, navigation indexes, history, and logs | Repository/content maintainers | Official | Yes | OKF content maintainers |
| `okf-extension/` | OWA manifest, registries, evidence, maps, schemas, and extension Markdown | OfflineWebArchiver maintainers | Project-specific extension | No; separate OWA layers validate it | OWA policy and validator maintainers |
| `tools/okf/` | Layered read-only CLI and validator implementation | Tooling maintainers | Project tooling implementing official and OWA checks | Official layer yes; other layers no | Validator maintainers |
| `tests/okf/` | Official, reference, provenance, extension, quality, format, and isolation tests | Test and validator maintainers | Project test suite | Tests both boundaries | Validator maintainers |
| `docs/okf-conformance/` | Validation contract, maintenance workflow, structure map, contribution guide, migration map, and phase audit records | Repository maintainers | Active project documentation | No | Repository maintainers |
| `docs/archive/okf/` | Archived bootstrap and completed migration records | Repository maintainers | Historical, non-authoritative | No | Maintainers preserving traceability |
| `docs/archive/okf/bootstrap/` | Former root-level bootstrap plans, evidence, governance, and target proposals | Repository maintainers | Historical bootstrap material | No | Maintainers consulting history |
| `docs/archive/okf/migration/` | Completed migration documents, schemas, inventories, reports, and handoffs | Repository maintainers | Historical migration material | No | Maintainers consulting history |
| `.github/workflows/okf-validation.yml` | CI matrix and optional remote validation workflow | CI/repository maintainers | Active project CI | Runs official and OWA validation | CI maintainers |

## Active entry points

- Start current maintenance at [MAINTENANCE_GUIDE.md](MAINTENANCE_GUIDE.md).
- Use [VALIDATION_CONTRACT.md](VALIDATION_CONTRACT.md) for rule ownership,
  diagnostics, warnings, and exit codes.
- Use [CONTRIBUTING_OKF.md](CONTRIBUTING_OKF.md) for change-specific steps.
- Use [MIGRATION_MAP.md](MIGRATION_MAP.md) for the preserved Phase 1 map and
  the Phase 5 archive map.
- Use [docs/archive/okf/README.md](../archive/okf/README.md) only to locate
  historical evidence.
