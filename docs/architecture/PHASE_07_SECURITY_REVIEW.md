# Product Phase 7 Security Review

## Reviewed surfaces

Lease acquisition/renewal, stale-owner writes, Checkpoint payloads, recovery reports, partial paths, completed outputs, CLI/Desktop bridges, logs, migrations, and concurrency were reviewed.

## Controls verified

Lease Tokens are random capability values. `job_leases` stores a SHA-256 verification digest; the Phase 6 Queue/attempt/idempotency ledgers retain the active credential to preserve durable identical-claim replay. The owner claim response and protected mutation inputs may carry it, while ordinary inspection/list/report output, logs, CLI display, and Desktop display omit or redact it. Project/Run/Job ownership plus Fencing Generation and expiry are checked on every protected write. SQL is parameterized; recovery batches and list/payload sizes are bounded. Checkpoint secret-like keys fail closed. Artifact/output paths are portable, traversal-safe, root-bounded, and symlinks fail verification. Recovery is inspect-only on Project open and confirmed/idempotent when mutating.

## Adversarial evidence

Unit tests cover boundary expiry, secret payloads, invalid paths, size/depth bounds, validator changes, and hash mismatch. Concurrency tests cover duplicate claim/recovery and stale generations. Process-kill tests cover durable crash points. CLI/Electron smoke tests confirm the isolated command boundary and token omission. `tools/security/check.mjs` statically guards renderer imports and secret output.

## Residual risk

The local Project database contains active owner credentials for Phase 6 compatibility/idempotent replay and is not encrypted or protected-store sealed; filesystem access control and Project locking are coordination controls, not confidentiality controls. Clock synchronization across future machines, retention/growth, very large hash cost, disk exhaustion, shared-filesystem locking, and production downloader/Worker Pool integration also remain open. There is no browser, external network dispatcher, credential store, proxy, or production Asset Downloader in Phase 7.
