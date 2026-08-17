# Container Architecture

## Product Phase 8 containers

`browser-runtime` is the Playwright infrastructure and browser-native interaction adapter; `rendering` is pure orchestration; `application-service` owns the use case; `persistence-sqlite` owns schema 7, artifact commit, and redacted Interaction traces; `contracts` owns transport 1.6; Desktop/CLI remain presentation adapters. The owned Chromium executable is a packaged runtime resource, not a code package or Project artifact. Architecture gates enforce the dependency arrows.

Application Service composes the pure Scope Engine and Queue policy with Project/Profile/Queue repository ports. Persistence SQLite implements those ports and all Queue transaction boundaries; applications never import the adapter or engine internals directly. Profile JSON is portable Project policy and Queue rows are portable Project database state.

| Runtime container | Process | Responsibility | Trust level |
|---|---|---|---|
| Electron main | Desktop process | Compose service/storage, native path grants, authorize IPC, own Project session | Privileged local |
| Electron preload | Sandboxed renderer preload | Expose validated execute and native-selection capabilities | Narrow bridge |
| Electron renderer | Sandboxed Chromium frame | English Project/Profile/Scope/Queue inspection and controlled test UI | Unprivileged |
| CLI | Node process | Parse bounded Project/Profile/Scope/Queue commands, compose service, format output/exits | Privileged terminal |
| Application Service | Caller process | Validate/orchestrate/translate contracts | No UI |
| SQLite adapter | Caller main/CLI process | Project filesystem, schema 7 Queue/Lease/Checkpoint/Recovery/Render/Interaction repositories and transactions, migrations, output verification, ZIP, locks | Local I/O boundary |
| Browser Runtime | Owned Chromium child process plus separate loopback adapter | Executable validation, Process/Context/Page lifecycle, request authorization, safe evidence; Phase 19 map-bounded Local Runtime serving | Privileged browser boundary; Local Runtime is non-privileged |
| Rendering Engine | Caller main/CLI process | Bounded navigation/stability/extraction policy through Core port | Browser-independent policy boundary |

Desktop and CLI do not communicate. Queue claims are synthetic in-process operations, not Worker processes. Phase 19 adds only the assigned Project Revision's non-privileged loopback Local Runtime; there is no database daemon, public network service, browser automation process, network client, Worker Pool, Lease, or Heartbeat. A future utility process requires a new ADR and contract-preserving threat review.
