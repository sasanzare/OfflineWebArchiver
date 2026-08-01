# Product Phase 2 Spike Promotion Review

The intact `spikes/phase-02-feasibility/` tree remains isolated historical evidence. No production manifest, source, build, or test imports it. “Adapt” means reimplement the evidenced concept behind the Phase 3 contract and security rules; it does not mean copy the spike.

| Spike path | Classification | Reason | Security impact | Production destination | Required changes | Related ADR | Future phase |
|---|---|---|---|---|---|---|---|
| `src/shared/contracts.ts`, `src/shared/ipc.ts` | Adapted concept | Typed IPC proved feasible | Spike types lacked version/runtime validation | `packages/contracts`, desktop adapter | Strict envelopes, version/rejection/correlation tests | ADR-003, ADR-004 | P3 complete |
| `src/main/index.ts`, `src/preload/index.ts` | Adapted concept | Isolation and narrow bridge passed | Privileged boundary must fail closed | `apps/desktop` | Sender/frame/URL allowlist; deny navigation, permissions, downloads, webviews; bundle preload | ADR-003, ADR-005 | P3 complete |
| `src/renderer/*` | Replaced | Spike UI was workflow-specific feasibility output | Renderer must not receive privilege | `apps/desktop/src/renderer` | English architecture-only UI, CSP, no remote content, validate response | ADR-002, ADR-004 | P3 shell; final UI P19 |
| `src/spike/browser.ts` | Retained only | Playwright/Chromium feasibility and artifact problems are valuable evidence | Untrusted target/browser lifecycle is not Phase 3 approved | None | New supported-version/artifact policy and production browser adapter | ADR-002, ADR-006 | P7; OD-027 |
| `src/spike/workflow.ts` | Retained only | Demonstrated an end-to-end synthetic slice | Contains later crawl/render/archive behavior | None | Rebuild as approved Core use cases after policy/persistence foundations | ADR-002 | P5–P10 |
| `src/spike/servers.ts` | Retained only | Fixture and loopback archive servers proved routing feasibility | Network origin, traversal, containment need separate threat model | None | Production runtime contract, origin policy, hostile-content tests | ADR-003 | P11 |
| `src/spike/archive.ts`, `src/spike/paths.ts` | Retained only | Atomic writes/relative paths informed requirements | Fixture-specific cleanup is not safe production rewriting | None | Parser decision, portable Project/storage contracts, adversarial corpus | ADR-002 | P4, P9–P10; OD-012 |
| `src/spike/errors.ts`, `src/spike/logger.ts` | Adapted concept | Safe stage/correlation reporting was useful | Raw values could leak without a contract/redaction policy | `contracts`, `observability`, `application-service` | Stable error taxonomy, JSON events, recursive redaction | ADR-007 | P3 complete |
| `fixtures/spa/*` | Retained test evidence | Deterministic JS/lazy/history fixture supported P2 claims | Synthetic content is not a hostile corpus | None yet | Version fixtures and add adversarial/performance coverage | ADR-006 | P7–P10 |
| `tests/unit/*`, `tests/integration/*` | Retained only | Prove the spike, not production boundaries | Reusing them could overstate production coverage | `tests/` contains new tests | Test public packages, negative boundaries, real CLI/Electron | ADR-006 | P3 complete; future suites later |
| `scripts/electron-smoke.mjs` | Adapted concept | Hidden real-runtime smoke is high-value | Must assert isolation and narrow bridge | `tests/electron/desktop-smoke.test.ts` | Invoke production bundle, parse structured report, assert privileges | ADR-006 | P3 complete |
| `scripts/run-tests.mjs`, `clean.mjs`, `copy-static.mjs` | Replaced | Spike-local lifecycle does not own production outputs | Clean must target only owned paths | `tools/build`, `tools/testing` | Workspace references, safe explicit output cleanup | ADR-001, ADR-005 | P3 complete |
| `scripts/install-browser.mjs`, `assert-browser.mjs`, `process-env.mjs` | Retained only | Record regional download/runtime lessons | Direct downloader workarounds cannot define supply-chain policy | None | Approved source/cache, checksum/provenance, empty-cache and clean-host tests | ADR-006 | P7/P21–P25; OD-027 |
| `scripts/verify-package.mjs`, `run-packaged-smoke.mjs`, `generate-dependency-report.mjs` | Retained only | Package inspection/restricted-PATH smoke demonstrated useful gates | Not release-grade signing/SBOM/license/clean-host proof | None | Rebuild against production packaging and release policy | ADR-001, ADR-006 | P21–P25 |
| `electron-builder.yml` | Retained only | One unsigned Windows unpacked spike was produced | No signing/update/installer/platform authority | None | Production packaging ADR, SBOM/licenses/signing and OS matrices | ADR-001 | P21–P25 |
| `package.json`, `package-lock.json`, `tsconfig.json` | Retained only | Exact P2 environment must remain reproducible | Old browser/tool pins cannot leak into production | Root/workspace files are new | Current exact pins, no Playwright production dependency, strict refs/exports | ADR-001, ADR-005 | P3 complete |
| `README.md`, `DEPENDENCIES.md`, `THIRD_PARTY_NOTICES.md`, generated evidence | Preserved evidence | Captures commands, versions, licenses, outcomes, limitations | Must not be mistaken for current production/release authority | Linked from OKF P2 record | Keep immutable-in-scope; supersede claims only with new evidence | ADR-008 | Historical / P25 review |

