# Project Scope

## Product Phase 8 implementation boundary

Product Phase 8 is verified. `FR-RENDER-001` and the bounded Phase 8 portion of `FR-RENDER-002` now have owned Playwright/Chromium lifecycle, queued single-Job rendering, combined DOM/network stability, final rendered HTML, optional screenshot, safe evidence, runtime-network authorization, and Browser/Page crash recovery under Lease/Fencing/Checkpoint ownership. Link discovery, production asset download, HTML rewrite, API capture, Worker Pool scheduling, authentication, and proxies remain planned. The exact next phase is **Product Phase 9 — Link Discovery and SPA Support**.

**Project:** Offline Web Archive Builder  
**Document status:** Proposed baseline  
**Owner / decision authority:** Product Owner, except where another owner is named  
**Current product phase:** Product Phase 8 complete; Product Phase 9 — Link Discovery and SPA Support is next and not started
**Last updated:** 2026-07-31

This is the authoritative product-scope and requirements document. Measurement
rules are authoritative in [Coverage and Eligibility](COVERAGE_AND_ELIGIBILITY.md);
verification details are authoritative in the
[Acceptance Matrix](ACCEPTANCE_MATRIX.md). Unknown business or legal facts remain
in the [Open Decision Register](../project/OPEN_DECISIONS.md).

## Current production capability boundary

Product Phases 3–6 establish npm workspaces, versioned contracts, GUI-independent Archive Core, one Application Service, secure Electron/CLI adapters, canonical OKF, portable Project format `1.1.0`, SQLite schema `4`, Site Profile/Scope Engine `1`, and persistent Page Job Queue state/priority policy `1`. Implemented local commands cover system description, Project lifecycle/transfer, Profile revisions, Scope evaluation/normalization, and Queue enqueue/batch/claim/complete/fail/retry/release/skip/block/get/list/statistics/history/clear-pending.

The Queue durably stores Page Job identity, state, attempts, transitions, idempotency, and statistics. Phase 8 can render only an already eligible queued Page Job and persist its final DOM artifact. The production repository does **not** discover/enqueue links, authenticate, store Sessions/OTP, use proxies, download production assets, rewrite archives, capture/replay APIs, serve a final offline runtime, schedule multiple Workers, package releases, or validate a real target site. Interfaces and planned names are not implementation claims. Exact next phase is Product Phase 9 — Link Discovery and SPA Support.

## Vision and problem

Offline Web Archive Builder will let authorized users create portable, navigable
archives of modern websites whose useful content exists only after JavaScript
executes. Existing downloaders often save initial HTML without the rendered DOM,
SPA routes, lazy content, API-backed views, or enough state to resume a large,
multi-day run safely.

The product will combine an independently usable **Archive Core**, a **Local
Application Service**, an English **Desktop Interface**, an internal CLI, and a
loopback-only **Local Runtime Server**. A **Project** is a portable, versioned
directory containing configuration, non-secret state, archive revisions, and
reports. A **Run** is one execution against a Project; a **Revision** is an
immutable or explicitly versioned archive result.

## Target users and primary use cases

Target users are archivists, QA and migration teams, researchers, compliance
teams, and website owners or operators who have authority to preserve a site.

Primary use cases are:

1. Define an approved domain/path scope and safely create a Project.
2. Render public or authorized pages in real Chromium and discover bounded
   internal routes.
3. Pause, resume, and recover a multi-day run without duplicating completed work.
4. Participate directly in manual or OTP login without the application retaining
   passwords or OTP values.
5. Download and deduplicate assets, rewrite archived URLs, and selectively replay
   safe GET API responses.
6. Validate coverage, broken links, resource failures, and known limitations.
7. Browse the result through a loopback-only Local Runtime Server without
   contacting the target domain.
8. Move a secret-free exported Project between supported operating systems.

## Platforms, delivery, and language

- **Initial main deliverable:** portable Windows desktop application.
- **Required later delivery:** supported Linux and macOS desktop packages.
- **Architecture constraint:** Archive Core, portable format, and test fixtures
  must remain platform-neutral; exact OS/architecture matrices are open decisions.
- **User prerequisites:** no system-installed Node.js, Playwright, Chromium,
  SQLite, separate web server, or background service.
- **Product language:** English for UI, reports, dialogs, validation output,
  errors, menus, settings, and bundled documentation. Additional translations are
  optional post-MVP work.

## Delivery classification

### MVP

The MVP is the smallest complete Windows product that can safely create, resume,
validate, and browse a modern-site archive:

- Project creation/reopen, versioned relative-path format, scope policy, and URL
  normalization.
