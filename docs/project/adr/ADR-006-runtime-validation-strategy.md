# ADR-006 — Runtime Validation Strategy

## Status

Accepted on 2026-07-31.

## Context

Static types cannot protect IPC or serialized input. Phase 3 needs repeatable commands without importing a broad test framework into production.

## Decision

Use Zod at every command/response/event boundary, Node's built-in test runner for tests, small repository-local semantic validators for architecture/docs/security/OKF, and real built-process smokes for CLI/Electron. Validators fail with actionable errors and never rewrite data.

## Alternatives Considered

Vitest/Jest, generated schema compilers, compile-only checks, and renderer mocks were considered. Current scope is covered by Node 24 and direct runtime execution with fewer dependencies.

## Consequences

The suite stays small and transparent. Custom semantic validators must remain bounded and tested as the graph grows.

## Security Impact

Untrusted boundary values fail closed; real Electron smoke verifies privilege assumptions rather than accepting configuration text alone.

## Portability Impact

Most tests are platform-independent; Electron execution is currently proven on Windows x64 only.

## Testing Impact

Unit, integration, CLI, Electron, architecture, contract, security, docs, and OKF commands are independently runnable.

## Migration Impact

Phase 2 test evidence is preserved; no spike runner or browser dependency enters the production graph.

## Evidence

`tests/`, `tools/testing`, `tools/architecture`, `tools/security`, `tools/docs`, and `tools/okf`.

## Phase Impact

Establishes the minimum validation gates inherited by Product Phase 4.

## Traceability

Requirements: NFR-TEST-001, NFR-KNOW-002. Acceptance: AC-TEST-001, AC-OKF-004, AC-P03-003 through AC-P03-024. Risks: R-002, R-039, RISK-KNOW-001. Decisions: OD-024, OD-026. OKF domains: OKF-DOM-031, OKF-DOM-041.
