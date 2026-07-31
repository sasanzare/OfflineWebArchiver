# ADR-EXP-003 — Loopback Spike Runtime

**Status:** Experimental  
**Scope:** Product Phase 2 only  
**Production disposition:** Retained as evidence; no loopback listener promoted in Product Phase 3  
**Date:** 2026-07-31

## Product Phase 3 disposition

The Phase 3 Application Service is in-process: Desktop uses sender-validated IPC and CLI uses a direct local adapter. No HTTP listener exists. The fixture/archive server remains bounded evidence for Product Phase 11 and requires a new origin/containment/hostile-content review before production. See ADR-003 and the spike promotion review.

## Context

The archived page must be displayed over HTTP after the synthetic origin stops,
while the final Product Phase 11 server and Product Phase 3 service boundary do
not yet exist.

## Experimental decision

Use a spike-local built-in Node HTTP server in Electron's main process. Bind only
to `127.0.0.1` on port `0`, serve a single generated archive root, reject decoded
traversal, use explicit content types and a minimal route fallback, and expose no
control API. The renderer receives no filesystem path and no arbitrary server
input.

## Alternatives retained for Product Phase 3

- an authenticated separate Local Application Service;
- a custom Electron protocol;
- an IPC-only transport for application operations; and
- a dedicated production runtime package with stronger archived-content policy.

## Consequences

The spike can prove loopback serving with a small attack surface. It does not
resolve `OD-009`, define the production runtime contract, or prove containment
for arbitrary hostile archives.
