# System Context

## Product Phase 8 context

An authorized operator selects a Project/queued Job through Desktop or CLI. Application Service composes the Scope/Queue/Recovery stores with Browser Runtime and Rendering Engine. Owned Chromium may contact only runtime-authorized destinations; the Phase 19 archive preview uses only its assigned exact loopback Local Runtime origin. Final rendered artifacts remain inside the Project. Phase 17 adds an explicit scheduler-bound Asset pipeline, and Phase 18 transforms stored rendered content into separate derived HTML/maps without network access. There is no automatic discovery, authentication provider, proxy, remote control service, or external telemetry actor.

In the current baseline the authorized local user can manage a portable Project/Profile, evaluate scope, queue an eligible Page Job, and run controlled Browser Contexts through contract 1.11.0. A bounded approved Interaction Plan can also run through the Browser Runtime foundation, and a privileged Secret Store can manage opaque references/encrypted values without exposing them to the general transport. Phase 13 additionally persists Crawl Run state and defines replay/offline, Service Worker, canonical path, trust-zone, and concurrency contracts. Phase 14 adds versioned Locator/Login Flow descriptors, a temporary native Element Picker, and visible single/segmented OTP participation on an existing authenticated Session boundary; phone and OTP inputs remain ephemeral and are never persisted or emitted in diagnostics. Phase 16 adds the portable Worker Pool, shared Origin cooldown, request permits, and fail-closed proxy affinity boundary. Phase 17 adds explicit Asset source/content persistence and Phase 18 adds a pure rewrite/map transformation over stored output. Phase 19 adds reusable selective capture, deterministic replay enforcement, and map-bounded Local Runtime serving; production Application Service preview orchestration, Phase 9 discovery, target-site acceptance, and Phase 20 remain outside the current boundary. Owned Chromium and the system DNS resolver remain runtime actors behind authorization.

The English Electron Desktop and internal CLI call one local Application Service. The service composes Archive Core ports, Scope/Queue/Recovery/Rendering/Interaction/Scheduler policy, Browser Runtime, and the Node SQLite adapter. SQLite schema 13 persists Leases, Checkpoints, Run control/state, Recovery, Render, Interaction, Session metadata, Asset source/content/relation state, replay snapshots/events and response bodies, output, execution-session state, proxy metadata, and Project/Run/Origin cooldown state. The Render, Interaction, Worker Runtime, and Asset download paths can make only authorized outbound GET/HEAD requests; Phase 18 rewrite/map calls make no outbound requests; Phase 19 replay enforcement fulfills only captured GETs and aborts strict misses. The Local Runtime is a separate loopback-only mapped-resource server; fixture servers are test-only and no arbitrary production network listener exists.

```mermaid
flowchart LR
  User["Authorized local user"] --> Desktop["Isolated Desktop"]
  User --> CLI["Internal CLI"]
  Desktop --> Service["Application Service"]
  CLI --> Service
  Service --> Core["Archive Core ports/models"]
  Service --> Scope["Scope Engine 1"]
  Service --> Queue["Queue policy 1"]
  Service --> Persistence["SQLite adapter / schema 13"]
  Service --> Browser["Owned Chromium Browser Runtime"]
  Persistence --> Files["Portable Project directory / ZIP"]
  Contracts["Contract 1.11.0"] -.-> Desktop
  Contracts -.-> CLI
  Contracts -.-> Service
```

Queue claims do not represent an actual Worker. Lease ownership, Heartbeats, Checkpoints and recovery are Product Phase 7; discovery, target-site capture, production preview orchestration, and release packaging remain future or separately gated capabilities.
