# Dependency Map

Product Phase 5 adds one direct runtime dependency: `@offline-web-archive/scope-engine -> tldts@7.4.9` (MIT, bundled Public Suffix List, no runtime network). Scope Engine also uses existing exact `zod@4.4.3`. Application Service and SQLite persistence depend on the Scope Engine public package; apps still depend on Application Service/contracts rather than persistence internals.

Product Phase 7 adds internal `@offline-web-archive/recovery@0.7.0` and no external dependency. Applications depend on contract/Application Service public entries; Application Service depends on Archive Core, Scope/Queue/Recovery policy and ports; SQLite persistence implements Queue/Recovery ports. Desktop/CLI never depend on persistence. Queue/Recovery/Core never depend on SQLite, Electron, browser/network, or production Worker APIs.

Dependencies point inward: application shells -> application service -> core. Contracts are transport-neutral. Platform and observability are narrow adapters. No production dependency points to `spikes/`.
