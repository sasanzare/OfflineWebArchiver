# ADR-022: Private Network Preflight

## Status

Accepted — 2026-07-31.

## Context

Scope permission is not proof that a destination address is safe from SSRF.

## Decision

Phase 5 classifies literal IPv4/IPv6 ranges without I/O, denies non-public classes unless explicitly allowed, and marks hostnames for dispatch-time DNS preflight. Domain allow and network authorization are separate fields.

## Consequences

Hostname decisions can be scope-eligible while `networkAuthorized` is false. No request is enabled.

## Alternatives

Trusting host strings and performing DNS in the pure engine were rejected.

## Security Impact

Loopback/private/link-local/multicast/reserved/unspecified literals fail closed by default; DNS rebinding remains a later dispatch control.

## Portability Impact

Literal classification is local and OS resolver independent.

## Testing Impact

IPv4, IPv6, mapped IPv4, hostname, and policy override cases require tests.

## Migration Impact

No network state is stored. Dispatch-time address evidence belongs to later phases.

## Evidence

`docs/architecture/SSRF_PREPARATION.md`, security review, and scope unit tests.

## Phase Impact

Prepares, but does not implement, SSRF-safe dispatch.

## Persistence Impact

Profiles persist only allowed address classes; DNS answers, resolved addresses, and authorization results are not persisted in Phase 5.

## Related Requirements

FR-SCOPE-003.

## Related Acceptance Criteria

AC-SCOPE-003; AC-P05-034.

## Related Risks

R-027; R-052.

## Related Open Decisions

OD-035.

## Related OKF Domains

site-profile; scope-engine; security; testing.

## Traceability

FR-SCOPE-003; AC-SCOPE-003; AC-P05-034; OD-035; R-027, R-052.
