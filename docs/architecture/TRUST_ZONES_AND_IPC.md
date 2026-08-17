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

Phase 14 OTP and Element Picker commands remain inside the trusted local UI to
privileged Application Service path. The Picker overlay runs in the already
authorized manual Authentication page and returns only a versioned locator
descriptor. It does not install a preload bridge, expose a capability token,
read form values, or provide any path from the page to Secret Store or SQLite
payloads. Untrusted archived content cannot invoke these commands.

The Phase 19 archive runtime follows that boundary: it has no preload, no IPC
bridge, no Node integration, and no external navigation. It reads only
explicitly approved Route/Original Resource mapped content through the
loopback-only Local Runtime contract. It cannot read Project databases, replay
body storage directly, Secret Store payloads, Session Storage State, or invoke
privileged commands. Network Replay is enforced by the Browser Runtime at
Context/CDP request interception, not by archive page code. A separate
window/context is mandatory.

Evidence: [ADR-052](../project/adr/ADR-052-trust-zones-and-privilege-boundaries.md),
[desktop main](../../apps/desktop/src/main/index.ts), and the desktop smoke and
transport tests.

