# Target-Site Acceptance Plan

## Phase 7 boundary

Browser/Render/Recovery evidence is deterministic and local; it does not establish target-site coverage. Product Phase 9 discovery and later Asset/Rewrite/Runtime work remain planned. Future target runs must reuse Scope/Queue/Lease/Fencing/Checkpoint/Render semantics and cannot reinterpret synthetic completed Jobs as a complete archive.

**Document status:** Proposed template; blocked on target-specific approvals  
**Owner / decision authority:** [TARGET_SITE_OWNER] with QA Lead and Security Owner  
**Expected scale:** approximately 600 pages; replace with `[EXPECTED_PAGE_COUNT]`  
**Planned phase:** 24 — Target-Site Acceptance  
**Last updated:** 2026-07-31

This plan governs future validation against the private target site. It does not
authorize a crawl. The target domain is intentionally not invented or stored here.
All execution must comply with [Project Scope](../product/PROJECT_SCOPE.md),
[Coverage and Eligibility](../product/COVERAGE_AND_ELIGIBILITY.md), and the
[Definition of Done](../project/DEFINITION_OF_DONE.md).

## Approval record

The following fields must be completed, reviewed, signed, and hashed into the
Project measurement snapshot before any target request:

| Field | Required value / evidence | Approval authority |
|---|---|---|
| Target base URL | `[TARGET_SITE_BASE_URL]` | [TARGET_SITE_OWNER] |
| Legal basis | `[AUTHORIZATION_DOCUMENT_REFERENCE]` with scope, purpose, dates, and revocation contact | Legal/Compliance Owner and [TARGET_SITE_OWNER] |
| Authorized domains | `[AUTHORIZED_DOMAIN_LIST]` including redirect/CDN/API exceptions | [TARGET_SITE_OWNER] and Security Owner |
| Authorized paths | `[AUTHORIZED_PATH_LIST]` | [TARGET_SITE_OWNER] |
| Explicit denied paths | `[DENIED_PATH_LIST]` including admin, payments, registration, deletion, mutations, logout as applicable | [TARGET_SITE_OWNER] and Security Owner |
| Expected inventory | `[EXPECTED_PAGE_COUNT]` (planning assumption: about 600), source/method, page classes, expected aliases | [TARGET_SITE_OWNER] and QA Lead |
| Account owner | `[TEST_ACCOUNT_OWNER]`, approved roles, environment, revocation method; no credential values | [TARGET_SITE_OWNER] and Security Owner |
| Request policy | `[APPROVED_MAX_REQUEST_RATE]`, global/per-origin/per-proxy concurrency, retry/cooldown limits | [TARGET_SITE_OWNER] |
| Proxies | `[APPROVED_PROXY_LIST]` by non-secret identifier, ownership/authorization, regions, sticky rules | [TARGET_SITE_OWNER] and Security Owner |
| Test windows | `[APPROVED_TEST_WINDOWS]`, timezone, blackout windows, operations contact | [TARGET_SITE_OWNER] |
| Retention | `[DATA_RETENTION_POLICY]`, storage location/classification, deletion deadline, evidence exception | Privacy Owner |
| Acceptance owner | `[TARGET_SITE_ACCEPTANCE_OWNER]` with delegates and escalation route | Product Owner |

Authorization must be current on each Run day. A revoked, expired, incomplete, or
ambiguous record stops the Run before target network access. Robots directives,
terms, copyright, privacy/data-processing terms, and infrastructure rules are
review inputs; the existence of a public URL alone is not authorization.

## Scope and route policy

Before execution, attach a redacted route inventory:

- expected static, JavaScript-rendered, React/Vue/Angular/Next.js, SPA, pagination,
  lazy-content, API-driven, public, and login-only page types;
- seed URLs and approved discovery sources;
- approved functional query keys/values and tracking-key removal policy;
- finite budgets for pagination, scroll, calendar ranges, search corpus, facets,
  route count, redirects, retries, and page depth;
