# Project Handoff

## Last Updated

2026-08-10

## Project Summary

Offline Web Archive Builder is a local, authorized archiving monorepo. The
repository contains the Phase 3–8 production foundation, the Phase 10
interaction foundation, the Phase 11 Secret Store, and the Phase 12 Manual
Login and Secure Session Manager implementation. Phase 9 Discovery remains
absent. This handoff does not claim Guided OTP, proxy management, a full
Network Replay engine, an archive runtime, a downloader, HTML rewriting, API
capture, or production packaging.

## Current Objective

Freeze the Phase 13 native-evidence source baseline without starting Phase 14.
The runner now records a deterministic source fingerprint and acceptance-
definition hash, and final reconciliation requires a clean committed source
tree. Real Chromium, Electron, and cross-platform evidence remain external
prerequisites.

## Current Phase or Milestone

Phase 13 evidence infrastructure is present at HEAD
`5881707927131085032707a9e69b27ccb73bd750` on 2026-08-10. The current freeze
changes are pre-commit preparation changes. The registered session fixture
requires cookie, localStorage, and IndexedDB state and preserves the explicitly
unsupported sessionStorage contract. Phase 13 remains `PARTIAL` and Phase 14
remains blocked until approved Chromium, Electron, and required native-platform
evidence exist.

## Repository State

- Repository path: `/Users/sasan/Desktop/codex/OfflineWebArchiver`
- Current branch: `main`
- Base or starting commit: `5881707927131085032707a9e69b27ccb73bd750`
- Current HEAD: `5881707927131085032707a9e69b27ccb73bd750`
- Working tree status: nine intended freeze files are modified or untracked;
  generated `.artifacts/` output is ignored.
- Staged changes: none.
- Unstaged changes: `docs/project/PHASE_13_EVIDENCE_EXECUTION_MATRIX.md`,
  `docs/project/PHASE_13_IMPLEMENTATION_REPORT.md`,
  `okf-extension/registry/evidence.json`, `okf/log.md`,
  `okf/operations/platform-support.md`, `okf/testing/phase-13-validation.md`,
  `tools/testing/run-phase13-evidence.mjs`, and `HANDOFF.md`.
- Untracked files: `tools/testing/phase13-evidence-baseline.json`.
- Branch, commit history, and working tree were not changed destructively; no
  commit, push, branch change, reset, clean, restore, or stash was performed.

## Completed Work

- Closed the Authentication Context origin/policy gap for document,
  subresource, redirect, and provider decisions using a shared helper and
  deterministic safe metadata tests.
- Added Archive Core contracts for separated Crawl Run state, Network Replay
  and Strict Offline policy, Service Worker policy, canonical path safety, and
  worker/network concurrency.
- Added SQLite migration `009_add_crawl_run_state`, moving the current schema
  and Project schema to version 9 while preserving existing queue,
  checkpoint, and Session data.
- Persisted and projected validated Run states independently from legacy pause
  control.
- Routed Project Format, Recovery, and SQLite output/import verification
  through the canonical path helper and added symlink-boundary enforcement.
- Added Desktop approved-command checking and documented the untrusted archive
  runtime security baseline; the current product does not load archived HTML
  or JavaScript in a trusted window.
- Added Phase 13 architecture docs, ADR-052 through ADR-056, baseline audit,
  security review, acceptance metrics, platform policy, concurrency contract,
  SQLite stress plan, report draft, acceptance reconciliation, and OKF v0.2 /
  extension synchronization.
- Added a real-browser Service Worker fixture for explicit `block` and `allow`
  policies, passed the actual Playwright request method into authentication
  request metadata, and made replay-header ordering locale-independent.
- Reconciled AC-P13-008 as `BLOCKED` because real IndexedDB/session restore
  evidence is unavailable; fake-runtime coverage is not promoted.
- Reviewed `/Users/sasan/Mistakes/mistakes.md`; the existing reusable lessons
  cover proving every persisted browser storage type and resolving
  platform-native runtime paths before classifying provisioning failures.
