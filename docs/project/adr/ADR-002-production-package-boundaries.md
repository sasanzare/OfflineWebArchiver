# ADR-002 — Production Package Boundaries

## Status

Accepted on 2026-07-31.

## Context

Desktop, CLI, use-case orchestration, domain logic, transport contracts, platform facts, and logging have different reasons to change and privilege levels.

## Decision

Create `archive-core`, `application-service`, `contracts`, `platform`, `observability`, and `test-support` packages plus `desktop` and `cli` apps. Dependency direction is shells to service to Core; cross-workspace imports use only exported package entry points. Tests enforce the graph.

## Alternatives Considered

A single application package, app-owned Core, and many fine-grained domain packages were considered. They either collapse privilege boundaries or invent later-phase components prematurely.

## Consequences

Core remains GUI/transport/platform independent and testable. Some composition stays internal to Application Service until later lifecycle requirements justify a composition package.

## Security Impact

The renderer cannot import Node/Electron/service/Core. Privileged adapters are explicit and auditable.

## Portability Impact

Platform-specific facts are isolated; pure packages can run wherever compliant JavaScript runs.

## Testing Impact

Architecture tests reject forbidden imports, app dependencies from packages, and insecure BrowserWindow settings.

## Migration Impact

No spike source was copied. Future capabilities enter Core/service through reviewed public contracts.

## Evidence

Workspace manifests, source entry points, TypeScript references, `npm run test:architecture`.

## Phase Impact

Establishes the stable extension shape for Product Phase 4 and beyond without implementing those phases.

## Traceability

Requirements: NFR-MAINT-001. Acceptance: AC-MAINT-001, AC-P03-013 through AC-P03-017. Risks: R-002, R-031. Decisions: OD-011. OKF domains: OKF-DOM-004 through OKF-DOM-007.
