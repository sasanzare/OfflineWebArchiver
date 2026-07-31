# Product Phase 2 Feasibility Report

**Status:** Fully complete against the Product Phase 2 completion gate  
**Clean-machine evidence:** `PARTIAL` — controlled local simulation only  
**Evidence date:** 2026-07-31  
**Scope:** Experimental spike only; production architecture is not finalized

## Executive summary

The required `Electron → Playwright Chromium → local SPA → rendered DOM → saved
HTML → loopback runtime → Electron preview → packaged Windows run` slice works.
The unpacked Windows x64 package launched with `PATH` reduced to
`C:\Windows\System32` and browser downloads disabled. It used the Chromium
executable under its own `resources/playwright-browsers/` directory, required no
system Node.js or system browser, stopped the source fixture before preview, and
completed with zero console errors and zero failed requests.

The result supports proceeding to Product Phase 3 with conditions. It does not
approve the spike's process boundaries, npm, TypeScript, Electron, Playwright,
electron-builder, Node HTTP server, fixture serializer, or package layout for
production. A clean Windows image, supported-browser update strategy, signing,
antivirus, long/Unicode path, permission, compressed-size, and full license/SBOM
review remain open.

## Questions tested and results

| Question | Result | Evidence |
|---|---|---|
| Can Electron launch? | `VERIFIED` | Development and packaged Electron smoke tests passed. |
| Can Electron start a separate Playwright Chromium? | `VERIFIED` | Chromium 141.0.7390.37 launched from the isolated browser directory. |
| Can Chromium be bundled? | `VERIFIED` | Package inspection found `resources/playwright-browsers/chromium-1194/chrome-win/chrome.exe`. |
| Can Playwright render a JavaScript SPA? | `VERIFIED` | Real integration exercised `/`, `/products`, and `/products/example-item`. |
| Can the spike detect completion? | `VERIFIED` for the fixture | Explicit marker, expected delayed content/lazy image, and a 350 ms DOM quiet window passed. |
| Can final HTML be extracted and saved? | `VERIFIED` | Script-free rendered HTML and metadata were written through temporary files and promoted into a unique Run directory. |
| Are stored paths portable? | `VERIFIED` for spike output | Tests and package run found only archive/resource-relative paths in stored metadata. |
| Can a loopback runtime serve it? | `VERIFIED` | `127.0.0.1`, port `0`, explicit MIME types, SPA fallback, and traversal rejection passed. |
| Is the result offline from the source origin? | `VERIFIED` | Source port was closed before preview; Electron preview made no request to it. |
| Does packaged execution work without system Node? | `VERIFIED` by controlled simulation | Packaged process passed with a restricted `PATH`; embedded Electron Node was 24.18.0. |
| Does packaged execution work without system Chromium? | `VERIFIED` by controlled simulation | Exact bundled executable was detected and launched; system fallback is absent. |
| Does it work on a truly clean host? | `PARTIAL` | No Windows Sandbox, clean VM, or separate clean machine was available. |

## Environment and versions

| Item | Observed value | Classification |
|---|---|---|
| Host OS | Windows 25H2, build 26200.8875 (`Microsoft Windows NT 10.0.26200.0`) | Development/package host only |
| Architecture | `win32` / `x64` | Verified package target |
| Development Node.js | 24.17.0 | Development only |
| Development npm | 11.17.0 | Provisional spike package manager |
| Packaged Electron | 43.2.0 | Experimental |
| Packaged Electron Node.js | 24.18.0 | Embedded runtime |
| Electron Chromium | 150.0.7871.129 | Electron UI/preview engine only |
| Playwright | 1.56.1 | Experimental pin |
| Playwright Chromium | 141.0.7390.37, revision 1194 | Separate archive-rendering browser |
| electron-builder | 26.15.3 | Experimental build tool |
| TypeScript | 7.0.2 | Experimental compiler |
| `@types/node` | 24.13.3 | Development only |

Playwright 1.56.1 was selected after current lines redirected their matched
Chrome-for-Testing artifacts to a Google endpoint that returned a location-based
access denial on this host. The selected release is the last inspected stable
line whose exact matched Chromium artifact was available from Microsoft's
official Playwright CDN. This is a feasibility workaround, not a production
version recommendation. Product Phase 3 must establish a current-browser update
and artifact-mirroring policy before adopting this stack.

