# System Context

## Product Phase 8 context

An authorized operator selects a Project/queued Job through Desktop or CLI. Application Service composes the Scope/Queue/Recovery stores with Browser Runtime and Rendering Engine. Owned Chromium may contact only runtime-authorized destinations; deterministic loopback is test-only. Final rendered artifacts remain inside the Project. There is no automatic discovery, Asset Downloader, authentication provider, proxy, remote control service, or external telemetry actor.

In Product Phase 8 the authorized local user can manage a portable Project/Profile, evaluate scope, queue an eligible Page Job, and run one controlled Browser Render through contract 1.5.0. Owned Chromium and the system DNS resolver are now runtime actors behind authorization; proxies, authentication services, production downloaders, discovery Workers, and Worker Pools remain outside the running system.

The English Electron Desktop and internal CLI call one local Application Service. The service composes Archive Core ports, Scope/Queue/Recovery/Rendering policy, Browser Runtime, and the Node SQLite adapter. SQLite schema 6 persists Leases, Checkpoints, Run control, Recovery, Render, output, and execution-session state. The Render Runtime can make only authorized outbound GET/HEAD requests; fixture servers are test-only and no production network listener exists.

```mermaid
flowchart LR
  User["Authorized local user"] --> Desktop["Isolated Desktop"]
  User --> CLI["Internal CLI"]
  Desktop --> Service["Application Service"]
  CLI --> Service
  Service --> Core["Archive Core ports/models"]
  Service --> Scope["Scope Engine 1"]
  Service --> Queue["Queue policy 1"]
  Service --> Persistence["SQLite adapter / schema 6"]
  Service --> Browser["Owned Chromium Browser Runtime"]
  Persistence --> Files["Portable Project directory / ZIP"]
  Contracts["Contract 1.4.0"] -.-> Desktop
  Contracts -.-> CLI
  Contracts -.-> Service
```

Queue claims do not represent an actual Worker. Lease ownership, Heartbeats, Checkpoints and recovery are Product Phase 7; rendering, discovery, downloading, authentication, proxies, archive output/runtime, and release packaging remain future capabilities.
