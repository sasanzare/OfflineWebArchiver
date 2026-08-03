# OfflineWebArchiver Extension Semantic Rules

Extension validation is fail-closed and never repairs files. JSON must parse; manifest and registries require supported statuses; IDs are globally unique; repository paths are relative, traversal-free, and present; relationships and verified evidence references resolve; required phases and changes are present; mappings use known authority IDs; verified nodes carry evidence; and critical requirements are not orphaned.

Absolute paths, drive-letter paths, unsupported status, missing records, unknown mappings, duplicate identifiers, broken relationships, verified nodes without evidence, and planned-only implementation claims block extension validation. These are project rules, not official Google OKF v0.2 rules.