## Workflow exercised

1. Electron loaded only the local packaged renderer.
2. The renderer invoked one allowlisted preload method.
3. Main created a unique Run workspace and started a deterministic SPA fixture on
   `127.0.0.1` with an OS-selected port.
4. Playwright resolved its executable from the configured isolated browser root,
   launched one separate Chromium browser with `chromiumSandbox: true`, and
   allowed requests only to the fixture origin.
5. The page loaded delayed JSON, navigated the two History API routes, rendered a
   delayed component, scrolled the lazy image into view, set its completion
   marker, and satisfied a bounded DOM quiet window.
6. The final DOM was cloned, scripts and inline event attributes were removed,
   and fixture assets were materialized with relative references.
7. Metadata, route, console, network, log, and summary files were written
   atomically under a unique Run ID.
8. Chromium and its context closed; the fixture server stopped; a socket probe
   confirmed the old origin port was unavailable.
9. A new archive server bound to `127.0.0.1` on another dynamic port.
10. A sandboxed Electron preview loaded the archived route and allowed requests
    only to that archive origin.

## Successful paths

- Development build and strict type-check passed.
- All 18 unit/integration assertions passed using the real local Chromium path.
- Electron smoke passed with the exact five-method bridge allowlist and exact
  nine requested progress stages.
- The Windows x64 unpacked package built and passed structural inspection.
- Packaged execution passed with downloads disabled and a restricted `PATH`.
- Final package contained no Git metadata, `.env`, pasted prompt file, or
  stand-alone `node.exe` according to the package verifier.
- Runtime traversal test returned `403` for encoded parent traversal.
- Stored evidence contained no full environment dump and no absolute browser
  path; browser locations were development/package-relative.

## Failed paths and recovered experiments

- Playwright 1.62.0 and 1.61.1 browser installation failed because the current
  Chrome-for-Testing path ultimately reached a Google storage endpoint that
  returned `403 AccessDenied` for this location; Playwright CDN names also failed
  local DNS resolution.
- Playwright 1.56.1's matched Microsoft-hosted artifact was reachable only after
  a direct-DNS workaround. Chromium revision 1194, FFmpeg 1011, and winldd 1007
  were downloaded over hostname-verified TLS. Observed SHA-256 values were
  `bc65aed7bded748e267bd4d5d21f19459fa6e47464370a923fb6d87ebb22d7fb`,
  `8d08827c019ad36e7b9d49d3648447d884534cb2acf200e71c715f6dd834cc50`,
  and `0069f0d11d4ad6df068a068c003d22fe7dbec192a47bba64b2e115e9c8ce41d8`.
  These are observed hashes, not an upstream checksum claim.
- Electron's npm postinstall fetch failed through Node networking. The exact
  GitHub release ZIP was downloaded separately and matched the SHA-256 embedded
  in Electron's own `checksums.json`. electron-builder later also downloaded and
  extracted Electron successfully during packaging.
- Node's default test-file process isolation failed with sandbox `spawn EPERM`.
  Node 24's `--test-isolation=none` ran the independent tests in process.
- The final idempotent `npm run browser-install` exited successfully but
  Playwright's optional Windows host-dependency probe warned `spawn EPERM` in
  the restricted shell. Real Chromium integration, Electron, and package runs
  outside that restriction passed with the explicit Chromium sandbox enabled.
- The first Electron run exposed a multi-file sandboxed preload incompatibility;
  the preload was made self-contained and the real Electron security smoke then
  passed.
- The original broad absolute-drive regex matched `http://`; the test was fixed
  to require a token boundary before a drive letter.

## Browser packaging findings

electron-builder copies only the spike application files into `app.asar` and
uses `extraResources` for the isolated `.playwright-browsers` directory and SPA
fixture. Development resolves Chromium through Playwright with
`PLAYWRIGHT_BROWSERS_PATH=<spike>/.playwright-browsers`; packaged mode resolves
the same supported Playwright executable under
`resources/playwright-browsers`. The application refuses a missing or
out-of-root executable and has no system-Chrome fallback or first-launch
download path.

