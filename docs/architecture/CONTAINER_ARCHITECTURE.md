# Container Architecture

| Runtime container | Process | Responsibility | Trust level |
|---|---|---|---|
| Electron main | Desktop process | Compose service/storage, native path grants, authorize IPC, own Project session | Privileged local |
| Electron preload | Sandboxed renderer preload | Expose validated execute and native-selection capabilities | Narrow bridge |
| Electron renderer | Sandboxed Chromium frame | English Project lifecycle UI | Unprivileged |
| CLI | Node process | Parse Project commands, compose service, format output/exits; open is one-shot | Privileged terminal |
| Application Service | Caller process | Validate/orchestrate/translate contracts | No UI |
| SQLite adapter | Caller main/CLI process | Project filesystem, SQLite, migrations, ZIP, locks | Local I/O boundary |

Desktop and CLI do not communicate. No loopback service, database daemon, browser automation process, network client, or worker pool exists. A future utility process requires a new ADR and contract-preserving threat review.