- Re-executed the final evidence closure gate at the current HEAD. Official
  Playwright Chromium and Electron provisioning still failed because the
  required external hosts/resources were unavailable; no blocked acceptance
  row was promoted.
- Added the canonical Phase 13 evidence runner with locked runtime checks,
  bounded/redacted diagnostics, bundle integrity and secret scanning, and
  same-HEAD native matrix reconciliation.
- Added the Phase 13 Native Evidence Execution Matrix and synchronized README,
  acceptance, closure, implementation, OKF, and extension-registry references
  without promoting any blocked acceptance result.
- Added `tools/testing/phase13-evidence-baseline.json` as a pre-commit
  preparation manifest. It records the exact input file hashes, toolchain and
  browser/Electron contracts, required platforms, parent HEAD, and a null
  final-commit field.
- Strengthened the runner to record source fingerprints and acceptance-
  definition hashes in every evidence file, reject source/contract drift,
  verify the Electron `--version` output, and prevent dirty or source-mismatched
  bundles from final reconciliation. Sorting is locale-independent.
- Reviewed the current Git delta: the starting tree at `5881707` was clean;
  the current nine-file delta is the intended freeze change set only. No
  product behavior, Phase 14 feature, branch, or migration was changed.

## Work in Progress

No product implementation is in progress. The final pre-commit diagnostic
bundle
`.artifacts/phase13-evidence/2026-08-10T19-44-04-251Z-588170792713` validates,
matches source fingerprint
`5f72396f0ae6f227f50ec06b566c12842cb46193a7b045dcf4b85674b3bc41fb`, records
acceptance-definition hash
`8d83372556de3b2f0dfbfef17472a38e2f49eb1a82e3ca6b8495447282097fdc`, and its
secret scan reports zero unauthorized occurrences. It remains non-promotable
because the working tree is dirty, npm is `12.0.2`, approved Chromium is
missing, Electron is missing, and the native matrix is unavailable.

## Remaining Work

1. Review the exact freeze file list and create the single baseline commit;
   the current manifest is explicitly `PRE_COMMIT_PREPARATION` and does not
   claim the resulting commit hash.
2. On that same resulting commit, use Node 24/npm 11 and provision the exact
   repository-owned Chromium and locked Electron binary on approved hosts.
3. Run `npm run test:phase13:evidence`, validate each bundle, and inspect the
   real Session, IndexedDB, Service Worker, and Desktop results.
4. Execute the documented native matrix on Windows 11 x64, Linux, and macOS;
   retain Windows 10 only as optional legacy evidence. Reconcile only clean
   bundles with the same Git HEAD, source fingerprint, and acceptance hash.
   Do not begin Phase 14 while any mandatory Phase 13 row remains blocked.

## Exact Next Steps

1. After the baseline commit, on each approved host run `npm ci`,
   `npm run browser:install`,
   `npm run browser:verify`, and `node node_modules/electron/install.js` only
   when the locked Electron binary is absent.
2. Run `npm run test:phase13:evidence` and then
   `node tools/testing/run-phase13-evidence.mjs validate <bundle>`.
3. After all required rows pass, run the documented reconcile command and
   inspect it before changing any acceptance status. Do not edit acceptance
   rows from a blocked or dirty diagnostic bundle.

## Files Created

