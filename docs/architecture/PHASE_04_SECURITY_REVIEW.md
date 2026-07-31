# Product Phase 4 Security Review

## Scope

Reviewed Project manifest/path trust, local filesystem writes, SQLite configuration/migration/backup, lock coordination, ZIP export/import, contracts, CLI, Electron IPC/dialog grants, logging, dependencies, and phase boundaries. Crawling, HTTP, browser rendering, auth, proxies, queues, runtime server, and archive rewriting are absent.

## Threats and controls

| Threat | Control | Evidence |
|---|---|---|
| Path traversal/host overwrite | Strict portable path grammar, exact staging root, atomic non-overwrite | Path corpus and failed-import tests |
| ZIP bomb/parser ambiguity | Central preinspection, parser entry-set agreement, entry/byte/ratio limits | Archive negative tests |
| ZIP symlink/alias | Reject special Unix entries, backslash, duplicate, case/Unicode collision | Archive negative tests |
| Database tamper/corruption | Strict migrations/checksums, integrity check, metadata identity comparison | Migration/integration tests |
| Partial upgrade/write | SQLite backup API, transaction rollback, sibling atomic replacement | Legacy/failure/atomic tests |
| Concurrent writers | Owned lock plus `BEGIN IMMEDIATE` | Lock/storage concurrency tests |
| Renderer filesystem access | Sandboxed isolated renderer, no Node, main native selection grants, one validated execute bridge | Real Electron smoke/security check |
| Secret/export leakage | No secret schema, excluded auth/proxy/log/temp/backups/locks, redacted structured logs | Export inventory/log assertions |
| Native dependency supply chain | Built-in SQLite; exact pure-JS fflate; exact lockfile and zero-audit check | Lockfile/dependency validation |

## Residual risk

ZIP is in-memory and bounded, not streaming/ZIP64. SHA-256 detects corruption but does not authenticate an exporter. Locks do not defend against hostile local writers, PID reuse, or network filesystems. Same-filesystem rename durability varies. Backup retention/restore UX is open. Cross-OS packaged transfer remains Product Phase 25. These limitations do not authorize weakening validation.

## Outcome

No Phase 4 high-severity defect is known after automated validation. R-012/R-013 controls are implemented for the foundation but stay open for later recovery/scale phases. R-045/R-046 track hostile import and lock limitations. Future sensitive directories and data require their own security phases.
