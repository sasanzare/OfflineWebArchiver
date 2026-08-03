# OKF Phase Evolution Contract

**Document status:** Proposed mandatory cross-cutting contract  
**Owner:** Product Owner, Knowledge Governance Owner, and QA Lead  
**Applies to:** Product Phases 2–25 and every intervening feature, defect, migration, refactor, packaging, or documentation change  
**Last updated:** 2026-07-31

This is the principal OKF bootstrap deliverable.

> **A product phase is not complete until its OKF impact has been reviewed and recorded.**

OKF maintenance is a Definition of Done requirement, not a separate feature phase.
OKF Phase 0 does not alter or renumber the 25 Product Phases.

## Mandatory workflow for every product phase

Before editing, the responsible task must:

1. Read the current OKF entry point: `okf-bootstrap/README.md` before canonical
   activation, then `okf/README.md`.
2. Read the previous Product Phase knowledge record and current handoff.
3. Inspect actual repository evidence and current Git state; do not rely on the
   phase prompt’s assumed tree.
4. Identify affected knowledge domains, owners, requirements, acceptance,
   decisions, risks, consumers, and evidence before implementation.

During and after the work, it must:

5. Add or update affected knowledge nodes.
6. Add evidence records for actual source, tests, migrations, schemas,
   configuration, contracts, builds, runtime observations, manual validation, and
   release artifacts.
7. Update typed relationships and ownership.
8. Update Product Phase status and its knowledge record.
9. Update requirement and acceptance mappings.
10. Update risk, control, mitigation, and decision references when affected.
11. Record unknowns, blockers, limitations, and
    `DOCUMENTATION_CODE_CONFLICT` honestly.
12. Mark removed/replaced artifacts deprecated or superseded and preserve
    historical references.
13. Add an OKF change record.
14. Validate schemas, identifiers, repository-relative evidence paths, links,
    referential integrity, and critical-orphan rules.
15. List every OKF file created/modified in the final phase response.

The task must inspect again after tests because actual implementation and evidence
can differ from the initial plan.

## Mandatory phase-level record

Each Product Phase record contains all fields below. Use an explicit value such as
`None`, `UNKNOWN`, `NOT_APPLICABLE`, or `NOT_COMMITTED`; do not omit fields.

```text
Phase ID
Product phase number
Phase name
Objective
Initial repository state
Changed domains
Files created
Files modified
Files removed
Requirements affected
Acceptance criteria affected
Risks affected
Decisions affected
Architecture decisions
Public contracts changed
Database changes
Configuration changes
Security impact
Privacy impact
Platform impact
Tests added
Tests executed
Builds produced
Runtime evidence
Known limitations
Open conflicts
Unknown items
Deprecated artifacts
Migration requirements
Final verification status
Commit hash
Handoff summary
```

When no commit exists:

```text
Commit hash: NOT_COMMITTED
```

The phase record distinguishes files changed from evidence verified. “Tests
executed” includes exact command, environment, date, result, and evidence link.
“Builds produced” and “runtime evidence” cannot cite hypothetical work.

## Required future prompt section

Every future Codex phase prompt must contain this section:

```text
## OKF Synchronization Requirements

1. Read the canonical OKF entry point or current bootstrap entry point.
2. Identify affected knowledge domains before editing.
3. Update OKF after implementation and tests.
4. Register evidence using repository-relative paths.
5. Update requirement and acceptance mappings.
6. Update risks and decisions when affected.
7. Record unknowns and conflicts honestly.
8. Update the Product Phase record.
9. Validate OKF links and identifiers.
10. Report all OKF changes in the final response.
```

Prompts may add phase-specific instructions but cannot remove these.

## Change-type rules

### Bug fixes

When a bug shows that documented behavior, an invariant, failure mode, trust
boundary, dependency, or consumer map was incomplete or wrong:

- update the affected node and relationships;
- register the reproduction and regression-test evidence;
- record any prior `DOCUMENTATION_CODE_CONFLICT`;
- update affected requirements, acceptance, risks, and phase record; and
- preserve the incorrect historical claim and resolution.

A purely local implementation correction still receives an OKF review; the phase
record can state that no durable knowledge changed only after inspection.

### New capabilities

Review and update the capability’s domain, ownership, source and test evidence,
requirements, acceptance criteria, risks, decisions, consumers, public contracts,
security/privacy/platform impacts, and Product Phase record. A new source file
without discoverable domain ownership blocks completion.

### Removal or replacement

- Do not erase history or reuse identifiers.
- Mark the old node/evidence `DEPRECATED` or superseded.
- Record replacement and effective Product Phase.
- Update incoming/outgoing relationships and every active evidence link.
- Record consumer and migration impact.
- Remove obsolete current claims while retaining historical resolution.
- Fail validation if an active registry still cites a removed path.

