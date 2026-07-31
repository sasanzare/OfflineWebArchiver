# Component Boundaries

| Component | Owns | May depend on | Must not own |
|---|---|---|---|
| `archive-core` | Pure domain `describeSystem` result | Nothing | Electron, CLI, Node/platform APIs, persistence |
| `application-service` | Use-case orchestration, validation/error translation, Core composition | Core, contracts, observability | UI or transport implementation |
| `contracts` | Runtime schemas and public envelope types | Zod | Core/service/app implementation |
| `platform` | Minimal runtime/platform facts and allowlisted config | Contracts, Node | Business logic or environment dump |
| `observability` | Structured log shape and redaction | Nothing | File/network sinks |
| `desktop` | BrowserWindow, preload, renderer, IPC adapter | Public service/contracts/adapters | Core internals, remote content |
| `cli` | Arguments, output, exit codes, local adapter | Public service/contracts/adapters | Core internals |
| `test-support` | Deterministic fixtures | Contracts, observability | Runtime app dependencies |

Public entry points are the only cross-workspace import surface. Test helpers are not runtime dependencies.
