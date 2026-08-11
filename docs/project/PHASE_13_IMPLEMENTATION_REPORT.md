# Product Phase 13 Implementation Report

## Phase Status

PARTIAL

The requested architecture and security hardening is implemented and
deterministic validation passes. Phase 13 remains open because the registered
real pinned-Chromium Session, IndexedDB restore, and Service Worker evidence,
plus the native platform matrix, are blocked or unavailable in this
environment.

The follow-up native-evidence work introduced at Git HEAD
`5881707927131085032707a9e69b27ccb73bd750` and committed into the current
matrix-history line at `759e4c4e1ad21618abdd593008ee0b638b101885` adds the canonical
[Phase 13 Native Evidence Execution Matrix](PHASE_13_EVIDENCE_EXECUTION_MATRIX.md)
and its runner at `tools/testing/run-phase13-evidence.mjs`. This infrastructure
is validated, but it does not change the blocked runtime acceptance rows or
authorize Phase 14. The committed evidence baseline at the start of the final
runtime remediation is `deb26e7e0ca65cde1c60f75b72bda8b385fdaa66`.

## Phase 12 Closure Result

Phase 12 is reconciled explicitly rather than promoted from fake-runtime tests:

| Phase 12 acceptance | Status | Basis |
|---|---|---|
| AC-P12-001 | BLOCKED | Real headed authentication fixture unavailable; local implementation exists. |
| AC-P12-002 | PASS | Session metadata, protected storage, and persistence tests passed in the Phase 12 evidence set. |
| AC-P12-003 | PASS | Expiry and reauthentication state handling is covered by the Phase 12 test set. |
| AC-P12-004 | PASS | Safe session metadata/transport boundary is covered. |
| AC-P12-005 | PASS | Secret-free export/diagnostic behavior is covered. |
| AC-P12-006 | BLOCKED | Required real restore/browser evidence is unavailable. |
| AC-P12-007 | PASS | Session ownership and affinity controls are implemented and tested. |
| AC-P12-008 | PASS | Storage State parsing and bounded supported-store behavior are tested. |
| AC-P12-009 | PASS | Explicit save validation behavior is tested. |
| AC-P12-010 | PASS | Reauthentication preserves prior valid state on failure. |
| AC-P12-011 | PASS | Session lifecycle command validation is covered. |
| AC-P12-012 | PASS | CLI/Desktop metadata-only controls are covered. |
| AC-P12-013 | PASS | Phase 12 documentation and ADR evidence exists. |
| AC-P12-014 | PASS | OKF Phase 12 synchronization exists. |
| AC-P12-015 | BLOCKED | The documentation gate must retain the real-browser limitation. |

## Git Baseline

- Branch: `main`
- Starting HEAD: `d59390f7a060321fe37ece716ec74d06b5071ba3`.
- Ending HEAD: `d59390f7a060321fe37ece716ec74d06b5071ba3`.
- Initial working tree: clean; no pre-existing user changes were present at
  the Phase 13 starting checkpoint.
- Final working tree: Phase 13 changes are uncommitted and intentionally
  unstaged; no files are staged.
- No commit, push, branch change, reset, restore, clean, stash, rebase, or
  history rewrite occurred.

## Final Runtime Remediation and Classification Reconciliation

The validated baseline bundle
`.artifacts/phase13-evidence/2026-08-10T20-59-38-509Z-deb26e7e0ca6` recorded
`AC-P13-016` as `PRODUCT_FAIL` in `matrix-entry.json` even though its
`environmentClassification` and the related browser acceptance rows were
`ENVIRONMENT_BLOCKED`. The authoritative Acceptance Matrix still defines
`AC-P13-016` as `BLOCKED`; the bundle inconsistency was in the evidence runner,
not in the product acceptance requirement.

