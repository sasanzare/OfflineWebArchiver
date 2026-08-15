# Product Phase 13 Closure and Blocker Remediation Report

## Phase status

`COMPLETE`

The clean committed native Windows 11 x64 gate passed on Git HEAD
`7fbc5eaba60f4ae22753fc5bb9d67da51fd7a090`. The authoritative bundle is
`.artifacts/phase13-evidence/final-native-windows-11-x64`; its validator passes,
its secret scan reports zero unauthorized occurrences, and
`.artifacts/phase13-evidence/final-reconciliation.json` records `PASS` with
`PHASE_14_READY`.

The accepted host is a physical HP Victus x64 system running Windows 11 Home
25H2, build `26200.8875`. Node is `v24.17.0`, npm is `11.17.0`, Playwright is
`1.56.1`, the repository-owned official Chromium build is `141.0.7390.37`
(revision `1194`), and Electron is `43.2.0`. The source fingerprint,
acceptance-definition hash, clean-tree state, exact HEAD, browser/Desktop
fixtures, full regression, quality, migration, security, documentation, OKF,
and sensitive-evidence gates all match.

This closes the prior procedural/evidence blocker. Phase 14 was previously
partial because this upstream promotion gate was unresolved, not because its
OTP/Element Picker implementation failed.

## Current release platform decision — 2026-08-11

The current product version is Windows-only and targets Windows 11 x64.
Windows 10 is legacy/compatibility, best-effort, and non-blocking. Linux and
macOS are deferred future-version targets; their native rows are preserved for
roadmap validation but are not mandatory Phase 13 closure inputs.

The previous AC-P13-016 definition required a Windows 11, Windows 10, Linux,
macOS, and architecture matrix. That multi-platform denominator is obsolete
for the current release. The updated definition requires the current Windows
11 native/Desktop/browser evidence, clean committed source, matching source
fingerprint and acceptance-definition hash, real Chromium and Electron,
focused and full gates, and secret-scan success. It does not weaken any native
runtime or security requirement.

Phase 14 revalidation is authorized from this accepted baseline. Phase 15 was
not started by this closure task.

## Historical diagnostic context (superseded)

The remaining sections preserve earlier diagnostic runs and root-cause history.
Their blocked/partial statements are superseded by the accepted closure result
above.

## Baseline

- Repository: `/Users/sasan/Desktop/codex/OfflineWebArchiver`
- Branch: `main` (unchanged)
- HEAD at the start and end of the final evidence gate:
  `edea9585aeaee56620d22cc6c091c61fa65edbb6`
- The prior Phase 13 hardening commit was
  `df2920071d53803963b6d64c5a7689f6677a1d41`; the remediation is included in
  the current HEAD.
- The request's expected `d59390f7a060321fe37ece716ec74d06b5071ba3` was not
  the current HEAD; repository state was preserved.
- Working tree was clean at the start of the final evidence gate. Only this
  report, `HANDOFF.md`, and the OKF maintenance log are updated by the gate;
  no commit, push, branch change, reset, restore, stash, clean, or rebase was
  performed.
- Host: Darwin 23.2.0, arm64. Node `v24.19.0`; npm `12.0.2`. The project
  declares Node 24 and npm 11, so the npm version difference is an environment
  limitation recorded here and was not changed.

## Previous blockers and root causes

| Blocker | Root cause | Classification |
|---|---|---|
| AC-P13-002 | `.runtime/browsers/browser-manifest.json` and the approved Chromium executable are absent. Both normal and escalated official Playwright provisioning attempts fail DNS resolution for the allowlisted download hosts. | `ENVIRONMENT_BLOCKED` |
| AC-P13-008 | The real BrowserContext cannot be created without AC-P13-002. No IndexedDB restore claim is made. | `ENVIRONMENT_BLOCKED` |
| AC-P13-012 | The Service Worker fixture cannot launch the approved Chromium because the repository-owned installation is missing. | `ENVIRONMENT_BLOCKED` |
| AC-P13-016 | The required Windows 11, Windows 10, Linux, macOS, and architecture matrix cannot be produced on this host. The local Electron package also has no downloaded macOS binary. | `ENVIRONMENT_BLOCKED` |

The normal sandbox additionally prevents loopback fixture binding with
`listen EPERM`. Escalated loopback execution succeeds and reaches the actual
missing-browser errors, so the browser failures are not hidden behind the
sandbox restriction.

