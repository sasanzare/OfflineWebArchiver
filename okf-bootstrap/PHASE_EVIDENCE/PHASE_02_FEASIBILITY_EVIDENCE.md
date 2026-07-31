# Product Phase 2 Feasibility Evidence

**Phase ID:** P02  
**Product phase number:** 2  
**Phase name:** Technical Spike and Feasibility Proof  
**Objective:** Prove the packaged `Electron → Playwright Chromium → local SPA →
rendered DOM → saved HTML → loopback runtime → Electron preview` path without a
system Node.js or browser dependency.  
**Evidence date:** 2026-07-31  
**Code status:** Experimental feasibility evidence; not production architecture  
**Final verification status:** `VERIFIED` for the Product Phase 2 completion
gate; clean-machine evidence is `PARTIAL`  
**Commit hash:** `NOT_COMMITTED`

## Initial repository state

- Branch `main`, HEAD `0abb7b1`, one prior commit.
- `README.md` was the only tracked working-tree modification.
- `HANDOFF.md`, all `docs/`, and `okf-bootstrap/` were untracked user work from
  Product Phase 1 and OKF Phase 0 and were preserved.
- The repository had documentation only: no package manifest, lockfile, source,
  dependency, executable test, build, package, runtime artifact, or canonical
  `okf/` directory.
- Canonical OKF remained intentionally absent; bootstrap governance was complete
  enough to record Phase 2.

## Spike directory

`spikes/phase-02-feasibility/`

The directory and its README state that it is disposable experimental evidence,
not the Product Phase 3 monorepo or production implementation.

## Changed knowledge domains

| Domain | Phase 2 change | Current status after Phase 2 |
|---|---|---|
| OKF-DOM-006 desktop-interface | Secure local Electron shell and narrow bridge observed | `PARTIAL` — spike behavior verified; production Desktop Interface planned |
| OKF-DOM-008 project-format | Relative-path/atomic Run output provides feasibility input only | `PLANNED` — no production Project format exists |
| OKF-DOM-012 browser-runtime | Separate Playwright browser lifecycle and owned path observed | `PARTIAL` — one pin/platform verified |
| OKF-DOM-013 rendering | Deterministic SPA marker/content/quiet-window capture observed | `PARTIAL` — fixture proof only |
| OKF-DOM-014 link-discovery | Two History routes and lazy content exercised | `PARTIAL` — no production discovery |
| OKF-DOM-024 html-rewriting | Rendered DOM plus fixture-specific cleanup/materialization observed | `PARTIAL` — production parser/rewriter remains blocked |
| OKF-DOM-026 offline-runtime | Loopback serve, traversal rejection, source shutdown, Electron preview observed | `PARTIAL` — provisional server only |
| OKF-DOM-029 security | Renderer/IPC/origin/path boundaries observed | `PARTIAL` — arbitrary hostile archive model remains planned |
| OKF-DOM-031 testing | Real unit, integration, Electron, package, and packaged-run tests added | `PARTIAL` — spike suite verified; product suite planned |
| OKF-DOM-032 packaging | Experimental unpacked Windows package produced/inspected | `PARTIAL` — unsigned non-release artifact |
| OKF-DOM-033 windows | Windows x64 restricted-`PATH` run observed | `PARTIAL` — clean matrix/VM evidence blocked |
| OKF-DOM-038 risks | Existing risks received measured evidence; R-038..040 added | `VERIFIED` register update; risks remain open |
| OKF-DOM-039 decisions | P2 evidence attached to OD-003/006/009..013/021/024/026; OD-027 added | `VERIFIED` register update; outcomes unresolved |
| OKF-DOM-040 phases | P02 completion/handoff recorded; P03 is next | `VERIFIED` phase-state record |
| OKF-DOM-041 evidence | Source/test/build/runtime/package records now exist | `PARTIAL` — manual bootstrap evidence, no canonical schema/validator |

All other implementation domains remain `PLANNED`, `BLOCKED`, `UNKNOWN`, or
owner-dependent. No spike package boundary is promoted to final architecture.

## Files created