The verifier measured:

- package: 738,865,971 bytes / 704.64 MiB;
- browser resource tree: 364,499,058 bytes / 347.61 MiB;
- package files: 335;
- browser files: 256.

This is an unpacked, unsigned experiment. It is not a portable release candidate,
installer, compressed download measurement, or Product Phase 21 claim.

## Electron and Playwright compatibility

Electron 43.2.0 and Playwright 1.56.1 coexist in one package while using separate
Chromium engines: Electron's 150 engine for the trusted app/preview surfaces and
Playwright's 141 build for rendering. The separation worked but doubles browser
footprint and creates independent patch/update obligations. No native Node addon
was introduced, so this spike did not test ABI rebuild behavior relevant to a
future SQLite selection.

## Local runtime findings

The built-in Node HTTP implementation was sufficient for one archive root and a
known SPA fallback. It bound only to `127.0.0.1`, requested an ephemeral port,
rejected traversal after decoding, emitted explicit MIME types, and stopped with
the application. It has no external control API and receives no arbitrary path
from the renderer. This does not decide the production Local Application Service
boundary, authentication, multi-project concurrency, cache policy, or hostile
archive isolation model.

## Clean-machine findings

`verify:packaged-run` removed every inherited `PATH` entry and set only
`C:\Windows\System32`, disabled Playwright downloads, and launched the packaged
executable from `dist/win-unpacked`. The workflow passed without invoking a
global Node, Playwright, Chrome, or Chromium executable. No Windows administrator
elevation or installation service was used.

This is controlled local simulation, not clean-machine evidence. Clean-machine
status is therefore `PARTIAL`. Final confirmation requires Windows Sandbox or an
approved clean Windows x64 VM with prohibited tools absent, external networking
blocked/observed, and non-admin execution recorded.

## Performance and memory observations

The latest packaged restricted-`PATH` run measured:

| Measurement | Value | Collection method |
|---|---:|---|
| Electron process start to workflow invocation | 365 ms | `performance.now()` in Electron main, recorded when workflow began |
| SPA render/capture duration | 2,260 ms | Workflow monotonic timer around browser capture |
| Total workflow duration | 4,232 ms | Workflow monotonic timer from workspace start through validated preview |
| Workflow-host RSS | 86.44 → 123.97 MiB | `process.memoryUsage()` at workflow start/end |
| Workflow-host heap used | 4.02 → 21.84 MiB | `process.memoryUsage()` at workflow start/end |
| Electron process-tree working set after completion | 475.57 MiB total | Sum of one-time `app.getAppMetrics()` working sets: Browser, GPU, Utility, two Tabs |

These values are one sample on the named host. They are not performance budgets,
benchmarks, peaks, or statistically repeatable thresholds. The Playwright
Chromium process had closed before the Electron process-tree snapshot, so its
peak memory is unknown.

## Security observations

- Main and preview windows used `contextIsolation: true`,
  `nodeIntegration: false`, `sandbox: true`, and `webSecurity: true`.
- The separate Playwright Chromium launch explicitly used
  `chromiumSandbox: true`; the spike does not add `--no-sandbox`.
- Renderer inspection reported both `require` and `process` as `undefined`.
- The preload exposed only `getRuntimeInfo`, `onProgress`, `openOutput`,
  `reopenPreview`, and `run`; raw IPC was not exposed.
- Main validates the IPC sender and source frame. Window opens, unexpected
  navigation, permissions, and downloads are denied.
- Browser capture aborts any request outside the synthetic fixture origin.
- Preview requests are restricted to its unique archive origin.
- Both servers use loopback and dynamic ports. Traversal is rejected and roots
  are main-process-owned.
- No credentials, private target, authentication, telemetry, upload, proxy,
  CAPTCHA, stealth, or dynamic evaluation capability exists.
- The fixture-specific script stripping/CSP is not sufficient for arbitrary
  hostile archives and must not be promoted as the production security model.

## Dependency, license, and maintenance observations

