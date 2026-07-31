# Dependency Rules

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
