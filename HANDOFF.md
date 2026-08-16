# Project Handoff

## Authoritative Remediation Handoff

This section supersedes the historical Phase 14 checkpoint retained below.

## Last Updated

2026-08-16

## Project Summary

Offline Web Archive Builder is a local authorized archiving monorepo. Product
Phase 13 architecture/security hardening and Product Phase 14 OTP Flow/Element
Picker remain complete on the accepted native Windows 11 x64 baseline. Product
Phase 15 Proxy Manager and Health Monitor remains implemented within its
declared boundary. Product Phase 16 Worker Pool and Rate-Limit Compliance is
implemented and locally validated within its declared boundary; exact clean
HEAD release promotion is not claimed for the current uncommitted worktree.

## Current Objective

Implement and validate Product Phase 16 Worker Pool and Rate-Limit Compliance
while preserving the Phase 13/14 promotion baseline and Phase 15 proxy,
Secret Store, and Session-affinity boundaries.

## Current Phase or Milestone

- Phase 13: COMPLETE
- Phase 14: COMPLETE
- Phase 15: COMPLETE within declared boundary
- Phase 16: IMPLEMENTED/VALIDATED within declared boundary

## Repository State

- Repository path: `D:\All projects\OfflineWebArchiver`
- Current branch: `main`
- Base or starting commit: `e1f562e` (`docs(phase15): record final evidence checkpoint`)
- Current HEAD at task start: `e1f562e`
- Phase 15 implementation commit: `1fa68547f4a42b28f3bce0c4e8b0c81dfdc029fe`
- Final Phase 15 evidence HEAD: recorded exactly in
  `.artifacts/phase15-evidence/final-native-windows-11-x64/summary.json`
- Working tree at task start: unstaged Phase 16 source/test changes and new
  scheduler files; no staged changes; no unrelated changes observed.
- Current working tree remains intentionally uncommitted; staged changes: none.

## Completed Work

- Committed the Phase 14 OTP/Element Picker implementation and its tests.
- Fixed asynchronous popup-handler settling exposed by the real browser gate.
- Upgraded Phase 14 evidence tooling to require an accepted same-HEAD Phase 13
  bundle/reconciliation and to validate full/focused/browser and quality gates.
- Fixed Windows UBR normalization so evidence records build `26200.8875`.
- Produced and validated final Phase 13 and Phase 14 evidence from clean source.
- Synchronized Acceptance Matrix, reports, security reviews, OKF, and HANDOFF.
- Implemented Phase 15 Core proxy validation/health/eligibility/affinity,
  contract 1.11, SQLite schema 10 and migration 010, Project format schema 10,
  Secret Store proxy scope, Application Service commands, Browser Runtime
  HTTP/HTTPS/SOCKS5 routing checks, and explicit Session affinity.
- Added deterministic CSV/JSON import, local HTTP/HTTPS/SOCKS5 fixtures,
  fail-closed/dead-proxy coverage, secret-leakage assertions, security and
  contract boundary checks, and the exact-HEAD Phase 15 evidence runner.
- Updated Phase 15 architecture/security/report/ADR/acceptance/risk/HANDOFF
  records and canonical/extension OKF navigation, concepts, registries, and
  maintenance log.
- Implemented Phase 16 Core Worker Pool scheduling, canonical-Origin network
  budgets, shared cooldowns, bounded `Retry-After`, proxy selection/circuit
  breaking, sticky/fail-closed Session affinity, backpressure, and durable
  Queue/Recovery adapter hooks.
- Added Browser Runtime Origin permits and multi-Context lifecycle support,
  SQLite schema 11 migration `011_add_scheduler_state`, Project format schema
  11, focused scheduler tests, persistence tests, and Browser Runtime
  lifecycle coverage.
- Synchronized Phase 16 architecture, security review, report, ADR, acceptance,
  traceability, risks, canonical OKF concepts, and extension registries.

## Work in Progress

No Phase 16 implementation work remains within the declared boundary. Focused
Core validation has passed `15/15`, persistence validation has passed `25/25`,
and Browser Runtime/Chromium validation has passed `12/12` after updating the
lifecycle assertion for concurrent isolated Contexts. Full regression and all
final quality/documentation/security gates have now passed; exact clean-HEAD
release promotion remains intentionally unclaimed because the worktree is
uncommitted.

## Remaining Work

