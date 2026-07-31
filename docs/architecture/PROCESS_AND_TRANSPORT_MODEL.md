# Process and Transport Model

Desktop path: renderer creates a strict command -> preload exposes `systemDescribe` -> one allowlisted `ipcMain.handle` validates sender/frame/local URL -> Application Service validates/orchestrates -> Core owns domain result -> response schema validates -> renderer validates and displays.

CLI path: argument parser -> local in-process adapter -> the same Application Service -> Core -> response validator -> human or JSON formatter. Logs remain on stderr; structured data remains on stdout.

Correlation and command IDs pass unchanged end to end. There is no Phase 3 HTTP boundary. A future out-of-process service must retain contract compatibility, authenticate its transport, and receive an ADR/threat review.
