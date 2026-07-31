# OKF Bootstrap Traceability

**Document status:** Verified bootstrap migration map  
**Owner:** QA Lead  
**Last updated:** 2026-07-31

This map connects current authorities and identifier families to future canonical
OKF nodes. Evidence Level 3 verifies a requirement/plan, not implementation.
Product Phase 2 adds bounded Level 1/2 spike evidence in the dedicated section
below. Canonical activation remains Product Phase 3.

## Functional requirement families

| Current artifact | Current identifier | Knowledge domain | Future OKF node type | Planned activation phase | Current status | Evidence level | Critical coverage / notes |
|---|---|---|---|---|---|---:|---|
| `docs/product/PROJECT_SCOPE.md` | `FR-AUTHZ-*` | scope, security, operations | capability, policy, authorization gate | P03 registry; P05/P24 evidence | `PLANNED` | 3 | Includes critical FR-AUTHZ-001 |
| same | `FR-PROJECT-*` | project-format, database | capability, format contract | P03; P04 evidence | `PLANNED` | 3 | Includes critical FR-PROJECT-001..003 |
| same | `FR-SCOPE-*` | scope, link-discovery, security | policy, normalization rule | P03; P05 evidence | `PLANNED` | 3 | Includes critical FR-SCOPE-001..003 |
| same | `FR-QUEUE-*` | queue, database | state machine, invariant | P03; P06 evidence | `PLANNED` | 3 | Includes critical FR-QUEUE-001..003 |
| same | `FR-RECOVERY-*` | checkpoint-recovery | capability, invariant, failure mode | P03; P06/P17 evidence | `PLANNED` | 3 | Includes critical FR-RECOVERY-001 |
| same | `FR-RENDER-*` | browser-runtime, rendering, interaction | capability, lifecycle, contract | P03; P07/P08 evidence | `PLANNED` | 3 | Includes critical FR-RENDER-001..002 |
| same | `FR-DISCOVERY-*` | link-discovery, scope | capability, provenance, budget | P03; P08 evidence | `PLANNED` | 3 | Includes critical FR-DISCOVERY-001..002 |
| same | `FR-AUTH-*` | authentication, session, secrets | capability, state lifecycle | P03; P12 evidence | `PLANNED` | 3 | Includes critical FR-AUTH-001..002 |
| same | `FR-OTP-*` | otp, secrets | capability, secret lifecycle | P03; P13 evidence | `PLANNED` | 3 | Includes critical FR-OTP-002 |
| same | `FR-PROXY-*` | proxy-management, session, security | capability, protocol, state machine | P03; P14/P15 evidence | `PLANNED` | 3 | Includes critical FR-PROXY-003 |
| same | `FR-RATE-*` | rate-limiting, worker-scheduling | policy, scheduler invariant | P03; P15 evidence | `PLANNED` | 3 | Includes critical FR-RATE-001..002 |
| same | `FR-ASSET-*` | asset-management | capability, identity, storage rule | P03; P09 evidence | `PLANNED` | 3 | High-priority family; migrated |
| same | `FR-ARCHIVE-*` | html-rewriting, offline-runtime | capability, rewrite/route rule | P03; P10/P11 evidence | `PLANNED` | 3 | Includes critical FR-ARCHIVE-001 |
| same | `FR-API-*` | api-capture, privacy, secrets | capability, filtering/replay contract | P03; P16 evidence | `PLANNED` | 3 | Includes critical FR-API-002 |
| same | `FR-RUNTIME-*` | offline-runtime, security | capability, service/network boundary | P03; P11 evidence | `PLANNED` | 3 | Includes critical FR-RUNTIME-001..002 |
| same | `FR-REPORT-*` | reporting, validation | capability, report contract | P03; P18 evidence | `PLANNED` | 3 | Includes critical FR-REPORT-002 |
| same | `FR-UX-*` | desktop-interface | capability, workflow | P03; P19 evidence | `PLANNED` | 3 | High-priority family; migrated |
| same | `FR-CLI-*` | cli, application-service | capability, command contract | P03; P18/P19 evidence | `PLANNED` | 3 | High-priority family; migrated |
| same | `FR-DIAG-*` | security, evidence, operations | capability, sanitization contract | P03; P20 evidence | `PLANNED` | 3 | Includes critical FR-DIAG-001 |
| same | `FR-PACKAGE-*` | packaging, windows, linux, macos, release | capability, platform matrix/artifact | P03; P21–P25 evidence | `PLANNED` | 3 | Includes critical FR-PACKAGE-001 |
| same | `FR-VALIDATE-*` | validation, reporting, operations | quality gate, metric | P03; P24/P25 evidence | `PLANNED` | 3 | Includes critical FR-VALIDATE-001 |

## Non-functional requirement families

