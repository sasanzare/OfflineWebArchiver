# System Map

Desktop Renderer flows through the Preload Bridge and Electron IPC Adapter to the Application Service and Archive Core. CLI uses an in-process adapter to the same Application Service and Archive Core.

Requests and responses use transport-neutral Contracts 1.0.0 at the documented interface boundary.
