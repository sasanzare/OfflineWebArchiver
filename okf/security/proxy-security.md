---
type: Security Control
title: Proxy Security
description: Records Phase 15 controls for proxy credentials, routing, health, and authenticated Session affinity.
tags: [security, proxy, secrets, routing, fail-closed]
status: stable
sources:
  - id: phase-fifteen-security-review
    resource: Phase 15 implementation working tree
    title: Phase 15 security review
stale_after: "2026-11-15"
---

# Proxy Security

Proxy credentials use Secret Store scope `proxy`, kind `proxy_credential`, and
purpose `proxy_connection`; SQLite, transport, logs, imports, evidence, and
Session metadata retain only an opaque reference or safe metadata. The Browser
Runtime is the sole Playwright owner and tests a configured proxy in an
isolated context. A failed, disabled, cooldown, unhealthy, or missing-secret
proxy fails closed and never falls back to direct routing.

Authenticated Session proxy changes are explicit and require reauthentication.
Normal Browser Runtime contexts keep strict TLS validation. The generated local
HTTPS fixture may use the test-only certificate option only when
`OWAB_TEST_MODE=1`; this is not a production trust exception. See [Security Boundaries](security-boundaries.md) and [Phase 15 Validation](../testing/phase-15-validation.md).
