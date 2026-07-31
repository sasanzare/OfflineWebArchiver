# Process and Transport Model

Desktop renderer creates a strict contract command. Preload exposes only `execute` and `selectPath`. Main grants exact native-dialog-selected paths, verifies sender webContents/main frame/local URL and path grant, then invokes the same Application Service used by CLI. Renderer validates the returned envelope. No raw IPC, filesystem, SQLite, shell, or environment API crosses preload.

CLI parses bounded commands, constructs contract `1.1.0`, invokes Application Service in process, writes logs to stderr, and returns human or JSON data on stdout. `project open` and export close their session before the one-shot process exits.

Correlation/command IDs remain unchanged. No HTTP boundary exists. A future process/service split must retain contracts, authenticate the transport, and receive an ADR/threat review.