The root cause was the Desktop classification path: it checked Electron
availability but did not treat the required Chromium runtime as a Desktop
environment prerequisite, and its blocker scan ignored `stdoutSafe` even
though the Desktop smoke emitted `BROWSER_INSTALLATION_MISSING` there. The
runner now checks both required runtimes and scans bounded stdout, stderr, and
spawn diagnostics before allowing `PRODUCT_FAIL`. The regression suite covers
missing browser/Electron runtime, stdout-reported runtime blockers, and a valid
runtime with an application assertion failure; a separate unassessable command
is retained as `TEST_INFRA_FAILURE` rather than being collapsed into an
environment or product result.

The latest corrected escalated diagnostic bundle recorded in `HANDOFF.md`
classified all mandatory rows, including `AC-P13-016`, as
`ENVIRONMENT_BLOCKED`; bundle validation passed, the source baseline matched,
and the artifact secret scan found zero unauthorized occurrences. The source
tree is intentionally dirty after this remediation, so the bundle is
diagnostic and is not eligible for native acceptance or cross-platform
reconciliation.

## Windows Evidence Runner Compatibility Remediation — 2026-08-11

The native Windows execution exposed a test-infrastructure defect before any
valid Phase 13 evidence could be collected. Both supported runner entry points
failed with `spawn EINVAL`. The exact failing subprocess was the direct
`spawn("npm.cmd", ["run", "browser:verify"], ...)` call; a direct Node probe
confirmed `spawnSync npm.cmd EINVAL`. The host used supported Node 24 and npm
11 majors, so this incident is classified as `TEST_INFRA_FAILURE`, not
`PRODUCT_FAIL`.

The smallest correction keeps the existing runner and evidence model but adds
an explicit `resolvePortableCommand` planner. Repository-owned Node commands
use `process.execPath` with explicit module paths and argument arrays. npm
commands use the JavaScript CLI named by `process.env.npm_execpath` or the
standard Windows Node installation path; no `.cmd` file is passed directly to
`spawn` or `execFile`, no shell is enabled, and the copied environment retains
the repository `cwd`, `PATH`, `ComSpec`, `SystemRoot`, and temporary-directory
values. Synchronous spawn errors are recorded as bounded diagnostics.

The new planner regression suite covers POSIX/Windows Node and npm commands,
spaces in repository paths and arguments, npm CLI fallback, and environment
preservation. `npm run test:unit` passed 63/63. Actual Windows reruns of both
`node tools/testing/run-phase13-evidence.mjs run` and
`npm run test:phase13:evidence` completed without `spawn EINVAL`; the latter
used the npm-provided `npm_execpath` JavaScript CLI. The validated diagnostic
bundle recorded official Chromium and Electron runtime checks, a 9/10 browser
focused result with one Service Worker assertion failure, and a 2/2 Desktop
focused result. Because this source changed after `deb26e7e0ca65cde1c60f75b72bda8b385fdaa66`,
the old evidence baseline is superseded and the diagnostic bundle is not
eligible for final native acceptance.

The full escalated `npm test` run on the same Windows host reported 168 tests:
166 passed, 2 failed, and 0 skipped. The failures were the browser-native
Interaction popup trace assertion and the Service Worker policy assertion.
They remain separate follow-up diagnostics; the dirty remediation bundle does
not promote either failure to a Phase 13 product or acceptance result.

## Baseline Audit

The baseline audit found one Phase 12 routing defect: the Authentication
Context route previously rechecked the explicit origin policy only for document
requests. Phase 13 applies the same policy to every request class and records
safe request metadata only. Additional hardening establishes trust-zone and IPC
rules, a separate Crawl Run state, replay/offline contracts, explicit Service
Worker policy, canonical path safety, symlink-aware persistence boundaries, and
bounded concurrency contracts. Findings and owners are in the [Phase 13 security
review](../architecture/PHASE_13_SECURITY_REVIEW.md).

