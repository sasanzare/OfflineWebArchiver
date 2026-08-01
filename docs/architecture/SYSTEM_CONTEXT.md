# System Context

In Product Phase 7 the authorized local user can manage a portable Project/Profile, evaluate local URL scope, enqueue synthetic Page Jobs, and operate Queue/Lease/Checkpoint/Recovery/Pause controls through contract 1.4.0. Websites, DNS resolvers, proxies, remote services, browser engines, production downloaders, and Worker Pools remain outside the running system.

The English Electron Desktop and internal CLI call one local Application Service. The service composes Archive Core ports, pure Scope/Queue/Recovery policy, and the Node SQLite adapter. SQLite schema 5 also persists Leases, Checkpoints, Run control, recovery/output/session state. No production network listener or website request exists; the Range server is test-only.

```mermaid
flowchart LR
  User["Authorized local user"] --> Desktop["Isolated Desktop"]
  User --> CLI["Internal CLI"]
  Desktop --> Service["Application Service"]
  CLI --> Service
  Service --> Core["Archive Core ports/models"]
  Service --> Scope["Scope Engine 1"]
  Service --> Queue["Queue policy 1"]
  Service --> Persistence["SQLite adapter / schema 5"]
  Persistence --> Files["Portable Project directory / ZIP"]
  Contracts["Contract 1.4.0"] -.-> Desktop
  Contracts -.-> CLI
  Contracts -.-> Service
```

Queue claims do not represent an actual Worker. Lease ownership, Heartbeats, Checkpoints and recovery are Product Phase 7; rendering, discovery, downloading, authentication, proxies, archive output/runtime, and release packaging remain future capabilities.
