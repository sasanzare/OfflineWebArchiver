# Project Handoff

## Last Updated

2026-08-11

## Project Summary

Offline Web Archive Builder is a local, authorized archiving monorepo. It
contains the Phase 3-8 foundation, Phase 10 interaction baseline, Phase 11
Secret Store, Phase 12 Manual Login and Secure Session Manager, and Phase 13
architecture/security hardening. Phase 9 discovery and Phase 14 features are
outside the current scope.

## Current Objective

Remediate the Phase 13 Windows evidence-runner spawn EINVAL failure, preserve
all acceptance and security requirements, and prepare a new immutable source
baseline for native evidence. Do not start Phase 14.

## Current Phase or Milestone

Phase 13 remains PARTIAL; Phase 14 remains PHASE_14_BLOCKED. The Windows
runner portability defect is corrected and the actual Windows host can execute
the runner, but the remediation is uncommitted and the required
Windows/Linux/macOS clean common-HEAD matrix is not complete.

## Repository State

- Repository path: D:\All projects\OfflineWebArchiver
- Current branch: main
- Base or starting commit for this task: 759e4c4e1ad21618abdd593008ee0b638b101885
- Previous requested evidence baseline: deb26e7e0ca65cde1c60f75b72bda8b385fdaa66
- Current HEAD: 759e4c4e1ad21618abdd593008ee0b638b101885
- Working tree status: unstaged remediation and documentation changes; no unrelated changes observed
- Staged changes: none
- Unstaged changes: runner, baseline manifest, Phase 13 reports, OKF records/registries, and HANDOFF
- Untracked files: tests/unit/phase13-evidence-command-planning.test.ts

## Completed Work

- Verified the task-start branch, HEAD, clean tree, recent history, and diff
  check. The repository was not on the requested prior baseline: it was on
  759e4c4, a later committed Phase 13 matrix line.
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
  current diagnostic fingerprint is
  1bc25491f1bbf72add9fd166511a659fd9e0142466fd0c9de8613ae160424198;
  finalCommittedBaseline remains null.
- Updated the Phase 13 execution matrix, implementation/closure reports,
  Google OKF validation/platform/history/log records, and evidence/relationship
  registries. No acceptance definition or security invariant was weakened.
- Reviewed the cross-project mistakes log and recorded the reusable Windows
  npm.cmd spawn EINVAL lesson at D:\All projects\Mistakes\mistakes.md.

## Work in Progress

The remediation tree is intentionally unstaged and uncommitted. The source
baseline manifest has been regenerated from the final current source set using
the existing sha256-canonical-path-role-hash-list-v1 algorithm. Its
finalCommittedBaseline remains null until the user creates the new commit.

## Remaining Work

1. Review the focused Windows Service Worker failure separately; it is not
   evidence that the original spawn EINVAL incident was a product failure.
2. User reviews, commits, and pushes the remediation set.
3. Run the full native evidence matrix from that new clean common HEAD on
   Windows 11, Linux, and macOS; validate each bundle and reconcile only
   same-HEAD, clean-source bundles.
4. Keep AC-P13-002, AC-P13-008, AC-P13-012, and AC-P13-016 blocked until their
   required real evidence passes.

## Exact Next Steps

After review, the user should commit the exact remediation file set listed
below, then record the new commit hash and run on each required host:

    node --version
    npm --version
    git rev-parse HEAD
    npm run browser:verify
    npm run test:phase13:evidence
    npm run test:phase13:evidence:validate -- <bundle>
    node tools/testing/run-phase13-evidence.mjs reconcile <windows> <linux> <macos>

Use the repository-owned official Chromium only. Do not use system Chrome/Edge,
fake manifests, mixed revisions, or dirty-tree bundles as final acceptance.

## Files Created

- tests/unit/phase13-evidence-command-planning.test.ts

## Files Modified

- HANDOFF.md
- docs/project/PHASE_13_CLOSURE_REPORT.md
- docs/project/PHASE_13_EVIDENCE_EXECUTION_MATRIX.md
- docs/project/PHASE_13_IMPLEMENTATION_REPORT.md
- okf-extension/registry/evidence.json
- okf-extension/registry/relationships.json
- okf/history/phase-13.md
- okf/log.md
- okf/operations/platform-support.md
- okf/testing/phase-13-validation.md
- tools/testing/phase13-evidence-baseline.json
- tools/testing/run-phase13-evidence.mjs

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
  PRODUCT_FAIL.
