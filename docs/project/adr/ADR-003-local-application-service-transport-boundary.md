# ADR-003 — Local Application Service Transport Boundary

## Status

Accepted on 2026-07-31.

## Context

OD-009 asked whether the production service boundary should use Electron IPC, loopback HTTP, or a hybrid. Phase 3 needs one safe smoke path shared conceptually by Desktop and CLI without claiming the later offline server.

## Decision

Use one in-process Application Service. Desktop calls it through one allowlisted, sender-validated Electron IPC handler; CLI calls it through a local in-process adapter. Both exchange contract 1.0.0 envelopes. Do not expose loopback HTTP in Phase 3.

## Alternatives Considered

Authenticated loopback HTTP and a child service process remain valid future options if isolation, concurrency, or runtime serving demands them. A hybrid now would expose unused attack surface.

## Consequences

The contract and use case are transport-neutral while lifecycle is simple. Moving the service out-of-process later requires compatibility and threat review, not Core changes.

## Security Impact

No network listener exists. Electron validates webContents, main frame, and exact local file URL before authorizing a request.

## Portability Impact

CLI/service/Core are Electron-independent. Electron owns only its IPC adapter.

## Testing Impact

Integration tests exercise authorized/denied transports; real Electron and built CLI smokes traverse the service.

## Migration Impact

Phase 2 loopback archive serving remains experimental evidence for Product Phase 11, not the Phase 3 service transport.

## Evidence

`packages/application-service`, desktop IPC transport, CLI entry point, integration and smoke tests.

## Phase Impact

Resolves OD-009 for the current production boundary. A later process-boundary change requires an ADR.

## Traceability

Requirements: FR-CLI-001, NFR-MAINT-001, NFR-SEC-003. Acceptance: AC-CLI-001, AC-P03-007, AC-P03-008, AC-P03-011, AC-P03-012. Risks: R-029, R-036. Decision: OD-009. OKF domains: OKF-DOM-005 through OKF-DOM-007, OKF-DOM-029.
