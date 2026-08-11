# 25-Phase Plan

## Current phase position — 2026-08-07

Product Phase 8 — Browser Lifecycle and Rendering Engine remains the latest fully gated product phase. The repository also contains a partial Product Phase 10 interaction foundation, the Product Phase 11 Secret Store foundation, the Product Phase 12 Manual Login and Secure Session Manager implementation, and a partial Product Phase 13 hardening pass: contract `1.9.0`, SQLite schema `9`, Project schema `9`, Interaction Profile/Trace schema `1`, Secret Reference/Vault/Envelope schema `1`, Session metadata/storage-state/affinity schema `1`, Crawl Run state `1`, Replay/Offline policy `1`, Service Worker policy `1`, Canonical Path policy `1`, approved-plan validation, user-driven headed authentication, protected session persistence, fresh restore validation, redacted traces, project-scoped encrypted storage, metadata-only transport, and safe export/diagnostic boundaries. The Phase 9 Discovery Engine prerequisite is absent, so Phase 10/11 remain conditional; Phase 12 real browser evidence and Phase 13 browser/platform evidence are currently blocked.

**Document status:** Proposed baseline  
**Owner:** Product Owner  
**Current product status:** **Phase 8 complete; Phase 9 is the open prerequisite for discovery; Phase 10 partial; Phase 11 conditional; Phase 12 implementation present with a real-browser validation gate; Phase 13 implementation present with browser/platform validation gates**
**Last updated:** 2026-08-07

This is the authoritative concise delivery sequence. The attached Product Phase 11
specification adds a cross-cutting Secret Store foundation before later
authentication/session work; this repository records that implementation without
claiming the missing Phase 9/10 gate. The older Local Runtime Server row remains a
planned feature whose final placement must be reconciled by the Product Owner
before it is treated as a replacement for the Phase 11 security foundation.
A future detailed proposal
may expand it but must link here or explicitly supersede a row; no detailed
proposal exists in the Phase 1 repository. Every gate also requires the
[Project-Wide Definition of Done](DEFINITION_OF_DONE.md), applicable entries in
the [Acceptance Matrix](../product/ACCEPTANCE_MATRIX.md), traceability updates,
and a current handoff.

### Revised Phase 13 numbering note

The attached post-Phase-12 proposal defines the current Phase 13 as
architecture and security hardening. The numbered table below is the legacy
25-phase sequence and still contains the older Guided OTP label in its row 13;
that legacy row is not authorization to implement OTP in this task. Guided OTP,
the later proxy/worker/replay/runtime/download/rewrite work, and the final
phase-number reconciliation remain deferred until the revised proposal is
available as an authoritative repository document.

> **OKF maintenance is a continuous Definition of Done requirement, not a
> separate product feature phase.**

OKF Phase 0 does not change the 25 Product Phases. The detailed synchronization
workflow is authoritative in the
[OKF Phase Evolution Contract](../../docs/archive/okf/bootstrap/PHASE_EVOLUTION_CONTRACT.md).

