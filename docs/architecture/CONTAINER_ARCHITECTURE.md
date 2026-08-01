# Container Architecture

## Product Phase 8 containers

`browser-runtime` is the Playwright infrastructure adapter; `rendering` is pure orchestration; `application-service` owns the use case; `persistence-sqlite` owns schema 6 and artifact commit; `contracts` owns transport 1.5; Desktop/CLI remain presentation adapters. The owned Chromium executable is a packaged runtime resource, not a code package or Project artifact. Architecture gates enforce the dependency arrows.

Application Service composes the pure Scope Engine and Queue policy with Project/Profile/Queue repository ports. Persistence SQLite implements those ports and all Queue transaction boundaries; applications never import the adapter or engine internals directly. Profile JSON is portable Project policy and Queue rows are portable Project database state.

| Runtime container | Process | Responsibility | Trust level |
|---|---|---|---|
| Electron main | Desktop process | Compose service/storage, native path grants, authorize IPC, own Project session | Privileged local |
| Electron preload | Sandboxed renderer preload | Expose validated execute and native-selection capabilities | Narrow bridge |
| Electron renderer | Sandboxed Chromium frame | English Project/Profile/Scope/Queue inspection and controlled test UI | Unprivileged |
| CLI | Node process | Parse bounded Project/Profile/Scope/Queue commands, compose service, format output/exits | Privileged terminal |
| Application Service | Caller process | Validate/orchestrate/translate contracts | No UI |
| SQLite adapter | Caller main/CLI process | Project filesystem, schema 6 Queue/Lease/Checkpoint/Recovery/Render repositories and transactions, migrations, output verification, ZIP, locks | Local I/O boundary |
| Browser Runtime | Owned Chromium child process | Executable validation, Process/Context/Page lifecycle, request authorization, safe evidence | Privileged browser boundary |
| Rendering Engine | Caller main/CLI process | Bounded navigation/stability/extraction policy through Core port | Browser-independent policy boundary |

Desktop and CLI do not communicate. Queue claims are synthetic in-process operations, not Worker processes. No loopback service, database daemon, browser automation process, network client, Worker Pool, Lease, or Heartbeat exists. A future utility process requires a new ADR and contract-preserving threat review.
