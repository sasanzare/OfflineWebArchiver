# ADR-009 — Versioned Portable Project Format

## Status

Accepted on 2026-07-31.

## Context

Product Phase 4 needs a stable Project identity and a format that can move without retaining host paths or secrets. Later phases will add content, but cannot silently redefine the root contract.

## Decision

Use a directory Project with strict `project.json` format version `1.0.0`, application provenance, UUID Project/Revision/Run identities, UTC timestamps, a fixed relative SQLite path, explicit current schema version, lifecycle data, and future feature flags fixed to `false`. The Zod schema in `@offline-web-archive/project-format` is runtime authority; the bundled JSON Schema is documentation/interchange authority. Unknown fields and unsupported format versions fail closed.

The required initial directories are database, page/asset/API/runtime/report containers, logs, and temp. `profile`, `auth`, and `proxies` are reserved but are not created in Phase 4. Paths use NFC forward-slash relative syntax and reject traversal, drive, UNC, reserved-device, ambiguous, and non-portable names.

## Consequences

The format is explicit and portable. Adding or changing a field requires compatibility policy, tests, documentation, and a new format decision; later content does not make an existing false feature claim true automatically.

## Alternatives

An unversioned directory, absolute-path metadata, a database-only Project, and a single opaque container were rejected because they weaken inspection, portability, or recovery.

## Security Impact

Manifest fields cannot contain secrets by contract. Strict paths reduce traversal and cross-platform alias attacks. Reserved secret directories are outside the current format surface.

## Portability Impact

The contract uses UTF-8 JSON, LF, NFC, forward slashes, UUIDs, and UTC. Host absolute paths exist only in local commands and responses, never inside the Project.

## Testing Impact

Unit tests cover strict parsing, deterministic serialization, versions, identities, UTC, reserved names, normalization, and case-insensitive collision keys. Integration tests move a Project before reopen.

## Migration Impact

Format `1.0.0` is the initial production version. Unsupported future major/minor format values are read-only rejected; no downgrade exists.

## Evidence

`packages/project-format`, `tests/unit/project-format.test.ts`, and `npm run project-format:validate`.

## Phase Impact

Completes the Product Phase 4 format decision only. Profile/scope content begins in Product Phase 5.

## Traceability

Requirements: FR-PROJECT-001..004, NFR-PORT-002, NFR-REL-002. Acceptance: AC-PROJECT-001..005, AC-P04-001..004. Risks: R-013, R-031. Decisions: OD-014. OKF: OKF-DOM-008, OKF-NODE-P04-PERSISTENCE.
