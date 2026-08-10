# Phase 13 Native Evidence Execution Matrix

## Scope and status

This document defines the repository-owned execution path for the remaining
Phase 13 evidence. It does not add product functionality and does not change
the Phase 13 acceptance criteria. Phase 13 remains `PARTIAL` until real
approved Chromium and the required native matrix have been executed.

The canonical runner is
[`tools/testing/run-phase13-evidence.mjs`](../../tools/testing/run-phase13-evidence.mjs),
exposed as:

```text
npm run test:phase13:evidence
```

It verifies the locked runtime and the repository-owned source baseline declared
by [`tools/testing/phase13-evidence-baseline.json`](../../tools/testing/phase13-evidence-baseline.json), runs the existing focused test commands, writes a secret-scanned evidence bundle, and returns non-zero when a mandatory focused execution is blocked or fails. A final acceptance bundle requires a clean committed tree and a matching source fingerprint; dirty diagnostic bundles remain non-promotable. It never installs a system browser, stores raw Storage State, or edits the Acceptance Matrix.

## Locked runtime contract

| Runtime | Required value | Verification |
|---|---|---|
| Node.js | `>=24.0.0 <25` | `node --version` and `environment.json` |
| npm | `>=11.0.0 <12` | `npm --version` and `environment.json` |
| Playwright | `1.56.1` | `package.json`, lockfile, and `runtime.json` |
| Chromium revision | `1194` | installed Playwright `browsers.json` and manifest |
| Chromium build | `141.0.7390.37` | manifest and executable verification |
| Chromium source | `official-playwright` | manifest and runner validation |
| Electron | `43.2.0` | lockfile, package metadata, platform binary, and `--version` |

The source baseline manifest records the pre-commit preparation state, the
canonical SHA-256 fingerprint, the package-lock, runner, and acceptance
definition hashes, and the explicit immutable input file list. Its manifest
file is intentionally excluded from its own fingerprint to avoid a circular
hash. The final native run must use the commit created after this preparation;
the manifest does not claim a commit that has not yet been created.

Chromium must be under `.runtime/browsers`, have a manifest and SHA-256
matching the executable, remain inside the repository-owned resource root, and
launch with the Chromium sandbox enabled. A system Chrome/Edge binary,
renamed executable, fake manifest, Wine environment, or emulated OS is not
accepted as native evidence. The existing provisioning command is:

```text
npm run browser:install
npm run browser:verify
```

Electron is provisioned by the locked npm package. If `npm ci` did not leave
the platform binary in `node_modules/electron/dist`, the approved repair is:

```text
node node_modules/electron/install.js
```

The runner then verifies the platform-specific binary path and launches it
with `--version`; the Desktop smoke remains the launchability and bridge
evidence gate. No arbitrary Electron installation is used.

The repository has no offline-artifact import command. An approved cache or
offline artifact may be used only when it produces the same official
Playwright layout, revision, build, manifest, executable, and checksum that
`npm run browser:verify` accepts. If those facts cannot be proven, classify
the environment as `ENVIRONMENT_BLOCKED` and restore official download or
approved cache access. Do not run `provision.mjs manifest` on an unverified
system-browser directory.

## Canonical execution

From the same source revision on an approved host:

```text
node --version
npm --version
git rev-parse HEAD
npm ci
npm run browser:install
npm run browser:verify
node node_modules/electron/install.js
npm run test:phase13:evidence
```

The Electron installer command is only needed when the locked package binary
is absent; the runner will report `ELECTRON_BINARY_MISSING` otherwise. The
runner reuses the existing test orchestration and invokes these focused gates:

```text
npm run browser:verify
node tools/testing/run-tests.mjs package:browser-runtime
node tools/testing/run-tests.mjs package:desktop
```

After focused browser, Electron, native-toolchain, and runtime checks pass, it
also invokes `npm test` and the Phase 13 quality gates:

```text
npm run typecheck
npm run build
npm run lint
npm run format:check
npm run test:architecture
npm run contracts:check
npm run migrations:validate
npm run security:check
npm run docs:validate
npm run okf:validate
npm run test:okf
```

Use `--force-full` only for diagnostic execution when focused prerequisites
are blocked. It does not convert a blocked result into a pass. Use
`--skip-full` when a host operator needs only the focused evidence attempt.

## Environment classification

Every bundle records one of the following classifications:

| Classification | Meaning |
|---|---|
| `VALID_NATIVE_ENVIRONMENT` | Actual macOS, Windows, or Linux host with the declared toolchain, approved Chromium, Electron binary, and native launch checks available. |
| `VALID_BROWSER_ENVIRONMENT` | Approved Chromium is valid and launchable, but native Electron evidence is unavailable. |
| `INVALID_FOR_ACCEPTANCE` | The host is not an actual supported native OS/architecture, or is an emulated/substituted environment. |
| `ENVIRONMENT_BLOCKED` | A native host is present, but a required version, manifest, binary, network resource, sandbox, or launch precondition is unavailable. |

The runner captures actual OS version, kernel release, architecture, Node/npm,
Git HEAD, branch, and a dirty-state summary. It does not collect hostnames,
credentials, environment-variable values, cookies, tokens, OTP values, raw
Storage State, or Secret Store payloads.

## Evidence bundle and validation

