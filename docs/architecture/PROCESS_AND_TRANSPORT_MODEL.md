# Process and Transport Model

## Product Phase 8 transport and process model

Contract 1.5 adds Browser info/validation/health/restart and Render start/status/result/events/cancel. Render start accepts an existing Project/Run/Job identity and policy, never an ad-hoc URL. The Electron renderer retains the isolated two-method bridge and never receives Playwright/raw Browser handles or executable paths. Actual process-kill helpers remain tests, not a production Worker model.

Desktop renderer creates a strict contract command. Preload exposes only `execute` and `selectPath`. Main grants exact native-dialog-selected paths, verifies sender webContents/main frame/local URL and path grant, then invokes the same Application Service used by CLI. Renderer validates the returned envelope. No raw IPC, filesystem, SQLite, shell, or environment API crosses preload.

CLI parses bounded commands, constructs contract `1.5.0`, invokes Application Service in process, writes redacted logs to stderr, and returns human or JSON data on stdout. Browser Process ownership remains inside one Application Service instance; `service.close()` closes it. Desktop inspection/mutations use the same two-method bridge and exact path grant as Project operations.

Correlation/command/operation IDs remain unchanged. Claim tokens are contract data for a controlled local operation and are never exposed through logging. No HTTP boundary, Worker process, or direct renderer/CLI SQLite boundary exists. A future process/service split must retain contracts, authenticate the transport, and receive an ADR/threat review.