The [Post-Phase-12 baseline audit](POST_PHASE_12_BASELINE_AUDIT.md) separately
classifies verified behavior, Phase 13 remediation, design deferrals,
environment blocks, and open risks across Project Format, SQLite, Queue,
Checkpoint/Recovery, Browser Contexts, rendering, interactions, Secret Store,
Sessions, IPC/Electron, and OKF. No full runtime feature is inferred from
static or fake-runtime evidence.

## Architecture Changes

- Trust zones: Trusted Application UI, Privileged Application Service, and a
  future Untrusted Archive Runtime are separated; archive HTML/JavaScript is
  never loaded by a trusted renderer in the current product.
- State: Crawl Run state version 1 is separate from Job, Authentication, and
  future Proxy state, and is persisted independently of legacy pause control.
- Replay/offline: deterministic method+URL keys, bounded lookup decisions,
  sensitive-header filtering, and Strict Offline local-origin/unknown-request
  behavior are frozen without implementing a full replay engine.
- Service Workers: version 1 `block`/`allow` policy with safe default block is
  selected by Site Profile and propagated to render Contexts; a registered
  block/allow browser fixture is included.
- Paths: one Archive Core canonical path contract is consumed by Project
  Format, Recovery, SQLite import, and output verification, with trusted-root
  symlink checks.
- Concurrency: worker/page dimensions remain distinct from network request
  budgets, origin cooldown, Retry-After, and proxy multiplication; the SQLite
  stress design is documented without adding a Worker Pool.
- Electron/IPC: approved command types supplement sender/frame/origin/path
  checks while the existing sandbox and context-isolation baseline remains.

## Implementation Summary

- Added pure Archive Core contracts for Crawl Run state, replay/offline policy,
  Service Worker policy, canonical paths, and worker/network concurrency.
- Closed the Browser Runtime Authentication Context allowlist gap for documents,
  subresources, redirects, and provider requests.
- Persisted `run_state` in SQLite migration 009 and exposed validated state
  transitions through Recovery/Application Service metadata.
- Routed Project Format, Recovery, and SQLite output/import paths through one
  canonical path helper and added symlink-boundary checks.
- Added approved command-type checking and an explicit untrusted archive runtime
  baseline to the Desktop trust boundary.
- Added focused unit/integration coverage and the Phase 13 architecture/ADR,
  acceptance, security, and OKF records.

## Files Created

```text
docs/architecture/ACCEPTANCE_METRICS.md
docs/architecture/CANONICAL_PATH_SAFETY.md
docs/architecture/NETWORK_REPLAY.md
docs/architecture/PHASE_13_SECURITY_REVIEW.md
docs/architecture/PLATFORM_SUPPORT_POLICY.md
docs/architecture/SERVICE_WORKER_POLICY.md
docs/architecture/SQLITE_CONCURRENCY_STRESS_PLAN.md
docs/architecture/STRICT_OFFLINE_MODE.md
docs/architecture/TRUST_ZONES_AND_IPC.md
docs/architecture/WORKER_NETWORK_CONCURRENCY_CONTRACT.md
docs/project/PHASE_13_IMPLEMENTATION_REPORT.md
docs/project/POST_PHASE_12_BASELINE_AUDIT.md
docs/project/adr/ADR-052-trust-zones-and-privilege-boundaries.md
docs/project/adr/ADR-053-separated-crawl-run-state.md
docs/project/adr/ADR-054-network-replay-and-strict-offline-contract.md
docs/project/adr/ADR-055-versioned-service-worker-policy.md
docs/project/adr/ADR-056-canonical-path-safety.md
okf/architecture/network-replay.md
okf/architecture/service-worker-policy.md
okf/architecture/trust-zones-and-ipc.md
okf/data/canonical-path-safety.md
okf/history/phase-13.md
okf/operations/platform-support.md
okf/testing/phase-13-validation.md
okf/workflow/crawl-run-state.md
packages/archive-core/src/concurrency.ts
packages/archive-core/src/network.ts
packages/archive-core/src/path-safety.ts
packages/archive-core/src/run-state.ts
packages/archive-core/src/service-worker.ts
packages/browser-runtime/src/authentication-policy.ts
tests/browser/service-worker-policy.test.ts
tests/fixtures/rendering/service-worker.html
tests/unit/authentication-route.test.ts
```

