# Product Phase 3 Architecture Record — Transitional Legacy Artifact

> This file is not authoritative. Its merged historical Concept is [Product Phase 3 Architecture Record](../../history/phase-03.md). It remains for legacy-path compatibility until Phase 8 cleanup.

## Initial Repository State

The Git history contained only the initial README commit. Phase 1/2 documentation, OKF bootstrap records, HANDOFF, and the isolated Phase 2 spike existed as uncommitted user work and were preserved. No production scaffold existed.

## Architecture Decisions

npm workspaces are authoritative without an added orchestrator. Strict ESM TypeScript packages communicate through public entry points. Desktop IPC and CLI in-process adapters invoke one local application service. Zod validates contract version `1.0.0`. ADR-001 through ADR-008 record the decisions.

## Packages Created

`archive-core`, `application-service`, `contracts`, `platform`, `observability`, and `test-support`; production applications are `desktop` and `cli`.

## Contracts Created

Strict command, response, event, error, runtime, platform, and configuration schemas. The only command is `system.describe`; implemented and planned capabilities are distinct.

## Dependency Boundaries

Apps depend on public service/contracts/adapters. Application Service alone composes Core. Core is pure and has no Electron, CLI, Node, platform, or spike dependency. Architecture validation rejects forbidden external imports and privileged renderer access.

## Production Files Created

Production workspace manifests, TypeScript configs, package/app sources, build/test/quality/security/contract/architecture/OKF/docs tooling, tests, architecture docs, ADRs, and canonical OKF records.

## Spike Components Reviewed

Electron isolation, bundled preload, hidden real-runtime smoke, owned runtime concepts, and structured workflow evidence informed production boundaries. Crawler, browser engine, fixture cleanup/serialization, local archive server, and packaging scripts were not promoted.

## Tests Added and Executed

Unit, integration, built CLI, real Electron, architecture, contract, security, documentation, and OKF tests were added. Final clean root suite: 18/18 passed (11 unit, 3 integration, one CLI, one Electron, two OKF); all eight workspace build/test commands and every semantic gate passed. The record is `NOT_COMMITTED`.

## Requirements Affected

NFR-MAINT-001, NFR-TEST-001, NFR-KNOW-001, NFR-KNOW-002, NFR-KNOW-003, NFR-KNOW-004, and FR-CLI-001.

## Acceptance Criteria Affected

AC-P03-001 through AC-P03-024, AC-MAINT-001, AC-TEST-001, AC-CLI-001, and AC-OKF-001 through AC-OKF-006.

## Risks Affected

R-002, R-029, R-031, R-038 through R-044, and RISK-KNOW-001. Production browser compatibility, architecture/contract/privilege drift, validator growth, release packaging, and clean-machine proof remain open.

## Decisions Affected

OD-009, OD-010, OD-011, and OD-026 are resolved. OD-012, OD-013, OD-027, and owner-dependent release/product choices remain deferred.

## Security Impact

The renderer is sandboxed and isolated, Node integration is disabled, the bridge is allowlisted, IPC validates the sender/frame/URL, and navigation/windows/webviews/downloads/permissions/remote content are denied. No secrets or full environment are returned.

## Platform Impact

Development and the real Electron smoke are directly verified on Windows x64. The code normalizes Windows/Linux/macOS facts, but Linux/macOS execution and release packaging remain unverified.

## Known Limitations and Unknown Items

No crawler, database, authentication, OTP, proxy, browser-rendering, archive-generation, final UI, release packaging, or hostile-archive runtime exists. SQLite/library selection is a Product Phase 4 decision. Browser artifact sourcing remains open.

## Conflicts and Deprecated Items

No documentation-code conflict is known after validation. The bootstrap target structure is superseded as the current authority but retained intact as historical evidence. Phase 2 experimental architecture is not deprecated as evidence and is not promoted as production.

## Migration Result

Canonical OKF activation is `VERIFIED`: eight registries, three completed phase records plus planned Phase 4, schemas, semantic rules, repository-relative evidence, and automated validation exist; critical requirement orphans, duplicate IDs, and broken references are zero.

## Final Status

Product Phase 3 complete. Commit hash: `NOT_COMMITTED`. Exact next phase: Product Phase 4 — Portable Project and SQLite Foundation.