- `docs/architecture/ACCEPTANCE_METRICS.md`
- `docs/architecture/CANONICAL_PATH_SAFETY.md`
- `docs/architecture/NETWORK_REPLAY.md`
- `docs/architecture/PHASE_13_SECURITY_REVIEW.md`
- `docs/architecture/PLATFORM_SUPPORT_POLICY.md`
- `docs/architecture/SERVICE_WORKER_POLICY.md`
- `docs/architecture/SQLITE_CONCURRENCY_STRESS_PLAN.md`
- `docs/architecture/STRICT_OFFLINE_MODE.md`
- `docs/architecture/TRUST_ZONES_AND_IPC.md`
- `docs/architecture/WORKER_NETWORK_CONCURRENCY_CONTRACT.md`
- `docs/project/PHASE_13_IMPLEMENTATION_REPORT.md`
- `docs/project/PHASE_13_CLOSURE_REPORT.md`
- `docs/project/POST_PHASE_12_BASELINE_AUDIT.md`
- `docs/project/adr/ADR-052-trust-zones-and-privilege-boundaries.md`
- `docs/project/adr/ADR-053-separated-crawl-run-state.md`
- `docs/project/adr/ADR-054-network-replay-and-strict-offline-contract.md`
- `docs/project/adr/ADR-055-versioned-service-worker-policy.md`
- `docs/project/adr/ADR-056-canonical-path-safety.md`
- `okf/architecture/network-replay.md`
- `okf/architecture/service-worker-policy.md`
- `okf/architecture/trust-zones-and-ipc.md`
- `okf/data/canonical-path-safety.md`
- `okf/history/phase-13.md`
- `okf/operations/platform-support.md`
- `okf/testing/phase-13-validation.md`
- `okf/workflow/crawl-run-state.md`
- `packages/archive-core/src/concurrency.ts`
- `packages/archive-core/src/network.ts`
- `packages/archive-core/src/path-safety.ts`
- `packages/archive-core/src/run-state.ts`
- `packages/archive-core/src/service-worker.ts`
- `packages/browser-runtime/src/authentication-policy.ts`
- `tests/browser/service-worker-policy.test.ts`
- `tests/fixtures/rendering/service-worker.html`
- `tests/unit/authentication-route.test.ts`
- `docs/project/PHASE_13_EVIDENCE_EXECUTION_MATRIX.md`
- `tools/testing/run-phase13-evidence.mjs`
- `tools/testing/phase13-evidence-baseline.json`

## Files Modified

- `HANDOFF.md`, `README.md`, and `apps/desktop/src/main/index.ts`
- `docs/architecture/{CONTRACT_VERSIONING,PROCESS_AND_TRANSPORT_MODEL,README,SQLITE_PERSISTENCE,SYSTEM_CONTEXT,TEST_ARCHITECTURE}.md`
- `docs/product/ACCEPTANCE_MATRIX.md`, `docs/project/OPEN_DECISIONS.md`, and
  `docs/project/PHASE_PLAN.md`
- `okf-extension/README.md` and all seven files under
  `okf-extension/registry/`
- `okf/architecture/{contracts,index}.md`, `okf/data/{database,index}.md`,
  `okf/history/{index}.md`, `okf/log.md`, `okf/operations/index.md`,
  `okf/security/security-boundaries.md`, `okf/testing/index.md`, and
  `okf/workflow/index.md`
- `packages/application-service/src/index.ts`,
  `packages/archive-core/src/index.ts`, `packages/browser-runtime/src/index.ts`,
  `packages/contracts/src/index.ts`,
  `packages/persistence-sqlite/src/{archive,atomic,index,migrations,recovery}.ts`,
  `packages/project-format/{package.json,tsconfig.json,src/index.ts,schema/project-manifest.schema.json}`,
  `packages/recovery/src/index.ts`,
  `packages/scope-engine/{package.json,tsconfig.json,src/index.ts}`, and
  `packages/secrets/src/diagnostics.ts`
- `tests/integration/{project-lifecycle,recovery-lifecycle}.test.ts`,
  `tests/support/render-fixture-server.ts`,
  `tests/okf/{layered-validator,strict-validator}.test.ts`,
  `tests/unit/{archive-core,contracts,persistence-sqlite,project-format}.test.ts`
- `tools/architecture/validate.mjs`, `tools/docs/validate.mjs`,
  `tools/migrations/validate.mjs`, `tools/okf/{discovery,references}.mjs`, and
  `tools/testing/run-tests.mjs`
