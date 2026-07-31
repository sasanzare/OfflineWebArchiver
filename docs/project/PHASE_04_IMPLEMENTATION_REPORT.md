# Product Phase 4 Implementation Report

**Phase:** Product Phase 4 — Project Format, SQLite, and Migration  
**Status:** Implemented; final evidence is produced by repository validation commands  
**Date:** 2026-07-31  
**Branch:** `main`  
**Commit/push/tag:** Not performed by Codex

## Outcome

The production system can create, validate, open, migrate, close, export, import, inspect, and move a versioned portable Project. Project format is `1.0.0`, transport contract is `1.1.0`, application/workspaces are `0.4.0`, and SQLite schema is 2. Project, Revision, and Run identities persist in manifest and database. Desktop and CLI exercise the same Application Service/storage port.

No Phase 5 URL normalization/scope/profile behavior and no queue, crawl, browser, auth, proxy, capture, rewrite, runtime-server, worker, lease, or release behavior was implemented.

## Production architecture

New `project-format` owns strict manifest/version/path/archive-name rules without Node APIs. New Node-only `persistence-sqlite` implements the Archive Core storage port, SQLite schema/migrations/backups, atomic files, locks, and bounded ZIP. Application Service performs use-case dispatch and stable error translation. Apps import no persistence adapter directly.

The SQLite choice is built-in `node:sqlite`, verified in Node 24.17 and the Electron 43 process. ZIP uses exact `fflate@0.8.3`; it is the only added third-party dependency. Root npm audit reports zero known vulnerabilities at implementation time.

## Format, schema, and migration

The manifest has strict UUID/UTC/version/relative-path/lifecycle/compatibility/future-disabled fields and deterministic LF JSON. The canonical database is `database/crawl.db`. Its only tables are `schema_migrations`, `project_metadata`, `project_revisions`, `runs`, and `project_events`.

Two realistic forward migrations establish base identity state and the lifecycle event ledger. Applied checksums are immutable. Open performs validation first, locks, uses the SQLite backup API before pending work, applies each migration transactionally, and synchronizes manifest/metadata only after success. Schema 1 to 2 is an exercised compatibility path; newer/unknown/downgrade is rejected.

## File safety and portability

Atomic writes use exclusive same-directory temporary files, flush/close/rename, explicit overwrite policy, symlink checks, and owned cleanup. Create/import validate a sibling staging directory before final promotion. Portable paths reject traversal, absolute/drive/UNC/backslash, controls, reserved device names, non-NFC spelling, and aliases.

ZIP export snapshots SQLite and inventories approved files with SHA-256. Locks, WAL/SHM, temp, logs, backups, auth, proxies, and unknown roots are excluded. Import preinspects central metadata, enforces compressed/expanded/single-entry/count/ratio limits, rejects special/duplicate/unsafe/undeclared entries, verifies checksums, extracts to staging, and validates identity/database before promotion.

## Interfaces

Contract `1.1.0` defines eight commands, result unions, the expanded stable error catalog, and progress/completion event envelopes. CLI implements `system describe` and Project `create/open/validate/export/import/info`, human/JSON output, and stable exits. Desktop presents minimal English Project controls. Its renderer is sandboxed and receives no filesystem/SQLite primitive; native selection grants exact paths and sender/frame/URL checks protect IPC.

## Verification coverage

Automated coverage includes strict format/version/ID/path rules, cross-platform collision corpus, migration definition/order/checksum and injected rollback, atomic replacement, lock contention/stale state, hostile/corrupt/oversized ZIP, complete Project lifecycle/move/export/import/identity/exclusions, legacy migration/backup, corruption/metadata/checksum mismatch, no final failed import, service/contracts, built CLI all-operation smoke, and real Electron all-operation smoke.

The authoritative commands are:

```text
npm run typecheck
npm run build
npm test
npm run lint
npm run format:check
npm run test:architecture
npm run contracts:check
npm run project-format:validate
npm run migrations:validate
npm run security:check
npm run docs:validate
npm run okf:validate
```

Final command results and repository status are recorded in `HANDOFF.md`; generated build/test outputs are not committed.

## Decisions and risks

ADR-009..014 accept format 1.0.0, built-in Node SQLite, forward migration/backup, atomic replacement, bounded ZIP, and single-writer lock. OD-013 is resolved. OD-014 is resolved for the bounded Phase 4 container but requires high-volume/ZIP64 review before final transfer claims. OD-023 is resolved only for mandatory pre-migration backup; retention/restore remains open.

R-012 and R-013 retain later recovery/scale exposure. R-045 covers hostile/costly archive import and R-046 covers advisory lock/PID/network-filesystem limitations. No risk is closed solely by documentation.

## Next phase

The exact next phase is **Product Phase 5 — Profile, Scope, and URL Normalization**: define the profile contract, authorization/scope inputs, deterministic URL identity, allow/deny and redirect policy, and safe-method decisions before any network dispatch. It must not yet implement persistent crawl queues or browser crawling.
