# OfflineWebArchiver Extensions

This subtree contains OfflineWebArchiver-specific documentation, registries, compatibility records, and validation policy. It is not an official OKF Concept area. Official authored Concepts remain in the subject directories under `okf/` and must be understandable without parsing extension JSON.

The dependency direction is one way: Concepts may carry optional `owa` bridge identifiers; extension artifacts may consume Concept paths and links; extension validation and reporting consume both layers. Extension documentation is explanatory or historical unless it explicitly identifies an independent project authority.

The current manifest and JSON registries remain at their legacy paths until Phase 6 validates a consumer cutover. Their treatment is recorded in `docs/okf-migration/PHASE_05_EXTENSION_BRIDGE_REPORT.md`.