## Product Phase 8 promotion review

The following review uses the required Phase 8 classifications. All promoted ideas were independently reimplemented behind production ports; no production package imports `spikes/`.

| Reviewed Phase 2 component | Classification | Product Phase 8 disposition |
|---|---|---|
| Browser executable path resolution | promote-after-review | Rewritten as manifest-relative, root-contained, checksum-verified resolution in `browser-runtime` |
| Playwright browser installation strategy | rewrite | Explicit repository provisioning with exact pin; no global cache/system fallback/normal-launch download |
| Chromium packaging structure | promote-after-review | Repository-owned development/test root plus documented packaged-resource root |
| Browser launch options | rewrite | Minimal headless launch, explicit Sandbox, no arbitrary flags/profile/debugging |
| Chromium Sandbox configuration | promote-after-review | `chromiumSandbox: true`; no `--no-sandbox` |
| Local fixture server | rewrite | New bounded test-support server with explicit exact-origin loopback exception |
| Navigation handling | rewrite | `domcontentloaded`, timeouts, CDP pre-dispatch authorization, redirect/final-scope validation |
| Render marker handling | promote-after-review | Optional bounded selector combined with DOM/network quiet; never sole readiness evidence |
| HTML extraction | promote-after-review | Final DOM extraction through Browser Runtime port with size/blank checks |
| Console recording | rewrite | warning/error-only, redacted, globally bounded structured evidence |
| Network failure recording | rewrite | bounded safe GET/HEAD metadata without headers or bodies |
| Screenshot support | promote-after-review | opt-in viewport PNG with size limit, portable path, SHA-256 |
| Browser cleanup | rewrite | Page/Context finally cleanup, Process shutdown/recycle/restart policy, crash classification |
| Error sanitization | rewrite | versioned Render error codes and redacted contract boundary |
| Electron smoke integration | retain-as-reference | Phase 8 uses the existing production isolated Desktop smoke, not spike code |
| Spike archive/rewrite/local runtime | defer | Assets, rewriting, and offline runtime remain future phases |
| Spike crawl/discovery workflow | discard | It is not a production Phase 8 design and no discovery/enqueue was copied |

Production promotion result: Product Phase 8 now contains reviewed Browser Runtime and Rendering packages plus real production-boundary tests. The Phase 2 tree remains unchanged historical evidence. Link discovery, asset download, archive rewriting, loopback offline serving, and release packaging remain outside the Phase 8 production graph.
