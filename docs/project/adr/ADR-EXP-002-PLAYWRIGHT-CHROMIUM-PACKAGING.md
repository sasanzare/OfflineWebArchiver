# ADR-EXP-002 — Playwright Chromium Packaging

**Status:** Experimental  
**Scope:** Product Phase 2 only  
**Production disposition:** Retained as evidence; not promoted in Product Phase 3  
**Date:** 2026-07-31

## Product Phase 3 disposition

Production Phase 3 has no Playwright/browser automation dependency. Electron 43.2.0 supports only the secure architecture shell. The spike proves one owned browser resource layout and exposes artifact-sourcing/security/size risks, but OD-027 remains blocked until Product Phase 7 browser-runtime adoption and later release packaging. See ADR-001, ADR-006, and the spike promotion review.

## Context

The packaged spike must launch the Chromium revision intended by Playwright with
no system Chrome, global Playwright, global cache, or first-launch download.
Browser executables cannot run from an Electron ASAR archive.

## Experimental decision

Install only Playwright's Chromium into the generated, spike-owned
`.playwright-browsers/` directory. At build time electron-builder copies that
directory to `resources/playwright-browsers/`. Before Playwright is loaded, the
application sets `PLAYWRIGHT_BROWSERS_PATH` to the development or packaged
directory and verifies that the resolved executable exists and remains inside
that directory. Missing browser files fail as `SPIKE_BROWSER_NOT_FOUND`; there
is no system-browser fallback.

## Alternatives retained for Product Phase 3

- Playwright's documented hermetic location inside `node_modules`;
- an explicit browser resource manifest generated during packaging;
- a separate browser-host process or component package; and
- other packagers and compression/update strategies.

## Consequences

The browser source and destination are explicit and reversible, and unrelated
global caches are excluded. The approach increases package size and requires the
browser directory to remain outside ASAR. Compatibility, path length, update,
license, antivirus, and clean-machine behavior remain production risks.