- Closure remediation additionally modifies the Phase 13 acceptance/security
  records, Phase 13 OKF history/validation and extension registries,
  `packages/browser-runtime/src/index.ts`,
  `tests/browser/session.test.ts`, `tests/electron/desktop-smoke.test.ts`, and
  `tests/support/render-fixture-server.ts`.
- The final evidence gate additionally updates `HANDOFF.md`,
  `docs/project/PHASE_13_CLOSURE_REPORT.md`, and `okf/log.md` only.
- The native-evidence follow-up additionally modifies `.gitignore`, `README.md`,
  `package.json`, `docs/product/ACCEPTANCE_MATRIX.md`, the Phase 13 reports,
  `okf-extension/README.md`, the three OKF extension registries,
  `okf/operations/platform-support.md`, `okf/testing/phase-13-validation.md`,
  `okf/history/phase-13.md`, and `okf/log.md`.
- The current baseline-freeze preparation additionally modifies
  `docs/project/PHASE_13_EVIDENCE_EXECUTION_MATRIX.md`,
  `docs/project/PHASE_13_IMPLEMENTATION_REPORT.md`,
  `okf-extension/registry/evidence.json`, `okf/log.md`,
  `okf/operations/platform-support.md`, `okf/testing/phase-13-validation.md`,
  `tools/testing/run-phase13-evidence.mjs`, and `HANDOFF.md`, and adds
  `tools/testing/phase13-evidence-baseline.json`.

## Important Architecture and Design Decisions

- Trusted Application UI, Privileged Application Service, and a future
  Untrusted Archive Runtime are separate zones. Archived HTML/JavaScript is
  untrusted and receives no Node, filesystem, Secret Store, raw session,
  unrestricted IPC, or arbitrary project-management capability.
- Browser Runtime is the Playwright boundary. Normal render Contexts are
  isolated; Authentication Contexts are dedicated, headed for manual login,
  fresh/headless for restore, and exact-origin allowlisted.
- Raw Storage State remains Secret Store-only. SQLite, contracts, logs, CLI,
  Desktop results, reports, screenshots, and OKF contain metadata only.
- Job State, Crawl Run State, Authentication State, and future Proxy State are
  separate concepts. Migration 009 adds only the Run State fields needed now.
- Network Replay and full Strict Offline execution are contracts only; no full
  Replay engine or archive runtime was introduced.
- Service Workers use version 1 with `block` and explicit `allow`; `block` is
  the safe default and Authentication Contexts remain blocked by profile.
- Canonical relative paths are bounded, normalized, collision-keyed, and
  rejected on traversal, encoded traversal, absolute/drive/UNC, reserved,
  control, Unicode, separator, and symlink-boundary violations.
- Worker/page concurrency is distinct from network request budgets; adding
  proxies must not multiply an origin-wide request allowance.

## Commands Executed

- Repository reconnaissance: `git status`, `git branch`, `git rev-parse`,
  `git log`, instruction/HANDOFF/Phase 12/ADR/OKF inspections, and attachment
  review.
- `npm run typecheck` — PASS.
- `npm run build` — PASS.
- `npm run lint` — PASS.
- `npm run format:check` — PASS.
- `npm run contracts:check` — PASS (contract 1.9.0, 56 commands).
- `npm run migrations:validate` — PASS (9 immutable migrations, schema 9).
- `npm run security:check` — PASS.
- `npm run docs:validate` — PASS after the final documentation edits (158
  required artifacts, 399 active relative links, 98 archived Markdown files).
- `npm run test:architecture` — PASS (95 production TypeScript files).
- `npm run okf:validate` — PASS across all layers with zero errors/warnings.
- `npm run test:okf` — PASS (43/43).
- `node tools/testing/run-tests.mjs unit` — PASS (53/53).
- `node tools/testing/run-tests.mjs package:archive-core` — PASS (2/2).
- `node tools/testing/run-tests.mjs package:project-format` — PASS (3/3).
- `node tools/testing/run-tests.mjs package:persistence-sqlite` — PASS
  (22/22).
