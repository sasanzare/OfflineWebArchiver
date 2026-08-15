# OKF Knowledge Maintenance Log

This concise log records meaningful changes to the active Google OKF v0.2
bundle. It is not a copy of Git history or a task diary.

## 2026-08-07

- Added Product Phase 12 Manual Login and Secure Session concepts, security
  controls, database schema-8 knowledge, phase history, and extension evidence
  links. Recorded the real pinned-Chromium validation as environment-blocked;
  no unsupported browser evidence was promoted.
- Added Product Phase 13 hardening concepts for trust zones, Crawl Run state,
  replay/offline policy, Service Workers, canonical paths, platform support, and
  validation evidence; recorded migration 009 and the blocked browser/platform
  closure conditions.

## 2026-08-09

- Recorded the Phase 13 closure/remediation gate with the actual Chromium and
  Electron provisioning failures, 158-test regression totals, unchanged
  blocked acceptance rows, and the strengthened IndexedDB/session fixture.
- Re-ran the final evidence closure gate at the current `main` HEAD. Official
  Chromium/Electron provisioning still failed because the required external
  resources were unavailable; browser and native acceptance rows remain
  blocked, while deterministic, security, documentation, and OKF validators
  passed. The exact evidence and next action remain in the closure report.
- Added the repository-owned Phase 13 evidence runner, bundle schema,
  redaction/secret-scan rule, and same-HEAD native reconciliation path. The
  current macOS arm64 run produced a validated `ENVIRONMENT_BLOCKED` bundle;
  no browser or native acceptance row was promoted.

## 2026-08-10

- Revalidated the Phase 13 runner after synchronizing the execution matrix,
  acceptance/report links, and OKF extension registries. The fresh macOS arm64
  bundle and bundle validator passed their structural and secret-scan checks;
  native reconciliation remains `ENVIRONMENT_BLOCKED` because Windows 11,
  Linux, and macOS passing rows are unavailable.
- Added the Phase 13 source-baseline freeze invariant: native bundles record a
  deterministic source fingerprint and acceptance-definition hash, and final
  reconciliation requires a clean committed tree with matching source inputs.
- Reconciled the 2026-08-10 Phase 13 runtime diagnostic: a matrix
  `PRODUCT_FAIL` conflicted with its `ENVIRONMENT_BLOCKED` runtime because the
  Desktop classifier omitted the Chromium prerequisite and ignored blocker
  text on stdout. Added focused classification regression coverage and recorded
  the corrected `ENVIRONMENT_BLOCKED` result; no acceptance requirement was
  changed or promoted.

## 2026-08-11

- Reproduced the Windows Phase 13 runner failure in both invocation forms and
  traced `spawn EINVAL` to direct `npm.cmd` execution. Classified the incident
  as `TEST_INFRA_FAILURE`, then changed the runner to resolve Node/npm commands
  through `process.execPath` and explicit argument arrays without weakening
  shell or security boundaries.
- Added command-planner regression coverage for POSIX/Windows paths, npm CLI
  resolution, spaces, and environment preservation. The actual Windows reruns
  reached Chromium/Electron and the validated diagnostic bundle remained
  non-promotable because the remediation commit and complete native matrix are
  still required.
- The final Windows diagnostic checkpoint recorded full-suite totals of 168
  tests, 166 passed, 2 failed, and 0 skipped. The two browser assertion
  failures remain separate clean-HEAD triage items and do not change the
  runner incident classification.
- Investigated and remediated AC-P13-012 on the verified Windows Chromium:
  Playwright block mode produced no registration/controller and no
  worker-controlled fetch while the fixture incorrectly waited for rejected
  registration. The fixture now verifies the real warning/block behavior and
  explicit allow interception; focused Browser Runtime passed 10/10 and unit
  tests passed 64/64. The runner's generic `network` classification false
  positive was corrected with regression coverage; clean common-HEAD matrix
  evidence is still required.
- Reconciled the current release scope to Windows 11 x64 only. Windows 10 is
  legacy/non-blocking, while Linux and macOS are deferred future-version
  targets. Updated the Phase 13 acceptance contract and runner reconciliation
  to derive one required Windows row from the versioned platform-support
  contract; native runtime, security, clean-source, fingerprint, and
  acceptance-hash requirements remain unchanged.

## 2026-08-12

- Added the partial Phase 14 OTP Flow and Element Picker knowledge layer:
  versioned Locator/Login Flow/OTP contracts, temporary native picker,
  same-Run authentication continuation, ephemeral-input boundaries, focused
  evidence, and the unresolved Phase 13 release prerequisite.
