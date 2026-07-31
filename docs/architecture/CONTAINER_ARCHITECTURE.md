# Container Architecture

| Runtime container | Process | Responsibility | Trust level |
|---|---|---|---|
| Electron main | Desktop process | Compose service, create secure window, authorize IPC | Privileged local |
| Electron preload | Sandboxed renderer preload | Expose one typed method | Narrow bridge |
| Electron renderer | Sandboxed Chromium frame | English architecture status UI | Unprivileged |
| CLI | Node process | Parse args, compose service, format output/exit | Privileged local terminal |
| Application packages | Same caller process | Validate, orchestrate, describe Core | No direct external I/O |

Desktop and CLI do not communicate with each other. No loopback service, database process, browser automation process, or worker pool exists in production Phase 3.
