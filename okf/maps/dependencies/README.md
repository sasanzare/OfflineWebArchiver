# Dependency Map

Product Phase 5 adds one direct runtime dependency: `@offline-web-archive/scope-engine -> tldts@7.4.9` (MIT, bundled Public Suffix List, no runtime network). Scope Engine also uses existing exact `zod@4.4.3`. Application Service and SQLite persistence depend on the Scope Engine public package; apps still depend on Application Service/contracts rather than persistence internals.

Product Phase 8 adds internal `@offline-web-archive/browser-runtime@0.8.0`, `@offline-web-archive/rendering@0.8.0`, and exact external `playwright-core@1.56.1`. Applications depend on contract/Application Service public entries; Application Service composes Core Scope/Queue/Recovery/Browser/Render ports; SQLite persistence implements durable ports. Only Browser Runtime imports Playwright. Desktop/CLI never depend on Playwright or persistence; Core/Queue/Recovery/Rendering remain SQLite/Electron-independent.

Dependencies point inward: application shells -> application service -> core. Contracts are transport-neutral. Platform and observability are narrow adapters. No production dependency points to `spikes/`.
