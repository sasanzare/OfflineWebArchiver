# Target Canonical OKF Structure

**Document status:** Proposed; not activated  
**Knowledge status:** `PLANNED` overall; schema details `UNKNOWN` or `NEEDS_OWNER_CONFIRMATION`  
**Activation target:** Product Phase 3  
**Owner:** Architecture Owner with Knowledge Governance Owner and QA Lead  
**Last updated:** 2026-07-31

This file describes a likely canonical structure. It does not create `okf/`, lock
a schema, choose tooling, or prove architecture. Product Phase 3 must adjust the
layout to actual packages, layer contracts, and accepted decisions while
preserving bootstrap identifiers and history.

## Proposed tree

```text
okf/
  README.md
  manifest.json

  registry/
    domains.json
    nodes.json
    evidence.json
    relationships.json
    phases.json
    decisions.json
    risks.json
    changes.json

  knowledge/
    product/
    architecture/
    project-format/
    database/
    crawl/
    browser/
    authentication/
    proxy/
    archive/
    runtime/
    security/
    testing/
    ui/
    packaging/
    release/

  phases/
    phase-01/
    phase-02/
    phase-03/

  evidence/
    source/
    tests/
    builds/
    runtime/
    releases/

  maps/
    system/
    domains/
    dependencies/
    traceability/

  validation/
    schemas/
    rules/
    reports/
```

Phase directories continue through `phase-25` as phases occur. Domain folders can
be added or split only when actual repository structure and the domain registry
justify them.

## Root and registries

| Path | Purpose / authoritative content | Expected artifact types | Update triggers | Owner | Maintenance | Validation | Sensitivity |
|---|---|---|---|---|---|---|---|
| `okf/README.md` | Canonical entry point, stage, navigation, authority, maintenance instructions | Markdown | Activation; material governance/navigation change | Knowledge Governance Owner | Manual, validated | All links/declared paths resolve; stage matches manifest | No secrets/private target data |
| `okf/manifest.json` | Likely root identity/version, registry locations, schema versions, generation/validation metadata, current knowledge snapshot reference | JSON | Schema, registry, release snapshot, validation contract change | Knowledge Governance Owner / Architecture Owner | Manual core fields plus generated facts only if provenance exists | Schema, unique project identity, referenced files, version compatibility | Public metadata only |
| `okf/registry/` | Canonical machine-readable indexes and stable IDs | JSON | Any active/deprecated node, relation, evidence, phase, decision, risk, or change update | Per-registry owner; QA validates | Prefer generated indexes from authoritative records where provenance is clear | Schema, uniqueness, referential integrity, sorted/deterministic output, no orphan active record | Sanitized metadata only |
| `okf/registry/domains.json` | Domain definitions, owners, hierarchy, activation/status | JSON records | Domain add/change/deprecate/owner/status change | Knowledge Governance Owner | Manual authority; deterministic rendering allowed | Domain schema, unique IDs/slugs, valid statuses/relations | No sensitive values |
| `okf/registry/nodes.json` | Canonical node IDs, types, names, domain, authority, status, source | JSON records | Knowledge node lifecycle/change | Domain owners | Generated index from node authorities preferred | Node schema, authority/path existence, status/history, domain exists | Sanitized metadata |
| `okf/registry/evidence.json` | Evidence metadata and links; not secret payload storage | JSON records | Evidence add/verify/supersede/move/remove | QA Lead / evidence author | Generated from evidence records preferred | Evidence schema/type/status, root-relative path, commit/method, path/supersession resolution | Strictly sanitized; protected evidence referenced indirectly |
| `okf/registry/relationships.json` | Typed edges among nodes, evidence, requirements, acceptance, risks, decisions, phases, consumers | JSON records | Any dependency/ownership/validation/supersession change | Domain owners | Generated from authoritative relationships preferred | Endpoint existence, allowed type/direction/cardinality, duplicate/cycle rules | No secret payloads |
| `okf/registry/phases.json` | Product Phase 1–25 record index and final verification status | JSON records | Phase start/change/completion/reopen | Product phase owner / QA Lead | Generated from phase records | Exactly 25 product phase identities, required fields, evidence/status validity | Sanitized summaries |
| `okf/registry/decisions.json` | Project/OKF decisions and ADR links, including history | JSON records | Question/outcome/owner/deadline/ADR/status change | Decision owners | Generated index | Unique IDs, owner, outcome/ADR integrity, unresolved blockers visible | Private decision evidence referenced securely |
| `okf/registry/risks.json` | Risk IDs, scores, owners, controls, evidence, history | JSON records | Risk/control/score/status/owner change | Risk owners / Product Owner | Generated index | Score/status vocabulary, high/critical owner/control, evidence links | Sensitive incident detail excluded |
| `okf/registry/changes.json` | Append-oriented OKF knowledge change history | JSON records | Every phase and material knowledge correction/migration | Phase owner | Generated from reviewed change entries | Unique IDs, before/after/status/phase, referenced records | Sanitized change summaries |

