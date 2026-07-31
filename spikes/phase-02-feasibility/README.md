# Product Phase 2 Feasibility Spike

> **Experimental only. This is not production architecture, the production
> crawler, or the final Windows application.** Product Phase 3 must review the
> evidence before creating real packages, contracts, or canonical OKF.

## Objective

Prove this one vertical slice on Windows:

```text
Electron → Playwright-managed Chromium → local synthetic SPA → stable DOM →
final HTML → atomic archive output → loopback-only server → Electron preview
```

The packaged proof must carry Electron, Playwright, and Chromium and must not use
system Node.js or a system browser.

## Scope and non-goals

The spike contains one secure-by-default Electron shell, one deterministic local
SPA, one rendered-DOM capture path, fixture-aware archive materialization, one
minimal loopback server, automated tests, and an unpacked Windows x64 package.
It does not implement production Core, a monorepo, SQLite, queues, recovery,
authentication, proxies, target crawling, asset downloading, general HTML
rewriting, API replay, the final UI, installer/signing, or another platform.

## Experimental architecture

```text
local Electron UI
  → allowlisted preload IPC
  → spike workflow in Electron main
      → loopback fixture server
      → separate Playwright Chromium process
      → unique atomic archive directory
      → loopback archive server
  → sandboxed Electron archive preview
```

The application UI loads only packaged local files. The archive preview has no
preload bridge and loads only its run's `127.0.0.1` origin.

## Directory structure

```text
fixtures/spa/        synthetic source fixture
src/main/            Electron lifecycle and allowlisted IPC
src/preload/         narrow context bridge
src/renderer/        experimental English UI
src/spike/           rendering, archive, servers, logging, errors
tests/               unit and real local integration tests
scripts/             install/build/test/package/verification helpers
.playwright-browsers generated Playwright browser files (ignored)
build/               compiled application/tests (ignored)
dist/                Windows package and verification output (ignored)
output/              development/test run evidence (ignored)
```

## Requirements

- Windows x64 for the packaged proof.
- Node.js 24.x and npm 11.x for development only.
- Network access only while installing npm packages and Chromium.
- No administrator access is intended or required by the documented commands.

The validated experimental pins are Electron 43.2.0, Playwright 1.56.1,
Playwright Chromium 141.0.7390.37 (revision 1194), electron-builder 26.15.3,
TypeScript 7.0.2, and `@types/node` 24.13.3. They are not production choices.

## Installation and browser installation

From this directory:

```powershell
npm ci
npm run browser-install
```

The first command is the reproducible dependency-install command and uses the
committed lockfile. `npm run dependencies:install` is an equivalent named helper
after `package.json` is present. Browser installation is an explicit development
step; application launch never downloads a browser.

Chromium is installed under `.playwright-browsers/`. The directory is generated,
ignored, and copied to `resources/playwright-browsers/` in the Windows package.
The selected Playwright version installs full Chromium with `--no-shell`; its
pinned FFmpeg and winldd support files remain in the same isolated directory.

This host required a DNS workaround to retrieve official artifacts. A normal
environment should use only `npm run browser-install`. If it fails, retain the
exact error, confirm the selected Playwright release's supported official host,
and do not substitute a system browser, global cache, or unrelated Chromium.

## Development, build, and tests

```powershell
npm run development
npm run typecheck
npm test
npm run test:electron
npm run build
```

The UI has one **Run feasibility proof** action and displays the stages:
Preparing fixture, Starting Chromium, Loading SPA, Waiting for rendered state,
Extracting HTML, Saving archive, Starting offline server, Opening offline preview,
and Completed.

## Windows packaging and verification

```powershell
npm run package:windows
npm run verify:package
npm run verify:packaged-run
```

The artifact is an experimental unpacked directory under `dist/win-unpacked/`.
It is not an installer or a Product Phase 21 portable-release claim.
`verify:packaged-run` starts the executable with a restricted `PATH`, disables
browser downloads, runs the real workflow through renderer IPC, and checks the
structured result. A real clean Windows environment remains the preferred proof.

