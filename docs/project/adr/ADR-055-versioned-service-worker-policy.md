# ADR-055: Versioned Service Worker Policy

## Status

Accepted for Product Phase 13 hardening.

## Context

Service Workers can change request routing, cache responses, and preserve state
across navigations. An implicit allow default would make offline behavior
non-deterministic and could bypass the intended replay/routing relationship.

## Decision

Add a version 1 Site Profile policy with `mode: block | allow`; the safe
default is `block`. Browser Runtime page Contexts consume the selected mode,
while Authentication Contexts remain blocked. Unsupported policy versions fail
closed. The policy is independent from replay: replay still owns Context-level
request matching, and a later engine must document how Service Worker fetches
and caches enter that lookup. Unsupported combinations are surfaced as an
observable policy/result failure rather than silently ignored.

## Consequences

Existing profiles normalize to blocked Service Workers. Profiles that explicitly
allow them carry a reviewable versioned choice. Phase 13 provides the policy
and runtime hook but no archive replay engine.

## Alternatives

- Always allow: rejected because it undermines deterministic offline behavior.
- Always block: rejected because some authorized sites require Service Worker
  behavior and the policy must be explicit.
- Infer from page content: rejected because untrusted content cannot select its
  own privilege-affecting policy.

## Security Impact

The default blocks persistent worker state and routing. Allow is an explicit
Site Profile decision and remains subject to the existing network authorization,
download, popup, and Context isolation controls.

## Portability Impact

The policy model is portable; actual Service Worker behavior depends on the
pinned Chromium version and must be verified on Windows 11 first.

## Testing Impact

Unit tests cover defaulting and version rejection. Browser fixtures must cover
registration, fetch routing, block/allow behavior, and replay interaction when
the real browser environment is available.

## Migration Impact

No SQLite migration. The Site Profile JSON/transport schema gains a backward-
compatible defaulted field; profile hashes and revisions correctly reflect an
explicit non-default policy.

## Evidence

- `packages/archive-core/src/service-worker.ts`
- `packages/scope-engine/src/index.ts`
- `packages/browser-runtime/src/index.ts`
- `packages/contracts/src/index.ts`
- `docs/architecture/SERVICE_WORKER_POLICY.md`

## Phase Impact

This ADR does not implement a Service Worker archive runtime, rewrite system,
or replay store.

## Traceability

- Acceptance: `AC-P13-011`, `AC-P13-012`
- Security review: `docs/architecture/PHASE_13_SECURITY_REVIEW.md`