- `node tools/testing/run-tests.mjs package:scope-engine` — PASS (10/10).
- `node tools/testing/run-tests.mjs package:contracts` — PASS (7/7).
- `node tools/testing/run-tests.mjs package:recovery` — PASS (10/10).
- `node tools/testing/run-tests.mjs package:queue` — PASS (13/13).
- `node tools/testing/run-tests.mjs package:secrets` — PASS (12/12) after
  correcting deterministic ZIP timestamp handling.
- `node tools/testing/run-tests.mjs package:application-service` — 3 tests
  passed; one real-browser render was environment-blocked by `listen EPERM`.
- `node tools/testing/run-tests.mjs package:cli` — 2 passed and 2
  environment/product-fixture-dependent failures: render bind `EPERM` and
  missing browser manifest in the project smoke path.
- `node tools/testing/run-tests.mjs package:desktop` — 1 passed and 1 failed;
  the platform-correct macOS Electron path failed with `ENOENT`.
- Normal `node tools/testing/run-tests.mjs package:browser-runtime` — 2
  passed, 6 failed at loopback `listen EPERM`, 2 skipped.
- Escalated `node tools/testing/run-tests.mjs package:browser-runtime` —
  2 passed, 6 failed, 2 skipped; real cases were blocked by
  `BROWSER_INSTALLATION_MISSING` / `BROWSER_LAUNCH_FAILED`.
- Normal `npm test` — 158 tests: 142 passed, 14 failed, 2 skipped; failures
  were loopback `EPERM` and missing browser validation.
- Escalated `npm test` — 158 tests: 143 passed, 13 failed, 2 skipped. The
  failures were approved Chromium launch/manifest, browser-backed CLI/render/
  Application Service, and missing Electron binary cases; pure/unit/SQLite/OKF
  coverage passed.
- `npm run browser:verify` — failed because
  `.runtime/browsers/browser-manifest.json` is absent.
- Normal and escalated `npm run browser:install` — failed with DNS
  `getaddrinfo ENOTFOUND` for the official Playwright download hosts.
- Normal and escalated `node node_modules/electron/install.js` — failed with
  `TypeError: fetch failed`; no Electron binary was installed.
- `node tools/testing/run-tests.mjs package:browser-runtime` after the
  remediation — normal sandbox: 2 passed, 6 loopback `EPERM` failures, 2
  skipped; loopback escalation: 2 passed, 6 failures due to missing manifest
  or `BROWSER_LAUNCH_FAILED`, 2 skipped.
- `npm run typecheck`, `npm run build`, `npm run lint`, `npm run format:check`,
  and `node tools/testing/run-tests.mjs unit` after the fixture remediation —
  PASS; the unit suite is 53/53.
- `npm run okf:validate` and `npm run docs:validate` after the closure records
  — PASS; OKF has 0 errors/0 warnings and docs report 399 active links.
- Final `node tools/testing/run-tests.mjs package:desktop` — 1 pass, 1
  environment-blocked failure at the platform-correct macOS Electron path
  (`.../Electron.app/Contents/MacOS/Electron` ENOENT).
- Final `npm run typecheck`, `npm run build`, `npm run lint`,
  `npm run format:check`, `npm run test:architecture`,
  `npm run contracts:check`, `npm run migrations:validate`,
  `npm run project-format:validate`, scope/queue/recovery/checkpoint/render/
  Secret Store/diagnostics validators, `npm run security:check`,
  `npm run docs:validate`, `npm run okf:validate`, `npm run test:unit`, and
  `npm run test:okf` — PASS; unit 53/53 and OKF 43/43.
- Final generated-artifact scan — no logs, reports, screenshots, traces,
  diagnostics, test-result directories, or unauthorized synthetic secret/OTP
  occurrences were present; `.runtime` contains no browser executable or
  manifest.
- `node --version` — v24.19.0; `npm --version` — 12.0.2; host — Darwin
  23.2.0 arm64. The repository requires npm 11, so this version discrepancy
  remains an environment note, not a changed project requirement.
