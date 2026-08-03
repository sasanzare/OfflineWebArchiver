# OKF Bootstrap Gap Analysis

**Document status:** Verified analysis after the Product Phase 2 experimental spike  
**Owner:** QA Lead with domain owners  
**Last updated:** 2026-07-31

Missing production evidence remains expected because Product Phase 2 produced
only an isolated experimental spike. It must not be “fixed” by treating that
spike as the Product Phase 3 architecture or later-phase implementation.

## Gap classification

Only these gap classifications are used:

- `expected-at-current-phase`
- `requires-future-phase`
- `needs-owner-confirmation`
- `blocking`
- `documentation-conflict`

Knowledge status remains the separate uppercase model in
[Status Model](STATUS_MODEL.md).

## Current position

Known and evidence-backed now:

- product vision, scope, boundaries, requirements, acceptance, eligible-page
  rules, fixture strategy, target plan, risks, decisions, phase sequence,
  traceability, Definition of Done, and OKF bootstrap governance;
- the working tree contains the documentation baseline plus one isolated P02
  source/test/build/package spike;
- the P02 Windows x64 packaged slice passed controlled no-system-runtime
  simulation; and
- Product Phase 3 is next and remains the canonical activation gate.

Planned but not implemented for production:

- every final application/service/browser/data/crawl/auth/proxy/archive/runtime/
  UI/packaging/release capability in the domain catalog. P02 evidence changes
  selected domains to `PARTIAL` only.

Blocked or owner-dependent:

- architecture/package/schema/tool choices, security/vault/API/evidence policy
  details, platform matrices, target facts, signing, and canonical OKF schema and
  ownership choices.

## Gap register

