# Authoritative Source Map

**Document status:** Proposed bootstrap contract  
**Owner:** Product Owner with named category owners  
**Last updated:** 2026-07-31

This map prevents several documents from silently becoming competing sources of
truth. “Primary authority” means the artifact that must be updated first for that
category. Secondary artifacts summarize, test, visualize, or operationalize it
and must link back.

## Source map

| Knowledge category | Primary authority now / later | Secondary authority | Conflict resolution rule | Required update trigger | Responsible role | Future OKF domain |
|---|---|---|---|---|---|---|
| Product scope | [`PROJECT_SCOPE.md`](../docs/product/PROJECT_SCOPE.md) | README, phase plan, target plan | Scope authority wins for approved intent; conflicting implementation becomes `DOCUMENTATION_CODE_CONFLICT`, not an implicit scope change | Scope, delivery classification, boundary, platform, or safety change | Product Owner | `product`, `scope` |
| Functional requirements | Functional table in [`PROJECT_SCOPE.md`](../docs/product/PROJECT_SCOPE.md) | Acceptance matrix, traceability, phase plan | Requirement text/ID changes only through Product Owner change control; implementation divergence is noncompliance/conflict | Add/change/supersede requirement | Product Owner | `requirements` plus affected capability domain |
| Non-functional requirements | Non-functional table in [`PROJECT_SCOPE.md`](../docs/product/PROJECT_SCOPE.md) | DoD, risk register, acceptance, traceability | Same as functional requirements; security owner co-approves security/privacy changes | Quality/security/portability/governance obligation changes | Product Owner and relevant specialist owner | `requirements`, `security`, `privacy`, `evidence` |
| Acceptance criteria | [`ACCEPTANCE_MATRIX.md`](../docs/product/ACCEPTANCE_MATRIX.md) | Traceability, fixture/target plans, phase gates | Matrix controls criterion definition/status vocabulary; retained result evidence controls whether it passed | Requirement, scenario, expected result, phase, status, owner, or evidence changes | QA Lead | `validation`, `testing`, affected domain |
| Page eligibility and coverage | [`COVERAGE_AND_ELIGIBILITY.md`](../docs/product/COVERAGE_AND_ELIGIBILITY.md) | Acceptance matrix, reports, target plan | Formula/classification authority applies; later executable calculation must match or record conflict and obtain approval | Identity/classification/formula/threshold/report denominator changes | QA Lead and Target Site Owner for target denominator | `scope`, `validation`, `reporting` |
| Test fixture strategy | [`TEST_FIXTURE_STRATEGY.md`](../docs/testing/TEST_FIXTURE_STRATEGY.md) | Acceptance matrix; later fixture source/tests | Strategy defines intended categories; actual fixture source/tests define implemented behavior and must record gaps | Fixture added/changed/removed, test boundary or sensitivity changes | QA Lead | `testing`, `evidence` |
| Target-site acceptance | [`TARGET_SITE_ACCEPTANCE_PLAN.md`](../docs/testing/TARGET_SITE_ACCEPTANCE_PLAN.md) plus protected owner approvals | Coverage rules, matrix, phase report | Target owner controls authorization/scope/rate; QA controls evidence/metrics; repository never invents private facts | Target, authorization, scope, account, proxy, window, retention, metric or sign-off change | Target Site Owner and QA Lead | `validation`, `operations`, `security`, `privacy` |
| Risk management | [`RISK_REGISTER.md`](../docs/project/RISK_REGISTER.md) | Requirements, decisions, phase records, OKF gap analysis | Risk owner proposes; Product Owner/specialist owner accepts residual risk; tested control evidence is required to claim mitigation | Risk, score, signal, control, owner, status, or affected artifact changes | Row owner; Product Owner coordinates | `risks` |
| Definition of Done | [`DEFINITION_OF_DONE.md`](../docs/project/DEFINITION_OF_DONE.md) | Phase plan, acceptance matrix, handoff | DoD applies unless a stricter requirement exists; exceptions cannot waive critical safety/security rules | Any completion gate, evidence, release, handoff, or OKF synchronization rule changes | Product Owner and QA Lead | `phases`, `validation`, `evidence` |
| Open project decisions | [`OPEN_DECISIONS.md`](../docs/project/OPEN_DECISIONS.md) | ADRs after acceptance; OKF question register for OKF detail | Named owner decides; recommendation is not outcome; accepted technical result receives ADR | Question/evidence/recommendation/owner/deadline/outcome changes | Row owner | `decisions` |
| OKF-specific questions | [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) with umbrella `OD-026` | Future ADR/registry decisions | OKF question owner decides within authority; project-impacting outcome updates main register | OKF contract/schema/tool/ownership/policy choice changes | Named OKF question owner | `decisions`, `evidence` |
| Product phase sequencing | [`PHASE_PLAN.md`](../docs/project/PHASE_PLAN.md) | Phase evolution contract, handoff, phase records | Product plan controls 25 numbers/names/dependencies; OKF remains cross-cutting and cannot add a product phase | Phase name/objective/dependency/gate/responsibility changes | Product Owner | `phases` |
| Requirement traceability | [`TRACEABILITY.md`](../docs/project/TRACEABILITY.md) until canonical registries | Bootstrap traceability; acceptance/risk/phase sources | Each authority controls its own ID; traceability exposes mismatches rather than overwriting a source | Requirement/acceptance/test/risk/decision/domain/evidence relation changes | QA Lead | `requirements`, `evidence`, `maps/traceability` |
| Current phase status | [`HANDOFF.md`](../HANDOFF.md) for working state; accepted phase record later | README, Git status/history, phase evidence | Observable Git/repository state overrides stale handoff and creates a required correction/conflict | Phase start/finish, file/evidence/test/build/status/next-action change | Current phase owner | `phases`, `evidence` |
| Product Phase 2 spike behavior | Identified source/config/tests under [`spikes/phase-02-feasibility/`](../spikes/phase-02-feasibility/) plus reproducible runtime/package results | [`PHASE_02_FEASIBILITY_REPORT.md`](../docs/project/PHASE_02_FEASIBILITY_REPORT.md), Phase 2 bootstrap evidence, README/HANDOFF | Source/config/test/build/runtime evidence controls the identified spike; summaries cannot promote it to production | Spike code, fixture, dependency, test, package, runtime result, limitation, or status changes | Phase owner with QA/Security/Platform reviewers | `desktop-interface`, `browser-runtime`, `rendering`, `offline-runtime`, `testing`, `packaging`, `windows`, `evidence` |
| Product Phase 2 evidence summary | [`PHASE_02_FEASIBILITY_EVIDENCE.md`](PHASE_EVIDENCE/PHASE_02_FEASIBILITY_EVIDENCE.md) for bootstrap phase-impact record | Feasibility report and HANDOFF | Executable evidence outranks narrative; record exposes conflicts/unknowns and stays `NOT_COMMITTED` until an authorized commit | P02 evidence, status, mapping, risk, decision, or migration handoff changes | Product phase owner / QA Lead | `phases`, `evidence` |
| Future architecture | Approved ADRs and actual contracts/packages after Product Phase 3 | Architecture docs/diagrams and phase plan | Executable packages/contracts/tests describe current structure; ADR defines accepted intent; disagreement is explicit conflict | Package/layer/process/dependency/contract/consumer change | Architecture Owner | `architecture`, relevant component domains |
| Future implementation behavior | Current source, tests, schemas, configuration, migrations, builds, and reproducible runtime | Requirements, acceptance, ADRs, product docs | Level 1 evidence describes current behavior; deviations from approved requirements remain defects/conflicts | Any behavioral source/test/schema/config/runtime change or bug revealing an incomplete claim | Component owner and QA Lead | Affected implementation domain and `evidence` |
| Security decisions | Approved security ADR/policy and executable security controls/tests after implementation | Scope, requirements, risks, threat model, phase reports | Security Owner approval is required; weaker code is conflict/defect, not a policy change | Trust boundary, auth, secret, network, sandbox, redaction, audit, dependency, or threat change | Security Owner | `security`, `secrets`, affected domains |
| Platform support | Approved platform matrix decision plus clean-host packaged evidence | Scope, package docs, CI/release reports | A platform is supported only where approved matrix and actual package evidence agree | OS/version/architecture/dependency/support level changes | Platform Owner | `packaging`, `windows`, `linux`, `macos` |
| Packaging behavior | Reproducible build definitions, release artifact manifests, signatures/hashes, clean-host tests | Phase plan, packaging docs, SBOM, user docs | Actual identified package evidence controls current contents/behavior; documentation-only claim is not verified | Build inputs/output, bundled runtime, installer/portable behavior, signing, update, or dependency changes | Release Owner and Platform Owner | `packaging`, platform domains, `release` |

## Evidence and conflict rules

1. A lower-level source cannot verify a higher-evidence implementation claim.
2. A secondary document may summarize but must not redefine an identifier or
   silently copy an authoritative table.
3. When a primary authority changes, every dependent summary, relation, phase
   record, risk, decision, and evidence link is reviewed in the same change.
4. When code and tests exist, OKF behavior claims derive from current source,
   tests, schemas, configuration, migrations, reproducible builds, and runtime
   observation—not documentation claims alone.
5. Conflicts follow the process in [Status Model](STATUS_MODEL.md). History is
   preserved.

## Current limitations

Product Phase 2 now supplies Level 1 evidence for one identified experimental
Windows slice. It does not supply production architecture, component ownership,
public contracts, general crawling/archive behavior, hostile-content security,
platform support, or release evidence. Those claims remain `PLANNED`, `UNKNOWN`,
or `BLOCKED`. Product Phase 1 documentation remains authoritative for planned
obligations; P02 executable evidence is authoritative only for its bounded spike.
