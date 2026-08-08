# Authentication Sessions

## Scope

Product Phase 12 adds a project-scoped Manual Login and Secure Session Manager.
An authorized user receives a headed, isolated Chromium Context, completes the
website's login flow personally, and explicitly confirms `Save Session` only
after the configured validation check succeeds.

Authentication is intentionally user-driven. The application does not read,
capture, log, or transport passwords, OTP values, CAPTCHA answers, MFA values,
or raw browser handles. Manual OTP entry inside the displayed website remains
part of the Manual Login boundary; guided OTP automation is deferred to Phase
13.

## Layer ownership

- `packages/archive-core` owns Session metadata, lifecycle states, validation
  results, affinity, capabilities, errors, and ports.
- `packages/browser-runtime` owns headed manual and fresh headless restored
  authentication Contexts, navigation authorization, Storage State parsing,
  capture, validation, and Context cleanup.
- `packages/application-service` owns Project/session authorization, explicit
  save/replace ordering, Secret Store purpose boundaries, metadata transitions,
  and safe result/error projection.
- `packages/persistence-sqlite` stores only non-sensitive Session metadata and
  an opaque Phase 11 Secret Reference.
- CLI/Desktop expose only safe metadata and literal confirmations.

## Lifecycle and validation

The durable lifecycle is `ready`, `login_browser_open`, `saving`, and `valid`,
with explicit `validation_required`, `invalid`, `expired`, `reauth_required`,
`corrupt`, and `deleted` outcomes. A new manual login is not persisted merely
because a cookie exists. The user must request `Save Session`; the service
validates the configured URL/origin/path and optional marker first.

Validation distinguishes valid, expired, invalid, unavailable,
configuration-missing, corrupt, and incompatible-profile results. A failed
reauthentication closes the new Context and restores the previous completed
metadata/reference. The old session is replaced only after the new Storage
State has validated and the Secret Store replacement has succeeded.

## Storage and restoration

Playwright Storage State is captured with cookies, localStorage, and supported
IndexedDB state. `sessionStorage` is deliberately not claimed because it is
page-scoped and is not part of the supported persisted format. The sensitive
serialized payload crosses only the Phase 11 Secret Store callback with the
`session_storage` kind and a declared purpose. Mutable byte buffers are cleared
after use where practical.

Restore checks Project ownership, Browser Profile identifier/version, Session
format versions, and the affinity contract before resolving the Secret Store
reference. It then creates a fresh controlled headless authentication Context,
validates it, and closes it. Secret values never appear in SQLite content,
ordinary export, logs, diagnostics, CLI output, Desktop IPC, or UI state.

## Isolation and future affinity

Each Session belongs to exactly one Project and is bound to the current Browser
Context Profile descriptor. Durable affinity records the profile identifier,
profile version, affinity schema version, and a nullable future `proxyId`; Phase
12 does not implement proxy selection, rotation, health, or worker routing.
Profile incompatibility fails closed rather than restoring into an unknown
Context.

## Supported surfaces

The contract exposes `session.open`, `session.reauthenticate`, `session.save`,
`session.get`, `session.list`, `session.validate`, `session.restore`, and
`session.delete`. Save and delete require literal confirmations. Returned
metadata intentionally omits the opaque Secret Reference as well as all raw
Storage State. Deletion closes active Contexts, removes the protected payload
when present, removes the metadata row, and is idempotent for a missing Session.