## Remediation performed

The smallest in-scope test/runtime remediation was applied:

- Authentication marker validation now waits up to five seconds for an
  asynchronous marker state, while retaining bounded validation and fail-safe
  invalid outcomes.
- The local authentication fixture now creates an `auth-db` IndexedDB
  database, stores a synthetic non-secret session marker, and makes the
  protected marker depend on the cookie, localStorage, and IndexedDB record.
- The fixture sets a sessionStorage-only marker and the browser test asserts
  that it is not serialized, preserving the documented unsupported
  sessionStorage behavior.
- The browser test asserts the captured state contains the expected database,
  object store, and at least one record without logging or comparing the
  stored value.
- The Electron smoke fixture now resolves the platform-native executable
  path (`Electron.app/Contents/MacOS/Electron` on macOS, `electron` on Linux,
  and `electron.exe` on Windows). This fixes a test-infrastructure defect but
  does not install the missing binary.

No acceptance criterion was weakened and no system browser was used.

## Browser provisioning evidence

The repository's existing provisioning path was used unchanged:

- Playwright: `playwright-core 1.56.1`
- Expected Chromium: `141.0.7390.37`, Playwright revision `1194`
- Resource root: `.runtime/browsers`
- Required source: `official-playwright`
- Manifest/checksum: required
- Chromium sandbox: explicitly enabled
- System-browser fallback: disabled

Results:

- `npm run browser:info` — `ENOENT` for
  `.runtime/browsers/browser-manifest.json`.
- `npm run browser:verify` — same `ENOENT`; no verification was claimed.
- `npm run browser:install` in the normal sandbox — exit 1,
  `getaddrinfo ENOTFOUND` for `cdn.playwright.dev` and
  `playwright.download.prss.microsoft.com`.
- `npm run browser:install` with network escalation — exit 1 with the same
  DNS errors across the official fallback hosts.

The `.runtime/browsers` directory contains no manifest or executable. The
system-installed Chrome and Edge binaries were not substituted.

## Final evidence closure gate execution — 2026-08-09

The current HEAD was rechecked after the prior remediation. The host is macOS
14.2.1 on Darwin 23.2.0 arm64, with Node `v24.19.0`, npm `12.0.2`,
Playwright `1.56.1`, and Electron `43.2.0`. The project still declares npm 11;
that version difference was not changed.

- `npm run browser:info` and `npm run browser:verify` both exited 1 because
  `.runtime/browsers/browser-manifest.json` is absent.
- Normal and escalated `npm run browser:install` both exited 1. The official
  Playwright hosts returned `getaddrinfo ENOTFOUND`.
- Normal and escalated `node node_modules/electron/install.js` both failed with
  `TypeError: fetch failed`; no official Electron binary was installed.
- No compatible pre-provisioned Chromium, verified browser cache restoration
  path, native-platform CI matrix, or trusted offline artifact was available.

These results do not create a browser manifest, substitute a system browser,
or promote any browser/native acceptance result.

## Real Chromium and Service Worker evidence

The required command was executed after remediation:

`node tools/testing/run-tests.mjs package:browser-runtime`

With loopback escalation, the result was 10 tests: 2 passed, 6 failed, and 2
skipped. The two pure authentication-policy tests passed. The browser-backed
tests failed with `BROWSER_INSTALLATION_MISSING` or
`BROWSER_LAUNCH_FAILED`; the two process-kill tests were skipped by the
platform policy. The normal sandbox run separately produced 2 passed, 6
`listen EPERM` failures, and 2 skipped.

Therefore no headed authentication, restore, Service Worker, navigation,
Context teardown, or browser process evidence is promoted to acceptance.

## IndexedDB / Session evidence

The source and fixture now exercise the intended storage contract when a real
Chromium is available: cookie authentication, localStorage state, an
IndexedDB `auth-db`/`tokens` record, and non-persisted sessionStorage are
checked as one lifecycle. The test still performs the required close-and-fresh
restore sequence.

The test cannot reach the first BrowserContext creation in the current
environment. This is implementation/test-preparation evidence only, not real
browser acceptance evidence. AC-P13-008 remains `BLOCKED`.

## Native platform evidence