Phase 9 remains an independent discovery prerequisite for the earlier Phase
10/11 completion line. Exact clean-HEAD release promotion for the new Phase 16
work is not claimed because the worktree is uncommitted; this is a repository
state limitation, not a scheduler test failure. Authorized target-site
multi-proxy capture, long-running saturation, discovery, downloader, rewrite,
and replay remain later boundaries.

## Exact Next Steps

Before any Phase 16 release promotion, preserve the accepted Phase 13/14/15
evidence and the current Phase 16 source changes, rerun the final broad
validation commands listed below on the intended clean source, and only then
decide whether a clean commit and a Phase 16 release evidence bundle are
desired. Do not reset, clean, or discard the current uncommitted changes.

## Files Created

Phase 16 created `packages/archive-core/src/scheduler.ts`,
`packages/persistence-sqlite/src/scheduler.ts`,
`tests/unit/scheduler.test.ts`, `tests/integration/scheduler-lifecycle.test.ts`,
`docs/architecture/WORKER_POOL_SCHEDULER.md`,
`docs/architecture/PHASE_16_SECURITY_REVIEW.md`,
`docs/project/PHASE_16_IMPLEMENTATION_REPORT.md`,
`docs/project/adr/ADR-059-worker-pool-and-rate-limit-compliance.md`, and the
Phase 16 canonical/extension OKF concepts and records. Phase 15 inventory
remains in the prior committed implementation and evidence.

## Files Modified

Phase 16 modified Archive Core concurrency exports, Browser Runtime lifecycle
and network policy, SQLite adapter/migrations, Project format schema assertions,
Browser Runtime/persistence tests, test runner mappings, README, Phase Plan,
Acceptance Matrix, traceability, risk register, architecture/security/contract
docs, canonical and extension OKF indexes/registries/log, and this HANDOFF.

## Important Architecture and Design Decisions

- Phase 13 current-release native scope is Windows 11 x64; Windows 10 is
  legacy/non-blocking and Linux/macOS are future-version targets.
- Phase 14 promotion requires a validated Phase 13 bundle/reconciliation on
  the exact same clean committed HEAD.
- Phase 15 advances SQLite to schema `10`, Project format schema to `10`, and
  transport to `1.11.0`; migration `010_add_proxies` is forward-only and stores
  proxy metadata/health only. Raw proxy credentials remain in the Secret Store.
- Phase 16 advances SQLite and Project format to schema `11`; migration
  `011_add_scheduler_state` is forward-only and stores only canonical
  Project/Run/Origin cooldown metadata. Transport remains `1.11.0` because the
  scheduler is below the transport boundary.
- Configured proxy routing is fail-closed. Authenticated Session affinity is
  preserved by the scheduler, shared Origin cooldown cannot be bypassed by
  proxy selection, and direct mode rejects proxy-bound Jobs.
- Phone/OTP values remain ephemeral and absent from durable/evidence outputs.

## Commands Executed

The official Phase 13/14/15 evidence records remain available and were not
overwritten. Phase 16 commands executed include `npm test`,
`npm run test:unit`, `npm run test:integration`, `npm run test:concurrency`,
`node tools/testing/run-tests.mjs package:archive-core`,
`node tools/testing/run-tests.mjs package:persistence-sqlite`,
`node tools/testing/run-tests.mjs package:browser-runtime`,
`npm run test:secret-leakage`, `npm run typecheck`, `npm run build`, lint,
format, architecture, contracts, migrations, project-format, security, docs,
OKF, browser verification, and `git diff --check`.

## Validation and Test Results

- Full regression: `195/195 PASS`.
- Unit: `83/83 PASS`; integration: `30/30 PASS`; concurrency: `6/6 PASS`.
- Phase 16 Core focused suite: `15/15 PASS`.
- Phase 16 SQLite/persistence focused suite: `25/25 PASS` after updating the
  legacy teardown to drop the schema 11 scheduler table.
- Browser Runtime/Chromium suite: `12/12 PASS`; this includes concurrent
  isolated Context lifecycle and restart refusal while active.
- Secret Store leakage suite: `12/12 PASS`; browser provisioning verification:
  `PASS`.
- Typecheck/build/lint/format/architecture/contracts/migrations/project-format/
  security/docs/OKF: `PASS`; `git diff --check`: `PASS`.
- Post-final documentation revalidation: `docs:validate` and `okf:validate` both
  passed after the last documentation cleanup.
- An earlier focused Core run exposed a test-only fake-sleep starvation issue;
  the test was corrected to use a real asynchronous wait for in-flight
  concurrency and then passed. No production failure remained from that issue.

## Known Issues and Blockers