| Current artifact | Current identifier | Knowledge domain | Future OKF node type | Planned activation phase | Current status | Evidence level | Critical coverage / notes |
|---|---|---|---|---|---|---:|---|
| `docs/product/PROJECT_SCOPE.md` | `NFR-SEC-*` | security, secrets, scope | quality attribute, control obligation | P03; continuous evidence | `PLANNED` | 3 | Includes critical NFR-SEC-001..003 |
| same | `NFR-PRIV-*` | privacy, API, evidence | quality attribute, data policy | P03; P16/P20/P24 evidence | `PLANNED` | 3 | High-priority family; migrated |
| same | `NFR-REL-*` | checkpoint-recovery, database, queue | quality attribute, invariant | P03; P04/P17 evidence | `PLANNED` | 3 | Includes critical NFR-REL-001..002 |
| same | `NFR-PERF-*` | worker-scheduling, operations | quality attribute, resource bound | P03; P15/P18/P24 evidence | `PLANNED` | 3 | High-priority family; migrated |
| same | `NFR-PORT-*` | project-format, packaging, platforms | quality attribute, compatibility contract | P03; P04/P21–P25 evidence | `PLANNED` | 3 | Includes critical NFR-PORT-001..002 |
| same | `NFR-UX-*` | desktop-interface, reporting | quality attribute | P03; P19 evidence | `PLANNED` | 3 | High-priority family; migrated |
| same | `NFR-TEST-*` | testing, evidence, validation | evidence obligation | P03; continuous evidence | `PLANNED` | 3 | Includes critical NFR-TEST-001 |
| same | `NFR-MAINT-*` | architecture, contracts | quality attribute | P03; P03/P19/P25 evidence | `PLANNED` | 3 | High-priority family; migrated |
| same | `NFR-QUAL-*` | validation, reporting | quality attribute, metric integrity | P03; P18/P24 evidence | `PLANNED` | 3 | Includes critical NFR-QUAL-001 |
| same | `NFR-KNOW-*` | evidence, phases, requirements, decisions | governance obligation | Bootstrap; canonical P03 | `PARTIAL` | 3 | Includes critical NFR-KNOW-001..004; bootstrap exists, continuous/canonical enforcement remains |

## Acceptance criterion families

All rows originate in `docs/product/ACCEPTANCE_MATRIX.md`.