| Gap ID | Gap | Area | Classification | Knowledge status | Current evidence | Required action / exit condition | Owner | Target phase | Impact if ignored |
|---|---|---|---|---|---|---|---|---|---|
| OKF-GAP-001 | No production source or component ownership evidence | Implementation | `expected-at-current-phase` | `PLANNED` | Repository inventory; Product Phase 1 scope | Product Phases create actual source and register domain ownership/evidence | Component owners | P02–P20 | Speculation or undiscoverable files |
| OKF-GAP-002 | No accepted final architecture/package/process boundary | Architecture | `requires-future-phase` | `BLOCKED` | P02 spike and experimental ADRs; OD-009..013/027 | P03 reviews feasibility evidence, approves ADRs/contracts and creates actual structure | Architecture Owner | P03 | Spike may be mistaken for final design |
| OKF-GAP-003 | No canonical OKF manifest or registry schemas | OKF schema | `needs-owner-confirmation` | `BLOCKED` | Target structure; OKF-OD-002..008 | Approve schema direction, versioning, validation and migration in P03 | Knowledge Governance / Architecture Owner | P03 | Incompatible or unverifiable records |
| OKF-GAP-004 | Production application tests and full fixture services do not exist | Testing | `requires-future-phase` | `PARTIAL` | P02 has 18 passing unit/integration assertions plus Electron/package smoke on one synthetic SPA | Add production tests/fixtures in mapped phases; retain P02 only as experimental evidence | QA Lead | P03–P25 | Spike coverage could be generalized beyond evidence |
| OKF-GAP-005 | No production build/package/CI evidence | Build | `requires-future-phase` | `PARTIAL` | P02 TypeScript build and 704.64 MiB unpacked x64 package passed; no CI/release/clean-host proof | P03 defines build ownership; P21–P25 record clean builds, SBOM, signatures, outputs/hashes/environments | Build/Platform Owner | P03, P21–P25 | Experimental package could be mistaken for release evidence |
| OKF-GAP-006 | Production runtime observations are absent | Runtime | `requires-future-phase` | `PARTIAL` | P02 records one Electron/Playwright/runtime sample and explicit measurement limits | Later phases record identified production builds, repeatable profiles and approved thresholds | QA/domain owners | P03–P25 | One sample could be mislabeled a performance guarantee |
| OKF-GAP-007 | No database/project schemas or migrations | Data | `expected-at-current-phase` | `PLANNED` | Requirements/acceptance only | P04 creates/registers schema, migrations, integrity and compatibility evidence | Data Owner | P04 | Format/data behavior remains unknown |
| OKF-GAP-008 | No release artifact or release knowledge snapshot | Release | `expected-at-current-phase` | `PLANNED` | Phase plan and DoD only | P21–P25 produce artifact evidence; P25 generates final snapshot | Release Owner | P21–P25 | Capabilities cannot be tied to shipped artifacts |
| OKF-GAP-009 | Target identity, authorization, limits, owner and retention facts unresolved | Business/legal/operations | `needs-owner-confirmation` | `NEEDS_OWNER_CONFIRMATION` | OD-001, OD-002, OD-022, OD-025 | Named owners approve protected evidence before target access | Target Site Owner / Legal / Privacy | Before P24 | Unauthorized or unauditable target work |
| OKF-GAP-010 | Vault/keychain, API sanitization, screenshots, diagnostics and signing policies unresolved | Security/privacy | `needs-owner-confirmation` | `BLOCKED` | OD-007, OD-008, OD-016..018, OD-021 | Security/privacy/release owners decide with threat and feasibility evidence | Security Owner | P03 and relevant later deadlines | Secret/privacy leakage or unimplemented policy |
| OKF-GAP-011 | Windows/Linux/macOS matrices unresolved | Platform | `needs-owner-confirmation` | `BLOCKED` | OD-003..005; P02 one-host Windows x64 simulation; clean-machine evidence partial | Approve matrices from needs and feasibility/package evidence; execute clean-host checks | Platform Owner / Product Owner | P21–P23 deadlines | Unsupported cross-platform claims |
| OKF-GAP-012 | Executable evidence exists only for the bounded P02 slice | Traceability | `requires-future-phase` | `PARTIAL` | Main traceability maps AC-P02-* to real tests/build/runtime; remaining implementation is planned | Add actual domain/evidence relations phase by phase; never generalize P02 proof | QA Lead | P03–P25 | Critical claims could remain documentary or overclaim the spike |
| OKF-GAP-013 | Canonical automated OKF validator/tooling not selected | Validation | `needs-owner-confirmation` | `BLOCKED` | Manual bootstrap validation; OKF-OD-009..012, OKF-OD-016..017 | Select supported approach in P03 and add schema/link/semantic checks | QA Lead / Architecture Owner | P03 | Drift and broken references become hard to detect |
| OKF-GAP-014 | Commit-linked evidence is unavailable for uncommitted Phase 1/OKF work | Evidence provenance | `expected-at-current-phase` | `UNKNOWN` | Git working tree; phase record uses `NOT_COMMITTED` | Use actual commit hashes after authorized commits; never invent them | Phase owner | First relevant commit | Evidence cannot yet bind to an immutable revision |
| OKF-GAP-015 | Domain ownership model is not formally approved | Governance | `needs-owner-confirmation` | `NEEDS_OWNER_CONFIRMATION` | Proposed domain catalog; OKF-OD-019 | Assign primary/delegate/reviewer owners before canonical activation | Product Owner | P03 | Orphan or competing knowledge authority |
| OKF-GAP-016 | Markdown versus JSON authority and generated/manual boundaries unresolved | Governance/schema | `needs-owner-confirmation` | `BLOCKED` | Target structure; OKF-OD-002, OKF-OD-009 | Define one-way generation/authority and conflict policy before registries | Knowledge Governance Owner | P03 | Two contradictory sources of truth |
| OKF-GAP-017 | Bootstrap-to-canonical migration has not been exercised | Migration | `requires-future-phase` | `PLANNED` | Migration plan only | P03 dry-run/backup/validation/rollback with preserved bootstrap | Architecture Owner / QA Lead | P03 | Lost IDs/history or broken paths |
| OKF-GAP-018 | Sensitive evidence storage/reference boundary needs approval | Evidence/security | `needs-owner-confirmation` | `BLOCKED` | Evidence policy; OKF-OD-022 | Approve classifications, protected locations, retention and sanitized reference schema | Security/Privacy Owner | Before sensitive evidence, no later than P12/P16 | Secrets/private target data could enter OKF |
| OKF-GAP-019 | Release snapshot retention/signing/diff policy unresolved | Release knowledge | `requires-future-phase` | `UNKNOWN` | OKF-OD-013 | Resolve before release schema freezes; validate P25 snapshot against artifacts | Release Owner | P21 design; P25 use | Snapshot may be mutable or unauditable |
| OKF-GAP-020 | Bootstrap summary duplication budget is undefined | Knowledge quality | `needs-owner-confirmation` | `UNKNOWN` | OKF-OD-023 | Define single-authority/link-first and generated-summary rules | Knowledge Governance Owner | P03 | Contradictory stale copies |
| OKF-GAP-021 | Supported browser/runtime artifact source, mirror, update and rollback policy is unresolved | Build/security | `blocking` | `BLOCKED` | P02 current artifact location denial/DNS failures; working older Microsoft-hosted pin; R-038/R-039; OD-027 | P03 approve supported versions, provenance/checksums/cache/mirror, empty-cache CI, update/rollback and security SLA | Architecture / Security / Build Owner | P03 | Fresh builds fail or ship stale/vulnerable browser artifacts |

