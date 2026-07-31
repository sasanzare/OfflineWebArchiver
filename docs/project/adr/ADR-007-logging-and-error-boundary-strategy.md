# ADR-007 — Logging and Error Boundary Strategy

## Status

Accepted on 2026-07-31.

## Context

Desktop and CLI require consistent diagnostics without leaking commands, credentials, environment state, or implementation exceptions.

## Decision

Application Service translates failures into versioned error contracts with stable code/category/user message/retryability. Structured JSON logs use timestamp, level, component, correlation ID, command ID, event name, and optional error code. Secret-like metadata keys are recursively redacted. CLI writes logs/errors to stderr and data to stdout.

## Alternatives Considered

Raw exception propagation, free-form text logs, and a full external telemetry SDK were considered. Raw errors leak internals; an external sink has no Phase 3 requirement or privacy authority.

## Consequences

Callers receive safe predictable errors and can correlate operations. Later durable telemetry requires retention/privacy decisions.

## Security Impact

No full environment, stack, token, password, cookie, session, proxy credential, or secret is returned. Recursive key redaction is tested.

## Portability Impact

Logger is a pure sink abstraction with no filesystem, OS, or Electron dependency.

## Testing Impact

Tests assert redaction, correlation, structured events, safe contract errors, and CLI stream/exit behavior.

## Migration Impact

Spike progress messages are historical only and are not the production log contract.

## Evidence

Observability and Application Service packages plus unit/integration/CLI/Electron tests.

## Phase Impact

Defines the Phase 3 error/log baseline. Persistence, retention, and export remain later concerns.

## Traceability

Requirements: NFR-MAINT-001, NFR-SEC-002. Acceptance: AC-MAINT-001, AC-P03-009 through AC-P03-012. Risks: R-021, R-030, R-036. Decision: OD-017. OKF domains: OKF-DOM-005, OKF-DOM-029, OKF-DOM-041.