The sandboxed esbuild/Chromium subprocess restriction requires elevated
execution for some build/test commands; the initial sandbox attempts for
`test:secret-leakage` and `browser:verify` returned `EPERM`, then both passed
with the necessary execution permission. Deferred Linux/macOS native evidence,
the independent missing Phase 9 discovery engine, exact clean-HEAD promotion,
and authorized target-site all-path evidence remain known scope limitations.

## Risks and Assumptions

Future promoted commits must rerun the same clean-source native evidence gates;
the accepted Phase 13/14/15 bundles prove only their recorded Git HEAD. A Phase
16 release bundle must additionally bind scheduler, cooldown, persistence, and
Browser Runtime evidence to one clean unchanged HEAD.

## Database or Migration State

SQLite schema `11` is implemented with forward-only migrations `010_add_proxies`
and `011_add_scheduler_state`; the `proxies` table contains no raw credential
columns and `origin_rate_limits` contains only safe cooldown metadata. Project
format schema is `11`; transport contract is `1.11.0`.

## Configuration and Environment Notes

Accepted host: physical HP Victus x64, Windows 11 Home 25H2 build `26200.8875`;
Node `v24.17.0`; npm `11.17.0`; Playwright `1.56.1`; official Chromium
`141.0.7390.37` revision `1194`; Electron `43.2.0`.

## Uncommitted or Partially Applied Changes

Phase 16 source, tests, and documentation remain uncommitted and intentionally
preserved. No destructive rollback, branch change, push, reset, rebase, or
amend has occurred.

## Recovery or Rollback Notes

No push, force-push, reset, rebase, or history rewrite occurred. Generated
evidence is ignored under `.artifacts/`; source rollback should use ordinary
forward Git commits rather than destructive cleanup.

## Related Documentation

- `docs/project/PHASE_13_CLOSURE_REPORT.md`
- `docs/project/PHASE_14_OTP_FLOW_ELEMENT_PICKER.md`
- `docs/product/ACCEPTANCE_MATRIX.md`
- `okf/testing/phase-13-validation.md`
- `okf/testing/phase-14-validation.md`
- `.artifacts/phase13-evidence/final-native-windows-11-x64`
- `.artifacts/phase13-evidence/final-reconciliation.json`
- `.artifacts/phase14-evidence/final-native-windows-11-x64`
- `docs/project/PHASE_15_IMPLEMENTATION_REPORT.md`
- `docs/architecture/PHASE_15_SECURITY_REVIEW.md`
- `docs/project/adr/ADR-058-proxy-manager-and-health-monitor.md`
- `.artifacts/phase15-evidence/final-native-windows-11-x64`
- `docs/project/PHASE_16_IMPLEMENTATION_REPORT.md`
- `docs/architecture/WORKER_POOL_SCHEDULER.md`
- `docs/architecture/PHASE_16_SECURITY_REVIEW.md`
- `docs/project/adr/ADR-059-worker-pool-and-rate-limit-compliance.md`
- `okf/history/phase-16.md`

## Notes for the Next Agent

The Phase 15 evidence summary and validator bind to their accepted clean HEAD;
the current Phase 16 worktree is intentionally dirty because this task must
not commit. Preserve the Phase 16 scheduler boundary: no direct fallback for
proxy-bound work, no alternate-proxy cooldown bypass, no secret/payload state in
SQLite, and no claim of discovery/downloader/replay/target-site completion.

## Historical Handoff (superseded)

## Last Updated

2026-08-12

## Project Summary

Offline Web Archive Builder is a local, authorized archiving monorepo. It
contains the Phase 3-8 foundation, Phase 10 interaction baseline, Phase 11
Secret Store, Phase 12 Manual Login and Secure Session Manager, and Phase 13
architecture/security hardening. Phase 9 discovery is still absent. The
current user-directed Phase 14 OTP Flow and Element Picker implementation is
present but remains partial pending the existing Phase 13 release gate. Proxy,
Worker Pool, downloader, rewrite, replay execution, and later-phase engines
are not implemented here.

## Current Objective

Implement and validate the user-directed Phase 14 boundary: versioned Locator
and Login Flow contracts, temporary native Element Picker, visible single and
segmented OTP participation, bounded outcomes/resend/expiry, Session
save/validate, and same-Run `waiting_for_auth` continuation. Preserve Phase 13
security and release-gate semantics.

## Current Phase or Milestone