No unresolved `documentation-conflict` was found. The P02 brief and Phase Plan
initially expressed the clean-host gate differently; the Phase Plan now separates
P02 packaged no-system simulation from still-partial clean-machine evidence.
Future validation must not interpret “no conflict detected” as verified
production behavior.

## Traceability assessment

- All 47 functional and 16 pre-OKF non-functional requirements had direct
  acceptance and phase/test/risk mappings before bootstrap.
- New `NFR-KNOW-001..004` and `AC-OKF-001..006` are mapped in the updated project
  traceability and [Bootstrap Traceability](BOOTSTRAP_TRACEABILITY.md).
- Every critical requirement family is assigned to at least one future OKF
  domain. No critical requirement is excluded from canonical migration.
- Actual executable evidence exists for AC-P02-001..012 and AC-P02-014 only;
  AC-P02-013 is blocked. Production implementation requirements remain
  `PLANNED`, `PARTIAL`, `UNKNOWN`, or `BLOCKED`, never broadly `VERIFIED`.

## Migration risks

- Source-relative Markdown links may be indexed incorrectly if not normalized
  from each source file.
- IDs or status history may be lost by treating migration as regeneration.
- Planned nodes may be mislabeled verified because their documents are real.
- One-way generation may be undefined, creating Markdown/JSON divergence.
- Bootstrap and canonical records may both appear current after activation.
- Sensitive evidence paths or values may be copied into registries.
- A failed partial activation may leave README/HANDOFF pointing to broken
  canonical paths.

The migration plan requires a freeze, backup/rollback, source-path normalization,
registry validation, no-orphan comparison, explicit migrated/superseded status,
and preserved bootstrap history.

## Knowledge-drift risks

`RISK-KNOW-001` covers documentation detaching from code, AI agents using stale
claims, removed files leaving evidence links, contradictory sources, unsynchronized
phase completion, and undocumented platform change. Warning signs include:

- a Git diff changes source/tests/contracts/migrations/builds without OKF files;
- an active evidence path no longer exists;
- a `VERIFIED` node cites only Level 3–5 evidence;
- registry and source authority counts disagree;
- a package/platform behavior changes without its phase/domain record; or
- HANDOFF omits affected OKF.

The bootstrap itself does not mitigate the risk fully. Continuous enforcement,
canonical validation, review ownership, and release reconciliation remain future
controls.
