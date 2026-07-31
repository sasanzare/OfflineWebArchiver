# Dependency Rules

```text
desktop / cli -> application-service -> archive-core
                       |
                       +-> persistence-sqlite -> archive-core
                       |          |
                       |          +-> project-format
                       +-> contracts / observability
apps -> contracts / platform / observability
tests -> public entries + test-support
```

`archive-core` imports no app, service, Node, SQLite, path, ZIP, Electron, CLI, platform, test, or spike module. `project-format` is portable validation only. Apps cannot import persistence directly; renderer cannot import Node/Electron/service/Core. Packages cannot import apps; public deep source imports, cycles, runtime test support, and production spike dependencies are forbidden. `npm run test:architecture` enforces allowlists, manifests, cycles, entries, Core purity, and Desktop settings.
