# OKF Semantic Validation Rules

Validation is fail-closed and never repairs files. JSON must parse; manifest/registries must contain required fields and supported statuses; IDs must be globally unique; repository paths must be relative, traversal-free, and exist; relationships and verified evidence references must resolve; phases 1–3 and the Phase 3 change must exist; mappings must use known authority IDs; `VERIFIED` nodes must carry evidence; phase numbers must be 1–25; and critical Phase 3 knowledge/maintainability/test requirements must not be orphaned.

An absolute path, drive-letter path, unsupported status, missing record, unknown mapping, duplicate ID, broken relationship, or planned-only implementation claim blocks validation with an actionable error.
