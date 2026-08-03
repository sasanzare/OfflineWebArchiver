# Product Phase 4 Project Format Record — Transitional Legacy Artifact

> This file is not authoritative. Its historical Concept is [Product Phase 4 Project Format Record](../../history/phase-04.md). It remains for legacy-path compatibility until Phase 8 cleanup.

## Status

`VERIFIED` on 2026-07-31. Product Phase 4 implements only the local portable Project/SQLite foundation. Product Phase 5 is next.

## Objective and boundaries

Deliver format 1.0.0, SQLite schema/migration/backup, stable Project/Revision/Run identity, atomic lifecycle, lock coordination, bounded secret-free ZIP, contract 1.1.0, CLI/Desktop flows, security review, and executable evidence. No scope/URL policy, queue, crawl, browser, auth, proxy, capture, rewrite, runtime server, or release capability is included.

## Implementation evidence

- Format/path runtime source: `packages/project-format/src/index.ts` and schema projection.
- Persistence/migrations/atomic/ZIP/lock source: `packages/persistence-sqlite/src/`.
- Service/contracts/apps: `packages/application-service`, `packages/contracts`, `apps/cli`, `apps/desktop`.
- Unit/integration/process evidence: `tests/unit/project-format.test.ts`, `tests/unit/persistence-sqlite.test.ts`, `tests/integration/project-lifecycle.test.ts`, CLI/Electron smokes.
- Decisions: ADR-009..014.
- Security: `docs/architecture/PHASE_04_SECURITY_REVIEW.md`.
- Narrative report: `docs/project/PHASE_04_IMPLEMENTATION_REPORT.md`.

## Versions and migrations

Application packages `0.4.0`; transport `1.1.0`; Project format `1.0.0`; SQLite schema `2`; export container `1.0.0`; lock `1`. Migrations are `001_initialize_project_schema` and `002_add_project_events`. Schema 1 upgrade plus backup and transactional failure rollback are executable evidence.

## Traceability

Requirements: FR-PROJECT-001..004, FR-CLI-001, NFR-REL-002, NFR-PORT-002, NFR-MAINT-001, NFR-TEST-001, NFR-KNOW-001..004. Acceptance: AC-PROJECT-001..005, AC-P04-001..029. Risks: R-012, R-013, R-031, R-045, R-046, RISK-KNOW-001. Decisions: OD-009, OD-013, OD-014, OD-023, OD-026.

## Validation

Repository build/test/architecture/contracts/format/migrations/security/docs/OKF gates provide current evidence. The all-suite test count is 29 with no skip. No commit, push, tag, package, deployment, or release is part of the phase action.

## Known limitations

ZIP is bounded/in-memory with no ZIP64/streaming/encryption/authenticity. Lock is coordination only. Backup retention/restore remains P17. Packaged all-OS transfer remains P25. These are recorded, not inferred complete.

## Next phase

Product Phase 5 — Profile, Scope, and URL Normalization. It must define authorization/scope and deterministic URL policy before network dispatch and must not start queue/crawl work.
