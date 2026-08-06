# System Map

Desktop Renderer flows through the Preload Bridge and Electron IPC Adapter to the Application Service and Archive Core. CLI uses an in-process adapter to the same Application Service and Archive Core.

Requests and responses use transport-neutral Contracts 1.6.0 at the documented
interface boundary. Phase 10 interaction commands remain bounded and carry
typed character counts rather than raw text.

The interaction path is `CLI/Desktop -> Application Service -> Archive Core
policy -> Browser Runtime adapter -> SQLite Trace`; raw Playwright handles stay
inside Browser Runtime. Discovery-generated candidate flow is not drawn as a
live edge because the Phase 9 prerequisite is missing.