- `/Users/sasan/Mistakes/mistakes.md` — reviewed and updated with two concise
  browser/native provisioning lessons in the earlier remediation; it was
  reviewed again for this follow-up and no new reusable lesson was added.
- `node --check tools/testing/run-phase13-evidence.mjs` — PASS.
- `node tools/testing/run-phase13-evidence.mjs --help` — PASS.
- `npm run test:phase13:evidence -- --skip-full` — exit 1 as expected for the
  blocked current host; a bundle was written with AC-P13-002, AC-P13-008,
  AC-P13-012, and AC-P13-016 blocked.
- `node tools/testing/run-phase13-evidence.mjs validate .artifacts/phase13-evidence/2026-08-09T21-21-39-551Z-660f55b71e3a` — PASS.
- `node tools/testing/run-phase13-evidence.mjs reconcile .artifacts/phase13-evidence/2026-08-09T21-21-39-551Z-660f55b71e3a --output .artifacts/phase13-evidence/reconciliation-current.json` — exit 1 as expected; required Windows 11, Linux, and macOS passing rows are missing.
- `npm run test:phase13:evidence -- --skip-full` — exit 1 as expected for
  the current blocked host; fresh bundle:
  `.artifacts/phase13-evidence/2026-08-10T18-04-53-247Z-660f55b71e3a`.
- `node tools/testing/run-phase13-evidence.mjs validate .artifacts/phase13-evidence/2026-08-10T18-04-53-247Z-660f55b71e3a` — PASS.
- `node tools/testing/run-phase13-evidence.mjs reconcile .artifacts/phase13-evidence/2026-08-10T18-04-53-247Z-660f55b71e3a --output .artifacts/phase13-evidence/reconciliation-2026-08-10.json` — exit 1 as expected; required native rows are missing.
- Current Git audit: branch `main`, HEAD
  `5881707927131085032707a9e69b27ccb73bd750`, clean at task start, no staged
  files, and no diff-check errors. The current delta is the nine-file freeze
  preparation set.
- An explicit-path `git add --dry-run` was not able to create the Git index
  lock in the managed read-only Git metadata environment; no staging occurred
  and no `.git/index.lock` remains. The proposed command is supplied for the
  user to run in the normal writable repository environment.
- `node --check tools/testing/run-phase13-evidence.mjs` — PASS.
- `node tools/testing/run-phase13-evidence.mjs --help` — PASS.
- `npm run typecheck` and `npm run build` — PASS.
- `npm run lint`, `npm run format:check`, `npm run test:architecture`,
  `npm run contracts:check`, `npm run migrations:validate`,
  `npm run project-format:validate`, `npm run scope:validate`,
  `npm run queue:validate`, `npm run recovery:validate`,
  `npm run checkpoint:validate`, `npm run render:validate`,
  `npm run secret-store:validate`, `npm run vault:validate`,
  `npm run diagnostics:validate`, `npm run security:check`,
  `npm run docs:validate`, `npm run okf:validate`, and
  `npm run okf:validate:conformance` — PASS. Docs reported 158 required
  artifacts and 400 active relative links; OKF reported zero errors/warnings.
- `npm run test:unit` — PASS (53/53).
- `npm run test:okf` — PASS (43/43).
- Normal `npm test` — 142 passed, 14 failed, 2 skipped; loopback `EPERM`,
  missing Chromium, missing Electron, and browser-dependent CLI/render flows.
- Escalated `npm test` — 143 passed, 13 failed, 2 skipped; remaining failures
  were `BROWSER_INSTALLATION_MISSING`, `BROWSER_LAUNCH_FAILED`, Electron
  `ENOENT`, and dependent browser-backed flows. No new pure/product failure
  was observed.
- Normal `npm run test:phase13:evidence -- --skip-full` — exit 1 as expected;
  source fingerprint initially exposed a generator canonicalization defect,
  then the corrected runner produced a validated blocked bundle.
