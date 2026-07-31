# Handoff

**Document status:** Product Phase 4 completion handoff
**Current branch:** `main`
**Product phase:** Product Phase 4 — Project Format, SQLite, and Migration (`complete`)
**OKF phase:** Canonical OKF synchronized through Product Phase 4 (`verified`)
**Next product phase:** Product Phase 5 — Profile, Scope, and URL Normalization (`not started`)
**Last updated:** 2026-07-31

## Product Phase 4 result

Project format `1.0.0`, SQLite schema 2, contract `1.1.0`, and application/workspace version `0.4.0` are implemented. The production lifecycle supports create, validation/compatibility, open, forward migration with SQLite API backup, clean close/checkpoint, bounded secret-free ZIP export/import, info, stable Project/Revision/Run identities, atomic staging/promotion, and a conservative single-writer lock.

New production packages are `project-format` and `persistence-sqlite`. Archive Core owns the storage port/types but imports no Node, SQLite, filesystem/path, ZIP, Electron, or CLI API. Application Service composes the adapter and translates errors. Desktop and CLI do not import persistence directly. The only new third-party dependency is exact pure-JavaScript `fflate@0.8.3`; SQLite is built into Node 24 and was exercised inside Electron 43.

SQLite owns exactly `schema_migrations`, `project_metadata`, `project_revisions`, `runs`, and `project_events`. Migrations `001_initialize_project_schema` and `002_add_project_events` are checksum-verified, forward-only, and transactional. The tested schema-1 path creates a verified backup before upgrade. Applied checksum drift, integrity corruption, identity mismatch, newer/unknown history, and failed migration all fail closed.

ZIP import is untrusted: central inspection rejects unsafe/absolute/traversing/backslash/reserved/colliding/invalid UTF-8/symlink/special/duplicate/encrypted/unsupported/multi-disk/ZIP64 entries and enforces count/compressed/expanded/single-file/ratio limits before staging. Inventory checksums and Project validation precede atomic promotion. Exports exclude locks, WAL/SHM, temp, logs, backups, auth, proxies, unknown roots, and secrets.

Contract commands are `system.describe` and Project `create/open/close/validate/export/import/info`. CLI exposes all requested one-shot workflows with human/JSON output and stable exit codes. The real Electron smoke executes the complete local Project round trip through a sandboxed renderer, narrow bridge, sender/frame/URL authorization, and main-owned exact path grants.

ADRs 009–014 accept the format, Node SQLite adapter, migrations/backups, atomic replacement, bounded ZIP, and locking. OD-013 is resolved; OD-014 is resolved for the bounded Phase 4 container but streaming ZIP64/large-archive policy remains before P25; OD-023 is partially resolved for mandatory pre-migration backup while retention/restore remains P17. R-045/R-046 track hostile archive/resource and advisory-lock/shared-filesystem limits.

Canonical OKF records verified Phase 4 format, database, migration, persistence, lifecycle, import/export, atomic, locking, contract, CLI, Desktop, security, test, and documentation evidence. Product Phase 5 remains planned. The Phase 2 spike and Phase 3 boundaries/history remain intact.

## Product Phase 4 validation summary

- Root install/lockfile update completed with zero npm audit findings.
- Typecheck, clean production build, all workspace builds, lint, formatting, architecture, contracts, format, migrations, security, documentation, OKF, and Git whitespace gates passed.
- `npm test` passed 29 tests with no skip, including built CLI and real Electron all-operation lifecycle smokes.
- Branch remains `main`. Codex created no commit, push, tag, release, deployment, stash, reset, or clean operation.

## Product Phase 4 known limitations

- ZIP is bounded and in-memory: no ZIP64, streaming, encryption, authenticity signature, or files above documented limits.
- Locking is coordination, not access control, and does not claim hostile-local-writer, PID-reuse, or network-filesystem safety.
- Backup retention, restore UX, rolling checkpoints, low-disk behavior, and broad recovery remain Product Phase 17.
- Cross-OS path rules are tested as a corpus; packaged Linux/macOS and all-pairs transfer remain Product Phase 25.
- No URL policy, scope, queue, crawler, browser, authentication, proxy, capture, rewrite, runtime server, or release behavior exists.

## Exact next product phase

**Product Phase 5 — Profile, Scope, and URL Normalization.** Define a versioned profile/config contract, authorization and approved scope inputs, deterministic URL identity/canonicalization, allow/deny precedence, redirect reevaluation, safe request-method policy, and a decision ledger before any network dispatch. Do not begin persistent queues or browser crawling.

