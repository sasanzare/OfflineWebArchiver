# Phase 6 Validator Handoff

Phase 6 implements five distinct results: official v0.2 conformance for discovered Concept files and reserved indexes; repository metadata policy; OfflineWebArchiver extension integrity; knowledge-quality warnings; and formatting checks. Official discovery excludes `okf-extension/` and explicitly recognizes retained transitional legacy artifacts. It must emit distinct error codes and exit summaries.

Repository metadata checks must parse YAML, enforce canonical fields and types, title/H1 equality, portable sources, `owa` closure, status separation, freshness, and reserved-file exceptions. Extension checks preserve current JSON parsing, identifier uniqueness, safe paths, authority-ID mappings, evidence references, required phases and changes, relationship endpoints, and critical requirement coverage. Legacy path compatibility remains required until Phase 8.

Fixtures: valid and invalid frontmatter fixtures, root and directory-index cases, every registry family, path-safety cases, legacy notices, and Concept-to-evidence/relationship mappings. CI integration and generated-output check mode are deferred to Phase 7.