Phase 14 is PARTIAL. Focused implementation, full local regression, real
Chromium, security, documentation, and OKF checks pass in the current
worktree. Phase 13 remains partial because its clean committed Windows 11
x64/native release evidence gate is unresolved; that prerequisite blocks Phase
14 promotion but is not a focused Phase 14 test failure. The next
user-requested phase is Phase 15 Proxy Manager and Health Monitor.

## Repository State

- Repository path: D:\All projects\OfflineWebArchiver
- Current branch: main
- Base or starting commit for this task: 8757bbf7bd9b208e7c7d7069e52ac0d4752d4f2d
- Final Phase 14 evidence bundle: `.artifacts/phase14-evidence/2026-08-12T05-39-23-723Z-8757bbf7bd9b/summary.json`
- Current HEAD: 8757bbf7bd9b208e7c7d7069e52ac0d4752d4f2d
- Working tree status: unstaged Phase 14 source, tests, docs, OKF, and evidence-runner changes; no unrelated changes observed
- Staged changes: none
- Unstaged changes: Phase 14 source/runtime/contracts, tests, docs, OKF registries, package script, evidence runner, and this HANDOFF
- Untracked files: new Phase 14 source, tests, reports, OKF concepts, and evidence runner

## Completed Work

- Verified the task-start branch, HEAD, clean tree, recent history, and diff
  check. This reconciliation started from `main` at
  `fff15859338a6ab8d13113b2be2a5ff66b1847b9` with a clean working tree.
- Captured the Windows environment: Windows build 10.0.26200.8875, x64,
  Node v24.17.0, shell npm 11.17.0, and ComSpec set to
  C:\WINDOWS\system32\cmd.exe. The runner observed npm 11.13.0 through the
  npm CLI path supplied by an earlier wrapper run; the final diagnostic bundle
  observed npm 11.17.0. Both are supported npm 11 majors.
- Reproduced both original invocations before editing:
  npm run test:phase13:evidence and
  node tools/testing/run-phase13-evidence.mjs run. Both failed immediately
  with spawn EINVAL.
- Proved the failing subprocess: the runner selected npm.cmd, and a direct
  Node probe returned spawnSync npm.cmd EINVAL for the --version argument.
  This is a test-infrastructure defect, not a product assertion or npm-major
  failure.
- Replaced direct .cmd execution with an explicit portable command planner.
  Node tools use process.execPath; npm uses the JavaScript CLI from
  npm_execpath or the standard Windows Node installation path. Arguments are
  passed as arrays, the inherited environment and absolute repository cwd are
  preserved, and no blanket shell mode is used.
- Added synchronous-spawn error capture so an unassessable child process is
  recorded in evidence instead of terminating the runner with usage text.
- Added POSIX/Windows Node/npm planner regression coverage, including paths and
  arguments containing spaces and environment preservation.
- Actual Windows reruns of both runner entry points completed without
  spawn EINVAL. The wrapper used its npm_execpath JavaScript CLI.
- Verified official Chromium and Electron on Windows. Chromium is Playwright
  1.56.1, revision 1194, build 141.0.7390.37, source official-playwright,
  under .runtime/browsers; Electron is 43.2.0 and
  node_modules/electron/dist/electron.exe launches with --version.
- Generated and validated the diagnostic bundle
  .artifacts/phase13-evidence/2026-08-11T05-56-50-247Z-759e4c4e1ad2.
  Its artifact secret scan passed with zero unauthorized occurrences.
- Regenerated the source-baseline manifest with the canonical algorithm. The
  earlier checkpoint fingerprint `1bc25491f1bbf72add9fd166511a659fd9e0142466fd0c9de8613ae160424198`
  is superseded; the current diagnostic fingerprint is recorded below and
  `finalCommittedBaseline` remains null.
- Updated the Phase 13 execution matrix, implementation/closure reports,
  Google OKF validation/platform/history/log records, and evidence/relationship
  registries. No acceptance definition or security invariant was weakened.
- Reviewed the cross-project mistakes log and recorded the reusable Windows
  npm.cmd spawn EINVAL lesson at D:\All projects\Mistakes\mistakes.md.
- Inspected the latest clean Windows bundle on `bdaac54`: approved Playwright
  Chromium 1.56.1 / revision 1194 / build 141.0.7390.37 and Electron 43.2.0
  were valid; the browser suite was 9/10 because the Service Worker test
  remained at `data-state="pending"`.
- Reproduced the Service Worker failure with the real production Browser
  Runtime. In `block` mode Playwright emitted `Service Worker registration
  blocked by Playwright`, returned no registrations/controller, and issued no
  worker-controlled fetch; in `allow` mode registration activated, controlled
  the page, and intercepted `/sw-probe`.
