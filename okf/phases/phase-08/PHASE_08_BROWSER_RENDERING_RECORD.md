# Product Phase 8 Browser Rendering Record — Transitional Legacy Artifact

> This file is not authoritative. Its historical Concept is [Product Phase 8 Browser Rendering Record](../../history/phase-08.md). It remains for legacy-path compatibility until Phase 8 cleanup.

**Status:** VERIFIED  
**Activated:** 2026-08-01  
**Application/workspaces:** 0.8.0  
**Contract:** 1.5.0  
**Project format:** 1.1.0  
**SQLite schema/migration:** 6 / `006_add_browser_rendering_engine`  
**Render Engine / Context / Stability models:** 1 / 1 / 1  
**Browser:** Playwright 1.56.1; Chromium 141.0.7390.37 revision 1194

## Outcome

Phase 8 verifies an owned, checksum-validated, sandboxed Chromium runtime with no system fallback or normal-launch download; one reusable Process/active Job; fresh deterministic Context/Page per attempt; bounded navigation and combined DOM/network stability; final DOM HTML and optional PNG artifacts; safe evidence; and Browser/Page crash classification.

## Ownership and persistence

Rendering begins only from an eligible queued Job. Application Service claims with a Lease, persists stage events/Checkpoints, heartbeats/renews, observes Pause, and fences every mutation. Schema 6 adds `render_results`, `render_events`, and `render_failures`. Artifact-first writes plus one fenced transaction and result replay prevent false or duplicate completion.

## Evidence

Production source is `packages/browser-runtime`, `packages/rendering`, `packages/application-service`, and `packages/persistence-sqlite/src/render.ts`. Real Chromium fixtures cover static, JavaScript, SPA, bounded lazy, continuous mutation, long-lived EventSource, blank, timeout, redirects, blocked methods, safe evidence, and screenshot. Actual Windows Page/Browser process kills and artifact/DB fault injection prove recoverable outcomes. Contracts, CLI/Desktop, architecture, security, docs, and OKF validators are registered evidence.

## Security and limitations

Every request/redirect is pre-dispatch authorized; production private/loopback/link-local/reserved/mixed DNS and non-GET/HEAD requests fail closed. Context state is ephemeral and the renderer has no Browser privilege. Linux/macOS provisioning, OS memory telemetry, DNS connection pinning, and retention policy remain unresolved. Link Discovery, human-paced interaction, authentication, proxies, assets, rewriting, API capture, and a complete archive remain PLANNED.

## Next phase

Product Phase 9 — Link Discovery and SPA Support.
