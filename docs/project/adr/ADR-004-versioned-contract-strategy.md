# ADR-004 — Versioned Contract Strategy

## Status

Accepted on 2026-07-31.

## Context

Desktop, CLI, and possible future process transports require serialized commands, responses, events, errors, runtime facts, and configuration that reject ambiguous change.

## Decision

Use strict Zod schemas and inferred TypeScript types in `@offline-web-archive/contracts`. Every transport envelope carries literal semantic contract version `1.0.0`, identifiers, correlation ID, and timestamp. Unknown fields and unsupported versions fail closed. Breaking changes require a major contract version and compatibility/migration ADR.

## Alternatives Considered

Type-only interfaces, JSON Schema generation, Protocol Buffers, and ad hoc IPC arguments were considered. Type-only contracts cannot validate runtime input; binary IDLs add unnecessary Phase 3 tooling.

## Consequences

Runtime and compile-time shapes stay aligned. Contract evolution is deliberate, though Zod is a runtime dependency.

## Security Impact

Strict schemas bound strings, reject extra properties, and prevent full environment or arbitrary data exposure.

## Portability Impact

JSON-compatible envelopes work in CLI, IPC, tests, and possible future local transports.

## Testing Impact

Serialization, rejection, response/error/event, correlation, CLI, and Electron tests use the same public schemas.

## Migration Impact

There is no prior production contract. Experimental spike IPC is not compatible authority.

## Evidence

`packages/contracts/src/index.ts`, `npm run contracts:check`, unit/integration/smoke tests.

## Phase Impact

Creates contract 1.0.0; later capabilities must extend it without pretending to be implemented.

## Traceability

Requirements: NFR-MAINT-001, NFR-TEST-001. Acceptance: AC-MAINT-001, AC-P03-006 through AC-P03-012. Risks: R-002, R-028. Decision: OD-009. OKF domains: OKF-DOM-004, OKF-DOM-005, OKF-DOM-041.