## Files Modified

```text
HANDOFF.md
README.md
apps/desktop/src/main/index.ts
docs/architecture/CONTRACT_VERSIONING.md
docs/architecture/PROCESS_AND_TRANSPORT_MODEL.md
docs/architecture/README.md
docs/architecture/SQLITE_PERSISTENCE.md
docs/architecture/SYSTEM_CONTEXT.md
docs/architecture/TEST_ARCHITECTURE.md
docs/product/ACCEPTANCE_MATRIX.md
docs/project/OPEN_DECISIONS.md
docs/project/PHASE_PLAN.md
okf-extension/README.md
okf-extension/registry/changes.json
okf-extension/registry/decisions.json
okf-extension/registry/evidence.json
okf-extension/registry/nodes.json
okf-extension/registry/phases.json
okf-extension/registry/relationships.json
okf/architecture/contracts.md
okf/architecture/index.md
okf/data/database.md
okf/data/index.md
okf/history/index.md
okf/log.md
okf/operations/index.md
okf/security/security-boundaries.md
okf/testing/index.md
okf/workflow/index.md
packages/application-service/src/index.ts
packages/archive-core/src/index.ts
packages/browser-runtime/src/index.ts
packages/contracts/src/index.ts
packages/persistence-sqlite/src/archive.ts
packages/persistence-sqlite/src/atomic.ts
packages/persistence-sqlite/src/index.ts
packages/persistence-sqlite/src/migrations.ts
packages/persistence-sqlite/src/recovery.ts
packages/project-format/package.json
packages/project-format/schema/project-manifest.schema.json
packages/project-format/src/index.ts
packages/project-format/tsconfig.json
packages/recovery/src/index.ts
packages/scope-engine/package.json
packages/scope-engine/src/index.ts
packages/scope-engine/tsconfig.json
packages/secrets/src/diagnostics.ts
tests/integration/project-lifecycle.test.ts
tests/integration/recovery-lifecycle.test.ts
tests/okf/layered-validator.test.ts
tests/okf/strict-validator.test.ts
tests/support/render-fixture-server.ts
tests/unit/archive-core.test.ts
tests/unit/contracts.test.ts
tests/unit/persistence-sqlite.test.ts
tests/unit/project-format.test.ts
tools/architecture/validate.mjs
tools/docs/validate.mjs
tools/migrations/validate.mjs
tools/okf/discovery.mjs
tools/okf/references.mjs
tools/testing/run-tests.mjs
```

## Database Changes

Migration `009_add_crawl_run_state` adds a constrained `run_state` column to
`run_control` and `run_checkpoints`. The current SQLite and Project schema
version is `9`. Migration definitions remain forward-only and immutable; no
existing migration was rewritten and no future Worker/Proxy/Downloader table
was added. Migration validation passed for all 9 immutable migrations, and
Project/recovery lifecycle tests passed with queue/checkpoint/session data
preservation evidence.

## Contract / API Changes

- Transport contract: `1.9.0`; `PauseStatus` includes validated `runState`.
- Crawl Run state contract: version `1`, with explicit running, pausing,
  paused, waiting, cancelling, cancelled, completed, and failed states.
- Replay/offline contract: version `1`; method+URL keys are deterministic and
  sensitive headers are filtered.
- Service Worker policy: version `1`, default `block`, explicit `allow` only.
- Canonical path contract: version `1`; bounded portable paths produce a
  normalized value and collision key.
- Site Profile draft contract: version 1 Service Worker policy with default
  `{ version: 1, mode: "block" }`; Browser Session policy accepts an explicit
  render Service Worker mode.
- No raw credential, OTP, token, Browser handle, or Secret Store payload was
  added to transport.

## Security Properties