| Phase | Name | Objective | Dependencies | Main deliverables | Acceptance gate | Security considerations | Expected test types |
|---:|---|---|---|---|---|---|---|
| 1 | Scope Finalization and Acceptance Criteria | Establish the authoritative documentation baseline before technical implementation | None | Scope/requirements, acceptance matrix, coverage rules, fixture/target plans, risks, decisions, 25-phase plan, traceability, DoD, README, handoff | All Phase 1 completion criteria pass; IDs/links/counts/security terms validate; no production code or orphaned critical requirement | Fix authorization, no-evasion, ephemeral credential, untrusted-content, loopback, redaction, and secret-free export boundaries | Documentation structure, link/ID/traceability/secret-pattern checks; manual consistency review |
| **2 (complete)** | **Technical Spike and Feasibility Proof** | Prove the riskiest packaged vertical slice: Open Electron → Launch bundled Chromium → Render a sample SPA → Save final HTML → Serve it through the Local Runtime Server → Run the packaged build on Windows without system-installed Node.js | P1 | Disposable spike, sample SPA fixture, packaged Windows proof, compatibility/size/resource measurements, decision recommendations, spike report | Reproducible packaged vertical slice passes without system Node/browser; clean-machine status is reported separately and cannot be passed without a clean host; risks/unknowns have evidence; spike is not mislabeled production architecture | Minimal isolated Electron surface, loopback bind, target-free fixture, no secrets/telemetry, retain Chromium sandbox | Integration, packaging smoke, controlled no-system simulation, dependency/size/performance/network isolation; clean-VM remains partial |
| **3 (complete)** | **Architecture, Monorepo, and Layer Contracts** | Convert spike evidence into reviewed repository/system boundaries, actual package ownership, and versioned public contract strategy | P2 | npm workspace; Core/service/contracts/platform/observability; Desktop/CLI shells; architecture docs; ADR-001..008; canonical OKF | AC-P03-001..024 pass; OD-009/010/011/026 resolved; OD-012/013/027 explicitly deferred; GUI-independent Core and OKF activation validated | Electron isolation, sender-validated IPC, no listener/remote content, dependency/supply-chain review, sensitive evidence paths constrained | Unit/integration/CLI/real Electron, boundary/cycle/contracts/security/docs, OKF prerequisite/semantic/rollback validation |
| **4 (complete)** | **Portable Project and SQLite Foundation** | Define and implement atomic Project lifecycle, manifests, schema/version/migration foundation | P3 | Project format 1.0.0, SQLite schema 2/repository, migrations/backups, atomic files, locks, ZIP transfer, contract 1.1.0, Desktop/CLI flows, ADR-009..014 | AC-PROJECT-001..005 and AC-P04-001..029 pass; OD-013 and bounded OD-014 resolved | No secret schema/export; traversal/reserved/alias limits; safe migration backup/rollback; renderer path grants | Unit, real SQLite integration, migration failure/corruption, hostile ZIP, built CLI and real Electron lifecycle smoke |
| **5 (complete)** | **Profile, Scope, and URL Normalization** | Define the versioned profile, authorization inputs, URL identity, allow/deny, redirect, and safe-method decisions before dispatch | P3, P4 | Profile schema 1/portable revision ledger, Scope Engine 1, normalization/identity, scope/canonical/redirect/security classifiers, contract 1.2.0, CLI/Desktop, ADR-015..022 | AC-P05-001..035 pass; AC-SCOPE-001 local normalization portion passes; future dispatch clauses remain defined | Deny precedence, credential/sensitive rejection, literal IP preflight, downgrade/loop controls, immutable approval evidence, no network | Unit/golden/integration/contracts/architecture/security, built CLI, real Electron smoke |
| **6 (complete)** | **Persistent Queue and Job State Machine** | Implement durable Page Job identity/state, transactional enqueue/claim/completion, retry foundations, history, inspection, and statistics without recovery behavior | P4, P5 | Queue package/port/SQLite repository, schema 4 migration, state/priority policy 1, contract 1.3.0, CLI/Desktop inspection, ADR-023..030, canonical OKF | AC-P06-001..035 pass, including real separate-connection duplicate/claim/terminal/retry races; no P7 capability is claimed | Bounded/redacted inputs and results, Project/Run/Profile ownership, parameterized SQL, token-fenced terminal writes | Unit/state-machine, migration/integration/security, Worker Thread SQLite concurrency, contract/architecture, CLI/Electron, docs/OKF |
| **7 (complete)** | **Checkpoint, Lease, and Crash Recovery** | Add expiring Worker ownership and recover durable work safely across application, process, and system failure | P4, P5, P6 | Lease/Heartbeat/fencing model, schema 5, versioned Checkpoints, cooperative Pause/Resume, bounded resumable recovery, multi-day/output/partial foundation, contract 1.4, ADR-031..040 | AC-P07-001..039 pass with independent connection races, actual process kill, exact expiry, stale fencing, Project-open inspection, 5m–14d horizons, CLI/Electron/security/docs/OKF | Hidden tokens, hashed Lease verifier, sensitive Project DB compatibility ledger, stale-worker prevention, bounded confirmed recovery, secret/path limits, no silent terminal reopen | Fake clock, SQLite races, forced process termination, local Range/no-Range, output integrity, full validators |
| **8 (complete)** | **Browser Lifecycle and Rendering Engine** | Establish browser process/context/page lifecycle and deterministic modern-page rendering under Phase 7 ownership | P5–P7 | Browser Runtime, Render Engine, schema 6/results, deterministic fixtures, Lease/Checkpoint/Crash integration, contract 1.5 | AC-P08-001..017 pass without weakening Scope, Lease, Fencing, recovery, sandbox, or network safety | Browser sandbox/process cleanup, request interception, stale ownership, no unapproved dispatch | Real Chromium lifecycle/render/crash/timeout, fault injection, recovery/security/architecture |
| **9 (next)** | **Link Discovery and SPA Support** | Extract bounded candidates from final rendered DOM/Sitemaps/client routes and enqueue only Phase 5-approved identities | P5–P8 | DOM link extraction, Sitemap, History API/SPA route observation, bounded button/pagination/infinite-scroll/JSON discovery, Queue integration | Discovery candidates are traceable, scope-evaluated, deduplicated, and recoverable without Phase 10 interaction | No state-changing actions, unapproved dispatch, scope bypass, or unbounded discovery | DOM/parser/golden, real SPA fixtures, scope/queue/recovery integration, adversarial links |
| **10 (partial foundation)** | **Browser-native Human-paced Interaction** | Add explicitly approved deterministic user-like actions without evasion or autonomous state-changing behavior | P5–P9 | Interaction profiles, bounded typing/clicking/hover/tab behavior, safety audit, redacted traces | Foundation criteria have direct evidence; full phase remains blocked until Phase 9 discovery and integration evidence exist | No stealth/evasion, credentials, destructive actions, or rate-limit bypass | Real browser interaction fixtures, safety interception, timeout/cancel/recovery; Phase 9 integration pending |
| 11 | Local Runtime Server | Serve a selected Revision locally with deterministic routing and offline isolation | P3, P10 | Loopback service, route/asset serving, runtime security policy, offline miss behavior | AC-RUNTIME-001..002 and malicious-content containment checks pass | Loopback default, origin/CSP/service-worker strategy, traversal, no live fallback, untrusted content | Socket/network, route E2E, traversal/adversarial, target-blocked browser |
| **12 (partial implementation)** | **Manual Login and Session Lifecycle** | Support direct-user visible login and protected consented session validation/expiry/re-auth | P3, P5–P7 | Headed Login Context, Secret Store-backed Storage State, Session lifecycle, Profile compatibility/affinity, CLI/Desktop surfaces, migration 008 | AC-P12-002..005 and AC-P12-007..014 pass; AC-P12-001/006/015 remain partial until pinned Chromium fixture validation | No password capture/persistence; Secret Store purpose boundary; third-party redirects; expiry, revocation, profile and Project isolation | Hybrid browser, protected storage, expiry clock, crash/leakage/adversarial |
| 13 | Guided OTP Login | Add accessible direct-user OTP participation for common field patterns | P12, OD-007/008 resolution | Guided single/multi-field flows, expiry/attempt states, ephemeral secret lifecycle | AC-OTP-001..003 pass, including cancel/fail/expire/crash leakage scan | No SMS interception/bypass; no OTP persistence; bounded attempts; visible user control | UI component/E2E, keyboard, fixed clock, lifecycle/crash/leakage |
| 14 | Proxy Management and Health | Import authorized proxy configurations, protect credentials, and model health/cooldown | P3, P5, P12 | HTTP/HTTPS/SOCKS5 adapters, import/store, health state machine, proxy inventory | AC-PROXY-001..005 pass with no credential/DNS/direct leak | Authorized proxies only, protected credentials, trust/DNS policy, conservative health | Local protocol integration, TLS/DNS, health clock, authentication/leakage |
| 15 | Worker Pool and Rate-Limit Compliance | Coordinate workers with global/origin/proxy limits, shared cooldowns, sticky assignments, and fail-closed behavior | P6–P8, P12, P14 | Worker scheduler, token/rate controls, origin cooldown, sticky-session routing, backpressure | AC-PROXY-006..007 and AC-RATE-001..006 pass across all network paths | `429`/`Retry-After` and challenges cannot be evaded by proxy rotation; no silent direct fallback | Deterministic scheduler/concurrency, multi-proxy network, fixed-clock cooldown, load/backpressure |
| 16 | Selective GET API Capture and Replay | Capture only approved sanitized GET responses and replay safely offline | P5, P7, P10, P11, OD-016 | Endpoint/field policy, capture manifest/store, sanitization, replay matcher/miss behavior | AC-API-001..003 pass with zero canary leakage and zero live fallback | Deny-by-default, sensitive headers/body fields, size/type/retention, non-GET disabled | API protocol integration, schema/variant, replay target-blocked, fuzz/leakage |
| 17 | Resilience, Recovery, and Integrity | Prove crash/network/browser recovery, checkpointing, multi-day resume, integrity, and bounded retry end to end | P4, P6, P7, P9, P12, P15 | Recovery coordinator, integrity checks, backup/restore policy, fault matrix and report | AC-RECOVERY-001,003,004; AC-REL-001..002; relevant partial/lease gates pass | Crash artifacts sanitized, expired sessions pause, corrupted state preserved, retry limits remain policy-bound | Forced process/browser/network faults, corruption/migration, multi-day clock, soak |
| 18 | Validation, Coverage, and Reports | Implement auditable coverage/eligibility ledger, offline/broken-link validation, and JSON/HTML reports | P8–P11, P16, P17 | Candidate/classification ledger, formula engine, validators, versioned report schemas/rendering | AC-REPORT-001..003, AC-QUALITY-001, and applicable runtime/API metrics pass on known goldens | No denominator manipulation, report escaping/redaction, challenge/error not success, offline network block | Formula/golden, independent recomputation, report schema/DOM, link/resource/API/console |
| 19 | English Desktop Experience and Accessibility | Deliver connected English Project/Run/login/progress/recovery/report workflows | P3–P18 | Electron/React Desktop Interface, state/error UX, keyboard support, user documentation | AC-UX-001..002 and AC-MAINT-001 pass; every workflow uses Core contracts | Context isolation, safe external links, no secret echo, explicit authorization/limitations | Component, contract/E2E, keyboard/accessibility, string inventory, packaged UI smoke |
| 20 | Security and Privacy Hardening | Complete threat-driven enforcement, audit, redaction, retention, diagnostics, and adversarial proof | P3–P19 | Reviewed threat model/controls, sanitized audit trail, retention/deletion, diagnostic bundle, security report | AC-SECURITY-001..004, AC-PRIVACY-001, anti-evasion/API/proxy/auth leakage gates pass; no high security defect | All mandatory safety/ethical requirements; secret-free exports; malicious archive containment | Static/dependency review, adversarial browser/network, canary/leakage, authorization/rate, deletion |
| 21 | Portable Windows Packaging | Produce and validate the initial portable Windows application | P2–P20, OD-003/021 | Reproducible Windows package, bundled Chromium/runtime, signing/integrity/dependency inventory, user docs | AC-WINDOWS-001 and AC-PORT-001 pass on every approved clean Windows image | Code signing/custody, SmartScreen/AV, non-admin storage, no secret in package/build log | Clean-VM package E2E, signature/hash/SBOM, uninstall/upgrade, AV/path/permissions |
| 22 | Linux Packaging | Produce and validate approved Linux packages | P2–P20, OD-004/021 | Linux artifacts, dependency/sandbox inventory, install/uninstall docs | AC-LINUX-001 and AC-PORT-001 pass on every approved distro/architecture | Preserve Chromium sandbox; declare system dependencies; permissions/signing | Clean image/hardware-like E2E, dependency/sandbox, package lifecycle, path |
| 23 | macOS Packaging | Produce signed/notarized packages for the approved architecture matrix | P2–P20, OD-005/021 | macOS artifacts, entitlements, signature/notarization, install/uninstall docs | AC-MACOS-001 and AC-PORT-001 pass on every approved Mac architecture | Hardened runtime, key custody, Gatekeeper, protected-store behavior | Clean hardware/VM E2E where valid, signature/notarization, architecture/path |
| 24 | Authorized Target-Site Acceptance | Validate the approximately 600-page target under owner-approved scope, rate, account, proxy, window, and retention | P1–P23 as applicable, OD-001/002/006/016/017/022/025 | Signed measurement snapshot, public/authenticated/recovery/proxy/offline Runs, evidence package, exceptions/sign-off | AC-VALIDATE-001 and TS-001..020 pass; >=95% audited coverage; pending classification zero; no scope/rate/leakage event | Current legal basis, direct-user login/OTP, anti-evasion, stop conditions, PII handling, evidence redaction | Target E2E/manual, recovery, network/rate, coverage audit, offline/link/API, security/leakage |
| 25 | Cross-Platform Release Readiness | Prove transfer/release integrity and close final release gates across all approved platforms | P21–P24 | Cross-platform Project matrix, full regression, release manifest/SBOM/hashes, migration/upgrade proof, final limitations and sign-off | AC-CROSSPLATFORM-001, AC-PORT-002, AC-TEST-001 and all release-critical criteria pass; DoD signed | Supply chain/signing, secret scans, platform sandbox/permissions, no unsupported claim | Full regression, cross-product platform transfer, clean package E2E, upgrade/migration, security, reproducibility |