- SQLite Page Job and Asset Job queues with transactions, leases, checkpoints,
  deduplication, pause/resume, and forced-crash recovery.
- Bundled Chromium rendering, final DOM extraction, bounded SPA/History API route
  discovery, lazy-content handling, and safe browser-native interactions.
- Asset download/deduplication, HTML rewriting, SPA route mapping, and the
  loopback-only Local Runtime Server.
- Manual interactive login, protected session persistence, validation, expiry,
  and re-authentication.
- Conservative global and per-origin rate limiting; `429` and `Retry-After`
  compliance applies even before proxy support.
- English Windows Desktop Interface, internal CLI, JSON/HTML reports, broken-link
  validation, and auditable coverage metrics.

MVP completion does not mean final multi-platform release.

### Required before final multi-platform release

- Guided user-participated OTP login.
- Authorized HTTP, HTTPS, and SOCKS5 proxy import, health checks, sticky sessions,
  fail-closed behavior, and per-proxy worker controls.
- Full worker pool and coordinated global, per-origin, and per-proxy limits.
- Selective GET API capture, sensitive-data filtering, and offline replay.
- Linux and macOS packages plus cross-platform Project transfer validation.
- Target-site acceptance and release-readiness validation.

### Post-MVP optional enhancements

- Additional UI translations.
- Optional Debian and RPM packages beyond the approved Linux baseline.
- Advanced site-profile sharing.
- Additional explicitly safe API replay methods after security review.
- Visual comparison reports.
- Automatic application updates if later approved.

Classification changes sequencing only; it does not remove a required capability
from the [25-phase plan](../project/PHASE_PLAN.md).

## Fixed product boundaries

### In scope

- Archive Core independent of the GUI; Electron/React Desktop Interface; Local
  Application Service; internal CLI.
- Playwright using bundled Chromium and extraction of the final rendered HTML.
- Versioned portable Projects backed by SQLite crawl state.
- Static and modern SPA rendering, bounded route discovery, asset download and
  deduplication, HTML/resource rewriting, and selected GET API replay.
- Manual login, guided OTP with direct participation, protected sessions, and
  expiry/re-authentication.
- User-owned or authorized HTTP, HTTPS, and SOCKS5 proxies, health monitoring,
  sticky authenticated sessions, controlled workers, and rate-limit compliance.
- Pause/resume, leases, checkpoints, crash recovery, JSON/HTML reports, and
  loopback-only offline preview.
- Windows, Linux, and macOS desktop packages.

### Out of scope

- iOS/iPadOS, mobile interfaces, or App Store publication.
- CAPTCHA solving/bypass; Cloudflare, WAF, access-control, block, challenge, or
  rate-limit bypass; stealth patches; fingerprint forgery.
- Public/free proxy collection or proxy rotation to evade `429`, `Retry-After`,
  blocks, or challenges.
- SMS interception, telecommunications-account access, password/OTP storage,
  unauthorized account access, session theft, or unauthorized session reuse.
- Reconstructing original React, Next.js, TypeScript, JSX, backend, or database
  source.
- Payments, registrations, destructive actions, or real operational form
  submissions; state-changing requests are disabled by default.
- Guaranteed offline operation for inherently live functionality, DRM bypass, or
  crawling outside the approved domain/path scope.

## Assumptions and legal basis

1. Each target has documented authorization from its owner or another valid legal
   basis before a run. The operator is responsible for contractual, copyright,
   privacy, robots-policy, and data-retention review.
2. Approved domains, paths, denied routes, rate limits, test windows, accounts,
   and proxies are supplied by authorized stakeholders; the application does not
   infer permission.
3. Authentication and CAPTCHA challenges require direct user participation.
4. Proxies are user-owned or explicitly authorized and do not expand scope or
   retry rights.
5. Target sites can change or withhold content; a successful archive is measured
   against an approved, auditable denominator, not a promise of perfect fidelity.
6. Private target identity and credentials are not repository fixtures.

Unresolved legal, business, ownership, and platform questions are not silently
decided; they are listed in [Open Decisions](../project/OPEN_DECISIONS.md).

## Technical and security boundaries

- The Archive Core owns crawl policy and domain logic; the Desktop Interface is
  not an alternate execution path.
- External redirects are re-evaluated against the allowlist before navigation.
  Denied or state-changing routes remain blocked.
- A `429` creates a shared origin cooldown. `Retry-After` is honored and another
  proxy cannot be used for an immediate retry.
- Passwords and OTP values are ephemeral and never persisted. OTP buffers are
  cleared after submission, cancellation, expiry, and failure. Session, proxy,
  and captured-API secrets are protected and redacted.