The implementation preserves exact sender/frame/origin/path checks, applies
authentication allowlists to all request classes, blocks external requests in
Strict Offline Mode, defaults Service Workers to blocked, rejects encoded and
double-encoded traversal, checks symlink boundaries for trusted Project roots,
and keeps privileged Browser/SQL/filesystem access outside Archive Core and the
renderer. The current product still does not execute archived HTML/JS in a
trusted window.

## Security Findings

| Finding | Severity | Status | Owner / target |
|---|---|---|---|
| S13-001: Real Chromium Session fixture unavailable | High | BLOCKED | Browser Runtime/QA before Phase 13 closure; normal run reports `listen EPERM`, escalated run reports `BROWSER_INSTALLATION_MISSING` / `BROWSER_LAUNCH_FAILED`, and provisioning reports DNS `ENOTFOUND`. |
| S13-002: Real Service Worker block/allow evidence unavailable | High | BLOCKED | Browser Runtime/QA must execute `tests/browser/service-worker-policy.test.ts` with approved Chromium. |
| S13-003: Native platform matrix unexecuted | High | BLOCKED | Platform/QA must execute the documented Windows 11 primary, Windows 10 legacy/optional, Linux, macOS, and architecture matrix. |
| S13-004: Full Worker Pool concurrency stress unavailable | Medium | NOT_APPLICABLE | No Worker Pool exists in the current scope; the contract and SQLite stress plan are ready for the later scheduler phase. |
| S13-005: Archive runtime isolation is future work | Medium | NOT_APPLICABLE | The current product does not load archive HTML/JS; the isolated runtime baseline is documented before that feature exists. |

No Critical finding is silently unresolved. High findings are explicit
environment/platform blockers with owners, target phases, mitigations, and
acceptance impact in the [Phase 13 security review](../architecture/PHASE_13_SECURITY_REVIEW.md).

## Tests

Repository-native validation and focused suites:

| Category | Status | Result |
|---|---|---|
| Typecheck / build | PASS | `npm run typecheck`, `npm run build`. |
| Lint / format | PASS | `npm run lint`, `npm run format:check`. |
| Contracts / migrations / Project Format | PASS | Contract 1.9.0, 9 immutable migrations/schema 9, and Project Format 1.1.0 validators. |
| Architecture / security / docs | PASS | `test:architecture`, `security:check`, and `docs:validate`; docs reported 158 required artifacts, 387 active relative links, and 98 readable archived Markdown files. |
| Scope / queue / recovery / checkpoint / render / Secret Store validators | PASS | All 9 applicable validators passed. |
| Unit tests | PASS | `node tools/testing/run-tests.mjs unit`: 57/57, including the Phase 13 evidence-classification regression tests. |
| Focused pure package suites | PASS | Archive Core 2/2, Project Format 3/3, SQLite 22/22, Scope Engine 10/10, Contracts 7/7, Recovery 10/10, Queue 13/13, Secret Store 12/12. |
| OKF | PASS | `npm run okf:validate`: all layers 0 errors/0 warnings; `npm run test:okf`: 43/43. |
| Browser package, normal sandbox | BLOCKED | 2 pass, 6 fail at loopback `listen EPERM`, 2 skipped; the registered Service Worker fixture is included. |
| Browser package, loopback escalation | BLOCKED | 2 pass, 6 fail, 2 skipped; real cases report `BROWSER_INSTALLATION_MISSING` or `BROWSER_LAUNCH_FAILED`, with one installation assertion false. |
| Full suite, normal sandbox | BLOCKED | 162 tests: 146 pass, 14 fail, 2 skipped. Failures are loopback `listen EPERM` and browser-dependent paths. |
| Full suite, loopback escalation | BLOCKED | 162 tests: 147 pass, 13 fail, 2 skipped. Failures are approved Chromium launch/manifest and dependent browser-backed CLI/Application Service, interaction, render, and Electron paths. |
| Browser provisioning | BLOCKED | `npm run browser:verify` reports missing `.runtime/browsers/browser-manifest.json`; the official provisioning attempt failed with DNS `getaddrinfo ENOTFOUND`. |
| Native platform matrix | BLOCKED | Not executable from this macOS environment. |