## Release-scope lifecycle

The current product release line is Windows 11 x64. Phase 21 is the current
Windows packaging path; Windows 10 remains a legacy/compatibility concern and
does not become a mandatory release target by implication. Phase 22 (Linux)
and Phase 23 (macOS) preserve future native packaging and support obligations,
but their gates are deferred and non-blocking for the current release. Phase 25
may reactivate cross-platform transfer and release gates only after those
future platform decisions and native evidence are approved.

## OKF responsibilities by product phase

Every row requires an OKF impact review, affected domain/evidence/relationship
updates, a phase record, validation, and handoff reporting in addition to the
phase-specific responsibility below.

| Product phase | Required OKF responsibility |
|---|---|
| P02 | Record the Technical Spike as experimental feasibility evidence under `docs/archive/okf/bootstrap/PHASE_EVIDENCE/`; update bootstrap domains, gaps, risks and decisions; do not create canonical OKF or call the spike final architecture. |
| P03 | Run AC-OKF-006 prerequisites; activate canonical `okf/`; migrate bootstrap records/history; register actual repository/packages/layers/contracts/ADRs and initial schemas/registries/validation. |
| P04 | Register Project-format versions, relative paths, SQLite schema/migrations, atomic writes, compatibility and integrity evidence. |
| P05 | Register authorization snapshot, URL identity/normalization, allow/deny/redirect/method policy and evidence. |
| P06 | Register Page Job identity/state, SQLite schema 4, uniqueness, enqueue/claim/terminal transactions, token fencing, retry/history/statistics invariants, CLI/Desktop and real concurrency evidence; keep Lease/Heartbeat/Crash Recovery planned. |
| P07 | Register Lease/Heartbeat/fencing ownership, expiration, abandoned-processing recovery, Checkpoints, Pause/Resume, multi-day/crash/shutdown integrity and stale-worker evidence while preserving Phase 6 invariants. |
| P08 | Register discovery sources/provenance, History/hash routes, safe interactions, finite budgets and fixture/runtime evidence. |
| P09 | Register asset identity, provenance, content hashes, dedupe, download policy and partial recovery evidence. |
| P10 | Register parser/rewriter decision, rewrite rules, route map, idempotency, collision/path and golden evidence. |
| P11 | Register Local Runtime Server bind/lifecycle/routing, loopback/untrusted-content controls and no-live-target evidence. |
| P12 | Register manual login boundary, protected session store/lifecycle, expiry/re-auth and leakage evidence without secret values. |
| P13 | Register OTP field/lifecycle/accessibility behavior and clearing/leakage evidence without OTP values. |
| P14 | Register authorized proxy protocols/import, credential boundary, DNS/trust behavior, health/cooldown and affinity inputs. |
| P15 | Register worker ownership, global/origin/proxy limits, sticky/fail-closed behavior, `429`/`Retry-After` and anti-evasion evidence. |
| P16 | Register selected GET capture policy, filtering/data classification, capture identity, replay/miss and no-live-fallback evidence. |
| P17 | Register cross-component checkpoints, forced failure, lease/multi-day/partial recovery, corruption and backup/restore evidence. |
| P18 | Register eligibility/coverage calculators, validators, report schemas, recomputation, failures and evidence maps. |
| P19 | Register actual Desktop Interface and CLI/service contracts, UI capability mapping, English surfaces and accessibility evidence. |
| P20 | Register threat/control/data maps, audit/redaction/retention/diagnostics, adversarial/leakage evidence and residual risks/conflicts. |
| P21 | Register Windows matrix, package contents/runtime versions, signing/AV/path/permission behavior and clean-host evidence. |
| P22 | Register Linux matrix, dependencies/sandbox, package lifecycle, adapters, limitations and clean-host evidence. |
| P23 | Register macOS matrix, entitlements, signing/notarization, package/protected-store behavior and hardware evidence. |
| P24 | Register sanitized target authorization/profile/run evidence, denominator/metrics, stops/incidents, limitations and sign-offs. |
| P25 | Reconcile every critical requirement and accepted capability to implementation/test/release evidence; close/review risks, conflicts and deprecations; generate final OKF validation report and release knowledge snapshot. |

## Phase governance

- A phase may begin discovery/design for its own work only after dependencies pass.
  It may not silently implement or claim a later phase.
- Any gate marked `needs-decision` in the acceptance matrix requires the relevant
  [Open Decision](OPEN_DECISIONS.md) before it can pass.
- Failed gates create tracked defects/risks; they are not removed by weakening
  acceptance after results are known.
- Security/privacy review is continuous; Phase 20 consolidates hardening and proof
  but does not defer basic controls from earlier phases.
- iOS, iPadOS, mobile UI, and App Store delivery are outside this plan.