- Classified the Service Worker failure as `TEST_INFRA_FAILURE`: the fixture
  assumed blocked registration rejects, but pinned Playwright leaves that
  promise pending while exposing a browser warning. Also corrected the
  runner's separate generic-`network` stdout classification false positive.
- Updated the fixture assertions and fixture-server request counters, added
  browser classification regression coverage, and verified the focused
  browser suite at 10/10 and the unit suite at 64/64.
- Reconciled the current release scope to Windows 11 x64 only. Windows 10 is
  legacy/compatibility and non-blocking; Linux/macOS are deferred future-
  version targets and remain represented in the roadmap and portable
  architecture.
- Redefined AC-P13-016 around the current Windows 11 native/Desktop/browser
  evidence without weakening real Chromium, Electron, clean-source,
  fingerprint, acceptance-hash, regression, quality, security, or secret-scan
  requirements.
- Updated the runner to read the versioned platform-support contract from the
  baseline, reconcile only required current-release rows, and expose a
  canonical `test:phase13:evidence:baseline` regeneration command.
- Added authoritative Windows registry/build detection. This host reports
  registry ProductName `Windows 10 Home` but CurrentBuildNumber `26200` and
  DisplayVersion `25H2`; the runner correctly records it as Windows 11 x64
  while retaining the legacy ProductName and kernel as diagnostics.
- Reviewed `D:\All projects\Mistakes\mistakes.md` and appended the reusable
  Windows edition-metadata lesson; no duplicate entry was present.

### Phase 14 implementation checkpoint

- Added strict versioned Locator, Login Flow, Element Picker, OTP policy,
  authentication transitions, outcomes, and `OtpFlowEngine` in Archive Core.
- Added contract `1.10.0` `otp.*` and `elementPicker.*` commands/results/errors;
  Login Flow is optional Profile JSON and does not require a SQLite migration.
- Added native Playwright interaction and temporary page-local picker with
  teardown on selection, timeout, navigation, close, and error.
- Added Application Service same-Run `waiting_for_auth` continuation through
  protected Session save/validate, plus recoverable cancel/browser-close paths.
- Added single/segmented OTP, resend/expiry/invalid/success/timeout handling,
  field clearing, privacy assertions, local fixtures, and registered tests.
- Added Phase 14 acceptance/report/ADR/security/architecture documents, OKF
  concepts/history/testing records and extension registry entries.
- Added `npm run test:phase14:evidence`, which writes only bounded redacted
  summaries and keeps the Phase 13 promotion gate explicitly blocked.

## Work in Progress

The Phase 14 tree is intentionally unstaged and uncommitted. The final Phase
14 evidence bundle is
`.artifacts/phase14-evidence/2026-08-12T05-39-23-723Z-8757bbf7bd9b/summary.json`:
all nine command groups passed, the sensitive scan passed with zero findings,
validation is `PASS`, phase status is `PARTIAL`, and release promotion is
`BLOCKED` because the working tree is dirty and the Phase 13 native gate is
unresolved.

## Remaining Work

1. Review the final Phase 14 evidence bundle after the last validation rerun.
2. Close the Phase 13 clean committed Windows 11 x64/native evidence gate with
   the existing Phase 13 evidence matrix and runner.
3. Reconcile product-plan numbering if the legacy 25-phase table is replaced;
   the current user-directed mapping is Phase 14 OTP/Picker and Phase 15 Proxy
   Manager/Health Monitor.
4. Only after the prerequisite/product decision, begin Phase 15 proxy work.

## Exact Next Steps

For this worktree, review the final Phase 14 summary and preserve its
`PASS` validation plus `PARTIAL/BLOCKED` promotion status. For release
promotion, use the existing clean-source Phase 13 procedure; do not treat a
dirty-tree bundle as final acceptance.

    node --version
    npm --version
    git rev-parse HEAD
    npm run test:phase14:evidence
    npm run test:phase13:evidence
    npm run test:phase13:evidence:validate -- <bundle>
    node tools/testing/run-phase13-evidence.mjs reconcile <windows-11-bundle>

Use the repository-owned official Chromium only. Do not use system Chrome/Edge,
fake manifests, mixed revisions, or dirty-tree bundles as final acceptance.
Windows 10 remains diagnostic/legacy only; Linux/macOS are future-version
validation work.

## Files Created

