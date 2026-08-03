# OfflineWebArchiver Extensions

This subtree contains OfflineWebArchiver-specific documentation, registry views, evidence views, and validation policy. It is not an official OKF Concept area. Official authored Concepts remain in the subject directories under `okf/` and must be understandable without parsing extension JSON.

The dependency direction is one way: Concepts may carry optional `owa` bridge identifiers; extension artifacts may consume Concept paths and links; extension validation and reporting consume both layers. Extension documentation is explanatory or historical unless it explicitly identifies an independent project authority.

The active manifest remains at `okf/manifest.json`, the eight active registries remain under `okf/registry/`, and their production schemas remain under `okf/validation/schemas/`. Phase 8 retained those established paths as the final extension contract because they have active validator consumers and are not duplicate compatibility copies.

## Evidence views

- [Build evidence](evidence/builds.md)
- [Decision evidence](evidence/decisions.md)
- [Runtime evidence](evidence/runtime.md)
- [Source evidence](evidence/source.md)
- [Test evidence](evidence/tests.md)

## Maps

- [Dependency map](maps/dependencies.md)
- [Domain map](maps/domains.md)
- [System map](maps/system.md)
- [Traceability map](maps/traceability.md)

## Reports and validation

- [Decision report](reports/decisions.md)
- [Evidence report](reports/evidence.md)
- [Risk report](reports/risks.md)
- [Semantic validation rules](validation/rules/semantic-rules.md)
- [Phase 3 migration report](validation/reports/phase-03-migration-report.md)
