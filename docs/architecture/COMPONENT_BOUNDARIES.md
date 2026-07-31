# Component Boundaries

Scope Engine owns Profile runtime validation and URL/scope identity. Archive Core owns Queue models and the repository port; the Queue package owns pure state, ordering, retry, idempotency, and redaction policy. Persistence owns locking, SQLite transactions/schema/history and file consistency. Application Service owns Scope re-evaluation, ownership checks, command orchestration, and error translation. Contracts own transport validation. Desktop/CLI own presentation only.

| Component | Owns | May depend on | Must not own |
|---|---|---|---|
| `archive-core` | Domain capability/status, Project/Queue ports/types/errors | Nothing | SQLite, Node paths/files, ZIP, Electron, CLI |
| `queue` | Pure Job state/priority/order/retry/idempotency/result/redaction policy | Archive Core | SQLite, filesystem, Electron, CLI, browser/network/worker/Lease APIs |
| `project-format` | Manifest/version/path/archive-name contract | Zod | Filesystem, SQLite, app/service |
| `persistence-sqlite` | SQLite schema/repositories, Queue transactions/history, migrations/backups, atomic files, ZIP, locks | Core ports, Queue, Project Format, observability, Node, fflate | UI, transport, crawler policy |
| `application-service` | Use-case orchestration, contract/error translation, composition | Core, contracts, persistence port adapter, observability | UI/IPC/CLI formatting |
| `contracts` | Runtime command/result/event/error schemas | Zod | Core/service/app implementation |
| `platform` | Runtime/platform facts and allowlisted config | Contracts, Node | Business logic/environment dump |
| `observability` | Structured log/redaction | Nothing | Durable file/network sink |
| `desktop` | Secure window, native path grants, IPC, English UI | Public service/contracts/adapters | Direct persistence/SQLite/Core internals |
| `cli` | Arguments, output, exit codes | Public service/contracts/adapters | Direct persistence/SQLite/Core internals |
| `test-support` | Deterministic fixtures | Contracts, observability | Runtime dependencies |

Only built public package entries may cross workspaces. Production never imports tests, the Phase 2 spike, or app internals.