### Experimental spike

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
- `spikes/phase-02-feasibility/src/renderer/index.html`
- `spikes/phase-02-feasibility/src/renderer/app.js`
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

### Documentation and governance

- `docs/project/PHASE_02_FEASIBILITY_REPORT.md`
- `docs/project/adr/ADR-EXP-001-PHASE-02-SPIKE-TOOLING.md`
- `docs/project/adr/ADR-EXP-002-PLAYWRIGHT-CHROMIUM-PACKAGING.md`
- `docs/project/adr/ADR-EXP-003-LOOPBACK-SPIKE-RUNTIME.md`
- `okf-bootstrap/PHASE_EVIDENCE/PHASE_02_FEASIBILITY_EVIDENCE.md`

## Files modified

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

No file was removed. Ignored browser/build/output/package artifacts were generated
under the spike and are not source records.

## Requirements and acceptance affected

**Requirements:** FR-PACKAGE-001, FR-RENDER-001..002,
FR-DISCOVERY-001, FR-ARCHIVE-001, FR-PROJECT-004, FR-RUNTIME-001..002,
NFR-PORT-001, NFR-SEC-003, NFR-TEST-001, NFR-KNOW-003.

**Phase-specific acceptance:** AC-P02-001..012 and AC-P02-014 passed;
AC-P02-013 is blocked because a truly clean host was unavailable. Production
AC-PORT-001 and AC-WINDOWS-001 remain `needs-decision`; the spike does not pass
them.

## Risks affected

- Measured evidence added to R-001, R-002, R-003, R-010, R-032, and R-033.
- R-038 added for binary artifact availability/reproducibility.
- R-039 added for build-tool advisories and stale browser security patches.
- R-040 added for incomplete transitive license/SBOM review.
- RISK-KNOW-001 received actual phase synchronization evidence but remains open.

No risk was closed or marked mitigated.

## Decisions affected

Evidence was added to OD-003, OD-006, OD-009, OD-010, OD-011, OD-012,
OD-013, OD-021, OD-024, and OD-026. OD-027 was added for the supported
Electron/Playwright/browser line, update cadence, and artifact-source policy.
All production outcomes remain unresolved.

## Experimental ADRs

- `ADR-EXP-001-PHASE-02-SPIKE-TOOLING.md`
- `ADR-EXP-002-PLAYWRIGHT-CHROMIUM-PACKAGING.md`
- `ADR-EXP-003-LOOPBACK-SPIKE-RUNTIME.md`

Each is `Status: Experimental`, `Scope: Product Phase 2 only`, and
`Production decision: Not finalized`.

## Dependencies and tooling

| Item | Exact version / method | Status |
|---|---|---|
| Package manager | npm 11.17.0, spike-local lockfile | Provisional |
| Build/compiler | TypeScript 7.0.2, CommonJS output | Provisional |
| Electron | 43.2.0 | Experimental |
| Electron embedded Node | 24.18.0 | Runtime observation |
| Electron embedded Chromium | 150.0.7871.129 | Runtime observation |
| Playwright | 1.56.1 | Experimental compatibility pin |
| Playwright Chromium | 141.0.7390.37, revision 1194 | Experimental owned browser |
| electron-builder | 26.15.3 | Experimental |
| Node types | 24.13.3 | Development only |

Final `npm audit --omit=dev` and full `npm audit` checks reported zero
vulnerabilities; no automatic or forced upgrade was applied. The complete
installed inventory is
`spikes/phase-02-feasibility/DEPENDENCIES.md`.

## Browser installation and packaging

**Normal installation method:** `npm run browser-install` invokes the local
Playwright CLI with `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers` and
`--no-shell`. Application startup sets download skipping and never installs.

**Observed host workaround:** current Playwright Chrome-for-Testing artifacts
were blocked by location/DNS policy. Official Microsoft-hosted Playwright 1.56.1
artifacts for Chromium 1194, FFmpeg 1011, and winldd 1007 were retrieved over
hostname-verified TLS with observed SHA-256 values recorded in the feasibility
report. Electron's official ZIP matched the checksum in its installed package.
This workaround is failed/recovered evidence, not the intended normal command.

