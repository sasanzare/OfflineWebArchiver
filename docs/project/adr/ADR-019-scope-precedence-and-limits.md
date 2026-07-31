# ADR-019: Scope Precedence and Limits

## Status

Accepted — 2026-07-31.

## Context

Conflicting rules and implicit counters would make eligibility ambiguous.

## Decision

Safety checks precede domain/path/query/network/depth/page decisions; deny always wins. Seeds are depth 0, children are parent+1, redirects/canonicals add no content depth. Page count and known hashes are explicit inputs; null is unlimited and zero permits no new page.

## Consequences

The engine remains pure and does not infer queue state.

## Alternatives

Order-dependent rules and database reads inside the engine were rejected.

## Security Impact

Explicit bounds prevent policy-bypass and resource amplification.

## Portability Impact

Identical profile/input yields identical results on every supported OS.

## Testing Impact

Deny precedence, boundary paths, depth zero, page zero, known identities, and batch bounds are tested.

## Migration Impact

No queue schema is added; Phase 6 supplies durable counts/known IDs.

## Evidence

`docs/architecture/SCOPE_ENGINE.md` and scope unit tests.

## Phase Impact

Completes Product Phase 5 eligibility semantics.

## Persistence Impact

Rule order is canonicalized and bounded limits are persisted in each immutable Profile revision; no job or result state is stored.

## Related Requirements

FR-SCOPE-002.

## Related Acceptance Criteria

AC-P05-008..010,014..016,027..028.

## Related Risks

R-008; R-027; R-054.

## Related Open Decisions

OD-032.

## Related OKF Domains

site-profile; scope-engine; security; testing.

## Traceability

FR-SCOPE-002; AC-P05-008..010,014..016,027..028; OD-032; R-008, R-027, R-054.
