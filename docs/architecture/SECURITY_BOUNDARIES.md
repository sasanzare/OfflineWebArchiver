# Security Boundaries

Electron main is privileged; preload is a narrow capability boundary; renderer is untrusted. BrowserWindow uses context isolation, no Node integration, sandbox, and web security. Main denies permission requests/checks, downloads, new windows, webviews, and unexpected navigation. It loads only a bundled local file with a restrictive CSP and no remote resources.

IPC exposes one channel and authorizes exact webContents ID, main frame, and expected file URL. Contracts validate both directions. The smoke response contains no sensitive environment values. This baseline does not yet cover hostile archived content, target networking, credential stores, proxies, signing, or update delivery.

## Focused Review

| Boundary/topic | State | Product Phase 3 finding |
|---|---|---|
| Renderer isolation and raw IPC | Implemented | Sandbox/context isolation/web security enabled; Node integration off; `require`, `process`, and raw `ipcRenderer` absent in the real smoke |
| Preload and IPC sender | Implemented | One `systemDescribe` method/channel; sender webContents, main frame, and exact local file URL required |
| Contract validation and errors | Implemented | Strict schemas on both directions; unsupported input fails; user errors expose no stack or raw exception |
| Logging redaction | Implemented | Structured correlation; recursive secret-like key redaction; no persistent/external sink |
| Paths, shell, network service | Implemented absence | Phase 3 public contracts accept no path or shell command; apps/packages invoke no child process and open no server |
| Navigation and external content | Implemented | New windows, navigation, webviews, permissions, and downloads denied; local assets only; CSP present |
| Dependency/workspace boundary | Implemented | Exact versions, one lockfile, exact install-script allowlist, public exports, import/cycle/runtime-dependency checks |
| Future secrets | Planned | Authentication/session/proxy/signing storage requires protected-store decisions and leakage tests; no Phase 11 secret store is claimed |
| Future untrusted archive content | Planned | Separate origin/CSP/scripting/service-worker/download/network containment threat model is required before P11/P19 |
| Cross-platform sandbox behavior | Unknown | Linux/macOS runtime/security behavior is not executed in Phase 3 |
| Remote telemetry/update/service | Deferred | No telemetry, updater, loopback Application Service, or remote service is introduced; owner/release decisions remain open |