- Selective GET capture is deny-by-default for sensitive headers and response
  data. Other methods are disabled unless a future reviewed policy permits them.
- Exported Projects omit secrets by default.
- Archived pages and responses are untrusted input. The Local Runtime Server
  binds to loopback by default, applies restrictive controls, and must prevent
  accidental live target access during offline validation.
- Persistent formats, database schemas, CLI contracts, service boundaries, and
  reports are versioned public contracts.

## Offline archive limitations

An archive preserves observed, authorized responses and rendered states; it is
not the original application. Live search, payments, account changes, streaming,
third-party identity, DRM media, personalized server logic, WebSockets, POST
flows, and unobserved API states may be unavailable. Time-dependent, random,
geographic, feature-flagged, session-specific, or continuously generated routes
cannot be exhaustively captured. Pages blocked by missing authorization, expiry,
challenge, or policy remain visible in reports and cannot be reclassified as
successful.

## High-level user journey

1. Obtain authorization and create a Project.
2. Enter approved scope, denied routes, request limits, and optional authorized
   accounts/proxies; validate configuration before network use.
3. If needed, complete a Login Flow manually or enter an OTP directly.
4. Start a Run; inspect progress, cooldowns, failures, and bounded discovery.
5. Pause, resume, or recover after interruption without redoing completed work.
6. Finalize a Revision, run offline validation, and review JSON/HTML reports.
7. Preview through the Local Runtime Server and export a secret-free Project.

## System boundary

```text
Authorized operator
  -> Desktop Interface / internal CLI
  -> Local Application Service
  -> Archive Core
       -> SQLite Project state
       -> Playwright + bundled Chromium
       -> authorized target origins / authorized proxies
       -> archive files and reports
  -> Local Runtime Server (loopback only)
  -> offline browser preview
```

External dependencies are target websites and identity providers, authorized
proxy services, OS packaging/signing services, Chromium/Playwright/Electron
compatibility, and optional platform keychains. Their availability and behavior
are not controlled by the product.

## Successful Project archive

A Project archive succeeds only when:

- its authorization and approved denominator are recorded;
- at least 95% of discovered eligible pages are successfully archived for the
  target-site acceptance run, with permanent failures retained in the denominator;
- all required quality metrics and exceptions are reported under
  [Coverage and Eligibility](COVERAGE_AND_ELIGIBILITY.md);
- the Project reopens, resumes, and transfers as required without secret leakage;
- internal navigation and selected API replay pass offline validation without
  target-domain access;
- known unsupported live features and security-relevant exclusions are explicit;
  and
- the applicable [Definition of Done](../project/DEFINITION_OF_DONE.md) and
  [Acceptance Matrix](ACCEPTANCE_MATRIX.md) gates have evidence.

## Functional requirements

“Must” describes planned product behavior, not current implementation.