- `packages/archive-core/src/authentication.ts`
- `packages/browser-runtime/src/authentication-interaction.ts`
- `tests/unit/authentication.test.ts`
- `tests/integration/otp-flow.test.ts`
- `tests/browser/otp-flow.test.ts`
- `tools/testing/run-phase14-evidence.mjs`
- `docs/project/PHASE_14_OTP_FLOW_ELEMENT_PICKER.md`
- `docs/project/adr/ADR-057-otp-flow-and-element-picker.md`
- `docs/architecture/PHASE_14_SECURITY_REVIEW.md`
- `okf/architecture/otp-flow-element-picker.md`
- `okf/testing/phase-14-validation.md`
- `okf/history/phase-14.md`

## Files Modified

- `README.md`, `package.json`, and `HANDOFF.md`.
- `docs/architecture/` Phase 14 authentication, browser interaction,
  contracts, process/transport, persistence, system context, trust zones,
  test architecture, and security review records.
- `docs/product/ACCEPTANCE_MATRIX.md` and `docs/project/PHASE_PLAN.md`.
- `packages/application-service/src/index.ts`,
  `packages/archive-core/src/index.ts`, `packages/browser-runtime/src/index.ts`,
  `packages/contracts/src/index.ts`, and `packages/scope-engine/src/index.ts`.
- `tests/support/render-fixture-server.ts`, `tools/testing/run-tests.mjs`,
  `tests/okf/layered-validator.test.ts`, and
  `tests/okf/strict-validator.test.ts`.
- `okf/` and `okf-extension/` Phase 14 concepts, indexes, log, and registries.

## Important Architecture and Design Decisions

- The evidence runner retains fixed repository-owned command definitions and
  does not accept user-controlled shell command strings.
- Repository-owned Node tools execute through process.execPath with explicit
  module paths. npm commands execute the npm JavaScript CLI, not npm.cmd or a
  shell wrapper.
- The planner returns command, argument array, and subprocess options with
  preserved cwd, environment, and Windows visibility behavior. Arguments are
  never manually quoted.
- The runner's environment/test-infrastructure/product classification remains
  separate. spawn EINVAL is TEST_INFRA_FAILURE; missing runtime or dirty source
  is ENVIRONMENT_BLOCKED; a valid runtime assertion failure is the only path to
  PRODUCT_FAIL. AC-P13-016 is PASS only for the current Windows 11 x64 target;
  Windows 10 is NOT_APPLICABLE/legacy and Linux/macOS are future/deferred.
- The baseline's versioned platform-support contract is the reconciliation
  source of truth. It currently requires `windows-11-x64` only and carries
  optional/legacy and future target patterns for later releases.
- Windows edition detection uses `HKLM\SOFTWARE\Microsoft\Windows
  NT\CurrentVersion` metadata. CurrentBuildNumber/DisplayVersion can override
  a legacy Windows 10 ProductName label; `os.release()` is retained only as
  diagnostic fallback and cannot verify the current target by itself.
- Playwright `serviceWorkers: "block"` is the production fail-closed control.
  The browser fixture observes its pinned-runtime warning and verifies that no
  worker-controlled probe reaches the fixture server; it must not require the
  blocked registration promise to reject.
- Environment classification scans specific runtime/launch signatures, not
  generic words such as `network` from otherwise valid test output.
- Chromium manifest verification, revision/source checks, sandbox policy,
  system-browser prohibition, evidence redaction, same-HEAD reconciliation,
  clean-source requirements, IPC security, Secret Store isolation, and path
  safety remain unchanged.

### Phase 14 architecture decisions

- Core owns pure contracts/transitions; Browser Runtime is the sole Playwright
  adapter; Application Service owns Session/Run orchestration.
- Locator/Login Flow/Picker/OTP descriptors are strict and versioned. Login
  Flow is optional Profile JSON and is absent from legacy Profiles.
- Phone and OTP inputs are ephemeral visible-browser inputs. They are not
  persisted or emitted in SQLite, Secret Store metadata, Session metadata,
  results, events, logs, traces, screenshots, diagnostics, evidence, HANDOFF,
  or OKF.
- The picker returns only a safe locator and semantic kind, and uses no preload
  bridge, capability token, DOM handle, or arbitrary script transport.
- There is no SMS interception, CAPTCHA solving, password capture, or
  automatic challenge bypass. No SQLite migration was added; schema remains 9.

## Commands Executed

- Repository baseline: branch, HEAD, status, porcelain status, latest log, and
  git diff --check.
- Windows environment: node --version, npm --version, where.exe node,
  where.exe npm, where.exe npx, ComSpec, ver, and Node runtime metadata.
