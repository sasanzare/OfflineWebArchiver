# ADR-EXP-001 — Product Phase 2 Spike Tooling

**Status:** Experimental  
**Scope:** Product Phase 2 only  
**Production disposition:** Reviewed in Product Phase 3; concepts partially adapted, spike tooling not promoted  
**Date:** 2026-07-31

## Product Phase 3 disposition

npm is now authoritative and strict TypeScript/Node tests remain useful concepts, but production uses root workspaces, project references, public package exports, esbuild only for Electron bundles, and new repository-local gates. No spike manifest, lockfile, script, source, or build output is a production dependency. See ADR-001, ADR-005, ADR-006, and `docs/architecture/SPIKE_PROMOTION_REVIEW.md`.

## Context

Product Phase 2 must prove an Electron → Playwright Chromium → rendered SPA →
saved HTML → loopback preview path without creating the Product Phase 3
architecture. The repository had no package manager, source layout, build tool,
or dependency lockfile before this spike.

## Experimental decision

Use one isolated npm package under `spikes/phase-02-feasibility/`, compile strict
TypeScript to CommonJS with the repository-local compiler, use the Node test
runner, and build an unpacked Windows x64 directory with electron-builder. Keep
all browser, build, package, run, and temporary output inside ignored spike-owned
directories.

## Alternatives retained for Product Phase 3

- pnpm or Yarn instead of npm;
- a workspace/monorepo instead of one isolated package;
- a bundler instead of plain TypeScript compilation;
- another Electron packaging tool or a production installer format; and
- separate service/core packages rather than a spike-local module boundary.

## Consequences

This gives a small reversible proof and one lockfile. It provides evidence for
`OD-009`, `OD-010`, and `OD-011`, but resolves none of them. Spike paths, scripts,
module boundaries, and configuration must not be copied into production without
Product Phase 3 review.
