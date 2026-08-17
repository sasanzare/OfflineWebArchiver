# Service Worker Policy

Site Profiles carry version 1 `serviceWorkerPolicy` with `mode: block | allow |
profile-specific`. The default is `block`, including for profiles created
before the field existed. `profile-specific` is valid only when the profile
also stores an explicit `profileMode: block | allow`; Browser Context creation
never infers that choice from Chromium defaults. Authentication Contexts remain
blocked regardless of the page profile.

Page Context creation consumes the policy. Unsupported versions are rejected by
profile validation. A later replay/runtime implementation must make worker
registration, worker fetch routing, cache behavior, and replay matching
observable; unsupported combinations must surface as a bounded failure.

Browser Runtime resolves the policy before Context creation and applies the
result to the pinned Playwright Context. Phase 19 replay events record worker
policy outcomes alongside replay/leakage events; worker-controlled external
fetches must still pass the same strict network boundary.

See [ADR-055](../project/adr/ADR-055-versioned-service-worker-policy.md) and
[the Phase 19 security review](PHASE_19_SECURITY_REVIEW.md).

