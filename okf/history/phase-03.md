---
type: Phase Record
title: Product Phase 3 - Architecture, Monorepo, and Layer Contracts
description: Preserves the historical architecture, workspace, and layer-contract decisions from Product Phase 3.
tags: [history, phase-record, architecture, monorepo]
status: stable
sources:
  - id: phase-03-legacy-record
    resource: okf/phases/phase-03/PHASE_03_ARCHITECTURE_RECORD.md
    title: Legacy Product Phase 3 record
  - id: phase-03-architecture-knowledge
    resource: okf/knowledge/architecture/PHASE_03_ARCHITECTURE_RECORD.md
    title: Merged Phase 3 architecture context
  - id: phase-03-application-service-adr
    resource: docs/project/adr/ADR-003-local-application-service-transport-boundary.md
    title: Local application-service transport decision
  - id: phase-03-okf-validator
    resource: tools/okf/validate.mjs
    title: Canonical OKF validation source
owa:
  verification_status: verified
  evidence_ids: [OKF-EV-P03-SOURCE, OKF-EV-P03-TESTS, OKF-EV-P03-OKF]
  legacy_ids: [OKF-PHASE-003]
  legacy_paths: [okf/phases/phase-03/PHASE_03_ARCHITECTURE_RECORD.md, okf/knowledge/architecture/PHASE_03_ARCHITECTURE_RECORD.md]
---

# Product Phase 3 - Architecture, Monorepo, and Layer Contracts

## Initial Repository State

The Git history contained only the initial README commit. Phase 1 and Phase 2 documentation, OKF bootstrap records, HANDOFF, and the isolated Phase 2 spike existed as uncommitted user work and were preserved. No production scaffold existed.

## Architecture Decisions

npm workspaces are authoritative without an added orchestrator. Strict ESM TypeScript packages communicate through public entry points. Desktop IPC and CLI in-process adapters invoke one local Application Service. Zod validates contract version 1.0.0. ADR-001 through ADR-008 record the decisions.

## Packages and Contracts

The production packages are `archive-core`, `application-service`, `contracts`, `platform`, `observability`, and `test-support`; production applications are `desktop` and `cli`. Strict command, response, event, error, runtime, platform, and configuration schemas were created. The only command was `system.describe`, and implemented and planned capabilities were kept distinct.

## Dependency Boundaries

Apps depend on public service, contracts, and adapter entry points. Application Service alone composes Core. Core is pure and has no Electron, CLI, Node, platform, or spike dependency. Architecture validation rejects forbidden external imports and privileged renderer access.

The merged Phase 3 architecture note records the same dependency direction: `apps -> application-service -> archive-core`, with transport-neutral contracts and narrow platform and observability adapters. Desktop uses an allowlisted Electron IPC bridge, and CLI invokes the same Application Service in-process. Current living facts are represented by the [Application Service](../architecture/application-service.md) and [Contracts](../architecture/contracts.md) Concepts.

## Production Files, Spikes, and Tests

Production workspace manifests, TypeScript configs, package and app sources, build, test, quality, security, contract, architecture, OKF, and documentation tooling were created. Electron isolation, bundled preload, hidden real-runtime smoke, and owned runtime concepts informed production boundaries; crawler, browser engine, fixture cleanup and serialization, local archive server, and packaging scripts were not promoted.

Unit, integration, built CLI, real Electron, architecture, contract, security, documentation, and OKF tests were added. The final clean root suite was 18/18 passed, with all eight workspace build/test commands and semantic gates passing. The historical record was marked `NOT_COMMITTED` at phase close.

## Traceability and Limitations

Requirements affected were NFR-MAINT-001, NFR-TEST-001, NFR-KNOW-001 through NFR-KNOW-004, and FR-CLI-001. Acceptance criteria affected were AC-P03-001 through AC-P03-024, AC-MAINT-001, AC-TEST-001, AC-CLI-001, and AC-OKF-001 through AC-OKF-006. Risks included R-002, R-029, R-031, R-038 through R-044, and RISK-KNOW-001.

The renderer was sandboxed and isolated, Node integration was disabled, the bridge was allowlisted, and navigation, windows, webviews, downloads, permissions, and remote content were denied. Windows x64 development and the real Electron smoke were verified; Linux and macOS execution and release packaging remained unverified. No crawler, database, authentication, OTP, proxy, browser-rendering, archive-generation, final UI, release packaging, or hostile-archive runtime existed at this phase. SQLite and library selection were deferred to Product Phase 4.

Canonical OKF activation was `VERIFIED` for the historical phase: eight registries, three completed phase records plus planned Phase 4, schemas, repository-relative evidence, and automated validation existed. Product Phase 3 was complete, with Product Phase 4 as the exact next phase. The living architecture is now linked from the [Architecture index](../architecture/index.md), while this file remains a historical record.