Each run writes a new directory under `.artifacts/phase13-evidence/`:

```text
bundle.json
environment.json
runtime.json
test-results.json
acceptance-results.json
matrix-entry.json
secret-scan.json
```

`acceptance-results.json` contains `AC-P13-002`, `AC-P13-008`,
`AC-P13-012`, `AC-P13-016`, and the Phase 12 carry-over rows
`AC-P12-001`, `AC-P12-006`, and `AC-P12-015`. Each row records the allowed
status, host metadata, Git HEAD, runtime versions, exact command, exit code,
test totals, evidence files, timestamp, and reason. `PASS` is valid only when
an executed command has exit code zero and a captured test result.
Every bundle also carries the source fingerprint and the acceptance-definition
hash. Bundle validation accepts a structurally valid blocked diagnostic, while
reconciliation rejects dirty trees, source mismatches, differing fingerprints,
and differing acceptance-definition hashes.

Generated command output is not stored raw. Failure diagnostics are bounded
and redacted. `secret-scan.json` must report `PASS` with zero unauthorized
occurrences. Validate a bundle before transferring it:

```text
node tools/testing/run-phase13-evidence.mjs validate .artifacts/phase13-evidence/<bundle>
```

When multiple hosts are available, reconcile only validated bundles:

```text
node tools/testing/run-phase13-evidence.mjs reconcile \
  .artifacts/phase13-evidence/<windows-11-bundle> \
  .artifacts/phase13-evidence/<linux-bundle> \
  .artifacts/phase13-evidence/<macos-bundle> \
  --output .artifacts/phase13-evidence/reconciliation.json
```

Reconciliation rejects invalid bundles, duplicate target rows, different Git
HEADs, differing source fingerprints, dirty/source-mismatched execution, and
different acceptance-definition hashes. It requires a passing `windows-11-x64` row and at least one passing
`linux-<architecture>` and `macos-<architecture>` row. Windows 10 is retained
as `windows-10-x64` legacy/optional evidence under the current platform policy;
it is not allowed to masquerade as Windows 11 or to block the primary Windows
11 classification. Reconciliation never mutates
`docs/product/ACCEPTANCE_MATRIX.md` or OKF registries.

## Acceptance-to-evidence mapping

| Acceptance | Required execution | Bundle evidence |
|---|---|---|
| AC-P13-002 | Real pinned Chromium authentication fixture, including launch, BrowserContext, fixture navigation, and clean close | `tests/browser/session.test.ts` and the browser-focused command record |
| AC-P13-008 | Cookie, localStorage, IndexedDB, close, fresh restored context, protected fixture, and unsupported sessionStorage behavior | `tests/browser/session.test.ts` and `runtime.json` |
| AC-P13-012 | Real Chromium Service Worker fixture in `block` and explicit `allow` modes | `tests/browser/service-worker-policy.test.ts` and the browser-focused command record |
| AC-P13-016 | Passing browser, Secret Store/filesystem/SQLite quality gates, and Electron smoke on the required native rows | `matrix-entry.json`, per-host bundles, and validated reconciliation |
| AC-P12-001 / 006 / 015 | Same real headed and fresh-context Session evidence, with documentation retaining the limitation until it passes | `tests/browser/session.test.ts`, `acceptance-results.json`, and this matrix |

## Native platform matrix

The authoritative policy makes Windows 11 x64 the primary target, Windows 10
legacy/optional, and Linux/macOS compatibility targets that require explicit
evidence. A generic hosted Windows Server image must be recorded as its actual
Windows version and cannot be labeled Windows 11. The runner derives Windows
10/11 from the actual build, records Linux distribution metadata when
available, and records macOS product version through `sw_vers`.

Run the same command without platform-specific test logic on:

| Target | Required host | Current result |
|---|---|---|
| `windows-11-x64` | Approved Windows 11 x64 physical host, VM, or self-hosted runner | Pending external execution |
| `windows-10-x64` | Approved Windows 10 x64 host, legacy/optional | Pending external execution |
| `linux-<architecture>` | Approved Linux host; distribution is recorded and not invented by the runner | Pending external execution |
| `macos-<architecture>` | Approved macOS host; architecture is recorded from the host | Current macOS arm64 row is blocked by missing Chromium/Electron |

The presence of the current macOS host proves neither its Browser nor its
Electron acceptance until the repository-owned runtimes launch successfully.

## Current host result

On 2026-08-10 at Git HEAD
`5881707927131085032707a9e69b27ccb73bd750`, the runner classified the host as
`ENVIRONMENT_BLOCKED`: macOS 14.2.1 / Darwin 23.2.0 / arm64 was native, but
the Chromium manifest and executable were absent, Electron 43.2.0 had no
downloaded macOS binary, and npm was `12.0.2` outside the declared npm 11
range. A pre-commit diagnostic bundle was recorded at
`.artifacts/phase13-evidence/2026-08-10T19-15-35-661Z-588170792713`.
It was written and validated; its source fingerprint matched the manifest, but
the pre-commit tree was dirty, so the bundle remained non-promotable. The
artifact secret scan found zero unauthorized occurrences, and no acceptance
row was promoted to `PASS`.

The canonical next action is to run the same command on an approved host after
provisioning the exact locked runtimes, preserve the bundle directory, then
validate and reconcile bundles from a common Git HEAD.