### Contracts, migrations, security, and platforms

- Database/project migrations update format/data nodes, versions, compatibility,
  recovery evidence, consumers, risks, and acceptance.
- Public contract changes update version, producers, consumers, tests, migration,
  deprecation, and compatibility knowledge.
- Security boundary/control changes update threat, risks, decisions, tests,
  leakage/adversarial evidence, and residual limitations.
- Platform/build changes update matrices, bundled versions, package contents,
  clean-host evidence, limitations, and release mapping.

## Product Phase 2–25 evolution

The names and sequencing follow the authoritative
[Product Phase Plan](../docs/project/PHASE_PLAN.md).

| Product Phase | Required OKF evolution | Required evidence / guardrail |
|---:|---|---|
| P02 — Technical Spike and Feasibility Proof | Create `okf-bootstrap/PHASE_EVIDENCE/PHASE_02_FEASIBILITY_EVIDENCE.md`; record experimental Electron launch, Playwright/Chromium launch, sample SPA render, final HTML save, loopback server, clean-Windows packaged run, dependency compatibility, size/resource findings, failures and feasibility risks; update affected bootstrap domains/gaps/decisions | Label all spike structure experimental; cite actual commands/artifacts/observations; do not mark final architecture verified; do not create canonical `okf/` |
| P03 — Architecture, Monorepo, and Layer Contracts | Run activation gate; create canonical `okf/`; migrate verified/planned bootstrap records; create initial manifest/registries/schemas/validation; register actual repository/package/layer structure, Archive Core, Local Application Service, Desktop Interface, CLI, public contracts, consumers, and ADR evidence; mark bootstrap records migrated/superseded without deletion | Requires completed P02 evidence, actual structure/names/boundaries, resolved blocking choices, schema/validation direction and rollback; validation must prove no orphan/broken evidence |
| P04 — Portable Project and SQLite Foundation | Register Project format/version, manifest, relative paths, actual SQLite schema/repositories/migrations, atomic writes, backup/recovery policy, compatibility consumers and risks | Cite schemas, migrations, tests and interruption/integrity results; no secret-bearing Project evidence |
| P05 — Authorization, Scope, and URL Policy | Register authorization snapshot, URL identity/normalization, allow/deny/redirect/method rules, policy decision types and evidence | Map FR-AUTHZ/FR-SCOPE and ACs; cite executable policy tests; target authority remains separate |
| P06 — Persistent Queues and Scheduler State | Register Page/Asset Job state machines, uniqueness, transactions, claims, leases, fencing, retry and invariants | Cite schema/source/concurrency/fault tests; relate queue consumers and recovery risks |
| P07 — Playwright Rendering Foundation | Register actual browser lifecycle/version/configuration, context ownership, readiness/stability, final DOM capture and crash/resource behavior | Cite browser fixture tests and runtime traces for identified build; update compatibility risk |
| P08 — Route Discovery and Safe Interaction | Register every discovery source, route provenance, History/hash behavior, finite budgets and browser-native interaction contract | Map scope/safety controls and fixtures; record undiscovered/unsupported gaps honestly |
| P09 — Asset Pipeline | Register asset identity/provenance/content hashes, dedupe, download/type/size policy, partial Range/no-Range behavior and storage ownership | Cite download/integrity/concurrency/fault tests; update source-map decision and disk risks |
| P10 — HTML Rewriting and SPA Route Mapping | Register chosen parser/rewriter evidence, supported URL-bearing constructs, rewrite rules, idempotency, route mapping/collision/path behavior | Link OD-012 outcome/ADR, goldens, cross-platform path tests, unresolved live dependency behavior |
| P11 — Local Runtime Server | Register service bind/lifecycle/routing, revision ownership, loopback-only behavior, untrusted-content controls, traversal and live-network prevention | Cite socket/network/adversarial/route evidence; map security consumers and R-029 |
| P12 — Manual Login and Session Lifecycle | Register visible user login boundary, protected store decision/adapter, session state/validation/expiry/re-auth, consent and evidence handling | No password/session value in OKF; cite local auth, storage and leakage tests; record affinity unknowns |
| P13 — Guided OTP Login | Register single/multi-field user flow, attempt/expiry/cancel/crash lifecycle, accessibility, secret clearing and limitations | Never store OTP values; cite sanitized lifecycle/leakage evidence and unresolved target variations |
| P14 — Proxy Management and Health | Register approved HTTP/HTTPS/SOCKS5 support, import schema, credential boundary, trust/DNS behavior, health states/cooldowns and session affinity inputs | No proxy credential in records; cite protocol/health/leakage evidence; maintain authorization boundary |
| P15 — Worker Pool and Rate-Limit Compliance | Register worker ownership/assignment, global/origin/proxy limits, backpressure, sticky behavior, fail-closed paths, `429` and `Retry-After` shared cooldown/anti-evasion | Cite deterministic concurrency/clock/all-path network evidence; proxies never expand target rate |
| P16 — Selective GET API Capture and Replay | Register approved endpoints/methods, sanitization fields/headers, data classification, capture identity, replay match/miss and live-fallback prevention | Link OD-016 outcome, schemas/tests, leakage evidence; no captured sensitive payload in OKF |
| P17 — Resilience, Recovery, and Integrity | Register cross-component checkpoints, forced browser/app/network failure behavior, lease recovery, multi-day resume, corruption detection, backup/restore and bounded retry | Cite injected fault matrix and integrity evidence; status remains partial if any required boundary is untested |
| P18 — Validation, Coverage, and Reports | Register eligibility/classification ledger, coverage formulas, asset/link/runtime/API/console/resource validators, JSON/HTML schemas and evidence/recomputation | Cite formula/golden/schema/report tests; retain failures/challenges/authorization blocks; update evidence maps |
| P19 — English Desktop Experience and Accessibility | Register actual Desktop Interface packages/views, UI-to-Core/service contracts, commands/events, English surfaces, keyboard/accessibility and error/recovery workflows | Cite connected E2E/contract/accessibility evidence; UI mocks alone are not implementation proof |
| P20 — Security and Privacy Hardening | Register final threat/control/data maps, audit/redaction/retention/deletion/diagnostics, dependency findings, adversarial/leakage evidence, residual risks and conflicts | No high security claim without tests; sensitive evidence referenced indirectly; update every affected domain |
| P21 — Portable Windows Packaging | Register approved Windows matrix, build graph, package contents, bundled runtime versions, signing/AV/path/permission behavior and clean-host results | Cite actual package hash/manifest/SBOM/signature and clean VM evidence; map capabilities to artifact |
| P22 — Linux Packaging | Register approved Linux distro/architecture matrix, declared dependencies, Chromium sandbox, package lifecycle, adapters and portability results | Cite each supported clean image/hardware-like run; unsupported combinations visible |
| P23 — macOS Packaging | Register approved architecture matrix, entitlements, signing/notarization, protected-store/package lifecycle and portability results | Cite actual package/signature/notarization and required hardware results; preserve Intel decision history |
| P24 — Authorized Target-Site Acceptance | Register sanitized authorization/snapshot references, target profile, public/authenticated/recovery/proxy/offline evidence, denominator/metrics, incidents/stops, limitations and sign-offs | No private URL/credential in OKF; target evidence policy/retention applies; no failure hidden from denominator |
| P25 — Cross-Platform Release Readiness | Verify every critical requirement has implementation and test evidence; map accepted capabilities to release artifacts; review all high/critical risks, decisions, conflicts, deprecations and unsupported combinations; generate final validation report and release knowledge snapshot | Canonical OKF must match released artifacts/builds across approved platforms; unresolved conflicts remain visible and may block release |