- CDN/static origins and selected GET API endpoints;
- expected file downloads and maximum object/total size;
- explicit denied routes for state changes, payments, registration, logout,
  destructive operations, account changes, live messaging, and unsupported
  services;
- external domains that may be observed but not followed; and
- known challenge/WAF/CAPTCHA behavior and the owner-approved response.

Redirects are checked again against the same allowlist. A newly observed domain or
route class is quarantined for approval; it is not automatically added.

## Authentication, OTP, session, and proxy profile

Complete before authenticated testing:

| Topic | Required target-specific input |
|---|---|
| Authentication method | `[AUTHENTICATION_METHOD]`: manual visible login, guided OTP, or approved combination |
| Login start/success/expiry signals | `[LOGIN_FLOW_SIGNALS]` without passwords, OTPs, cookies, or tokens |
| OTP | `[OTP_EXPECTATIONS]`: single/multi-field, validity window, attempt policy, user participation, support contact |
| Session | `[SESSION_EXPIRY_EXPECTATIONS]`: idle/absolute lifetime, validation endpoint/signal, renewal, logout and revocation |
| IP/proxy binding | `[SESSION_PROXY_BINDING_POLICY]`: whether the session must remain on its login proxy and fail-closed action |
| Account limitations | `[APPROVED_ACCOUNT_ROLES_AND_DENIED_ACTIONS]` |
| Proxy behavior | `[PROXY_REQUIREMENTS]`: approved IDs/protocols, health endpoint, authentication ownership, regions, direct-fallback rule |

Passwords and OTP values are entered directly by the authorized participant and
never persisted by the application. No SMS interception, CAPTCHA solving,
fingerprint forgery, stealth patch, or challenge bypass is permitted. Session,
proxy, and API secrets are stored only under the approved protected-store policy,
redacted from evidence, and excluded from exports. Proxy changes cannot expand
scope or evade rate limits; sticky sessions fail closed when the assigned proxy
is unavailable.

## Execution controls

### Baseline configuration

Record exact values before the Run:

```text
Project ID: [PROJECT_ID]
Build/version/hash: [BUILD_ID]
Project/DB/report schema versions: [SCHEMA_VERSIONS]
Normalization/policy versions: [POLICY_VERSIONS]
OS/architecture: [ACCEPTANCE_PLATFORM]
Approved global concurrency: [APPROVED_GLOBAL_CONCURRENCY]
Approved per-origin concurrency: [APPROVED_PER_ORIGIN_CONCURRENCY]
Approved per-proxy concurrency: [APPROVED_PER_PROXY_CONCURRENCY]
Approved max request rate: [APPROVED_MAX_REQUEST_RATE]
Timeout/retry/backoff/cooldown values: [APPROVED_RELIABILITY_LIMITS]
Discovery budgets: [APPROVED_DISCOVERY_BUDGETS]
Disk/memory limits and free-space stop: [APPROVED_RESOURCE_LIMITS]
Test windows and timezone: [APPROVED_TEST_WINDOWS]
```

Begin below the approved maximum and increase only with recorded owner approval.
All proxies share the target-origin rate/cooldown state. A `429` or valid
`Retry-After` prevents another proxy/direct path from retrying during the
cooldown.

### Stop, rollback, and escalation conditions

Immediately pause new target work, preserve sanitized diagnostic state, and notify
`[TARGET_SITE_OPERATIONS_CONTACT]` when any of these occurs:

- authorization expires/revokes, scope is ambiguous, or an unapproved
  domain/path/action is reached;
- target owner asks to stop or the Run leaves the approved window;
- `429`, `Retry-After`, WAF/CAPTCHA/challenge, block, unusual error spike, or
  operational degradation meets `[STOP_THRESHOLD]`;
- a state-changing request, credential/OTP capture, scope escape, proxy direct
  fallback, or sensitive-data leak is suspected;
