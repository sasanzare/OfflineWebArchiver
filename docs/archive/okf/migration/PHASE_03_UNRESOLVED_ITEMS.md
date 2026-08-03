# Phase 3 Unresolved Items

## Result

No unresolved metadata decision blocks deterministic Phase 4 migration.

Phase 2 had no material unresolved architecture item. Phase 3 resolves field requirements, type values, lifecycle mapping, actor syntax, AI assistance, provenance, evidence bridging, freshness, extension fields, reserved files, normalization, severities, schema structure, and migration status mapping.

## Assigned Implementation Details, Not Owner Decisions

| Item | Fixed safe default | Responsible phase | Phase 4 blocked? |
|---|---|---:|---|
| YAML parser selection/pinning | Must preserve YAML types, reject duplicate keys, and implement this contract without undeclared transitive dependency | 6 | No |
| Exact clock-skew tolerance for future timestamps | Treat future values as errors; Phase 6 may document a small deterministic tolerance | 6 | No |
| Generated index command/marker final text | No frontmatter; body marker must identify generator and prohibit edits | 6 | No |
| External URL reachability cadence | No mandatory network check; broken external resource is a warning only when explicitly checked | 7 | No |
| Eventual compatibility-field removal | Retain through final audit unless Phase 8 approves removal | 8 | No |

Two conditional owner cases exist only if future data introduces an unauthorized `DEPRECATED` or `NOT_APPLICABLE` legacy status. No current registry item uses either value, so these cases do not block Phase 4.