| Requirement ID | Priority | Requirement |
|---|---|---|
| FR-AUTHZ-001 | Critical | A Run must require recorded authorization/legal basis plus approved domains, paths, denied routes, and rate limits before target network access. |
| FR-PROJECT-001 | Critical | The system must create a Project with a stable identifier, versioned manifest, relative internal paths, and no embedded secrets. |
| FR-PROJECT-002 | Critical | The system must reopen and validate an existing compatible Project without losing prior state. |
| FR-PROJECT-003 | Critical | Project and SQLite schema versions must support explicit, atomic, tested migrations and reject unsupported versions safely. |
| FR-PROJECT-004 | High | Secret-free Project export/import must preserve revisions, reports, and relative references across supported platforms. |
| FR-SCOPE-001 | Critical | URL normalization must produce deterministic page identities while preserving approved functional query semantics. |
| FR-SCOPE-002 | Critical | Domain/path allowlists and denylists must be enforced before request dispatch and after redirects. |
| FR-SCOPE-003 | Critical | External, destructive, or state-changing routes and requests must be blocked by default and reported. |
| FR-QUEUE-001 | Critical | SQLite-backed Page Job and Asset Job queues must persist across clean and unclean exits. |
| FR-QUEUE-002 | Critical | Queue uniqueness and idempotency controls must prevent duplicate logical jobs and duplicate completion effects. |
| FR-QUEUE-003 | Critical | Job claims, transitions, retries, completion, and lease metadata must be transactional. |
| FR-RECOVERY-001 | Critical | Runs must support pause, checkpoint, lease expiry, crash recovery, application restart, and later-day resume. |
| FR-RECOVERY-002 | High | Resume must not redownload completed pages and must safely continue partial assets with or without HTTP Range support. |
| FR-RENDER-001 | Critical | Bundled Playwright/Chromium must save the final rendered HTML for static and JavaScript-rendered pages. |
| FR-RENDER-002 | Critical | Rendering must capture bounded SPA and lazy-loaded content using explicit readiness and stability criteria. |
| FR-RENDER-003 | High | Approved browser-native interactions may be used for discovery, while operational/state-changing actions remain disabled. |
| FR-DISCOVERY-001 | Critical | The system must discover approved HTML links, client-side routes, and History API navigations with provenance. |
| FR-DISCOVERY-002 | Critical | Pagination, infinite scroll, calendars, search, and faceted navigation must obey configured finite budgets. |
| FR-AUTH-001 | Critical | Manual interactive login must use a visible browser with direct user participation and no credential capture by the application. |
| FR-AUTH-002 | Critical | Sessions must be protected, persisted only with consent, validated before use, detect expiry, and support re-authentication. |
| FR-OTP-001 | High | Guided OTP login must support user-entered single- and multi-field forms without SMS interception or automated challenge bypass. |
| FR-OTP-002 | Critical | Passwords and OTP values must never be persisted; ephemeral OTP data must be removed on every terminal path. |
| FR-PROXY-001 | High | The system must import explicitly authorized HTTP, HTTPS, SOCKS5, and authenticated proxy configurations without logging credentials. |
| FR-PROXY-002 | High | Proxy health, cooldown, failure reason, and availability must be measured conservatively before assignment. |
| FR-PROXY-003 | Critical | Authenticated sessions must remain sticky to their proxy where required, and loss of that proxy must fail closed. |
| FR-RATE-001 | Critical | Worker dispatch must enforce configured global, per-origin, and per-proxy concurrency and request-rate limits. |
| FR-RATE-002 | Critical | `429` and `Retry-After` must create shared cooldowns; proxy rotation must never be used to bypass them. |
| FR-ASSET-001 | High | Approved static assets and downloadable files must be downloaded with status, content type, integrity, and source provenance. |
| FR-ASSET-002 | High | Content-addressed deduplication and safe partial-download recovery must avoid corrupt or redundant assets. |
| FR-ARCHIVE-001 | Critical | Archived HTML and resource URLs must be rewritten to portable local references with unresolved URLs reported. |
| FR-ARCHIVE-002 | High | Discovered SPA routes must map deterministically to Local Runtime Server routes without collisions. |
| FR-API-001 | High | Only selected, policy-approved, idempotent GET API responses may be captured with request/response provenance. |
| FR-API-002 | Critical | Capture must remove sensitive headers, cookies, tokens, and policy-defined sensitive response fields before persistence. |
| FR-API-003 | High | Approved captured GET responses must replay deterministically offline; misses must fail safely without live fallback. |
| FR-RUNTIME-001 | Critical | The Local Runtime Server must bind to loopback by default and serve the selected Revision with deterministic routing. |
| FR-RUNTIME-002 | Critical | Offline validation and navigation must not contact target domains; blocked live dependencies must be reported. |
| FR-REPORT-001 | High | Every Run and Revision must produce versioned, machine-readable JSON and human-readable HTML reports. |
| FR-REPORT-002 | Critical | Reports must include coverage denominator, page/asset/API results, broken links, exclusions, challenges, retries, and known limitations. |
| FR-UX-001 | High | The Desktop Interface and all user-facing outputs must be English. |
| FR-UX-002 | High | Primary workflows, dialogs, progress, pause/resume, and error recovery must be keyboard navigable. |
| FR-CLI-001 | High | A versioned internal CLI must expose diagnostics, deterministic fixtures, validation, and automation without bypassing Core policy. |
| FR-DIAG-001 | Critical | Diagnostic bundles must be sanitized, inventory their contents, and exclude secrets and private target data by default. |
| FR-PACKAGE-001 | Critical | The portable Windows package must run on the approved clean Windows matrix without system-installed product dependencies. |
| FR-PACKAGE-002 | High | The Linux package must run on the approved distribution/architecture matrix with documented bundled/system dependencies. |
| FR-PACKAGE-003 | High | The signed/notarized macOS package must run on the approved Apple Silicon/Intel matrix. |
| FR-PACKAGE-004 | High | A Project exported on one supported OS must import, validate, and serve on every other supported OS. |
| FR-VALIDATE-001 | Critical | Target-site acceptance must demonstrate at least 95% auditable eligible-page coverage and separately report all quality metrics. |

## Non-functional requirements

