# Service Worker Policy

Site Profiles carry version 1 `serviceWorkerPolicy` with `mode: block | allow`.
The default is `block`, including for profiles created before the field existed.
Authentication Contexts remain blocked regardless of the page profile.

Page Context creation consumes the policy. Unsupported versions are rejected by
profile validation. A later replay/runtime implementation must make worker
registration, worker fetch routing, cache behavior, and replay matching
observable; unsupported combinations must surface as a bounded failure.

See [ADR-055](../project/adr/ADR-055-versioned-service-worker-policy.md).