## Historical Product Phase 3 result

The production npm/TypeScript monorepo is operational. Desktop and CLI both send strict contract 1.0.0 `system.describe` commands through the Local Application Service to GUI-independent Archive Core. The real Electron smoke verifies sandbox/context isolation, one preload method, sender/frame/URL validation, and the versioned response. The built CLI verifies help, version, human, JSON, and usage-error behavior. Architecture, contract, security, docs, and OKF gates fail closed.

Production packages are `archive-core`, `application-service`, `contracts`, `platform`, `observability`, and test-only `test-support`; applications are `desktop` and `cli`. npm 11 workspaces and one root lockfile are authoritative, with no added orchestrator. ADR-001 through ADR-008 record the monorepo, package, transport, contract, build, validation, error/log, and OKF decisions.

Canonical `okf/` is active. Bootstrap is preserved, Phase 1 documentary authorities and bounded Phase 2 evidence retain their evidence levels, and the Phase 3 migration report records zero critical orphans, duplicate IDs, broken evidence paths, or broken references. OD-009, OD-010, OD-011, and OD-026 are resolved; OD-012, OD-013, OD-027, and owner-dependent product/release choices remain deferred.

The Phase 2 spike remains intact at `spikes/phase-02-feasibility/` and is not a production dependency. No production crawler, Project/database persistence, browser automation/rendering, authentication, proxy, archive generator/rewriter, offline archive runtime, final UX, or release package exists. Product Phase 4 must implement only the portable Project/SQLite foundation and preserve these boundaries.

Final Product Phase 3 evidence is recorded in `okf/phases/phase-03/PHASE_03_ARCHITECTURE_RECORD.md` and `okf/validation/reports/PHASE_03_OKF_MIGRATION_REPORT.md`. No commit, push, or tag was created; commit remains `NOT_COMMITTED`.

## Product Phase 3 validation summary