| Current identifier | Knowledge domain | Future OKF node type | Planned activation / evidence phase | Current status | Evidence level | Notes |
|---|---|---|---|---|---:|---|
| `AC-AUTHZ-*` | scope, security | acceptance node, evidence relation | P03 / P05,P24 | `PLANNED` | 3 | Authorization gate |
| `AC-PROJECT-*` | project-format, database | acceptance node | P03 / P04,P17,P25 | `PLANNED` | 3 | Create/open/migrate/portability |
| `AC-SCOPE-*` | scope | acceptance node | P03 / P05,P20,P24 | `PLANNED` | 3 | Normalize/allow/deny/safe route |
| `AC-QUEUE-*` | queue, database | acceptance node | P03 / P06,P17 | `PLANNED` | 3 | Persistence/duplicate/transaction |
| `AC-RECOVERY-*` | checkpoint-recovery | acceptance node | P03 / P06,P09,P17,P24 | `PLANNED` | 3 | Crash/lease/resume/partials |
| `AC-RENDER-*` | rendering, browser-runtime | acceptance node | P03 / P07,P08,P18 | `PLANNED` | 3 | Static/SPA/lazy |
| `AC-INTERACT-*` | browser-interaction, security | acceptance node | P03 / P08,P20 | `PLANNED` | 3 | Safe interactions |
| `AC-DISCOVERY-*` | link-discovery | acceptance node | P03 / P08,P18 | `PLANNED` | 3 | Link/history/budgets |
| `AC-AUTH-*` | authentication, session | acceptance node | P03 / P12,P17,P20,P24 | `PLANNED` | 3 | Manual/session/expiry |
| `AC-OTP-*` | otp, secrets | acceptance node | P03 / P13,P19,P20 | `PLANNED` | 3 | Single/multi/clearing |
| `AC-PROXY-*` | proxy-management, session | acceptance node | P03 / P14,P15,P17,P20,P24 | `PLANNED` | 3 | Protocols/health/sticky/fail-closed |
| `AC-RATE-*` | rate-limiting | acceptance node | P03 / P15,P20,P24 | `PLANNED` | 3 | Limits/cooldown/no evasion |
| `AC-ASSET-*` | asset-management | acceptance node | P03 / P09,P17,P18 | `PLANNED` | 3 | Download/dedupe |
| `AC-REWRITE-*` | html-rewriting | acceptance node | P03 / P10,P11,P18,P25 | `PLANNED` | 3 | HTML/route map |
| `AC-API-*` | api-capture, privacy | acceptance node | P03 / P16,P18,P20 | `PLANNED` | 3 | Capture/filter/replay |
| `AC-RUNTIME-*` | offline-runtime, security | acceptance node | P03 / P11,P18,P20,P24,P25 | `PLANNED` | 3 | Loopback/no live target |
| `AC-REPORT-*` | reporting, validation | acceptance node | P03 / P18,P19,P20,P24 | `PLANNED` | 3 | JSON/HTML/broken links |
| `AC-UX-*` | desktop-interface | acceptance node | P03 / P19,P25 | `PLANNED` | 3 | English/keyboard/state language |
| `AC-CLI-*` | cli | acceptance node | P03 / P18,P20,P25 | `PLANNED` | 3 | Command contract/policy parity |
| `AC-SECURITY-*` | security, secrets | acceptance node | P03 / P20,P25 | `PLANNED` | 3 | Redaction/diagnostics/content/audit |
| `AC-PRIVACY-*` | privacy | acceptance node | P03 / P20,P24 | `PLANNED` | 3 | Retention/deletion |
| `AC-REL-*` | checkpoint-recovery, database | acceptance node | P03 / P17,P24,P25 | `PLANNED` | 3 | Fault/corruption |
| `AC-PERF-*` | worker-scheduling, operations | acceptance node | P03 / P18,P24,P25 | `PLANNED` | 3 | Bounds/600-page behavior |
| `AC-PORT-*` | packaging, project-format | acceptance node | P03 / P21–P25 | `PLANNED` | 3 | Bundled runtime/cross-platform |
| `AC-TEST-*` | testing, evidence | acceptance node | P03 / every gate,P25 | `PLANNED` | 3 | Deterministic evidence |
| `AC-MAINT-*` | architecture | acceptance node | P03 / P19,P25 | `PLANNED` | 3 | Core/contract independence |
| `AC-QUALITY-*` | validation | acceptance node | P03 / P18,P24 | `PLANNED` | 3 | Auditable formulas |
| `AC-WINDOWS-*` | windows, packaging | acceptance node | P03 / P21,P25 | `PLANNED` | 3 | Clean Windows package |
| `AC-LINUX-*` | linux, packaging | acceptance node | P03 / P22,P25 | `PLANNED` | 3 | Approved Linux matrix |
| `AC-MACOS-*` | macos, packaging | acceptance node | P03 / P23,P25 | `PLANNED` | 3 | Signed/notarized matrix |
| `AC-CROSSPLATFORM-*` | project-format, packaging | acceptance node | P03 / P25 | `PLANNED` | 3 | Round-trip transfer |
| `AC-VALIDATE-*` | validation, operations | acceptance node | P03 / P24,P25 | `PLANNED` | 3 | Target coverage |
| `AC-OKF-*` | evidence, phases, requirements, decisions | governance acceptance node | Bootstrap / P03 and continuous | `PLANNED` | 3 | Bootstrap criteria are defined, not marked passed |

## Product Phase 2 evidence relationships

| Current identifier | Knowledge domain | Future OKF node type | Evidence phase | Current status | Evidence level | Evidence / limitation |
|---|---|---|---|---|---:|---|
| `AC-P02-001` | application-service, desktop-interface, packaging, windows | experimental acceptance/evidence relation | P02 | `VERIFIED` | 1/2 | Real Electron development/package smoke; not production UI/service |
| `AC-P02-002` | browser-runtime | experimental acceptance/evidence relation | P02 | `VERIFIED` | 1/2 | Real Playwright Chromium development/package launch; one old pin/platform |
| `AC-P02-003` | rendering, testing | experimental acceptance/evidence relation | P02 | `VERIFIED` | 1/2 | Marker/delayed/lazy/quiet-window fixture result only |
| `AC-P02-004` | link-discovery, testing | experimental acceptance/evidence relation | P02 | `VERIFIED` | 1/2 | Two known History routes and lazy trigger; not discovery engine |
| `AC-P02-005..006` | html-rewriting, project-format, evidence | experimental acceptance/evidence relation | P02 | `VERIFIED` | 1/2 | Fixture-specific DOM/save/relative output; production format/rewriter absent |
| `AC-P02-007..008` | offline-runtime, security | experimental acceptance/evidence relation | P02 | `VERIFIED` | 1/2 | Loopback/traversal/source-shutdown/Electron preview for one archive |
| `AC-P02-009..010` | packaging, windows, browser-runtime | experimental acceptance/evidence relation | P02 | `VERIFIED` | 1/2 | 704.64 MiB unpacked x64 package and restricted-`PATH` run; not release/clean-host proof |
| `AC-P02-011` | security, desktop-interface, offline-runtime | experimental acceptance/evidence relation | P02 | `VERIFIED` | 1/2 | Isolation/bridge/origin/path checks; hostile arbitrary archive controls incomplete |
| `AC-P02-012` | testing, evidence | experimental acceptance/evidence relation | P02 | `VERIFIED` | 1/2 | 18 assertions plus Electron/package verifiers passed |
| `AC-P02-013` | windows, packaging, evidence | blocked clean-host evidence relation | P02 | `BLOCKED` | 2/3 | Controlled local simulation only; clean Windows manifest/recording absent |
| `AC-P02-014` | phases, evidence, risks, decisions | governance acceptance/evidence relation | P02 | `VERIFIED` | 2/3 | Phase record and synchronized maps exist; canonical validator remains P03 |

