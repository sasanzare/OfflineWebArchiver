# Authentication Sessions

## Scope

Product Phase 12 adds a project-scoped Manual Login and Secure Session Manager.
An authorized user receives a headed, isolated Chromium Context, completes the
website's login flow personally, and explicitly confirms `Save Session` only
after the configured validation check succeeds.

Authentication is intentionally user-driven. The application does not read,
capture, log, or transport passwords, CAPTCHA answers, MFA values, or raw
browser handles. Phase 14 adds an explicit, visible OTP flow for configured
phone and OTP controls. Phone numbers and supplied OTPs remain ephemeral
inputs: they are used only for the native Browser interaction and are never
stored in Session metadata, SQLite, Secret Store payloads, transport results,
logs, traces, screenshots, diagnostics, or project documentation.

## Layer ownership

- `packages/archive-core` owns Session metadata, lifecycle states, validation
  results, affinity, capabilities, errors, and ports.
- `packages/browser-runtime` owns headed manual and fresh headless restored
  authentication Contexts, navigation authorization, Storage State parsing,
  capture, validation, and Context cleanup.
- `packages/application-service` owns Project/session authorization, explicit
  save/replace ordering, Secret Store purpose boundaries, Login Flow/Run-state
  orchestration, metadata transitions, and safe result/error projection.
- `packages/persistence-sqlite` stores only non-sensitive Session metadata and
  an opaque Phase 11 Secret Reference.
- CLI/Desktop expose only safe metadata and literal confirmations.

## Phase 14 Login Flow and Element Picker

`packages/archive-core/src/authentication.ts` defines versioned Locator,
Login Flow, Authentication State, Element Picker selection, and OTP lifecycle
contracts. Locator values are serializable descriptors, never DOM nodes or
Playwright handles. Supported strategies are role, label, placeholder, test
ID, approved stable attributes, and bounded CSS, with optional frame context.
Resolution requires exactly one visible and enabled target and returns safe
diagnostics for missing or ambiguous matches.

The trusted local UI can start a temporary Element Picker in the active manual
Authentication Context. `packages/browser-runtime` installs and removes a
page-local overlay using native Playwright primitives; it has no privileged
bridge, capability token, credential access, or value metadata. Picker teardown
is performed when a Session Context closes or navigation changes.

`OtpFlowEngine` handles opening the configured Login URL, resolving the phone
and country controls, requesting a code, single-field or segmented OTP entry,
controlled resend cooldown, expiry, invalid/expired outcomes, Session
validation, and explicit Session save. The existing Crawl Run is transitioned
to `waiting_for_auth` before the flow and back to `running` only after the same
Session is validated and saved. No automatic SMS retrieval or CAPTCHA bypass
is implemented.

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
profile version, affinity schema version, and nullable `proxyId`. Phase 15
resolves a bound proxy through the Application Service before opening,
restoring, or reauthenticating a Session. The proxy must be enabled, healthy,
and backed by an available Secret Store reference when credentials are needed.
Cooldown, disabled, missing-secret, and connectivity failures fail closed.
Profile incompatibility fails closed rather than restoring into an unknown
Context.

Changing affinity is an explicit `session.setProxyAffinity` command. A live
Authentication Browser cannot be rebound implicitly; after an explicit change,
the Session requires reauthentication before authenticated work resumes. A
restore never falls back to direct routing when the recorded proxy is no
longer eligible.

## Supported surfaces

The contract exposes `session.open`, `session.reauthenticate`, `session.save`,
`session.get`, `session.list`, `session.validate`, `session.restore`, and
`session.delete`. Save and delete require literal confirmations. Returned
metadata intentionally omits the opaque Secret Reference as well as all raw
Storage State. Deletion closes active Contexts, removes the protected payload
when present, removes the metadata row, and is idempotent for a missing Session.