- `npm install` succeeded with exact Electron/esbuild install-script allowlists; `npm audit --omit=dev` and `npm audit` each reported zero vulnerabilities.
- `npm run clean` removed only 17 owned generated paths; `npm run build` then completed from clean state.
- `npm run build --workspaces --if-present` built all eight workspaces independently.
- `npm run test --workspaces --if-present` passed every workspace-owned suite.
- `npm test` passed 18/18: 11 unit, 3 integration, one built CLI smoke, one real Electron smoke, and two OKF tests in their standalone groupings.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test:architecture`, `npm run contracts:check`, `npm run security:check`, `npm run docs:validate`, `npm run okf:validate`, and `npm run okf:migrate -- --self-test` passed.
- `npm run dev:cli` produced the safe architecture description; `npm run dev:desktop -- --architecture-smoke` produced a passing structured smoke with isolated renderer, one bridge key, a successful Core result, and safe unsupported-version error.
- `git diff --check` passed with only Git's LF-to-CRLF notice for README; no files are staged. Branch is `main` at initial commit `0abb7b1be8399f52f920b998ba789f234f4f105c` and no tag points at it.

## Product Phase 2 result

The isolated spike proves the complete packaged Windows path:

```text
Electron → Playwright-managed Chromium → local SPA render → final DOM extraction
→ atomic archive write → source shutdown → loopback-only archive server
→ Electron offline preview
```

The Windows unpacked package launched its copied Chromium with browser downloads
disabled and `PATH` restricted to `C:\Windows\System32`. It required neither a
system Node.js nor a system Chrome/Chromium executable. A separate clean Windows
Sandbox, VM, or machine was unavailable, so clean-machine verification remains
`PARTIAL`; the packaged-run simulation itself passed. This code remains
experimental evidence, not production architecture.

## Phase 2 files created

- `spikes/phase-02-feasibility/.gitignore`
- `spikes/phase-02-feasibility/README.md`
- `spikes/phase-02-feasibility/DEPENDENCIES.md`
- `spikes/phase-02-feasibility/THIRD_PARTY_NOTICES.md`
- `spikes/phase-02-feasibility/package.json`
- `spikes/phase-02-feasibility/package-lock.json`
- `spikes/phase-02-feasibility/tsconfig.json`
- `spikes/phase-02-feasibility/electron-builder.yml`
- `spikes/phase-02-feasibility/fixtures/spa/index.html`
- `spikes/phase-02-feasibility/fixtures/spa/app.js`
- `spikes/phase-02-feasibility/fixtures/spa/styles.css`
- `spikes/phase-02-feasibility/fixtures/spa/lazy.svg`
- `spikes/phase-02-feasibility/scripts/assert-browser.mjs`
- `spikes/phase-02-feasibility/scripts/clean.mjs`
- `spikes/phase-02-feasibility/scripts/copy-static.mjs`
- `spikes/phase-02-feasibility/scripts/electron-smoke.mjs`
- `spikes/phase-02-feasibility/scripts/generate-dependency-report.mjs`
- `spikes/phase-02-feasibility/scripts/install-browser.mjs`
- `spikes/phase-02-feasibility/scripts/process-env.mjs`
- `spikes/phase-02-feasibility/scripts/run-packaged-smoke.mjs`
- `spikes/phase-02-feasibility/scripts/run-tests.mjs`
- `spikes/phase-02-feasibility/scripts/verify-package.mjs`
- `spikes/phase-02-feasibility/src/main/global.d.ts`
- `spikes/phase-02-feasibility/src/main/index.ts`
- `spikes/phase-02-feasibility/src/preload/index.ts`
- `spikes/phase-02-feasibility/src/renderer/app.js`
- `spikes/phase-02-feasibility/src/renderer/index.html`
- `spikes/phase-02-feasibility/src/renderer/styles.css`
- `spikes/phase-02-feasibility/src/shared/contracts.ts`
- `spikes/phase-02-feasibility/src/shared/ipc.ts`
- `spikes/phase-02-feasibility/src/spike/archive.ts`
- `spikes/phase-02-feasibility/src/spike/browser.ts`
- `spikes/phase-02-feasibility/src/spike/errors.ts`
- `spikes/phase-02-feasibility/src/spike/logger.ts`
- `spikes/phase-02-feasibility/src/spike/paths.ts`
- `spikes/phase-02-feasibility/src/spike/servers.ts`
- `spikes/phase-02-feasibility/src/spike/workflow.ts`
- `spikes/phase-02-feasibility/tests/unit/archive.test.ts`
- `spikes/phase-02-feasibility/tests/unit/errors.test.ts`
- `spikes/phase-02-feasibility/tests/unit/paths.test.ts`
- `spikes/phase-02-feasibility/tests/unit/routes.test.ts`
- `spikes/phase-02-feasibility/tests/integration/servers.test.ts`
- `spikes/phase-02-feasibility/tests/integration/workflow.test.ts`
- `docs/project/PHASE_02_FEASIBILITY_REPORT.md`
- `docs/project/adr/ADR-EXP-001-PHASE-02-SPIKE-TOOLING.md`
- `docs/project/adr/ADR-EXP-002-PLAYWRIGHT-CHROMIUM-PACKAGING.md`
- `docs/project/adr/ADR-EXP-003-LOOPBACK-SPIKE-RUNTIME.md`
- `okf-bootstrap/PHASE_EVIDENCE/PHASE_02_FEASIBILITY_EVIDENCE.md`

## Phase 2 files modified

- `README.md`
- `HANDOFF.md`
- `docs/product/ACCEPTANCE_MATRIX.md`
- `docs/project/RISK_REGISTER.md`
- `docs/project/OPEN_DECISIONS.md`
- `docs/project/PHASE_PLAN.md`
- `docs/project/TRACEABILITY.md`
- `okf-bootstrap/README.md`
- `okf-bootstrap/REPOSITORY_INVENTORY.md`
- `okf-bootstrap/AUTHORITATIVE_SOURCE_MAP.md`
- `okf-bootstrap/KNOWLEDGE_DOMAIN_MODEL.md`
- `okf-bootstrap/BOOTSTRAP_GAP_ANALYSIS.md`
- `okf-bootstrap/BOOTSTRAP_TRACEABILITY.md`
- `okf-bootstrap/OPEN_QUESTIONS.md`
- `okf-bootstrap/PHASE_EVIDENCE/README.md`

## Dependencies and versions

- Runtime: `playwright@1.56.1`.
- Development: `electron@43.2.0`, `electron-builder@26.15.3`,
  `typescript@7.0.2`, and `@types/node@24.13.3`.
- Packaged Electron: Chromium `150.0.7871.129`, Node `24.18.0`.
- Playwright browser: Chromium `141.0.7390.37`, revision `1194`.
- Development environment: Node `24.17.0`, npm `11.17.0`, Windows 25H2
  build `26200.8875`, x64.

## Packaging, tests, and artifacts

- `npm test`: 18 passed, 0 failed, 0 skipped.
- `npm run test:electron`: passed the real Electron bridge, progress, security,
  render, save, offline-preview, and no-source-contact smoke path.
- `npm run package:windows`: passed; the experimental package is unsigned.
- `npm run verify:package`: passed; 335 files, no prohibited package findings.
- `npm run verify:packaged-run`: passed with downloads disabled and restricted
  `PATH`.
- Ignored artifact: `spikes/phase-02-feasibility/dist/win-unpacked/`.
- Packaged size: 738,865,971 bytes (704.64 MiB).
- Packaged browser:
  `resources/playwright-browsers/chromium-1194/chrome-win/chrome.exe`.
- Latest packaged run: Electron startup 365 ms, render 2,260 ms, total 4,232
  ms, 0 console errors, 0 failed requests, original origin unavailable, expected
  offline content visible.
- Post-workflow Electron process total: 475.57 MiB; this is not a peak and
  excludes the closed Playwright Chromium process.
- No Windows administrator elevation or installation service was required.

## Risks and decisions carried forward

Materially updated risks cover Electron/Playwright compatibility, browser path
resolution, package size, unpacked browser resources, antivirus/signing,
Windows paths, startup/memory behavior, clean-host execution, reproducibility,
and license notices. `RISK-038..040` were added for artifact reproducibility,
supply-chain exposure, and license completeness. Production package manager,
build layout, process boundaries, browser artifact policy, signing, release,
and runtime choices remain open; `OD-027` records the required browser/tool
artifact and update policy. The experimental ADRs do not resolve production
architecture.

## OKF synchronization

`okf-bootstrap/PHASE_EVIDENCE/PHASE_02_FEASIBILITY_EVIDENCE.md` records the
actual commands, environment, versions, tests, failures, package, runtime
measurements, limitations, affected requirements/acceptance/risks/decisions,
and migration considerations. The repository inventory, authority map, domain
model, gap analysis, traceability, open questions, and evidence index were
updated. Canonical `okf/` was not created.

## Git status and release actions

The branch remains `main`. Existing user documentation work and all Phase 2
changes remain unstaged. No commit, push, tag, deployment, or release was
performed.

## Historical Product Phase 1 and OKF Phase 0 baseline

The sections below preserve the prior handoff as historical context. Their
repository-state and next-phase statements describe the state before Product
Phase 2 and are superseded by the Phase 2 result above.

## Historical phase objective

Product Phase 1 established the authoritative product documentation baseline.
OKF Phase 0 adds evidence-first knowledge governance, status and identifier
models, 41 planned knowledge domains, continuous Product Phase 2–25 maintenance,
bootstrap traceability, and the Product Phase 3 canonical activation gate.

OKF Phase 0 is cross-cutting. It is not Product Phase 2 and does not add or
renumber a Product Phase. No production application work belongs to either
completed documentation phase.

## Files created

- `docs/product/PROJECT_SCOPE.md`
- `docs/product/ACCEPTANCE_MATRIX.md`
- `docs/product/COVERAGE_AND_ELIGIBILITY.md`
- `docs/testing/TEST_FIXTURE_STRATEGY.md`
- `docs/testing/TARGET_SITE_ACCEPTANCE_PLAN.md`
- `docs/project/RISK_REGISTER.md`
- `docs/project/DEFINITION_OF_DONE.md`
- `docs/project/OPEN_DECISIONS.md`
- `docs/project/PHASE_PLAN.md`
- `docs/project/TRACEABILITY.md`
- `HANDOFF.md`

OKF Phase 0 additionally created:

- `okf-bootstrap/README.md`
- `okf-bootstrap/REPOSITORY_INVENTORY.md`
- `okf-bootstrap/AUTHORITATIVE_SOURCE_MAP.md`
- `okf-bootstrap/KNOWLEDGE_DOMAIN_MODEL.md`
- `okf-bootstrap/EVIDENCE_POLICY.md`
- `okf-bootstrap/STATUS_MODEL.md`
- `okf-bootstrap/IDENTIFIER_CONVENTIONS.md`
- `okf-bootstrap/TARGET_OKF_STRUCTURE.md`
- `okf-bootstrap/PHASE_EVOLUTION_CONTRACT.md`
- `okf-bootstrap/BOOTSTRAP_GAP_ANALYSIS.md`
- `okf-bootstrap/BOOTSTRAP_TRACEABILITY.md`
- `okf-bootstrap/MIGRATION_AND_ACTIVATION_PLAN.md`
- `okf-bootstrap/OPEN_QUESTIONS.md`
- `okf-bootstrap/PHASE_EVIDENCE/README.md`

## Files modified

- `README.md` — added OKF stage, bootstrap link, Product/OKF phase distinction,
  synchronization rule, P2 evidence duty, and P3 activation target.
- `docs/product/PROJECT_SCOPE.md` — added `NFR-KNOW-001..004` and OKF governance.
- `docs/product/ACCEPTANCE_MATRIX.md` — added `AC-OKF-001..006`.
- `docs/project/DEFINITION_OF_DONE.md` — added mandatory OKF synchronization and
  explicit non-completion cases.
- `docs/project/PHASE_PLAN.md` — retained 25 Product Phases, updated the P3 name,
  and assigned OKF responsibilities to P2–P25.
- `docs/project/TRACEABILITY.md` — added knowledge requirements and the decision,
  domain, and evidence dimensions.
- `docs/project/RISK_REGISTER.md` — added `RISK-KNOW-001`.
- `docs/project/OPEN_DECISIONS.md` — added umbrella `OD-026` and the OKF question
  register link.
- `HANDOFF.md` — recorded this OKF Phase 0 work and unchanged next Product Phase.

## Decisions finalized

- The authoritative product name is **Offline Web Archive Builder**.
- The initial main deliverable is a portable English Windows desktop application;
  Linux and macOS follow, using a platform-neutral versioned Project format.
- Archive Core remains independent of the Desktop Interface. End-user packages
  bundle required runtimes and do not require system Node.js, Playwright,
  Chromium, SQLite, a separate server, or background service.
- MVP includes the complete safe archive/resume/offline-preview loop, manual login,
  conservative rate limits, reports, validation, and Windows GUI. OTP, proxy pool,
  selected GET API replay, and Linux/macOS are required before the final
  multi-platform release.
- Authorization, approved scope, no challenge/rate-limit evasion, direct user
  participation, no password/OTP persistence, protected/redacted secrets,
  loopback runtime, untrusted archived content, selective GET capture, and
  secret-free export defaults are fixed boundaries.
- Coverage is `successfully archived unique eligible pages / all discovered unique
  eligible pages`; permanent failures, authorization blocks, and challenges stay
  in the denominator. Pre-run exclusions and redirect/canonical aliases are
  reported separately. Target acceptance requires at least 95% and zero pending
  classifications.
- Acceptance statuses, risk scoring, 48 fixture categories, 25 delivery phases,
  requirement governance, and Definition of Done are established.
- OKF uses the Level 1–5 evidence hierarchy and the controlled status set
  `VERIFIED`, `PLANNED`, `PARTIAL`, `UNKNOWN`,
  `NEEDS_OWNER_CONFIRMATION`, `DOCUMENTATION_CODE_CONFLICT`, `DEPRECATED`,
  `BLOCKED`, and `NOT_APPLICABLE`.
- Every Product Phase 2–25 must perform an OKF impact review, register actual
  evidence, preserve conflicts/deprecations/history, validate references, and
  report OKF changes.
- Canonical `okf/` remains absent and is gated for Product Phase 3 after P2
  feasibility, actual architecture/contracts, schema/ownership/tool decisions,
  validation, and rollback readiness.

## Open decisions

All 26 project decisions are owned and deadline-bound in
[`docs/project/OPEN_DECISIONS.md`](docs/project/OPEN_DECISIONS.md). Items that must
be resolved early include:

- target identity/authorization, target acceptance owner, approved rate/window,
  quality/resource thresholds, and retention/stop policy;
- Windows/Linux/macOS architecture and distribution matrices;
- keychain/portable vault behavior and cryptographic approach;
- Electron IPC versus loopback service boundary;
- package manager, monorepo tooling, SQLite and HTML libraries;
- Project export, source-map, API sanitization, screenshot, diagnostics,
  telemetry, update, backup, and signing policies.

`OD-026` is the umbrella OKF decision. Twenty-five detailed questions
(`OKF-OD-001..025`) in
[`okf-bootstrap/OPEN_QUESTIONS.md`](okf-bootstrap/OPEN_QUESTIONS.md) cover the OKF
contract, Markdown/JSON authority, manifest/registry/node/evidence/relationship
schemas, generation, validation, migration, commits, release snapshots, diagrams,
CI/PR enforcement, history, ownership, conflicts, generated summaries, sensitive
evidence, duplication, external links, and terminology.

## Risks discovered

The register contains 38 risks: 14 critical, 23 high, and 1 medium. Key
critical risks are Electron/Playwright compatibility, Linux Chromium
dependencies, SPA discovery gaps, infinite URL spaces, browser memory, target
changes, cross-platform paths, unhealthy proxy routing, challenges, live-network
calls from archived JavaScript, and sensitive API data. Each high/critical risk
has an owner, warning indicator, mitigation, and contingency. No risk is marked
mitigated because production controls do not yet exist.

`RISK-KNOW-001` covers documentation/code detachment, stale evidence, contradictory
authorities, unsynchronized phases/platform behavior, and AI agents relying on
outdated claims. Bootstrap documents do not by themselves mitigate it; continuous
enforcement and canonical validation remain future controls.

## Validation performed

- Read the complete attached 1,062-line Phase 1 brief as UTF-8 and reviewed the
  project lessons log before making significant changes.
- Inspected the full repository tree with `Get-ChildItem -Force` and
  `rg --files -uu -g '!.git/**'`.
- Inspected repository state/history with `git rev-parse`, `git branch`,
  `git status`, `git log`, `git show`, `git ls-files`, and `git diff`.
- Confirmed the initial repository contained one tracked 20-byte `README.md`, one
  initial commit, no scaffold/config/dependencies/docs, and a clean worktree.
- Re-inspected the uncommitted Product Phase 1 baseline before OKF work: 12
  Markdown files, no source/config/dependencies/tests/runtime/build/release
  artifact, one initial commit, and branch `main`.
- Verified all 14 required bootstrap files exist, canonical `okf/` does not exist,
  the premature Product Phase 2 evidence file is absent, and every repository
  file outside `.git` is Markdown.
- Counted definition rows and checked duplicate identifiers: 47 functional
  requirements, 20 non-functional requirements, 85 acceptance criteria, 48
  fixtures, 38 risks, 26 project decisions, 25 OKF questions, 41 domains, and 20
  gaps; zero duplicate definition IDs.
- Compared requirements, acceptance rows, and traceability sets: zero missing
  requirements, zero missing acceptance mappings, zero acceptance rows with an
  unknown requirement, and zero requirements without a directly assigned
  acceptance criterion.
- Verified all 42 critical requirements have a bootstrap family/domain mapping and
  no implementation domain is marked `VERIFIED`.
- Validated acceptance/risk/question/domain table widths and acceptance/OKF status
  vocabularies; no errors.
- Confirmed exactly 25 Product Phase rows, Product Phase 2 remains next, Product
  Phase 3 owns canonical activation, and P2–P25 each has an OKF responsibility.
- Checked all relative Markdown links across 26 Markdown files; no missing target.
- Scanned for drive-qualified local paths, Persian/Arabic code points, literal
  private HTTP URLs, and common credential/token/OTP/cookie/proxy/phone
  signatures; zero findings.
- Confirmed no package/lock file, source/build/runtime directory, production file,
  dependency installation, fake test/build/runtime evidence, or early canonical
  directory was introduced.
- Reviewed all bypass-related text; every occurrence prohibits or tests bypass.
- Ran `git diff --check`; passed.
- Reviewed the final diff/status for unrelated or production-code changes; none.

## Test status

- **Phase 1 documentation validation:** passed.
- **OKF Phase 0 documentation validation:** passed.
- **Application/unit/integration tests:** not applicable; no production code,
  package manager, test tooling, or application scaffold exists in Phase 1.
- **Future acceptance criteria:** 75 `defined`, 10 `needs-decision`; none is
  represented as implemented, ready, or passed.

## Repository status

- Branch: `main`
- Modified tracked files: `README.md`
- New untracked files: 25 (the 11 Product Phase 1 files and 14 OKF bootstrap files)
- Staged files: none
- Commits/pushes during Product Phase 1 or OKF Phase 0: none
- Production implementation introduced: none

## Recommended next action

**Product Phase 3 — Architecture, Monorepo, and Layer Contracts**

Exact objective: review the Phase 2 feasibility evidence, resolve or formally
defer the required architecture decisions, establish the real repository and
package architecture, define versioned contracts between Core, Service, Desktop
UI, and CLI, create canonical `okf/`, and migrate verified bootstrap records.
Preserve the Technical Spike as experimental evidence and do not copy its code
into production without explicit review. Product Phase 3 was not started here.