- Escalated `npm run test:phase13:evidence -- --skip-full` — exit 1 as
  expected; bundle `.artifacts/phase13-evidence/2026-08-10T19-15-35-661Z-588170792713`
  classified all mandatory rows `ENVIRONMENT_BLOCKED`.
- `node tools/testing/run-phase13-evidence.mjs validate .artifacts/phase13-evidence/2026-08-10T19-15-35-661Z-588170792713` — PASS.
- Reconciliation of the diagnostic bundle — exit 1 as expected; dirty source
  and missing Windows 11/Linux/macOS passing rows were rejected.
- Final pre-commit `npm run test:phase13:evidence -- --skip-full` — exit 1 as
  expected; bundle `.artifacts/phase13-evidence/2026-08-10T19-44-04-251Z-588170792713`
  classified all mandatory rows `ENVIRONMENT_BLOCKED`.
- `node tools/testing/run-phase13-evidence.mjs validate .artifacts/phase13-evidence/2026-08-10T19-44-04-251Z-588170792713` — PASS; source baseline matched, dirty-source eligibility was false, and secret scan reported zero unauthorized occurrences.
- `node tools/testing/run-phase13-evidence.mjs reconcile .artifacts/phase13-evidence/2026-08-10T19-44-04-251Z-588170792713` — exit 1 as expected; dirty source and missing required native rows were rejected.
- Final source fingerprint: `5f72396f0ae6f227f50ec06b566c12842cb46193a7b045dcf4b85674b3bc41fb`.
- `/Users/sasan/Mistakes/mistakes.md` — reviewed and updated with the reusable
  source-fingerprint canonicalization lesson discovered during this freeze.

## Validation and Test Results

Deterministic contracts, SQLite, Project Format, scope, recovery, queue,
Secret Store, unit, architecture, security, documentation, and OKF checks
passed as listed above. The remediation now makes the browser fixture's
protected marker depend on cookie, localStorage, and an IndexedDB record, and
asserts that sessionStorage is not serialized; this change is typechecked and
unit-tested but has not been promoted to runtime evidence. Real pinned-Chromium
Session, IndexedDB restore, and Service Worker evidence is unavailable. The
latest escalated full suite recorded 143 passed, 13 environment-blocked
failures, and 2 skipped tests. The latest evidence bundle had a matching source
fingerprint but `sourceAcceptanceEligible: false` because the tree is dirty;
its secret scan reported zero unauthorized occurrences. Native reconciliation
correctly rejected the diagnostic bundle because the source is not yet a clean
committed baseline and the required platform rows are absent.

## Known Issues and Blockers

- The repository-owned Chromium manifest and executable are absent.
- Playwright browser provisioning cannot resolve the official download hosts.
- In the normal sandbox, loopback fixture-server binding can fail with
  `listen EPERM`; with escalation, binding succeeded but the browser artifact
  and launch remained unavailable.
- The Electron smoke test cannot find the current platform Electron binary;
  `node_modules/electron` contains package files but no `dist/Electron`.
- The current host is macOS 14-era Darwin 23.2.0 on arm64. Native Windows 11,
  Windows 10, Linux, and complete cross-platform evidence are not available;
  the presence of system Chrome/Edge is not an approved substitute for the
  repository-owned Playwright runtime.
- The explicit Service Worker browser fixture is registered, but its real
  browser execution and AC-P13-012 remain `BLOCKED`.
- AC-P13-008 remains `BLOCKED` because the real IndexedDB/session restore test
  cannot run; deterministic parser and fake-runtime integration coverage pass.
- `sessionStorage` persistence remains intentionally unsupported.
- The host uses npm `12.0.2`, while the repository engine contract requires
  npm 11; the runner classifies this as `ENVIRONMENT_BLOCKED`.
- The source-baseline manifest is intentionally in `PRE_COMMIT_PREPARATION`
  with `finalCommittedBaseline: null`; no native evidence may be promoted until
  the user creates the reviewed baseline commit and hosts run from that clean
  commit.

