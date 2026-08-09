# Trust Zones and IPC

Phase 13 names three zones:

1. Trusted Application UI: the Electron renderer loaded from the expected local
   renderer file. It receives only the narrow preload bridge.
2. Privileged Application Service: the local service that owns command schema
   validation, Project/SQLite, Browser Runtime orchestration, and Secret Store
   access.
3. Untrusted Archive Runtime: a future isolated surface for archived HTML/JS.

The current desktop application does not load archived HTML in the trusted UI.
Its enforced baseline is `contextIsolation=true`, `nodeIntegration=false`,
`sandbox=true`, `webSecurity=true`, denied permissions/downloads/popups/webviews,
and exact renderer navigation. The IPC handler validates the sender window,
sender frame, exact renderer URL, command type allowlist, and approved path set
before the Application Service sees a command. The Service then validates the
versioned command envelope and payload schema and applies transport
authorization.

The future archive runtime must have no preload, no IPC bridge, no Node
integration, and no external navigation. It may read only explicitly approved
archive content through a non-privileged runtime contract. It cannot read
Project databases, Secret Store payloads, Session Storage State, or invoke
privileged commands. A separate window/context is mandatory.

Evidence: [ADR-052](../project/adr/ADR-052-trust-zones-and-privilege-boundaries.md),
[desktop main](../../apps/desktop/src/main/index.ts), and the desktop smoke and
transport tests.