The failed/blocked commands were inspected and are not treated as passes. Pure
policy, SQLite, Secret Store, contract, OKF, and deterministic integration
coverage passed.

## Acceptance Results

The [acceptance matrix](../product/ACCEPTANCE_MATRIX.md) uses only `PASS`,
`FAIL`, `BLOCKED`, and `NOT_APPLICABLE` for Phase 13:

- `PASS`: AC-P13-001, AC-P13-003, AC-P13-004, AC-P13-006, AC-P13-007,
  AC-P13-009, AC-P13-010, AC-P13-011, AC-P13-013, AC-P13-014, AC-P13-015,
  AC-P13-017, AC-P13-018, AC-P13-019, AC-P13-020, AC-P13-021, and AC-P13-022.
- `BLOCKED`: AC-P13-002 real Chromium authentication, AC-P13-008 real
  IndexedDB/session restore, AC-P13-012 real Service Worker fixture, and
  AC-P13-016 native platform validation.
- `NOT_APPLICABLE`: AC-P13-005 because the current product has no archive
  runtime; the required isolated baseline is documented.
- `FAIL`: none identified. Environment failures remain blocked rather than
  being reclassified as product failures or passes. The earlier diagnostic
  `PRODUCT_FAIL` matrix field was corrected in the runner and is not an
  authoritative product failure.

## OKF Updates

The official OKF bundle remains v0.2. Phase 13 adds current concepts for trust
zones, replay/offline policy, Service Workers, canonical paths, Crawl Run state,
platform support, and validation evidence; the extension registries link those
concepts to ADRs, acceptance rows, evidence, risks, and this report. All
official, reference, provenance, extension, quality, format, and internal OKF
validators pass with zero errors and warnings. The runner-classification
regression and the corrected `AC-P13-016` environment result are recorded in
the Phase 13 validation and platform-support concepts.

## Known Limitations

- The real pinned-Chromium fixture cannot currently run in this environment.
- The repository-owned browser manifest/executable is absent; the official
  Playwright hosts also failed DNS resolution during provisioning.
- Native platform support evidence has not been executed.
- No full replay engine, archive runtime, downloader, proxy routing, Worker Pool,
  HTML rewrite, or API capture is included.
- `sessionStorage` persistence remains unsupported.
- The legacy phase table still contains an older Guided OTP row; a
  reconciliation note in `docs/project/PHASE_PLAN.md` prevents it from being
  treated as current Phase 13 authorization until the revised proposal is
  stored authoritatively.

## Deferred to Phase 14

Guided OTP, OTP automation, phone-number workflows, SMS handling, multi-field
OTP workflows, and production Element Picker UX are explicitly deferred. No
production implementation of those features was added.

## Deferred to Later Phases

Proxy Pool/rotation/health, multi-worker scheduling, Asset Downloader, HTML
Rewriter, full API Capture, full Network Replay, production Strict Offline
runtime, Local Runtime, Validation Engine, production packaging, Linux/macOS
packaging, and target-site acceptance remain deferred.

## HANDOFF

`HANDOFF.md` is updated with the actual dirty-tree state, exact files,
schema/contract changes, commands, validation totals, blockers, migration
state, and exact next action. The mistakes log was reviewed and only the two
reusable lessons discovered during this task were retained.

## Exact Next Step

Provision or authorize the pinned repository-owned Chromium and rerun:

```text
node tools/testing/run-tests.mjs package:browser-runtime
npm test
```

Inspect the real Session, IndexedDB restore, Service Worker, render,
interaction, CLI, and Electron evidence, then update the acceptance statuses.
Do not begin Phase 14 while AC-P13-002, AC-P13-008, AC-P13-012, or AC-P13-016
remain blocked.
