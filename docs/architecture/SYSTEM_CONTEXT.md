# System Context

The authorized local user operates either the English Electron desktop shell or internal CLI. Both call the same local Application Service and Archive Core through contract 1.0.0. Product Phase 3 opens no network listener and contacts no target website.

```mermaid
flowchart LR
  User["Authorized local user"] --> Desktop["Desktop Interface"]
  User --> CLI["Internal CLI"]
  Desktop --> Service["Local Application Service"]
  CLI --> Service
  Service --> Core["Archive Core"]
  Service --> Adapters["Platform and observability adapters"]
  Contracts["Versioned contracts"] -.-> Desktop
  Contracts -.-> CLI
  Contracts -.-> Service
```

External targets, a browser engine, SQLite, protected stores, proxy services, and release infrastructure are outside the implemented context. They require their planned product phases and new threat/evidence review.