## Database or Migration State

SQLite schema is version 9. Migration `009_add_crawl_run_state` adds
constrained `run_state` columns to `run_control` and `run_checkpoints` without
editing earlier migrations. Existing queue/checkpoint/Session metadata is
preserved; no future Worker, Proxy, Downloader, Replay, or archive-runtime
tables were added.

## Configuration and Environment Notes

The repository targets Node 24 and npm 11. Browser provisioning is explicit,
repository-owned, checksum-verified, sandboxed, and has no system-browser
fallback. No credentials, Secret Store payloads, raw Storage State, or local
machine secrets were added to the worktree.

## Uncommitted or Partially Applied Changes

The Phase 13 source-baseline freeze changes listed in Repository State are
unstaged and uncommitted. Generated evidence under `.artifacts/` is ignored and
contains no raw command output or credentials. The manifest records the exact
pre-commit parent HEAD and source hashes but intentionally leaves the final
commit null. No migration, public contract, branch, or generated browser
artifact was changed. Do not discard, reset, restore, stash, clean, commit,
push, or switch branches when resuming; the user must review and create the
single baseline commit. Treat the current worktree and this handoff as the
source of truth.

## Recovery or Rollback Notes

No destructive operation, migration rollback, branch change, commit, or push
was performed. If continuation is interrupted, first inspect `git status` and
this file, then continue from Exact Next Steps. Do not edit an already applied
migration in place. Any future rollback must treat the Phase 13 source,
migration 009, contract 1.9.0, docs, and OKF changes as a reviewed remediation
set.

## Related Documentation

- [Phase 13 implementation report](docs/project/PHASE_13_IMPLEMENTATION_REPORT.md)
- [Phase 13 closure/remediation report](docs/project/PHASE_13_CLOSURE_REPORT.md)
- [Phase 13 native evidence execution matrix](docs/project/PHASE_13_EVIDENCE_EXECUTION_MATRIX.md)
- [Post-Phase-12 baseline audit](docs/project/POST_PHASE_12_BASELINE_AUDIT.md)
- [Phase 13 security review](docs/architecture/PHASE_13_SECURITY_REVIEW.md)
- [Trust zones and IPC](docs/architecture/TRUST_ZONES_AND_IPC.md)
- [Network Replay](docs/architecture/NETWORK_REPLAY.md)
- [Strict Offline Mode](docs/architecture/STRICT_OFFLINE_MODE.md)
- [Service Worker policy](docs/architecture/SERVICE_WORKER_POLICY.md)
- [Canonical path safety](docs/architecture/CANONICAL_PATH_SAFETY.md)
- [ADR-052 through ADR-056](docs/project/adr/)
- [Acceptance Matrix](docs/product/ACCEPTANCE_MATRIX.md)
- [OKF Phase 13 history](okf/history/phase-13.md)
- The named revised proposal file was not present in the accessible repository
  or home search paths; the attached Phase 13 request was used as the task
  source.

## Notes for the Next Agent

Keep Phase 13 `PARTIAL` while real Chromium and native-platform evidence are
unavailable. Do not promote fake-runtime or pure contract results to browser
acceptance. Do not weaken authentication scope, Secret Store boundaries,
Electron sandboxing, IPC checks, path confinement, or browser provisioning to
make tests pass. Do not add Guided OTP, Proxy Pool, Asset Downloader, HTML
Rewriter, full Replay, archive runtime, Worker Pool, or packaging in this
phase.

The canonical follow-up commands are `npm run test:phase13:evidence`,
`node tools/testing/run-phase13-evidence.mjs validate <bundle>`, and
`node tools/testing/run-phase13-evidence.mjs reconcile <bundle>...`. A valid
single-host bundle is not sufficient for AC-P13-016 or Phase 14 readiness.
After the user creates the baseline commit, verify that the manifest's input
hashes still match, then run all native hosts from that same resulting HEAD.
