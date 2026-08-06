# Test Evidence

This authored extension guide describes test evidence. Records name exact commands and repository test sources. Generated transient output is not committed as authority.

Evidence identity and path integrity remain the responsibility of `okf-extension/registry/evidence.json` and extension validation.

Phase 10 focused evidence is split between `tests/unit/interaction.test.ts`,
`tests/browser/interaction.test.ts`, and
`tests/integration/interaction-lifecycle.test.ts`. The browser suite exercises
real focus, keyboard, pointer, scroll, Cookie Banner, Dialog, Popup, Context,
and redaction behavior; the integration suite exercises Lease, checkpoint,
pause/cancel, and fenced Trace persistence. Discovery-generated Queue evidence
is intentionally absent until Phase 9 is implemented.

## Product Phase 11 focused evidence

The Secret Store evidence is synthetic and local. No real credentials are used.

- `npm run test:secrets` - 12 focused Secret Store tests covering canonical references, project isolation, AEAD/AAD tamper, Portable Vault lifecycle, serialized initialization, replacement/rotation, Secure Export/Import, test-only backend enforcement, OS insecure-provider rejection, redaction, diagnostics, temporary cleanup, ordinary export exclusion, and screenshot policy.
- `npm run test:unit` - 48 unit tests, including contract and CLI metadata-only boundary assertions.
- `npm run test:integration` - 23 integration tests, including Application Service metadata-only Secret operations and existing Browser/Render lifecycle coverage.
- `npm run typecheck` - all workspace TypeScript projects, including `packages/secrets`.
- `npm run secret-store:validate`, `npm run vault:validate`, `npm run diagnostics:validate`, and `npm run test:secret-leakage` - source and leakage policy checks.

The Phase 9/10 prerequisite gate remains a separate blocked acceptance item;
these results do not claim discovery integration or manual login/session/OTP
behavior.