`manifest.json` is likely the discovery and compatibility entry point, not a copy
of all registries. Exact fields, schema/version strategy, manual/generated
boundaries, JSON authority, and signing/release-snapshot role remain unresolved
under `OKF-OD-002` through `OKF-OD-008` and `OKF-OD-013`. Product Phase 3 must not
claim schema stability without sufficient evidence and an upgrade policy.

## Knowledge directories

| Path | Purpose / authoritative content | Expected artifact types | Update triggers | Owner | Maintenance | Validation | Sensitivity |
|---|---|---|---|---|---|---|---|
| `okf/knowledge/product/` | Product capabilities, boundaries, terminology, users, success | Markdown/JSON node sources, maps | Scope/requirement/release change | Product Owner | Manual authority; generated summaries allowed | Links/IDs/source authority/status | Public planned facts |
| `okf/knowledge/architecture/` | Actual package/layer/process boundaries and ADR-linked structure | Node records, Markdown, Mermaid sources, contract links | Package/process/dependency/ADR change | Architecture Owner | Manual decisions plus generated package graph | Every claim cites packages/contracts/tests; diagrams link source | No secrets/internal endpoints |
| `okf/knowledge/project-format/` | Manifest/data layout, versions, portability, migration | Schemas, nodes, compatibility tables | Format/migration/path/export change | Data/Architecture Owner | Mixed, with schemas authoritative | Schema/version/path/evidence compatibility | No Project secrets |
| `okf/knowledge/database/` | Actual SQLite schema, migration/integrity/queue repository knowledge | Nodes, schema diagrams, migration links | Schema/migration/repository/invariant change | Data Owner | Generated schema views plus manual invariants | Migration/source/test paths and versions resolve | No captured target data |
| `okf/knowledge/crawl/` | Scope, queue, recovery, rate, discovery and asset orchestration views | Nodes, state/flow diagrams, policy maps | Crawl policy/state/discovery/worker change | Archive/Rendering/Reliability owners | Manual contracts plus generated graphs | Requirement/acceptance/test/evidence relations | No private target URL |
| `okf/knowledge/browser/` | Browser lifecycle, rendering, interaction, isolation and versions | Nodes, lifecycle/sequence maps, config/test links | Browser dependency/lifecycle/readiness/permission change | Rendering Owner | Mixed | Identified browser/build and reproducible evidence | No profiles/session values |
| `okf/knowledge/authentication/` | Login, OTP, session, secret boundaries and lifecycle | Nodes, sanitized state maps, policy/test links | Auth/session/OTP/store/expiry change | Security Owner | Manual policy/relationships | Leakage evidence and no secret-bearing records | Highest sanitization |
| `okf/knowledge/proxy/` | Authorized protocols, health, affinity, scheduler/rate relationships | Nodes, state maps, configuration schemas | Protocol/health/credential/assignment/rate change | Network/Security Owner | Mixed | No credential values; all-path evidence | Protected proxy details external |
| `okf/knowledge/archive/` | Asset identity, rewrite, route map and API capture/replay | Nodes, rule/contract maps, schema/test links | Asset/rewrite/API policy/storage change | Archive Owner | Mixed | Hash/rule/contract evidence; sensitive API filtering | No captured private payload |
| `okf/knowledge/runtime/` | Loopback server, route serving, containment and offline behavior | Nodes, contract/flow maps, test evidence | Bind/routing/CSP/isolation/replay change | Security/Archive Owner | Mixed | Loopback/live-network/traversal evidence | No runtime secrets |
| `okf/knowledge/security/` | Threat boundaries, controls, risks, audit/redaction behavior | Nodes, threat/control maps, ADR/test links | Security boundary/control/risk/incident change | Security Owner | Manual authority plus generated control coverage | Control-to-risk/test/evidence coverage | Sanitized; sensitive detail protected |
| `okf/knowledge/testing/` | Fixture/test strategy, suites, environments and evidence ownership | Nodes, test maps, result links | Test/fixture/environment/gate change | QA Lead | Mixed | Tests must exist/run for passed claims | Generated canaries excluded |
| `okf/knowledge/ui/` | English UI capability, workflows, events and accessibility | Nodes, flow/capability maps, test links | User flow/component/event/accessibility change | UX Owner | Mixed | UI-to-Core, strings, keyboard/accessibility evidence | Screenshots sanitized |
| `okf/knowledge/packaging/` | Build matrix, bundled contents, platform adapters, signing | Nodes, matrices, manifests, build/release links | Build/dependency/platform/signing change | Platform/Release Owner | Generated inventories plus manual policy | Clean-host/reproducible/signature evidence | Signing secrets never recorded |
| `okf/knowledge/release/` | Capability-to-artifact coverage, limitations, support and snapshot | Nodes, release maps, manifests | Candidate/final release or support change | Release Owner | Mixed | All critical claims map to artifact/evidence | Sanitized release metadata |

