# Extension Artifact Inventory

| Artifact family | Count | Classification | Authority | Phase 6 treatment |
|---|---:|---|---|---|
| `manifest.json` | 1 | Transitional authored extension configuration | Extension tooling configuration | Preserve path compatibility; separate version semantics |
| `registry/*.json` | 8 | Authored or transitional derived extension registries | See extension bridge report | Validate separately and derive eligible indexes |
| `validation/schemas/*.json` | 2 | Authored extension schemas | Extension policy | Activate only with tested Phase 6 validator |

All 11 non-Markdown artifacts under `okf/` are classified. No artifact is an official Concept or official conformance result.
