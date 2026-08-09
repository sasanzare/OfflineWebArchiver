# ADR-053: Separated Crawl Run State

## Status

Accepted for Product Phase 13 hardening.

## Context

The existing `run_control.control_state` describes pause/recovery control
coordination. It is not sufficient as the product-level Crawl Run lifecycle:
network waiting, authentication waiting, rate limiting, cancellation, and
terminal completion need independent observable states.

## Decision

Add version 1 `CrawlRunState` to Archive Core with `running`, `pausing`,
`paused`, `waiting_for_network`, `waiting_for_auth`, `waiting_for_rate_limit`,
`cancelling`, `cancelled`, `completed`, and `failed`. Keep the existing
`control_state` for backward-compatible pause/recovery control. Migration 009
adds `run_state` with a safe `running` default to `run_control` and
`run_checkpoints`; existing queue, checkpoint, and Session rows are preserved.
The repository validates state transitions and persists them in the same
`BEGIN IMMEDIATE` transaction as the corresponding control checkpoint.

## Consequences

Consumers can distinguish operational waiting from user pause and terminal
failure without overloading the legacy control state. Existing pause/resume
commands remain compatible; the response contract now includes `runState`.
No scheduler or full crawl execution is introduced in this phase.

## Alternatives

- Replace `control_state`: rejected because it would break recovery and pause
  compatibility.
- Store run state only in memory: rejected because restart and checkpoint
  recovery require durable state.
- Add a second table: rejected for this bounded change because the state is
  one-to-one with the existing run-control row and must commit atomically.

## Security Impact

State changes are Project/Run ownership checked, operation identified, and
persisted transactionally. No credentials or request payloads enter the state
ledger.

## Portability Impact

SQLite text checks and pure TypeScript transition rules are portable across
Windows, Linux, and macOS.

## Testing Impact

Migration, schema, pause/resume, close/reopen, and contract tests verify the
new field and preserve prior rows. Future worker tests must cover all waiting
states and fencing interactions.

## Migration Impact

Forward-only migration `009_add_crawl_run_state` changes Project/SQLite schema
from 8 to 9. Existing rows default to `running`; no queue, Session, or secret
payload is rewritten or discarded. Downgrade is unsupported.

## Evidence

- `packages/archive-core/src/run-state.ts`
- `packages/persistence-sqlite/src/migrations.ts`
- `packages/persistence-sqlite/src/recovery.ts`
- `tests/integration/recovery-lifecycle.test.ts`
- `tests/unit/persistence-sqlite.test.ts`
- `packages/contracts/src/index.ts`

## Phase Impact

This ADR implements the Phase 13 state-model requirement only. It does not
implement a Worker Pool, Downloader, or full replay engine.

## Traceability

- Acceptance: `AC-P13-006`, `AC-P13-007`
- Security review: `docs/architecture/PHASE_13_SECURITY_REVIEW.md`

