# ADR-014 — Single-Writer Project Lock

## Status

Accepted on 2026-07-31.

## Context

Desktop, CLI, migration, and export can otherwise mutate one Project concurrently and create split manifest/database state.

## Decision

Use one exclusive `.project.lock` JSON file containing version, random instance ID, PID, hostname, operation, and UTC creation time. The file is created with exclusive mode. An active same-host PID or any different-host lock fails with `PROJECT_LOCKED`; malformed locks fail with `PROJECT_LOCK_INVALID`. A same-host lock is reclaimed only when its PID is provably absent. Release verifies instance ownership. SQLite `BEGIN IMMEDIATE` remains the database-level migration guard.

The lock is a coordination mechanism, not an authorization or hostile-process security boundary. Open holds it until close. Export reuses the current lock or takes a temporary one. CLI open is deliberately an ephemeral open/close session.

## Consequences

Ordinary simultaneous Desktop/CLI writers fail clearly. PID reuse and network-shared filesystems remain limitations; a future multi-process worker design must revisit fencing.

## Alternatives

SQLite-only locking, OS-specific advisory locks, silently breaking every old lock, and multiple writers were rejected.

## Security Impact

Lock metadata has no secret and is excluded from export. An untrusted local user with filesystem write access can tamper with it, so it is not treated as access control.

## Portability Impact

The mechanism uses portable exclusive file creation and conservative host handling. Shared/network filesystem guarantees are not claimed.

## Testing Impact

Tests cover active-owner rejection, stale same-host recovery, ownership-checked release, and simultaneous storage opens. Electron and CLI exercise clean close paths.

## Migration Impact

Lock version starts at 1. Unsupported/malformed lock records are never guessed or silently deleted.

## Evidence

`packages/persistence-sqlite/src/locking.ts` and unit/integration process tests.

## Phase Impact

Completes the Product Phase 4 single-writer policy. Worker leases and scheduler concurrency remain Product Phase 6.

## Traceability

Requirements: FR-PROJECT-002..003, NFR-REL-002. Acceptance: AC-P04-021..022. Risks: R-012, R-013, R-046.
