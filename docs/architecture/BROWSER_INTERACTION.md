# Browser-Native Human-Paced Interaction

## Status

The repository contains a Product Phase 10 interaction foundation. It is
bounded, deterministic, approved-plan-only, and implemented behind the
existing Browser Runtime port. Product Phase 9 discovery is not present in
this baseline, so discovery integration is intentionally not claimed.

## Boundary and ownership

`packages/archive-core/src/interaction.ts` owns the browser-independent
Interaction Profile, Plan, step vocabulary, target validation, seeded timing,
budgets, failure/recovery decisions, Cookie Banner rules, Dialog/Popup policy,
and bounded trace/redaction policy. It has no Playwright dependency.

`packages/browser-runtime/src/interaction.ts` is the only production adapter
that touches Playwright input APIs. It maps approved target descriptors to
bounded Locators and uses real `focus`, `click`, `hover`, mouse movement,
keyboard input, Tab/Shift+Tab, and incremental mouse-wheel scrolling. Its
DOM evaluation is limited to read-only snapshots and focus checks. Synthetic
event dispatch, direct DOM value assignment, arbitrary JavaScript mutation,
and raw browser handles are not part of the boundary.

Application Service loads the effective profile, obtains an approved plan,
claims the existing Page Job Lease, keeps the Recovery heartbeat active,
executes through the optional Interaction port, checkpoints the operation,
and persists a fenced redacted trace. Projects without a profile receive the
disabled default and preserve prior behavior.

## Profile and plan

Interaction Profile schema `1` defines the enabled/mode/seed values, action,
typing, pointer, and scroll delay ranges, maximum actions and duration,
scroll/Tab/Popup/Dialog limits, typed-text and target bounds, trace bounds,
fixed Dialog/Popup policy, and explicit Cookie Banner rules. Invalid ranges,
missing policies, unsafe target selectors, malformed Cookie rules, and
conflicting enabled/mode combinations fail before browser execution.

Interaction Plan schema `1` requires `approved: true`, an approval reason,
unique stable step identifiers, a bounded step list, an explicit side-effect
classification, and validated preconditions/postconditions. Transport plans
carry only typed metadata for `type_text` such as character count and input
category; raw text is intentionally absent. The embedding service supplies
the executable approved plan, keeping discovery or future GUI policy outside
the browser adapter.

Target strategies are role/name, label, placeholder, test ID, controlled CSS,
and a bounded Phase 9 discovery reference. All strings are length- and
control-character-bounded. CSS declaration-like syntax and JavaScript URL
selectors are rejected. Runtime matching requires a unique target and, where
appropriate, visibility. A click is allowed only for an anchor or an element
with an explicit read-only/navigation marker; forms, submit controls, and
JavaScript URLs fail closed.

## Timing, budgets, and recovery

The same seed, profile, and plan produce the same delay sequence. Production
sleep is cancellation-aware, while tests inject clock and sleep behavior.
Action, step, overall duration, scroll distance/steps, Tab steps, Popup count,
Dialog count, typed characters, and trace size are all bounded. Pause,
cancellation, timeout, target failure, Browser failure, and security failure
produce structured status and failure categories.

Browser/Page failure is recorded as `outcome-uncertain` and is never blindly
replayed. Read-only retry requires the step policy to allow it; a potentially
side-effectful operation is not replayed after an uncertain boundary. Lease,
owner, token hash, expiry, and Fencing Generation checks remain authoritative
for all durable writes.

## Cookie Banners, Dialogs, and Popups

Cookie Banner actions are `accept`, `reject`, `dismiss`, or `no_action`. Only a
configured rule with a unique banner target and explicit action target can
act; there is no global accept-button heuristic. The default profile contains
no rules and therefore performs no consent action.

Unexpected Dialogs are dismissed by default. A profile can explicitly select
accept/dismiss per supported Dialog type, but the handling count and duration
are bounded and prompt values are never supplied or stored. Popups are
observed, scope-checked, and closed by default. An explicit in-scope policy
may authorize metadata observation, but raw Popup pages never leave the
Browser Runtime and nested chains remain bounded.

## Context and traces

The existing fixed Browser Context profile is reused without rotation:
`en-US`, `UTC`, `1280x720`, device scale factor `1`, fixed User Agent policy,
and fixed Accept-Language behavior. A non-sensitive profile ID/digest is
stored in the result and trace.

Interaction Trace schema `1` records step IDs/types, safe target IDs, timing,
status, failure category/code, navigation outcome, DOM/route change flags,
Popup/Dialog outcome, discovered-count metadata, input category, character
count, and recovery state. It never stores typed characters, prompt values,
credentials, cookies, authorization headers, or raw page content. Traces are
recursively redacted, bounded, canonicalized, and persisted through the
SQLite ownership/fencing boundary.

## Phase boundary

This foundation does not implement login, Session persistence, OTP, Secret
Store, proxies, downloading, rewriting, API capture, or a GUI configuration
surface. It also does not implement Phase 9 discovery. Once Phase 9 supplies
approved discovery opportunities, a later integration can evaluate resulting
URLs through Scope and enqueue them through Queue without changing this
browser-native safety boundary.

See [Browser Runtime](BROWSER_RUNTIME.md), [Phase 10 security review](PHASE_10_SECURITY_REVIEW.md), [Phase 10 implementation report](../project/PHASE_10_IMPLEMENTATION_REPORT.md), and [ADR-049](../project/adr/ADR-049-browser-native-human-paced-interaction.md).