- Original failure reproduction: both Phase 13 runner entry points.
- Direct subprocess probes: npm.cmd returned EINVAL; direct Node spawning was
  separately blocked by the normal sandbox with EPERM.
- node --check tools/testing/run-phase13-evidence.mjs.
- Initial `npm run test:unit` with escalated subprocess permissions: PASS,
  63/63.
- Normal-sandbox diagnostic runs of the direct and npm-wrapper runner: no
  spawn EINVAL; child execution was recorded as sandbox EPERM.
- Escalated actual Windows runs of the direct and npm-wrapper runner: no
  spawn EINVAL; both produced diagnostic bundles.
- npm run browser:info: PASS.
- npm run browser:verify: PASS.
- Evidence bundle validation for the final Windows diagnostic
  .artifacts/phase13-evidence/2026-08-11T05-56-50-247Z-759e4c4e1ad2: PASS.
- npm run test:phase13:evidence:validate --
  .artifacts/phase13-evidence/2026-08-11T05-56-50-247Z-759e4c4e1ad2: PASS.
- Focused reproduction on the approved Windows Chromium: 9/10 before the
  fix, with exact pending DOM assertion and diagnostic console/registration/
  network state captured.
- Production Browser Runtime diagnostic for block/allow registration and
  controller state: block had warning/no registration/no controller/no
  worker-controlled fetch; allow activated and intercepted the probe.
- `node tools/testing/run-tests.mjs package:browser-runtime` after the fix:
  PASS, 10/10.
- `node tools/testing/run-tests.mjs unit` after the fix: PASS, 64/64.
- Final escalated `npm test`: PASS, 170/170, 0 failed, 0 skipped. The count
  includes the Windows release-classification regression test added here.
- Final canonical gates: `npm run typecheck`, `build`, `lint`, `format:check`,
  `test:architecture`, `contracts:check`, `migrations:validate`,
  `project-format:validate`, `security:check`, `docs:validate`,
  `okf:validate`, and `test:okf`: all passed; OKF tests were 43/43.
- Final `npm run test:phase13:evidence` generated the post-remediation
  Windows diagnostic bundle recorded below; its process exit was 1 only
  because the runner correctly blocks dirty-source acceptance promotion.
- Final `npm run test:phase13:evidence:validate` for that bundle: PASS.
- `npm run test:unit` after the Windows-only changes: PASS, 65/65.
- `node --check tools/testing/run-phase13-evidence.mjs`: PASS.
- `npm run test:phase13:evidence:baseline` was run with escalated Git access;
  it regenerated the current source fingerprint and acceptance-definition hash.
- The first post-change evidence run exposed invalid Windows registry command
  arguments; after correction, the second run produced
  `.artifacts/phase13-evidence/2026-08-11T14-03-24-184Z-fff15859338a`.
- `npm run test:phase13:evidence:validate --
  .artifacts/phase13-evidence/2026-08-11T14-03-24-184Z-fff15859338a`: PASS.
- The new Windows diagnostic records registry ProductName `Windows 10 Home`,
  CurrentBuildNumber `26200`, DisplayVersion `25H2`, and verified target
  `windows-11-x64`; focused Browser Runtime is 10/10 and Desktop is 2/2.

### Phase 14 commands executed

- `npm run typecheck`, `npm run build`, `npm run lint`,
  `npm run format:check`, `npm run test:architecture`,
  `npm run contracts:check`, `npm run migrations:validate`,
  `npm run test:unit`, `npm run test:integration`, `npm run test:browser`,
  `npm run test`, `npm run security:check`, `npm run docs:validate`,
  `npm run okf:validate`, and `npm run test:phase14:evidence`.
- Child-process/browser/full-suite commands used escalated Windows execution
  because normal sandbox child creation previously returned `EPERM`.
- No commit, push, reset, branch change, rebase, or destructive cleanup was
  performed.

## Validation and Test Results

- `npm run typecheck`, `npm run build`, `npm run lint`, `npm run format:check`,
  and `npm run test:architecture`: PASS.
- `npm run contracts:check`: PASS for contract `1.10.0` and 56 commands plus
  response/error/event envelopes.
- `npm run migrations:validate`: PASS for 9 immutable migrations at schema 9.
- `npm run test:unit`: PASS, 69/69.
- `npm run test:integration`: PASS, 26/26 in the focused run.
- `npm run test:browser`: PASS, 11/11 after picker teardown/browser-close
  fixes.