## Other current authorities

| Current artifact | Current identifier | Knowledge domain | Future OKF node type | Planned activation phase | Current status | Evidence level | Notes |
|---|---|---|---|---|---|---:|---|
| `docs/project/RISK_REGISTER.md` | `R-001..040`, `RISK-KNOW-001` | risks plus affected domains | risk, control, evidence relations | P03 | `VERIFIED` | 2/3 | Register includes P02 measurements and R-038..040; risks remain open; preserve legacy IDs and score history |
| `docs/project/OPEN_DECISIONS.md` | `OD-001..027` | decisions plus affected domains | decision/ADR node | P03 | `NEEDS_OWNER_CONFIRMATION` | 2/3 | P02 evidence is attached; OD-026 links OKF questions; OD-027 captures artifact/update policy |
| `okf-bootstrap/OPEN_QUESTIONS.md` | `OKF-OD-001..025` | decisions, evidence | OKF decision node | P03 or named deadline | `NEEDS_OWNER_CONFIRMATION` | 3 | Does not duplicate project OD details |
| `docs/testing/TEST_FIXTURE_STRATEGY.md` | `FX-001..048` | testing plus mapped domains | fixture category, test/evidence relation | P03; source in later phases | `PLANNED` | 3 | P02 synthetic SPA exists but is not asserted to implement the full numbered fixture catalog |
| `docs/testing/TARGET_SITE_ACCEPTANCE_PLAN.md` | `TS-001..020` | validation, operations, security, privacy | target test/approval/evidence node | P03; execution P24 | `BLOCKED` | 3 | Private inputs/authorization absent |
| `docs/product/COVERAGE_AND_ELIGIBILITY.md` | Coverage/classification rules | scope, validation, reporting | policy, formula, status/relationship nodes | P03; implementation P18 | `PLANNED` | 3 | Rule document exists; calculator does not |
| `docs/project/PHASE_PLAN.md` | Product Phases P01..P25 | phases | phase nodes and gate relations | P03; continuous | `VERIFIED` | 2/3 | P02 is complete, P03 next; OKF Phase 0 is cross-cutting |
| `docs/project/DEFINITION_OF_DONE.md` | Project-wide DoD | phases, validation, evidence | governance/check nodes | P03; continuous | `VERIFIED` | 3 | Current rule is verified and includes OKF synchronization |
| `docs/project/TRACEABILITY.md` | Requirement trace rows | requirements, evidence, maps | relationship records and generated map | P03; continuous | `VERIFIED` | 2/3 | Planned production map plus actual P02 evidence chain |
| `docs/project/PHASE_02_FEASIBILITY_REPORT.md` | P02 findings | affected experimental domains, phases, evidence | phase report/evidence relations | P03 migration input | `VERIFIED` | 2 | Summary is bounded by source/test/package results and explicit limitations |
| `okf-bootstrap/PHASE_EVIDENCE/PHASE_02_FEASIBILITY_EVIDENCE.md` | P02 impact record | phases, evidence, risks, decisions | phase/evidence/change relations | P03 migration input | `VERIFIED` | 2 | `NOT_COMMITTED`; preserve as bootstrap history |
| `HANDOFF.md` | Current phase facts | phases, evidence | phase handoff/change nodes | P03 migration; continuously current | `VERIFIED` | 2/3 | P02 status is verified at validation time against observable Git state |

## Critical migration audit

The functional and non-functional family tables explicitly include every critical
requirement in `docs/product/PROJECT_SCOPE.md`, including the four new critical
knowledge requirements. Every family maps to a domain and future node type.

Required result at each migration/release check:

```text
critical requirements excluded from OKF domains: 0
critical requirements without acceptance mapping: 0
critical requirements without current or planned evidence activity: 0
```

“Planned evidence activity” does not satisfy final release. By Product Phase 25,
each accepted critical implementation claim must have current Level 1/2 evidence
or remain visibly blocked/failed; it cannot pass on this bootstrap mapping alone.
