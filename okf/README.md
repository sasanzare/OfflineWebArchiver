# Canonical OKF

Canonical OKF is synchronized and `VERIFIED` through Product Phase 7 (2026-08-01). The activated versions are application 0.7.0, contract 1.4.0, SQLite schema 5/migration 005, Queue state machine 2, and Recovery/Checkpoint/Lease configuration 1. Product Phase 8 browser lifecycle/rendering and Phase 9 production Asset Downloader remain `PLANNED`.

This directory is the active Organizational Knowledge Framework for Offline Web Archive Builder through Product Phase 6. Machine-readable registries are authoritative for current identifiers, links, statuses, phases, and evidence references. Product and project documents remain source authority for requirements, acceptance criteria, risks, and decisions.

Run `npm run okf:validate` after any relevant source, contract, test, documentation, phase, decision, risk, or evidence change. The validator reports errors and never repairs records. `npm run okf:migrate` verifies that the bootstrap-preserving migration remains materialized.

`okf-bootstrap/` is preserved as historical bootstrap evidence. Its proposed structure is superseded by this canonical structure, but its unresolved questions remain active where the decision registry says `UNKNOWN` or `NEEDS_OWNER_CONFIRMATION`.

Product Phase 6 evidence remains preserved for Queue state/priority policy 1, SQLite schema 4/migration 004, Page Job identity/deduplication, discovery/attempt/transition/idempotency ledgers, atomic token-fenced claims/terminal writes, retry foundations, contract 1.3.0, CLI/Desktop inspection, and real concurrency/security tests. Product Phase 7 supersedes only the former non-expiring-claim limitation with schema 5 Lease/Fencing/Checkpoint/Recovery behavior. Crawling, DNS/network dispatch, browser rendering, authentication, proxies, capture/rewrite/runtime, and production packaging remain planned.