The verified host is macOS arm64. The required cross-platform matrix was not
run. The existing Electron package contains package metadata but no
`node_modules/electron/dist/Electron.app/Contents/MacOS/Electron`; the official
Electron installer was attempted in normal and escalated environments and
returned `TypeError: fetch failed`. The platform-aware test path now reports
the correct macOS executable target and still fails with `ENOENT`.

System Chrome/Edge cannot provide Electron-native or repository-owned
Chromium evidence. AC-P13-016 remains `BLOCKED`.

The current platform evidence row is:

| Platform | Environment | Chromium | Electron | Required fixtures | Result |
|---|---|---|---|---|---|
| macOS | macOS 14.2.1, Darwin 23.2.0, arm64 | Not available; manifest absent | `package:desktop`: 1 pass, smoke `ENOENT` | Browser fixtures blocked; Electron smoke not launched | `ENVIRONMENT_BLOCKED` |
| Windows 11 x64 | Not available | Not run | Not run | Not run | `ENVIRONMENT_BLOCKED` |
| Windows 10 | Not available | Not run | Not run | Not run | `ENVIRONMENT_BLOCKED` |
| Linux | Not available | Not run | Not run | Not run | `ENVIRONMENT_BLOCKED` |

## Security and regression verification

- `npm run security:check` — PASS.
- `npm run test:architecture` — PASS for 95 production TypeScript files.
- `npm run contracts:check` — PASS for contract `1.9.0`, 56 commands and
  response/error/event envelopes.
- `npm run migrations:validate` — PASS for 9 immutable migrations at schema 9.
- `npm run project-format:validate` — PASS for Project format `1.1.0` and 7
  unsafe-path probes.
- `npm run scope:validate`, queue validators, recovery validators,
  `render:validate`, `secret-store:validate`, and `diagnostics:validate` —
  PASS.
- Secret Store, redaction, path-safety, IPC, authentication-route, strict
  offline, replay-contract, Service Worker policy, state, and persistence
  regressions remain covered by the passing deterministic suites.
- No OTP fixture was exercised and no OTP marker was generated. The browser
  fixture uses only synthetic non-credential values; no session payload is
  included in reports or diagnostics.

## Migration and contract impact

No migration was added or edited during closure remediation. SQLite schema 9
and migration `009_add_crawl_run_state` remain immutable and compatible with
the Phase 12 Session metadata migration. The transport contract remains
`1.9.0`; Project format remains `1.1.0`; Crawl Run, Session, Storage State,
Replay/Offline, Service Worker, and Canonical Path versions remain unchanged.
The asynchronous marker wait is an internal Browser Runtime validation
behavior and introduces no public contract version change.

## Full test results

The canonical full suite was run in both environments:

- `npm test` in the normal sandbox: 162 tests — 146 passed, 14 failed, 2
  skipped. The failures were loopback `listen EPERM` plus browser-dependent
  paths.
- `npm test` with loopback escalation: 162 tests — 147 passed, 13 failed, 2
  skipped. All remaining failures were classified as browser/native
  environment blockers: missing approved Chromium, browser launch failure, and
  CLI/render/interaction/Electron paths dependent on that browser.
- `node tools/testing/run-tests.mjs unit`: 57/57 PASS.
- `npm run test:okf`: 43/43 PASS.
- `npm run okf:validate`: PASS with 0 errors and 0 warnings across all layers.
- `npm run docs:validate`: PASS for 158 required artifacts, 387 active
  relative links, and 98 readable archived Markdown files.

The final gate reran the independent repository validators after focused and
full regression. Typecheck, build, lint, format, architecture, contracts,
migrations, Project Format, Scope, Queue, Recovery, Checkpoint, Render, Secret
Store, diagnostics, security, documentation, and OKF validation all passed;
the unit suite was 53/53 and the OKF suite was 43/43. A generated-artifact
scan found no logs, reports, screenshots, traces, diagnostics, test-result
directories, or unauthorized synthetic secret/OTP occurrences.

The negative validator messages shown inside the OKF suite are intentional
fixture assertions; the suite itself passed 43/43.

## Native evidence runner execution — 2026-08-10 follow-up

The follow-up at Git HEAD
`660f55b71e3a6ae6ef23a9a42552d4562ad70e83` added and exercised the canonical
[Phase 13 Native Evidence Execution Matrix](PHASE_13_EVIDENCE_EXECUTION_MATRIX.md)
and `tools/testing/run-phase13-evidence.mjs` with `--skip-full`.