- Full `npm run test`: PASS, 176/176, 0 failed, 0 skipped after the final
  picker teardown/browser-close lifecycle fix.
- `npm run security:check`, `npm run docs:validate`, and `npm run okf:validate`:
  PASS. OKF official, references, provenance, extension, quality, and format
  layers all pass.
- The final Phase 14 evidence bundle is
  `.artifacts/phase14-evidence/2026-08-12T05-39-23-723Z-8757bbf7bd9b/summary.json`.
  It records all nine command groups as `PASS`, unit `69/69`, integration
  `26/26`, browser `11/11`, sensitive scan `PASS` with zero findings,
  validation `PASS`, phase `PARTIAL`, and release promotion `BLOCKED`.
- `git diff --check`: PASS; Git reported only normal LF-to-CRLF working-copy
  warnings. Branch remains `main`; no files are staged.

## Known Issues and Blockers

- The Phase 13/14 source tree is dirty, so evidence is diagnostic and cannot
  satisfy final native acceptance.
- Linux and macOS passing rows are intentionally not required by the current
  Windows-only release contract; their support remains future-version work.
- The current Phase 14 bundle passes focused commands and sensitive scanning,
  but its release-promotion status is intentionally `BLOCKED`.
- The normal sandbox blocks child-process creation with EPERM; escalated
  Windows execution was used for the actual runner and runtime checks.
- Phase 14 implementation is present but partial; do not promote it until the
  Phase 13 prerequisite is closed. Do not begin proxy implementation in this
  phase.

## Database or Migration State

No database, schema, or migration changed. SQLite schema remains version 9;
migration 009 is unchanged and applied migrations remain immutable. Login Flow
is optional Profile JSON; phone and OTP inputs have no SQLite table, column,
migration, export field, or Secret Store metadata payload.

## Configuration and Environment Notes

The declared toolchain is Node >=24.0.0 <25 and npm >=11.0.0 <12.
Observed npm paths expose two npm 11 patch versions (11.17.0 from the shell
and 11.13.0 from the runner's CLI path); this is recorded separately and was
not treated as the cause of spawn EINVAL. The current host is recorded as
Windows 11 x64 from registry CurrentBuildNumber 26200 / DisplayVersion 25H2;
its registry ProductName remains `Windows 10 Home`, so the ProductName and
kernel string are not used alone for release classification. No credentials,
raw Storage State, phone/OTP values, Secret Store payloads, or machine secrets
were added to project records.

## Uncommitted or Partially Applied Changes

The files listed under Files Modified and Files Created are unstaged and
uncommitted. Generated `.artifacts/`, `.build-tests/`, and runtime browser
files are ignored and diagnostic only. No files are staged; new Phase 14 files
remain untracked until the user reviews them.

## Recovery or Rollback Notes

No reset, restore, clean, stash, rebase, branch change, commit, push, or
destructive cleanup was performed. Preserve the current unstaged files. If a
review rejects the remediation, inspect the diff and revert only with explicit
user authorization; do not discard the user's working tree.

## Related Documentation

- docs/project/PHASE_13_EVIDENCE_EXECUTION_MATRIX.md
- docs/project/PHASE_14_OTP_FLOW_ELEMENT_PICKER.md
- docs/architecture/PHASE_14_SECURITY_REVIEW.md
- docs/project/adr/ADR-057-otp-flow-and-element-picker.md
- docs/project/PHASE_13_IMPLEMENTATION_REPORT.md
- docs/project/PHASE_13_CLOSURE_REPORT.md
- docs/product/ACCEPTANCE_MATRIX.md
- docs/product/PROJECT_SCOPE.md
- docs/architecture/PLATFORM_SUPPORT_POLICY.md
- docs/project/PHASE_PLAN.md
- README.md
- okf/testing/phase-13-validation.md
- okf/architecture/otp-flow-element-picker.md
- okf/testing/phase-14-validation.md
- okf/operations/platform-support.md
- okf-extension/registry/evidence.json
- tools/testing/phase13-evidence-baseline.json

## Notes for the Next Agent

Treat the original Windows spawn EINVAL and pre-remediation Service Worker
fixture failure as TEST_INFRA_FAILURE, not PRODUCT_FAIL. Review the Phase 14
bundle as local implementation evidence only; its dirty-tree status cannot
promote Phase 13/14 release acceptance. Keep phone/OTP values out of durable
or diagnostic surfaces. The next user-requested implementation is Phase 15
Proxy Manager and Health Monitor, but start it only after the Phase 13
prerequisite and product-plan decision are resolved.