**Development browser path:**
`.playwright-browsers/chromium-1194/chrome-win/chrome.exe`

**Packaged browser path:**
`resources/playwright-browsers/chromium-1194/chrome-win/chrome.exe`

**Packaging method:** electron-builder `files` allowlists compiled app/runtime
files; `extraResources` copies only the isolated browser tree, fixture, and
notices. Browser presence/containment is checked before packaging and package
contents are inspected afterward.

## Fixture description

A zero-dependency local SPA serves incomplete initial HTML, delayed JSON, a
delayed component, two History API navigation targets (`/products` and
`/products/example-item`), a scroll-triggered lazy SVG, and the deterministic
`body[data-render-state="complete"]` marker. It uses no remote API, CDN, font,
private data, authentication, or third-party code.

## Rendering and HTML evidence

- Real Chromium visited all three expected routes.
- Capture waited for the marker, exact delayed text, lazy-image loaded state, and
  a bounded 350 ms DOM quiet window.
- Final HTML contained `Example Item archived state`, `Catalog loaded: 2 items`,
  `Delayed component ready`, and `data-loaded="true"`.
- Scripts and inline event attributes were absent from saved HTML.
- Unique Run IDs, metadata, route map, console/network evidence, JSONL log, and
  summary were written through temporary files before final promotion.
- Stored browser/archive locations were relative, not developer absolute paths.

## Offline server and preview evidence

- The fixture bound `127.0.0.1` on an OS-selected port and stopped after capture.
- A socket connection confirmed the source port was unavailable.
- The archive server bound `127.0.0.1` on a different dynamic port.
- Encoded traversal returned `403`; expected SPA route returned the archive.
- A sandboxed Electron preview rendered expected content.
- Preview request evidence contained no source-fixture origin request and no
  failed request.

## Packaged execution and clean-machine evidence

`dist/win-unpacked/` was produced and structurally verified. The latest packaged
run set `PATH` to only `C:\Windows\System32`, disabled browser downloads, and
passed with:

- Electron 43.2.0 / embedded Node 24.18.0 / Electron Chromium 150.0.7871.129;
- Playwright Chromium 141.0.7390.37 from packaged resources;
- original fixture unavailable;
- expected offline content visible;
- zero console errors and zero failed requests.

This verifies no-system-Node/browser behavior by controlled local simulation.
No truly clean image was available, so clean-machine evidence is `PARTIAL`, not
passed. Required final environment: Windows Sandbox or approved clean Windows
x64 VM, non-admin user, no prohibited runtimes, network observation/blocking,
and retained environment manifest/recording.

## Tests added and executed

- Four unit files cover metadata/atomic writes, sanitization/error categories,
  containment/Run IDs/browser detection, route/MIME/traversal behavior.
- Two integration files cover fixture/archive servers and the real
  Playwright-to-offline workflow.
- Electron smoke exercises real main/preload/renderer IPC, exact bridge methods,
  exact nine progress stages, security settings, and final preview.
- Package verification inventories required/prohibited files, exact browser
  executable, architecture, size, and counts.
- Packaged smoke exercises the real package under restricted `PATH` with
  downloads off.

Final relevant results:

| Command | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm test` | 18/18 assertions passed; 0 skipped |
| `npm run test:electron` | Passed all bridge/progress/security/offline checks |
| `npm run build` | Passed |
| `npm run package:windows` | Passed; unpacked x64 directory produced |
| `npm run verify:package` | Passed; 335 files, no prohibited findings |
| `npm run verify:packaged-run` | Passed under restricted `PATH`, downloads disabled |
| `npm audit --omit=dev` | Passed; 0 vulnerabilities |
| `npm audit` | Passed; 0 vulnerabilities |

Earlier failed executions and their causes are retained in the feasibility
report; none is presented as a passing test.

## Build and runtime observations

**Build commands:** `npm ci`, `npm run browser-install`, `npm run typecheck`,
`npm run build`, `npm test`.

**Packaging commands:** `npm run package:windows`, `npm run verify:package`,
`npm run verify:packaged-run`.

**Artifact:** `spikes/phase-02-feasibility/dist/win-unpacked/` (ignored).

**Measured latest packaged run:** 365 ms Electron process start to workflow
invocation; 2,260 ms render; 4,232 ms total workflow; 704.64 MiB unpacked
package; 347.61 MiB browser tree.

**Memory:** workflow-host RSS 86.44 → 123.97 MiB and heap 4.02 → 21.84 MiB;
post-workflow Electron tree working-set snapshot 475.57 MiB. This one-time sample
excludes the already-closed Playwright browser peak and is not a budget.

## Security impact

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and
  `webSecurity: true` observed.
- Separate Playwright Chromium launched with `chromiumSandbox: true`; no
  `--no-sandbox` override is configured by the spike.
- `require` and `process` were `undefined` in the renderer.
- Five named preload methods only; no raw IPC or file/shell API.
- IPC sender/frame checks, denied window opens/navigation/permissions/downloads.
- Browser and preview request origin restrictions.
- Loopback-only dynamic ports and main-owned path roots.
- Traversal rejection, sanitized user errors/logs, no environment dump.
- No secrets, private target, authentication, telemetry, upload, proxy, CAPTCHA,
  stealth, or dynamic evaluation.

Arbitrary archived content remains untrusted. Fixture-specific script removal and
CSP do not close the future runtime-security requirement.

## Known limitations, unknowns, and blocked validation

- `BLOCKED`: truly clean Windows execution, antivirus/SmartScreen, signing, and
  approved Windows matrix.
- `UNKNOWN`: compressed size, Playwright browser peak memory, concurrency/scale,
  ARM64, Linux/macOS, long/Unicode/read-only paths, low disk, crash recovery.
- `UNKNOWN`: production readiness/stability strategy, parser/rewriter, asset
  pipeline, service authentication/process boundary, persistence/SQLite.
- `UNKNOWN`: supported current browser/tool update and artifact-mirror policy.
- `PARTIAL`: fresh-clone browser installation scripts exist, but empty-cache
  download was blocked on this host and required official-artifact provisioning.
- `PARTIAL`: the final idempotent browser-install command succeeded but its
  optional Windows host-dependency probe warned `spawn EPERM` in the restricted
  shell; real Chromium launch checks passed outside that restriction.
- `PARTIAL`: license inventory/notices exist; full transitive legal/SBOM approval
  does not.
- The package is unsigned, unpacked, and experimental.

## Documentation-code conflicts

No unresolved code/document conflict remains within the spike after validation.
The earlier Phase Plan wording required an approved clean image for the P2 gate,
while the accepted P2 brief permits controlled local no-system simulation but
requires clean-machine evidence to remain partial. The Phase Plan was updated to
separate P2 completion from the still-blocked clean-host acceptance instead of
claiming a clean run.

Production documentation remains intentionally stricter: AC-PORT-001,
AC-WINDOWS-001, hostile archive containment, and final package/platform criteria
are not passed by this spike.

## Migration considerations for Product Phase 3

- Preserve the entire spike as experimental evidence; do not copy source into
  production without explicit code/security/dependency review.
- Use Phase 2 records as sample inputs for canonical phase/evidence schemas.
- Resolve or formally defer OD-009..013, OD-026, OD-027 and relevant platform,
  signing, size, security, and license decisions.
- Establish actual repository/package ownership and versioned Core, Service,
  Desktop UI, and CLI contracts before production implementation.
- Define browser/runtime artifact provenance, update, rollback, and clean-cache
  CI evidence.
- Create canonical `okf/` only through the P3 migration, validation, rollback,
  and ownership gate; preserve bootstrap history.

## Handoff summary

Product Phase 2 completion gate is satisfied by executable development and
packaged evidence. Clean-machine evidence remains `PARTIAL`; production decisions
remain open. Recommended next phase is **Product Phase 3 — Architecture,
Monorepo, and Layer Contracts**, with conditions documented in the feasibility
report. No Product Phase 3 work, commit, push, tag, or deployment occurred.