The latest bundle is under
`.artifacts/phase13-evidence/2026-08-10T18-04-53-247Z-660f55b71e3a` and records:

- macOS 14.2.1 / Darwin 23.2.0 / arm64, Node `v24.19.0`, and npm `12.0.2`
  (the repository requires npm 11).
- Missing `.runtime/browsers/browser-manifest.json` and the approved Chromium
  executable; the Electron 43.2.0 package metadata is present but its macOS
  binary is absent.
- Browser-focused results of 10 total, 2 passed, 6 failed, and 2 skipped;
  the browser-backed failures are environment/loopback blocked and do not
  prove a product failure. Desktop-focused results are 2 total, 1 passed, and
  1 failed, with the missing Electron binary and loopback restriction recorded.
- Bundle validation passed and the generated artifact secret scan reported zero
  unauthorized occurrences.

The reconciliation command was also executed against this bundle. It returned
`ENVIRONMENT_BLOCKED` because passing `windows-11-x64`, Linux, and macOS native
rows are still missing. No acceptance row was promoted and the authoritative
matrix remains unchanged. The exact transfer, validation, and reconciliation
commands are maintained in the execution matrix.

## Final runtime remediation and classification reconciliation — 2026-08-10

The committed baseline bundle
`.artifacts/phase13-evidence/2026-08-10T20-59-38-509Z-deb26e7e0ca6` exposed a
runner inconsistency: `matrix-entry.json` reported
`environmentClassification: ENVIRONMENT_BLOCKED` but `status: PRODUCT_FAIL`,
and the generated `AC-P13-016` row inherited that product-failure status. The
browser rows in the same bundle correctly reported `ENVIRONMENT_BLOCKED`
because the approved Chromium manifest was absent.

This was a `CLASSIFICATION_DEFECT`, not a product defect. The Desktop
classifier did not include missing Chromium in its runtime concerns and only
searched stderr/spawn diagnostics, while the Desktop smoke's bounded blocker
diagnostic was in stdout. The runner now checks browser and Electron
availability and scans stdout, stderr, and spawn diagnostics. Regression tests
prove that a missing required runtime maps to `ENVIRONMENT_BLOCKED`, a valid
runtime with an application assertion maps to `PRODUCT_FAIL`, and a runtime
blocker emitted on stdout remains `ENVIRONMENT_BLOCKED`.

The 2026-08-10 corrected escalated diagnostic bundle is recorded in
`HANDOFF.md`.
It validated successfully, reported zero unauthorized secret-scan occurrences,
matched the declared source fingerprint, and classified `AC-P13-016` as
`ENVIRONMENT_BLOCKED`. It remains
non-promotable because the remediation tree is dirty, the repository-owned
Chromium installation was missing on that historical macOS host, and the
required Windows 11, Linux, and macOS native rows had not been reconciled.

## Windows spawn EINVAL remediation — 2026-08-11

On Windows 11 x64, both canonical runner entry points initially failed before
evidence collection with `spawn EINVAL`. The exact failing call was the direct
`spawn("npm.cmd", ["run", "browser:verify"], ...)` path. A focused Node probe
confirmed `spawnSync npm.cmd EINVAL`; the host's Node 24 and npm 11 majors were
within the repository contract. This incident is therefore classified as
`TEST_INFRA_FAILURE`, not a product failure.

The runner now uses `process.execPath` plus explicit JavaScript module paths and
argument arrays for repository-owned Node/npm tools. It resolves the npm CLI
from `npm_execpath` or the standard Windows installation path, preserves the
absolute `cwd` and inherited environment, avoids `shell: true`, and records
synchronous spawn errors as bounded diagnostics. The new command-planner tests
pass as part of the 63/63 unit suite.

After the fix, both `node tools/testing/run-phase13-evidence.mjs run` and
`npm run test:phase13:evidence` completed on the actual Windows host without
`spawn EINVAL`. The validated diagnostic bundle
`.artifacts/phase13-evidence/2026-08-11T05-44-03-612Z-759e4c4e1ad2`
verified official Chromium 1.56.1/revision 1194 and Electron 43.2.0. Its
browser-focused result was 9/10 with one Service Worker assertion failure and
its Desktop-focused result was 2/2. Because the remediation source is not yet
committed and the cross-platform matrix is incomplete, this bundle is not
final acceptance evidence.

