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