The validated package was 704.64 MiB unpacked, including 347.61 MiB under the
Playwright browser resource tree. The restricted-`PATH` packaged run succeeded;
clean-machine status remains `PARTIAL` because no clean Windows image was used.

## Expected output

Each successful run creates an isolated unique directory:

```text
output/runs/<run-id>/
  archive/index.html
  archive/styles.css
  archive/lazy.svg
  archive/metadata.json
  runtime/routes.json
  evidence/console.json
  evidence/network-failures.json
  evidence/run-summary.json
  logs/events.jsonl
```

`output/latest.json` points to the latest successful Run ID. Generated output
contains archive-relative paths and sanitized browser-resource paths, never a
developer-machine absolute path or environment dump.

## Clean-machine checklist

1. Copy only `dist/win-unpacked/` to an approved clean Windows x64 environment.
2. Confirm Node.js, npm, Playwright, Chrome, and Chromium are absent from `PATH`.
3. Confirm no administrator elevation or installation service is active.
4. Disconnect external network access or monitor it; retain loopback networking.
5. Start `OfflineWebArchiveBuilderPhase02Spike.exe`.
6. Run the proof and confirm every UI stage completes.
7. Confirm the final page appears in the Electron preview.
8. Confirm the original fixture origin has stopped and cannot be reached.
9. Confirm no browser download or non-loopback request occurs.
10. Retain a sanitized environment manifest, timestamps, application report, and
    result. Without this run, clean-machine acceptance remains `PARTIAL`.

## Security notes

- Electron renderers use `contextIsolation: true`, `nodeIntegration: false`, and
  `sandbox: true`.
- The separate Playwright browser launch explicitly enables
  `chromiumSandbox: true`; no `--no-sandbox` override is added.
- Preload exposes named methods only; it does not expose raw Electron or generic
  send/on APIs. Main validates IPC senders.
- Both servers bind to `127.0.0.1` on dynamic ports. Archive requests reject
  decoded traversal and cannot choose an arbitrary root through renderer input.
- Preview navigation, new windows, permissions, downloads, and non-preview
  origins are denied.
- The generated archive removes fixture scripts and applies a restrictive CSP.
  This is fixture-specific and does not prove safe handling of arbitrary archives.
- No secrets, authentication, telemetry, real target, proxy, or upload exists.

## Known limitations

- The fixture-aware save step copies two known local assets and removes scripts;
  it is not production asset capture or standards-complete rewriting.
- One page, browser, context, and route sequence do not prove scale, framework
  breadth, crash recovery, target fidelity, or the Product Phase 7/8 gates.
- The local machine simulation cannot substitute for an approved clean VM.
- In this restricted workspace, Playwright's post-install Windows host check
  warns `spawn EPERM` even when browser installation succeeds; the real launch
  tests are the executable host check for this spike.
- Playwright 1.56.1 was chosen because this location denied the newer
  Chrome-for-Testing artifact route. Its Chromium version is not a production
  security baseline; an update/mirroring strategy is required before adoption.
- Final `npm audit --omit=dev` and full `npm audit` checks both reported zero
  vulnerabilities. This is a time-bound registry result, not production approval.
- The unpacked directory is unsigned and not antivirus/SmartScreen acceptance.
- The spike does not establish production process boundaries or package-manager,
  TypeScript, service, server, test, or builder choices.

## Troubleshooting

- `SPIKE_BROWSER_NOT_FOUND`: run `npm run browser-install`, then confirm the
  generated browser directory exists. The app will not fall back to Chrome.
- Browser launch failure: run `node scripts/assert-browser.mjs` and retain the
  sanitized error category; do not add `--no-sandbox`.
- Packaging failure: confirm `npm run build` and browser detection pass first.
- Runtime 403: the requested path was outside the archive root or contained
  traversal.
- Use `npm run clean` to remove only the spike's generated build, package, output,
  and browser directories after its printed containment check.