- unexpected personal/special-category/confidential data is captured;
- request/concurrency budgets are exceeded;
- disk free space, memory, process stability, database integrity, or artifact
  integrity crosses the approved safe threshold;
- target content or login/OTP flow changes enough to invalidate the profile; or
- report/ledger integrity no longer supports an auditable denominator.

“Rollback” means stop dispatch, revoke test sessions, remove temporary target data
according to retention policy, restore only from verified Project backup if
needed, and document impact. It never means undoing actions on the target because
state-changing target actions are prohibited.

## Planned acceptance runs

No row is passed during Phase 1. Each execution receives a unique Run ID and
retains redacted evidence.

| Test ID | Future test | Procedure | Required result | Principal evidence |
|---|---|---|---|---|
| TS-001 | Initial login | Open visible browser and have [TEST_ACCOUNT_OWNER] log in directly | Approved account reaches documented success state; no password captured/persisted | Redacted recording, event/storage scan |
| TS-002 | OTP login | User directly completes approved OTP form, including accessibility paths | Success without SMS interception; OTP absent from storage/log/report/export | Redacted recording and canary/leakage scan |
| TS-003 | Session validation | Restart and validate a consented protected session before work | Valid session accepted only for approved scope/proxy | Validation trace without secret values |
| TS-004 | Session expiry | Let idle/absolute expiry occur during work | Affected jobs pause; expiry is reported; no unauthenticated page counted successful | Timeline and job/session states |
| TS-005 | Re-authentication | User re-authenticates after TS-004 | Work resumes from durable state without duplicate completion | Request/job comparison |
| TS-006 | Public crawl | Run approved public seeds within conservative limits | Only approved public identities requested; ledger/metrics generated | Request and classification ledgers |
| TS-007 | Authenticated crawl | Run approved role/path inventory | Approved login-only content archives; denied roles/actions remain blocked | Auth-scope and page result report |
| TS-008 | Sticky proxy behavior | Login through assigned proxy and process session-bound pages | Origin observes same approved proxy; no direct/alternate fallback | Redacted origin/proxy correlation |
| TS-009 | Proxy failure | Disable sticky and non-sticky proxies on schedule | Sticky work fails closed; eligible non-sticky work follows approved health/cooldown policy | Network and scheduler timeline |
| TS-010 | Internet interruption | Interrupt connectivity during page/API/asset work | Bounded failures/partials persist and resume safely | State snapshots and integrity hashes |
| TS-011 | Forced process termination | Kill browser and application at approved checkpoints | Transactional state survives; abandoned leases recover once | Kill log and DB invariants |
| TS-012 | Resume after application restart | Reopen immediately after pause/crash | Pending work continues; completed work remains complete | Before/after job inventory |
| TS-013 | Resume on a later day | Resume after date/session/window change | Authorization and session revalidated; durable work retained | Approval/session/restart timeline |
| TS-014 | No redownload of completed pages | Rediscover completed identities after restart | No target request unless an approved refresh policy applies | Request counts and job history |
| TS-015 | Failed-page retry | Inject/observe transient and permanent failure classes | Retries honor caps/backoff/cooldowns; permanent failure remains in denominator | Attempt timeline and final classification |
| TS-016 | Offline validation | Block target network and traverse selected/all archived content | Local navigation/API replay works as reported; zero target-domain requests | Browser/network trace and report |
| TS-017 | Eligible-page coverage | Recompute against approved candidate ledger | Coverage is at least 95%; permanent failures/auth blocks/challenges remain in denominator; pending count zero | Signed denominator ledger and independent calculation |
| TS-018 | Broken-link reporting | Run link/resource validator and sample findings | Required failures and sources are listed; critical navigation has no unresolved break | JSON/HTML report and sample review |
| TS-019 | Known unsupported live features | Exercise documented search/payment/live/third-party or other limitations safely offline | Unsupported behavior is disabled or fails clearly without live target call/state change | Limitations report and network trace |
| TS-020 | Rate-limit compliance | Exercise naturally or with owner-approved test response; never induce unsafe load | Origin-wide cooldown respects `429`/`Retry-After` across proxies | All-path request timeline |

