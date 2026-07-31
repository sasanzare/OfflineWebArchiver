# ADR-001 — Monorepo and Workspace Strategy

## Status

Accepted on 2026-07-31.

## Context

The production repository needs independently owned applications and libraries, one lockfile, reproducible local commands, and no dependency on the isolated Phase 2 spike. OD-010 and OD-011 were blocking the scaffold.

## Decision

Use npm 11 workspaces over `apps/*` and `packages/*`, a root exact-version lockfile, and repository-local Node scripts. Add no Nx/Turborepo layer until measured graph or CI needs justify it. Node 24 is the development baseline.

## Alternatives Considered

pnpm, Yarn, Nx, and Turborepo were considered. They add another tool or cache model without Phase 3 evidence of benefit.

## Consequences

Installation and ownership are simple; root scripts must explicitly order TypeScript references and desktop bundling. Future orchestration requires a new ADR.

## Security Impact

One lockfile and exact direct versions improve dependency review. npm install-script approval is restricted to exact Electron 43.2.0.

## Portability Impact

npm and Node are cross-platform, but only Windows x64 execution is directly verified this phase.

## Testing Impact

Root and suite-specific commands build prerequisites before tests; workspace package boundaries are validated separately.

## Migration Impact

The spike lockfile remains isolated. Production dependencies live only at the root/workspace graph.

## Evidence

`package.json`, `package-lock.json`, `tsconfig.json`, successful install/typecheck/build/test commands.

## Phase Impact

Resolves OD-010 and OD-011 in Product Phase 3; later phases retain the workspace convention.

## Traceability

Requirements: NFR-MAINT-001, NFR-TEST-001. Acceptance: AC-P03-001 through AC-P03-005. Risks: R-002, R-038, R-039. Decisions: OD-010, OD-011. OKF domains: OKF-DOM-004, OKF-DOM-031.
