# ADR-005 — TypeScript Module and Build Strategy

## Status

Accepted on 2026-07-31.

## Context

The workspace needs strict independent libraries, a Node CLI, Electron CommonJS entry files, a browser renderer, declarations, and deterministic commands.

## Decision

Use strict TypeScript project references and NodeNext ESM for production packages/CLI. Use esbuild only to bundle Electron main/preload as CommonJS and renderer as an IIFE. Keep exact tool versions and repository-local build scripts. Public package exports point only to `dist/index.js` and declarations.

## Alternatives Considered

CommonJS everywhere, a general bundler for all packages, ts-node at runtime, and a larger task orchestrator were considered. They weaken native ESM semantics or add runtime/tooling complexity.

## Consequences

Libraries have inspectable JS/declarations; Electron receives the formats it expects. Build tooling must preserve output ownership and explicit clean targets.

## Security Impact

Bundled preload has a closed dependency set. Runtime TypeScript loaders and dynamic evaluation are absent.

## Portability Impact

NodeNext packages are platform-neutral; Electron bundle targets follow the pinned runtime. Windows is the directly executed environment this phase.

## Testing Impact

Typecheck, clean build, format/lint, public-entry, CLI, and Electron gates validate emitted artifacts.

## Migration Impact

Spike build scripts remain isolated. Future packages must join root project references and ownership tests.

## Evidence

Root and leaf tsconfigs, build scripts, emitted package declarations, desktop bundles.

## Phase Impact

Defines build conventions for Product Phase 3 onward; changes require measured evidence and an ADR.

## Traceability

Requirements: NFR-MAINT-001, NFR-TEST-001. Acceptance: AC-P03-002 through AC-P03-005, AC-P03-016. Risks: R-002, R-038, R-039. Decisions: OD-010, OD-011. OKF domains: OKF-DOM-004, OKF-DOM-031, OKF-DOM-032.