The grouping above is a navigation proposal. The 41 bootstrap domain IDs remain
the semantic registry. Product Phase 3 may use one folder for several domains or
split a folder when actual ownership and artifact volume justify it.

## Phase, evidence, maps, and validation

| Path | Purpose / authoritative content | Expected artifact types | Update triggers | Owner | Maintenance | Validation | Sensitivity |
|---|---|---|---|---|---|---|---|
| `okf/phases/` | One knowledge-impact record per Product Phase with history and handoff | Markdown and/or JSON | Every phase activity, completion, reopen, correction | Phase owner / QA Lead | Manual facts with generated indexes | Required fields, evidence links, exact P01–P25 identity | Sanitized; sensitive evidence indirect |
| `okf/evidence/source/` | Metadata/views for source and configuration evidence | Evidence records, indexes | Source/configuration evidence lifecycle | Component owner / QA | Generated index preferred | Path/symbol/commit/status resolution | No source secrets |
| `okf/evidence/tests/` | Existing tests and execution evidence | Evidence records, result references | Test add/change/run/remove | QA/component owner | Mixed | Test exists; result command/environment/date retained | Canary values excluded |
| `okf/evidence/builds/` | Reproducible build definitions/results | Evidence records, manifests/hashes | Build/dependency/toolchain change/run | Build/Platform Owner | Generated where reproducible | Input/tool/environment/hash integrity | Build credentials excluded |
| `okf/evidence/runtime/` | Reproduced behavior for identified builds | Sanitized observation records | Runtime verification/behavior change | QA/domain owner | Manual or generated with provenance | Build/environment/procedure/result links | Private traces protected |
| `okf/evidence/releases/` | Release artifact evidence | Artifact metadata, signatures/hashes/SBOM refs | Release candidate/final/supersession | Release Owner | Generated plus approvals | Artifact existence, hash/signature/matrix | Signing keys excluded |
| `okf/maps/system/` | Small views of actual system boundaries | Mermaid/JSON/Markdown | Architecture/process boundary change | Architecture Owner | Manual source; generated render optional | Every node/edge resolves and has evidence | No secret topology |
| `okf/maps/domains/` | Domain ownership/hierarchy views | Mermaid/JSON/Markdown | Domain/owner/hierarchy change | Knowledge Governance Owner | Generated from registry preferred | Registry parity | Public metadata |
| `okf/maps/dependencies/` | Package/contract/domain consumer relationships | Mermaid/JSON/Markdown | Dependency/consumer change | Architecture/domain owners | Generated where possible | Endpoints/evidence, cycle policy | No secret endpoints |
| `okf/maps/traceability/` | Requirement → acceptance → phase → test → risk → decision → domain → evidence views | JSON/Markdown/Mermaid | Any mapped item/relation change | QA Lead | Generated from registries preferred | No critical orphan; source counts agree | Sanitized metadata |
| `okf/validation/schemas/` | Versioned machine-record schemas | JSON Schema or selected equivalent | Record/manifest schema change | Architecture Owner / QA | Manual reviewed schemas | Self-validation, compatibility/migration tests | No sensitive examples |
| `okf/validation/rules/` | Semantic validation policy | Rule definitions/scripts after tooling decision | Governance/invariant change | QA Lead | Manual rules; executable implementation generated/reviewed | Deterministic clean-run tests | No repository data leakage |
| `okf/validation/reports/` | Generated validation results, not source authority | Machine/human reports | Validation run | QA/CI | Generated only | Identifies commit/input/tool/result; stale reports labeled | Sanitized outputs |

## Activation safeguards

Product Phase 3 may create this structure only when
[Migration and Activation Plan](MIGRATION_AND_ACTIVATION_PLAN.md) prerequisites
pass. It must validate paths from their source documents before indexing them,
preserve `okf-bootstrap/`, and roll back the canonical addition—not bootstrap
history—if referential integrity or ownership cannot be established.
