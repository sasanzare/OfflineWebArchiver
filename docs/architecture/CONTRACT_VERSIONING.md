# Contract Versioning

Current contract version is `1.0.0`. It is explicit on commands, responses, and events. Schemas are strict: unknown fields, invalid identifiers/timestamps, invalid discriminators, and unsupported versions are rejected.

Backward-compatible optional additions require a minor version, tests proving old/new consumers, and synchronized desktop/CLI documentation. Breaking removal/rename/semantic change requires a major version, compatibility/migration plan, ADR, and parallel handling when rolling upgrades can occur. Patch versions clarify validation without changing accepted semantics. Product package version `0.3.0` is distinct from contract version.
