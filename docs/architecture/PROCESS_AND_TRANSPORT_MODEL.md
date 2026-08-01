# Process and Transport Model

## Product Phase 7 transport

Contract 1.4 adds Recovery, Run, Lease, Checkpoint, Artifact Checkpoint, and recovery-aware Queue commands. Lease Tokens are accepted only on owner mutations and omitted from Lease/list/report/UI results. The Electron renderer retains the isolated two-method bridge. Process-kill helpers are tests, not a production worker process model.

Desktop renderer creates a strict contract command. Preload exposes only `execute` and `selectPath`. Main grants exact native-dialog-selected paths, verifies sender webContents/main frame/local URL and path grant, then invokes the same Application Service used by CLI. Renderer validates the returned envelope. No raw IPC, filesystem, SQLite, shell, or environment API crosses preload.

CLI parses bounded commands, constructs contract `1.4.0`, invokes Application Service in process, writes redacted logs to stderr, and returns human or JSON data on stdout. One-shot Profile/Scope/Queue/Recovery/Run/Lease/Checkpoint operations explicitly select and safely open/close a Project when needed. Desktop inspection/mutations use the same two-method bridge and exact path grant as Project operations.

Correlation/command/operation IDs remain unchanged. Claim tokens are contract data for a controlled local operation and are never exposed through logging. No HTTP boundary, Worker process, or direct renderer/CLI SQLite boundary exists. A future process/service split must retain contracts, authenticate the transport, and receive an ADR/threat review.