- Chromium manifest verification, revision/source checks, sandbox policy,
  system-browser prohibition, evidence redaction, same-HEAD reconciliation,
  clean-source requirements, IPC security, Secret Store isolation, and path
  safety remain unchanged.

## Commands Executed

- Repository baseline: branch, HEAD, status, porcelain status, latest log, and
  git diff --check.
- Windows environment: node --version, npm --version, where.exe node,
  where.exe npm, where.exe npx, ComSpec, ver, and Node runtime metadata.
- Original failure reproduction: both Phase 13 runner entry points.
- Direct subprocess probes: npm.cmd returned EINVAL; direct Node spawning was
  separately blocked by the normal sandbox with EPERM.
- node --check tools/testing/run-phase13-evidence.mjs.
- npm run test:unit with escalated subprocess permissions: PASS, 63/63.
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

## Validation and Test Results

- Command-planner and existing unit tests: 63 passed, 0 failed.
- Windows Browser verification: PASS for official Playwright Chromium 1.56.1,
  revision 1194, build 141.0.7390.37, sandbox enabled, no system fallback.
- Windows Electron --version: PASS for v43.2.0.
- Windows focused browser suite: 10 total, 9 passed, 1 failed. The one failure
  was the Service Worker policy assertion; it requires separate clean-HEAD
  investigation and is not attributed to the spawn incident.
- Windows focused Desktop suite: 2 total, 2 passed.
- Full escalated npm test: 168 total, 166 passed, 2 failed, 0 skipped. The
  failures were the browser-native Interaction popup trace assertion and the
  Service Worker policy assertion; they are separate diagnostic findings and
  were not promoted to product or acceptance failures from the dirty tree.
- Windows diagnostic bundle validation: PASS; sourceBaselineMatch: true;
  secret scan: PASS with 0
  unauthorized occurrences.
- Full regression, all quality gates, and cross-platform reconciliation were
  not run to completion in this remediation checkpoint.

## Known Issues and Blockers

- The remediation source tree is dirty, so the Windows bundle is diagnostic and
  cannot satisfy final native acceptance.
- The required Linux and macOS passing rows are not present at the new common
  source revision.
- The Windows Service Worker focused test failed once with the approved
  Chromium runtime; do not promote AC-P13-012 or call the runner incident a
  product failure until a clean committed rerun classifies the failure.
- The normal sandbox blocks child-process creation with EPERM; escalated
  Windows execution was used for the actual runner and runtime checks.
- Phase 14 is blocked and must not be started.

## Database or Migration State

No database, schema, or migration changed. SQLite schema remains version 9;
migration 009 is unchanged and applied migrations remain immutable.

## Configuration and Environment Notes

The declared toolchain is Node >=24.0.0 <25 and npm >=11.0.0 <12.
Observed npm paths expose two npm 11 patch versions (11.17.0 from the shell
and 11.13.0 from the runner's CLI path); this is recorded separately and was
not treated as the cause of spawn EINVAL. No credentials, raw Storage State,
Secret Store payloads, or machine secrets were added.

## Uncommitted or Partially Applied Changes

The files listed under Files Modified are unstaged and uncommitted. Generated
.artifacts/, .build-tests/, and runtime browser files are ignored and are
diagnostic only. The new command-planning test is untracked until the user
reviews the complete remediation set.

## Recovery or Rollback Notes

No reset, restore, clean, stash, rebase, branch change, commit, push, or
destructive cleanup was performed. Preserve the current unstaged files. If a
review rejects the remediation, inspect the diff and revert only with explicit
user authorization; do not discard the user's working tree.

## Related Documentation

- docs/project/PHASE_13_EVIDENCE_EXECUTION_MATRIX.md
- docs/project/PHASE_13_IMPLEMENTATION_REPORT.md
- docs/project/PHASE_13_CLOSURE_REPORT.md
- docs/product/ACCEPTANCE_MATRIX.md
- okf/testing/phase-13-validation.md
- okf/operations/platform-support.md
- okf-extension/registry/evidence.json
- tools/testing/phase13-evidence-baseline.json

## Notes for the Next Agent

Treat the original Windows spawn EINVAL as TEST_INFRA_FAILURE, not
PRODUCT_FAIL. Do not use the old deb26e7 evidence baseline after the runner or
fingerprinted inputs change. The user must create the new clean common commit,
then rerun official Chromium/Electron evidence on Windows 11, Linux, and macOS
and reconcile bundles from that exact HEAD. Do not begin Guided OTP, Element
Picker, Proxy Manager, Worker Pool, Asset Downloader, HTML Rewriter, full
Replay, Validation Engine, packaging, or any other Phase 14 or later work.
