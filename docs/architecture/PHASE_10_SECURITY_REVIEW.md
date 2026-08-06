# Product Phase 10 Security and Privacy Review

## Review status

The implemented interaction foundation passes the focused unit, real
Chromium, integration, contract, and static security checks run for this
working tree. The review is partial at the product-phase level because the
required Phase 9 Discovery Engine and its integration evidence are absent.

## Controls reviewed

### Input and target safety

- Interaction Profiles and Plans are parsed and bounded before browser work.
- Plans require explicit approval and stable step IDs.
- Role, label, placeholder, test ID, controlled CSS, and discovery-reference
  targets are length-bounded and control-character checked.
- JavaScript URL selectors and declaration-like CSS are rejected.
- Runtime target matching requires uniqueness and visibility where an action
  needs it.
- No arbitrary selector function or injected action script is accepted.

### Browser-native execution

The adapter uses real Playwright `Locator`, `Keyboard`, and `Mouse` APIs.
Read-only page evaluation is limited to snapshots and focus verification.
The source contains no synthetic event dispatch, direct DOM value assignment,
or stealth/fingerprint patching. The existing Chromium sandbox, HTTPS
verification, service-worker policy, fixed User Agent policy, and request
interception remain unchanged.

### Side effects and navigation

Click steps require a link or an explicit read-only/navigation marker. Forms,
submit controls, JavaScript URLs, downloads, and non-GET/HEAD request policy
remain denied. Resulting navigation is reauthorized through the existing
Application Service URL policy. Popup destinations are scope-checked and
closed by default. No credential, proxy, authentication, or storage state is
introduced.

### Cookie Banner, Dialog, and Popup policy

Cookie action is `no_action` unless a profile contains a matching bounded rule
with an explicit action target. Dialogs default to dismissal, do not accept
prompt values, and have count/time limits. Popups are observed, authorized,
bounded, and closed; raw Page objects do not cross the Browser Runtime.

### Privacy and trace data

Typed text is sent character-by-character to the browser but is not included
in trace events, CLI output, contract payloads, or SQLite canonical JSON.
Trace redaction removes sensitive keys and URL query/fragment data, and the
trace builder enforces event/byte caps. Persistence validates Project/Run/Job
identity, the active Lease, owner, token hash, expiry, and Fencing Generation.

### Recovery and uncertainty

Timeout, cancellation, cooperative pause, Browser crash, and target/security
failure map to safe status and recovery categories. A Browser crash is
`outcome-uncertain`; the system does not blindly replay a plan after that
boundary. Durable trace writes remain fenced and idempotent by canonical trace
identity.

## Residual risks and accepted limits

- Phase 9 discovery, route observation, Queue enqueueing, and duplicate-loop
  evidence are not available in this baseline.
- The CLI exposes plan validation and trace inspection; execution requires a
  service-provided approved plan provider.
- Linux/macOS browser behavior and release packaging remain unverified.
- Long-term trace retention/deletion policy remains a later privacy decision.
- No secret store, login, session persistence, OTP, or proxy behavior is
  implemented.

These limits keep the interaction work from claiming discovery, identity,
credential, or evasion capabilities that are not implemented.

## Evidence

- `tests/unit/interaction.test.ts`
- `tests/unit/interaction-contracts.test.ts`
- `tests/unit/interaction-persistence.test.ts`
- `tests/browser/interaction.test.ts`
- `tests/integration/interaction-lifecycle.test.ts`
- `tools/security/check.mjs`
- `packages/archive-core/src/interaction.ts`
- `packages/browser-runtime/src/interaction.ts`
- `packages/persistence-sqlite/src/interaction.ts`
