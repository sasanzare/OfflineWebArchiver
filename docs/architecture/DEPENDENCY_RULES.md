# Dependency Rules

## Product Phase 8 rules

Only `packages/browser-runtime` may import `playwright-core`. `packages/rendering` uses Archive Core `BrowserPageSession`/`RenderEnginePort` only and must not import Playwright, SQLite, Desktop, or CLI. Archive Core must remain free of Playwright/browser paths and operating-system process APIs. Application Service may compose Browser/Rendering/Recovery ports but must not expose raw Browser objects. Desktop and CLI may depend only on public contract/service entries. Production code must not import `spikes/`, test fixtures, or generated Browser resources.

## Product Phase 7 rule

The permitted path is Desktop/CLI → contracts → Application Service → Core ports, with `persistence-sqlite` and platform adapters injected outside Core. `recovery` → `archive-core` is permitted; Core/Recovery/Queue → SQLite/Electron/browser/network is forbidden. Production source may not import the local Range fixture or process-kill helpers.

Scope Engine remains limited to computational URL/crypto APIs, Zod, and `tldts`. Phase 6 Queue may depend on Archive Core plus computational UUID/hash facilities but cannot import filesystem, SQLite, applications, services, Electron, browser/network/Worker/Lease APIs, or test support. Persistence implements Core ports and may use Queue pure policy; Application Service composes Scope and Queue. Architecture validation enforces this graph.

```text
desktop / cli -> application-service -> archive-core
                       |
                       +-> queue -> archive-core
                       +-> persistence-sqlite -> archive-core / queue
                       |          |
                       |          +-> project-format
                       +-> contracts / observability
apps -> contracts / platform / observability
tests -> public entries + test-support
```

`archive-core` imports no app, service, Node, SQLite, path, ZIP, Electron, CLI, platform, test, or spike module. `project-format` is portable validation only. Apps cannot import persistence directly; renderer cannot import Node/Electron/service/Core. Packages cannot import apps; public deep source imports, cycles, runtime test support, production spike dependencies, and Phase 7 Lease/Heartbeat fields in Phase 6 Queue code are forbidden. `npm run test:architecture` enforces allowlists, manifests, cycles, entries, Core purity, Queue purity, and Desktop settings.
