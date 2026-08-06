# ADR-049: Browser-Native Human-Paced Interaction

## Status

Accepted for the partial Product Phase 10 foundation. Full phase closure is
blocked by the missing Product Phase 9 Discovery Engine.

## Context

Later discovery and GUI phases need a reusable way to perform explicitly
approved, browser-native, human-paced actions without exposing Playwright,
credentials, arbitrary JavaScript, or uncontrolled side effects. The current
baseline has a Browser Runtime and Phase 7 ownership/recovery model but no
Phase 9 discovery implementation.

## Decision

Implement Interaction Profile, Plan, Step, Budget, Trace, and policy models in
Archive Core. Keep all Playwright input operations in Browser Runtime. Require
explicit plan approval, bounded target descriptors, deterministic seeded timing,
real Playwright input APIs, fixed Context settings, explicit Cookie Banner
rules, conservative Dialog/Popup handling, and redacted fenced traces. Extend
contracts to version `1.6.0` and SQLite with forward migration `007`.

## Consequences

The interaction path is reusable and auditable without changing the existing
Browser or Electron security boundary. Projects without a profile preserve
previous behavior. The transport cannot carry raw typed text. The system is
not a crawler and does not infer actions from arbitrary page controls.

## Alternatives

- Put Playwright calls in Application Service: rejected because it would break
  the sole-adapter boundary.
- Simulate interaction with DOM assignment or synthetic events: rejected
  because it would not prove browser-native input and would weaken safety.
- Store raw plan/trace payloads without bounds: rejected because target and
  trace data are untrusted and can contain sensitive content.
- Implement discovery and interaction together: rejected because Phase 9 is a
  prerequisite and must retain its own scope/Queue evidence.

## Security Impact

The decision preserves Chromium sandboxing, GET/HEAD request policy, Scope
authorization, DNS/private-network blocking, Lease/token/fencing checks, and
Electron isolation. Click side effects, Cookie actions, Dialogs, Popups,
navigation, selectors, typed text, and traces all fail closed or redact by
default.

## Portability Impact

The pure model has no Playwright or platform dependency. The adapter continues
to use the pinned Playwright/Chromium runtime and fixed Context profile.
Cross-platform browser packaging remains an existing limitation.

## Testing Impact

Unit, contract, persistence, real Chromium, Application Service lifecycle,
architecture, security, migration, CLI, and documentation checks cover the
foundation. Phase 9 discovery integration cannot pass until its implementation
and evidence are present.

## Migration Impact

Migration `007_add_browser_interaction` is forward-only and preserves prior
migrations. Missing profiles resolve to a disabled default. Existing Projects
remain readable after the migration; no downgrade is supported.

## Evidence

- `packages/archive-core/src/interaction.ts`
- `packages/browser-runtime/src/interaction.ts`
- `packages/persistence-sqlite/src/interaction.ts`
- `tests/browser/interaction.test.ts`
- `tests/integration/interaction-lifecycle.test.ts`
- `tests/unit/interaction.test.ts`
- `tests/unit/interaction-persistence.test.ts`
- `docs/architecture/PHASE_10_SECURITY_REVIEW.md`

## Phase Impact

This ADR supplies the Phase 10 foundation and intentionally does not claim
Phase 9 discovery, Phase 11 Secret Store, authentication, OTP, proxy, or later
archive capabilities.

## Traceability

See AC-P10-001 through AC-P10-017 in the Acceptance Matrix, the Phase 10
implementation report, `okf/history/phase-10.md`, and the OWA extension
registries. AC-P10-017 remains blocked until the Phase 9 prerequisite is
verified.
