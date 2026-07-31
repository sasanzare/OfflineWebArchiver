# Dependency Map

Product Phase 5 adds one direct runtime dependency: `@offline-web-archive/scope-engine -> tldts@7.4.9` (MIT, bundled Public Suffix List, no runtime network). Scope Engine also uses existing exact `zod@4.4.3`. Application Service and SQLite persistence depend on the Scope Engine public package; apps still depend on Application Service/contracts rather than persistence internals.

Product Phase 6 adds the internal `@offline-web-archive/queue@0.6.0` workspace and no external runtime dependency. Applications depend on contract/Application Service public entries; Application Service depends on Archive Core, Scope Engine, Queue policy and repository interfaces; SQLite persistence implements the Queue port and may depend on pure Queue policy. Desktop/CLI never depend on persistence. Queue/Core never depend on SQLite, Electron, browser/network, Worker, Lease, Heartbeat, or Checkpoint APIs.

Dependencies point inward: application shells -> application service -> core. Contracts are transport-neutral. Platform and observability are narrow adapters. No production dependency points to `spikes/`.
