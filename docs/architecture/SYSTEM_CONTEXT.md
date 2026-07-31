# System Context

The authorized local user operates the English Electron desktop or internal CLI. Both call one local Application Service through contract `1.1.0`. Archive Core owns domain/storage-port types; the service composes the Node SQLite adapter. Product Phase 4 opens no network listener and contacts no website.

```mermaid
flowchart LR
  User["Authorized local user"] --> Desktop["Desktop Interface"]
  User --> CLI["Internal CLI"]
  Desktop --> Service["Local Application Service"]
  CLI --> Service
  Service --> Core["Archive Core ports/domain"]
  Service --> Persistence["SQLite Project adapter"]
  Persistence --> Format["Portable Project format"]
  Persistence --> Files["Local Project directory / ZIP"]
  Contracts["Contract 1.1.0"] -.-> Desktop
  Contracts -.-> CLI
  Contracts -.-> Service
```

External targets, browser engines, protected stores, proxy services, and release infrastructure remain outside the implemented context.