## OKF completion checklist

Every Product Phase prompt must copy or reference this checklist:

- [ ] Current OKF/bootstrap entry point and previous phase record read.
- [ ] Actual repository/Git evidence inspected.
- [ ] Affected domains, owners, requirements, acceptance, risks, decisions, and
      consumers identified before editing.
- [ ] Created/modified/removed/renamed/generated artifacts recorded.
- [ ] Knowledge nodes and typed relationships updated.
- [ ] New source/test/migration/configuration/contract/build/runtime/manual/release
      evidence registered with repository-relative paths.
- [ ] Evidence removal/rename/supersession handled without broken active links.
- [ ] Requirement and acceptance mappings updated.
- [ ] Risk controls/status and decision references updated when affected.
- [ ] Unknowns, blockers, limitations and conflicts recorded honestly.
- [ ] Deprecated/replaced concepts retain IDs, history, relationships and migration.
- [ ] Product Phase record and OKF change log updated.
- [ ] OKF schemas, IDs, statuses, paths, links, relationships, source counts and
      critical-orphan rules validate.
- [ ] HANDOFF and final response list all OKF changes and validation results.

## Non-completion conditions

A Product Phase is not complete when:

- code changed but OKF was not reviewed;
- tests changed but evidence and mappings were not updated;
- a migration changed but project-format/database knowledge was not updated;
- a public contract changed without version, producers, consumers and migration;
- a security boundary changed without risks, decisions, tests and evidence;
- a phase omits known gaps, conflicts, unknowns or unsupported behavior;
- new files lack discoverable domain ownership;
- removed files leave active evidence references;
- build/package claims lack reproducible identified evidence;
- documentation claims verified behavior without executable evidence; or
- HANDOFF omits changed OKF files.