For target safety, fault cases should first be proven with local fixtures. Target
fault injection requires explicit approval and must not deliberately degrade the
site.

## Data handling and retention

- Store raw target artifacts only at `[APPROVED_STORAGE_LOCATION]` with
  `[APPROVED_ACCESS_CONTROL]` and encryption/protection defined by the Security
  Owner. Repository and ordinary CI artifacts receive only sanitized fixtures.
- Minimize capture to approved content. Selective GET capture filters
  authorization, cookie, proxy, CSRF, tracking, and policy-defined sensitive
  fields before persistence.
- Do not retain passwords or OTPs. Protect sessions/proxy secrets outside
  secret-free Project exports. Screenshots/recordings avoid or mask identity,
  contact, token, and private content regions.
- Apply `[DATA_RETENTION_POLICY]` separately to raw archives, protected stores,
  logs, screenshots, recordings, diagnostics, reports, backups, and temporary
  browser profiles. Record deletion verification.
- A diagnostic bundle is allowlist-based, consented, inventoried, sanitized, and
  excludes private payloads/secrets by default.

## Success metrics and gates

The authoritative formulas and classifications are in
[Coverage and Eligibility](../product/COVERAGE_AND_ELIGIBILITY.md).

Required gates:

- archive coverage is at least 95% of the final approved unique eligible-page
  denominator; denominator is nonzero, fully classified, and independently
  reproducible;
- page, asset, internal-link, runtime, API replay, console error, and resource
  failure metrics are all calculated with their underlying identity lists;
- offline runtime tests produce zero target-domain requests;
- every permanent failure, challenge, authorization block, exclusion, alias,
  unsupported feature, and denominator amendment is visible;
- no critical defect, high/critical security defect, scope/rate breach, or secret
  leakage remains;
- supporting thresholds use approved `[TARGET_QUALITY_THRESHOLDS]` and may not be
  weakened after results are known; and
- all applicable matrix criteria and project Definition of Done are met.

## Required evidence package

Retain, sanitize, and hash:

1. authorization/scope/rate/window approval references and measurement snapshot;
2. build, environment, browser, proxy ID, schema, policy, fixture/profile, and
   command manifests;
3. initial and final candidate/eligible/excluded/alias/failure ledgers;
4. JSON and self-contained HTML Run/Revision reports;
5. broken-link, asset, console, resource, API replay, scope, cooldown, recovery,
   and leakage reports;
6. required screenshots: Project/scope review, login success without secrets,
   progress/pause, recovery, final metrics, representative offline pages, and
   known limitation states;
7. required recordings: initial/OTP login when used, forced termination/restart,
   later-day resume, sticky proxy failure, and representative offline navigation;
8. target-blocked network capture and independent coverage recomputation; and
9. signed exceptions, stop incidents, retention/deletion proof, and final sign-off.

Evidence must show the behavior without exposing private URLs or data in the
repository. Redaction must not remove facts required to audit counts.

## Sign-off

| Role | Responsibility | Required sign-off |
|---|---|---|
| [TARGET_SITE_OWNER] | Authorization, scope, denominator, rate/window, operational impact | Required |
| [TARGET_SITE_ACCEPTANCE_OWNER] | Business acceptance and known limitations | Required |
| QA Lead | Traceability, evidence integrity, metric recomputation, defects | Required |
| Security Owner | Scope/evasion controls, auth/proxy/API/runtime/leakage results | Required |
| Privacy/Legal Owner | Legal basis, data handling, retention, exceptions | Required when target data is non-public/personal/contract-restricted |
| Platform Owner | Acceptance environment and packaged-build identity | Required |
| Product Owner | Final Phase 24 gate and deferred limitations | Required |

Any missing required sign-off leaves target-site acceptance `blocked`; it cannot
be replaced by a developer assertion.
