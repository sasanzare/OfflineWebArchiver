# Final Official and Extension Boundary

Audit date: 2026-08-03

## Physical boundary

- `okf/index.md` and normal Concepts in the nine subject directories form the official Google OKF v0.2 Markdown bundle.
- `okf/extensions/` contains project-specific explanatory and historical Markdown. It is deliberately excluded from normal Concept classification.
- `okf/manifest.json`, `okf/registry/*.json`, and `okf/validation/schemas/*.json` form the OfflineWebArchiver extension data layer.
- `docs/okf-migration/` and `okf-bootstrap/` are migration history and bootstrap reference, outside the production bundle.

## Dependency direction

Concepts are the human-readable authority and must remain understandable without JSON. Concepts may carry one closed `owa` mapping with project-state and traceability IDs. Registries consume or cross-reference Concept paths; they add stable IDs, evidence state, and typed graph semantics but do not replace Concept prose.

Approved `owa` children are `implementation_status`, `verification_status`, `governance_status`, `requirement_ids`, `acceptance_ids`, `decision_ids`, `risk_ids`, `evidence_ids`, and `legacy_ids`. The migration-only `legacy_paths` child was removed in Phase 8.

## Validation boundary

The official layer validates only official specification obligations and tolerates unknown types and fields. Repository policy validates the closed producer taxonomy, canonical metadata, body conventions, source portability, and links. Extension validation covers the manifest, registries, schemas, IDs, mappings, and paths. Quality and format remain separate reporting layers.

## Final artifact decisions

All 11 JSON artifacts are retained because current validator and traceability consumers use them and they hold non-duplicative project semantics. All 15 extension Markdown files are retained as explanatory or historical views. The 58 legacy Markdown paths and all `owa.legacy_paths` entries were removed after canonical replacements and inbound references were reconciled. No compatibility artifact remains.