The subsequent pre-remediation full Windows regression run reported 168 tests:
166 passed, 2 failed, and 0 skipped. The failing cases were the browser
Interaction popup trace assertion and the Service Worker policy assertion.
After the Service Worker fixture remediation, the full Windows regression run
reported 169 tests: 169 passed, 0 failed, and 0 skipped. The remediation tree
still requires a clean committed rerun for final acceptance promotion.

## AC-P13-012 final remediation — 2026-08-11

The clean Windows `bdaac54` bundle used the repository-owned Playwright
Chromium 1.56.1 / revision 1194 / build 141.0.7390.37 and reproduced the
Service Worker assertion failure with a valid browser. The `block` Context
emitted `Service Worker registration blocked by Playwright`; it had no
registration or controller and no worker-controlled probe reached the fixture
server. The `allow` Context registered and activated the fixture worker and
returned its intercepted probe response.

The failure was `TEST_INFRA_FAILURE` in the fixture harness: it incorrectly
assumed that Playwright's blocked `register()` promise rejects, although the
pinned runtime leaves it pending while exposing the browser warning. The
fixture now observes that real browser signal and asserts the network effect.
The evidence runner's unrelated generic-`network` classification false
positive was removed and covered by a regression test.

The post-remediation focused Browser Runtime suite passed 10/10 and the unit
suite passed 64/64. The refreshed Windows diagnostic bundle recorded in
`HANDOFF.md` validated with sourceBaselineMatch true, Browser Runtime 10/10,
Desktop 2/2, and zero unauthorized secret-scan occurrences. The source tree is
intentionally unstaged, so the bundle must be rerun after the user creates the
new clean common baseline.

## Acceptance reconciliation

The authoritative Phase 13 matrix remains unchanged for the mandatory
blockers:

- `PASS`: AC-P13-001, AC-P13-003, AC-P13-004, AC-P13-006, AC-P13-007,
  AC-P13-009, AC-P13-010, AC-P13-011, AC-P13-013, AC-P13-014, AC-P13-015,
  AC-P13-017, AC-P13-018, AC-P13-019, AC-P13-020, AC-P13-021, and
  AC-P13-022.
- `NOT_APPLICABLE`: AC-P13-005; the current product has no archive runtime
  and no trusted renderer loads archive HTML/JavaScript.
- The current Windows focused execution reports `PASS` for AC-P13-002,
  AC-P13-008, and AC-P13-012. Those results are not promoted into final
  acceptance from an unstaged source tree.
- `BLOCKED`: AC-P13-016 because the current Windows 11 x64 release evidence
  has not yet been rerun from the clean committed post-reconciliation source.
  Windows 10 is legacy/non-blocking and Linux/macOS are deferred; neither is
  required for current-release closure.
- `FAIL`: none identified. The earlier diagnostic matrix inconsistency was
  corrected in the runner; the authoritative acceptance matrix remains
  `BLOCKED` for the environment/native-evidence reasons above.

Phase 12 carry-over reconciliation remains historical and traceable:

- AC-P12-001 — `BLOCKED`: no real headed Chromium authentication evidence.
- AC-P12-006 — `BLOCKED`: no real fresh-context restore evidence.
- AC-P12-015 — `BLOCKED`: the documentation gate must continue to disclose
  the real-browser limitation.

Other Phase 12 rows remain as previously reconciled; this report does not
rewrite the historical Phase 12 implementation report.

## Phase 14 readiness

`PHASE_14_BLOCKED`

Phase 14 is not authorized. The current Windows 11 x64 native gate remains
open, and no OTP or Element Picker production work was added.

## Exact next action

On a host with DNS/download access to the allowlisted official Playwright
hosts, provision Chromium through:

```text
npm run browser:install
npm run browser:verify
node tools/testing/run-tests.mjs package:browser-runtime
npm test
```

Then execute the documented Windows 11 x64 release evidence, inspect the real
Session, IndexedDB, Service Worker, and native results, validate the bundle,
and reconcile it against the versioned Windows-only contract. Do not begin
Phase 14 while any mandatory current-release Phase 13 row is blocked.
