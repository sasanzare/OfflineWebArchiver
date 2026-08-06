# Product Phase 10 — Browser-Native and Human-Paced Interaction

## Phase status

**PARTIALLY COMPLETE.** The reusable browser-native interaction foundation is
implemented and directly tested. The repository baseline is Product Phase 8,
not a completed Phase 9, so the Phase 9 prerequisite and the full discovery
integration acceptance gate remain blocked. No completion claim is made.

## Baseline and versions

The starting branch is `main` at the pre-change Phase 8 commit recorded in the
handoff. The working tree was clean before this implementation. The baseline
was application/workspaces `0.8.0`, contract `1.5.0`, Project format `1.1.0`,
SQLite schema `6`, Browser Context profile `1`, Render Engine `1`, and no
Discovery Engine implementation. The current interaction work changes the
contract to `1.6.0` and SQLite schema to `7`; application/workspace,
Project-format, Context, and Render versions remain unchanged. Interaction
Profile and Trace schemas are both `1`.

## Architecture implemented

### Pure domain

`packages/archive-core/src/interaction.ts` defines bounded profile, plan,
step, target, precondition/postcondition, retry, budget, trace, Cookie Banner,
Dialog/Popup, timing, failure, and recovery policy. Seeded timing and injected
clock/sleep ports make execution reproducible. The profile is disabled by
default when no stored profile exists.

### Browser adapter

`packages/browser-runtime/src/interaction.ts` owns Playwright input access.
It uses real focus/click/hover, mouse movement/wheel, keyboard press/type, Tab
navigation, state waits, and explicit Cookie actions. Dialogs and Popups are
bounded and handled inside the adapter. Read-only snapshots are the only page
evaluation used by the interaction path.

### Application Service

The service validates profile and plan, requires a provider for an approved
plan, claims and heartbeats the Page Job Lease, observes Pause/cancellation,
passes the fixed Context descriptor, checkpoints progress, and persists the
redacted result through fenced repository ports. No Playwright object crosses
the service, CLI, Desktop, or contract boundaries.

### Contracts and CLI

Contract `1.6.0` adds profile get/validate, plan validate, interaction run,
trace list, and trace inspect. Transport plans contain character counts and
input categories instead of raw typed text. The CLI exposes profile, plan, run,
and trace commands with bounded JSON/human output and safe error translation.

### Persistence and migration

Migration `007_add_browser_interaction` adds `interaction_profiles` and
`interaction_traces`. Profiles are canonical validated JSON with a hash and
revision identity. Traces are canonical, redacted, bounded, schema-versioned,
and fenced by the existing Project/Run/Job/Lease/token/generation rules.

## Tests and evidence

The focused suites cover profile/plan validation, unsafe targets, malformed
policies, deterministic timing, budgets, redaction/truncation, recovery
classification, contracts, migration persistence/idempotency, and a real
Chromium fixture covering focus, typing, hover, mouse movement, click safety,
Tab, scrolling, Cookie Banner, Alert/Confirm/Prompt Dialogs, in-scope and
blocked Popups, and trace redaction. Popup and Dialog handler work is settled
before step and final Trace snapshots. The lifecycle
integration also verifies service command/plan/provider/trace flow through a
queued Job.

The 2026-08-06 validation snapshot is reproducible locally:

- `npm run typecheck`, `npm run build`, `npm run format:check`, `npm run lint`,
  `npm run contracts:check`, `npm run project-format:validate`,
  `npm run migrations:validate`, `npm run scope:validate`,
  `npm run scope:golden`, `npm run queue:validate`,
  `npm run queue:state-machine`, `npm run recovery:validate`,
  `npm run checkpoint:validate`, `npm run browser:verify`,
  `npm run render:validate`, `npm run security:check`, and
  `npm run docs:validate`: passed.
- Focused suites: unit `47/47`, browser `8/8`, integration `22/22`,
  concurrency `6/6`, recovery `11/11`, rendering `9/9`, CLI `2/2`, Electron
  `1/1`, and process-kill `4/4`: passed.
- `npm test`: `135/135` passed, with no skipped tests.
- `npm run test:okf`: `43/43` passed; official, references, provenance,
  extension, quality, format, and combined OKF validation all passed.

These results verify the interaction foundation, not the missing Phase 9
Discovery Engine gate.

## Explicit non-goals

This phase does not add authentication, Session or storage-state persistence,
OTP, Secret Store, proxies, stealth/evasion, CAPTCHA or WAF bypass, rate-limit
bypass, file upload, destructive form submission, production downloading,
rewriting, API capture, or a full GUI configuration surface.

## Phase 9 gate

The following evidence is still required before this phase can be closed:

- final rendered DOM, Sitemap, History/SPA, bounded pagination/infinite-scroll,
  lazy-content, and selected JSON discovery;
- Scope evaluation, Queue enqueueing/deduplication, and loop prevention for
  every interaction-generated candidate;
- Phase 9 Lease/Fencing/Checkpoint/Pause/Recovery acceptance evidence;
- an integration report and security review that establish Phase 9 as
  complete.

See [Acceptance Matrix](../product/ACCEPTANCE_MATRIX.md), [Phase 10 security review](../architecture/PHASE_10_SECURITY_REVIEW.md), [Browser Interaction architecture](../architecture/BROWSER_INTERACTION.md), and [ADR-049](adr/ADR-049-browser-native-human-paced-interaction.md).