| Requirement ID | Priority | Requirement |
|---|---|---|
| NFR-SEC-001 | Critical | Security controls must enforce authorization, approved scope, no evasion, challenge participation, and `Retry-After` compliance consistently across GUI, CLI, workers, and proxies. |
| NFR-SEC-002 | Critical | Passwords and OTPs must not persist; session, proxy, API, and signing secrets must be least-privilege protected and redacted from logs, reports, diagnostics, screenshots, and exports. |
| NFR-SEC-003 | Critical | Archived content must be treated as untrusted with loopback binding, restrictive runtime controls, external-navigation checks, and state-changing requests disabled by default. |
| NFR-SEC-004 | High | Security-sensitive actions and policy denials must leave sanitized, tamper-evident-enough audit evidence without recording secret values. |
| NFR-PRIV-001 | High | Collection and retention must be purpose-limited, configurable, documented, and capable of deleting sensitive captured data and temporary artifacts. |
| NFR-REL-001 | Critical | Queue and archive operations must be idempotent, transactional where state changes, and recoverable after forced process/browser/network failure. |
| NFR-REL-002 | Critical | SQLite integrity, migrations, manifests, partial files, and generated revisions must be validated with recoverable failure behavior. |
| NFR-PERF-001 | High | Concurrency, request rates, timeouts, scroll depth, route count, retries, and resource use must have explicit configurable bounds and observable backpressure. |
| NFR-PERF-002 | High | Approximately 600-page acceptance runs and larger archives must expose disk/memory estimates, low-space stops, and bounded worker/browser consumption. |
| NFR-PORT-001 | Critical | End-user packages must bundle required runtime components and not depend on system-installed Node.js, Playwright, Chromium, SQLite, a web server, or background service. |
| NFR-PORT-002 | Critical | Portable data must use platform-neutral names, relative paths, stable encoding, and versioned contracts across Windows, Linux, and macOS. |
| NFR-UX-001 | High | User-facing language must be clear English and distinguish success, exclusion, challenge, failure, and unknown states. |
| NFR-UX-002 | High | Primary workflows must meet the approved keyboard-accessibility baseline and expose progress without color-only meaning. |
| NFR-TEST-001 | Critical | Each critical behavior must have deterministic local fixtures, traceable automated/manual evidence, and leakage/adversarial tests where relevant. |
| NFR-MAINT-001 | High | Archive Core must remain GUI-independent and all public IPC/HTTP/CLI/database/project/report contracts must be versioned and documented. |
| NFR-QUAL-001 | Critical | Quality claims must use approved, reproducible formulas and retain permanent failures, challenges, and authorization blocks in auditable reports. |
| NFR-KNOW-001 | Critical | Project knowledge must be organized into discoverable, versioned OKF domains with stable identifiers, ownership, relationships, lifecycle status, and traceability. |
| NFR-KNOW-002 | Critical | Every technical claim marked `VERIFIED` must reference current repository evidence at sufficient authority for the claim; a plan or proposal cannot prove implementation. |
| NFR-KNOW-003 | Critical | Every Product Phase and material intervening change must review and update affected OKF knowledge, evidence, relationships, requirements, acceptance, risks, decisions, conflicts, deprecations, and phase records. |
| NFR-KNOW-004 | Critical | Documentation-code conflicts must be explicitly recorded with both evidence sources, owner, affected mappings, and resolution history; conflicts must not be silently erased or resolved by unsupported assertion. |

## Requirement governance

- Requirement IDs are immutable once implementation work references them. A
  semantic change requires a new ID or an explicitly recorded supersession.
- Product Owner approves scope and prioritization; Security Owner approves
  security/privacy policy; QA Lead approves evidence and metrics; Platform Owner
  approves packaging matrices; Target Site Owner approves authorization and the
  target denominator.
- Every requirement maps to acceptance, phase, fixtures, and risks in
  [Traceability](../project/TRACEABILITY.md). Any future orphan is a release
  blocker until mapped or formally removed.

### OKF maintainability and governance

Canonical [`okf/`](../../okf/README.md) is the current structured knowledge
entry point. It complements these authoritative requirements rather than
replacing them. The historical [OKF Bootstrap](../../okf-bootstrap/README.md)
records the migration and activation path completed in Product Phase 3.

Every Product Phase 2–25 must follow the
[OKF Phase Evolution Contract](../../okf-bootstrap/PHASE_EVOLUTION_CONTRACT.md).
The responsible task identifies affected knowledge domains before editing,
registers actual evidence after implementation/testing, preserves unknowns and
conflicts, handles removed/superseded evidence, validates links/identifiers, and
reports OKF changes in its handoff. No implementation capability becomes
`VERIFIED` solely because this scope plans it.