Exact dependency metadata is in
[`spikes/phase-02-feasibility/DEPENDENCIES.md`](../../spikes/phase-02-feasibility/DEPENDENCIES.md).
Direct Electron, Playwright, electron-builder, TypeScript, and Node type license
files were inspected from their installed package roots. The package preserves
the spike notice plus Electron and Chromium license resources.

Final `npm audit --omit=dev` and full `npm audit` checks both reported zero
vulnerabilities. No automatic or forced upgrade was applied. This is a
time-bound registry result, not a production security approval. The older
Chromium pin and all build/runtime dependencies still require a supported-version
policy and review before production adoption or distribution.

## Known limitations

- One deterministic synthetic SPA is not framework breadth or target fidelity.
- The completion marker and fixture-aware asset copy are test conveniences, not
  general readiness, crawling, asset capture, or HTML rewriting.
- Only one browser, context, page, and sequential route path were exercised.
- The runtime handles one active archive and is not authenticated for a broader
  service/control surface.
- No clean Windows image, ARM64, Linux, macOS, long/Unicode/read-only path,
  low-disk, browser crash, antivirus, SmartScreen, signing, installer, update, or
  compressed-package test was performed.
- Package size is high and includes two Chromium engines.
- Playwright/Chromium was pinned below current because of artifact distribution
  availability; update/support policy is unresolved.
- Browser installation from an empty cache was not reproducible through this
  host's ordinary DNS/proxy route; standard commands are documented and became
  idempotent after official artifacts were provisioned.
- Process-tree memory is a single post-workflow sample and excludes Playwright
  Chromium peak usage.
- Dependency licenses were inventoried, not given legal approval; transitive
  license/SBOM review remains incomplete.
- The package is unsigned and experimental.

## Risks discovered or changed

- `R-001`: 704.64 MiB unpacked size and 347.61 MiB Playwright browser footprint
  materially confirm the package-size risk.
- `R-002`: Electron and Playwright worked together, but two independent Chromium
  versions confirm update/compatibility complexity.
- `R-003`: controlled no-system simulation passed; clean/locked-down Windows,
  paths, permissions, and AV remain unverified.
- `R-010`: one memory sample exists, but Playwright peak/concurrency remains
  unknown.
- `R-032`/`R-033`: the unsigned artifact was not subjected to reputation,
  antivirus, signing, or installer validation.
- `R-038`: browser binary availability and region/DNS policy can break otherwise
  pinned, reproducible installs.
- `R-039`: build-tool advisories and browser patch age create supply-chain risk
  before production adoption.
- `R-040`: incomplete transitive license/SBOM review can block redistribution.

## Decisions required before Product Phase 3 implementation

Phase 2 adds evidence but resolves no production decision:

- `OD-003`: Windows x64 worked on one current host; the supported matrix remains
  open.
- `OD-006`: measured values are baselines only; budgets remain open.
- `OD-009`: preload IPC plus internal loopback worked; final service/process and
  authentication boundaries remain open.
- `OD-010`: npm worked locally; package-manager authority remains open.
- `OD-011`: the isolated single package gives no reason to add monorepo tooling;
  the real workspace decision remains Phase 3.
- `OD-012`: browser DOM serialization worked for the fixture; production parser
  and rewriter remain open.
- `OD-013`: no SQLite/native addon was tested; the persistence decision remains
  open.
- `OD-021`: the spike is unsigned; signing ownership/budget remains open.
- `OD-024`: committed source fixture with no framework build worked; general
  fixture-build policy remains open.
- `OD-026` and `OKF-OD-*`: Phase 2 provides real record samples, but canonical
  OKF activation and schemas remain Phase 3 decisions.
- New decision evidence is required for the supported Playwright/Electron update
  cadence, browser artifact mirroring, and package-size strategy.

## Recommendation

**Proceed to Product Phase 3 with conditions.**

The completion gate's 17 items are supported: packaged execution, intended
bundled Chromium, no-system-runtime simulation, critical tests, documentation,
risk/decision updates, and OKF evidence exist, and no later-phase feature was
implemented. Product Phase 3 must treat clean-machine validation as partial,
address the old-browser/artifact-distribution and dependency-governance risks, define
the real architecture and versioned contracts, and preserve this directory only
as experimental evidence.
