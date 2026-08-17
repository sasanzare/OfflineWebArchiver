# Offline Web Archive Builder

Offline Web Archive Builder is a portable desktop application foundation for creating authorized offline archives. Product Phases 13 and 14 are complete on the accepted native Windows 11 x64 baseline: Phase 13 supplies architecture/security hardening and Phase 14 supplies versioned Login Flow/Locator contracts, a temporary native Element Picker, and visible single/segmented OTP participation. Product Phase 15 supplies proxy metadata/health/affinity, Product Phase 16 supplies the bounded Worker Pool and shared rate-limit scheduler, Product Phase 17 supplies the explicit-asset downloader, content deduplication, resumable storage, and canonical path safety boundary, Product Phase 18 supplies deterministic HTML/CSS rewriting plus Route, Original Resource, and External Dependency maps with atomic derived output, and Product Phase 19 supplies selective GET capture, deterministic replay, strict-offline enforcement, and a map-bounded loopback Local Runtime. The independent Phase 9 discovery prerequisite remains absent, so Phases 17–19 consume explicit descriptors and mappings and do not claim automatic site discovery.

The current product release targets **Windows 11 x64**. Windows 10 is a
legacy/compatibility target and is non-blocking for the current release. Linux
and macOS remain future-version targets; the portable architecture and Core
abstractions are retained for that future work, but those platforms are not
current Phase 13 acceptance gates.

Current versions are application/workspaces `0.8.0`, transport contract `1.11.0`, Project format `1.1.0`, Project schema `13`, SQLite schema `13`, Asset pipeline contract `1`, Worker Pool contract `1`, Queue state machine `2`, Render Engine `1`, Browser Context profile `1`, Interaction Profile `1`, Interaction Trace `1`, Secret Reference `1`, Session metadata/storage-state/affinity `1`, Crawl Run state `1`, Replay/Offline policy `1`, API Capture contract `1`, Local Runtime contract `1`, Service Worker policy `1`, Canonical Path policy `1`, Locator contract `1`, Login Flow contract `1`, Element Picker contract `1`, OTP policy `1`, Vault `1`, Encryption Envelope `1`, HTML Rewrite contract `1`, Route Map `1`, External Dependency Map `1`, and Original Resource Map `1`, alongside Playwright `1.56.1` and Chromium `141.0.7390.37` revision `1194`. The interaction surface is bounded and approved-plan-only; the Secret Store, Session, OTP, proxy, scheduler, Asset, and replay body surfaces are metadata/content-addressed and use privileged protected storage. Phone and OTP values are ephemeral and are not persisted or emitted in results, logs, traces, screenshots, diagnostics, or reports. Without Phase 9 it does not discover or enqueue links. Phase 17 accepts explicit Asset descriptors through an injected scheduler-bound network adapter, Phase 18 consumes completed mappings without downloading unresolved resources, and Phase 19 captures only sanitized JSON-like GET responses and serves only map-approved runtime resources.

## Safety and authorization

Use is limited to websites the user is authorized to archive. The product does not bypass access controls, challenges, or rate limits. Project input, Checkpoints, URLs, recovery reports, and output paths are untrusted and bounded. Lease verification uses a SHA-256 digest in `job_leases`; active owner credentials retained by the Phase 6 compatibility/idempotency ledgers make the Project database sensitive. Tokens are never logged or displayed by inspection/UI/list commands, and protected writes enforce Project/Run/Job ownership, token, active Lease, expiry, and current Fencing Generation.

## Workspace

```text
apps/desktop             isolated Electron Project/Queue/Recovery/Render UI
apps/cli                 internal Project/Queue/Recovery/Browser/Render CLI
packages/archive-core    GUI/platform-independent models and ports
packages/browser-runtime Playwright/Chromium lifecycle and interception adapter
packages/rendering       browser-independent Render policy and orchestration
packages/recovery        pure Lease/Checkpoint/Recovery/partial-file policy
packages/queue           pure Queue state/idempotency policy
packages/persistence-sqlite  SQLite schema 13, Asset/replay repositories, response bodies, and file store
packages/application-service use-case and ownership orchestration
packages/contracts       runtime-validated contract 1.10.0
packages/secrets         encrypted Secret Store adapters and sensitive-data policy
```

Use Node 24 and npm 11:

```text
npm install
npm run typecheck
npm run build
npm run lint
npm run test
npm run test:unit
npm run test:integration
npm run test:concurrency
npm run test:process-kill
npm run test:recovery
npm run test:browser
npm run test:rendering
npm run test:architecture
npm run contracts:check
npm run migrations:validate
npm run queue:validate
npm run recovery:validate
npm run checkpoint:validate
npm run browser:install
npm run browser:verify
npm run browser:info
npm run render:validate
npm run test:secrets
npm run secret-store:validate
npm run vault:validate
npm run diagnostics:validate
npm run test:secret-leakage
npm run security:check
npm run docs:validate
npm run okf:validate
```

CLI examples:

```text
npm run project -- recovery inspect D:\Archives\example --run <run-uuid> --json
npm run project -- recovery recover D:\Archives\example --run <run-uuid> --confirm --idempotency-key recovery-001
npm run project -- run pause D:\Archives\example --run <run-uuid>
npm run project -- checkpoint list D:\Archives\example --run <run-uuid> --job <job-uuid>
npm run project -- browser validate --json
npm run project -- render start D:\Archives\example --run <run-uuid> --job <job-uuid> --owner local-renderer
npm run project -- interaction profile show D:\Archives\example
npm run project -- interaction plan validate D:\Archives\example plan.json --profile profile.json
npm run project -- interaction trace list D:\Archives\example --run <run-uuid> --job <job-uuid>
npm run project -- session open D:\Archives\example --login-url https://example.test/login --validation-url https://example.test/account --origin https://example.test
npm run project -- session save D:\Archives\example --session <session-uuid> --confirm
npm run project -- session restore D:\Archives\example --session <session-uuid> --json
```

Run `npm run project -- --help` for all Project/Profile/Scope/Queue/Recovery/Run/Lease/Checkpoint/Browser/Render/Interaction/Session commands. `npm run dev:desktop` opens the local UI. The renderer receives only the approved two-method bridge and never receives Playwright or raw Browser, filesystem, SQL, or process access. Browser installation is an explicit provisioning action; normal launch never downloads or falls back to system Chrome. Manual Login keeps credentials inside the visible website; Session Save requires explicit validation and stores only protected Storage State through the Phase 11 Secret Store. Interaction execution requires a service-supplied approved plan and never accepts raw typed text on the transport boundary.

## Documentation

- [Phase 8 implementation report](docs/project/PHASE_08_IMPLEMENTATION_REPORT.md)
- [Browser Runtime](docs/architecture/BROWSER_RUNTIME.md)
- [Rendering Engine](docs/architecture/RENDERING_ENGINE.md)
- [Render stability](docs/architecture/RENDER_STABILITY.md)
- [Security review](docs/architecture/PHASE_08_SECURITY_REVIEW.md)
- [Human-Paced Interaction architecture](docs/architecture/BROWSER_INTERACTION.md)
- [Phase 10 implementation report](docs/project/PHASE_10_IMPLEMENTATION_REPORT.md)
- [Phase 11 implementation report](docs/project/PHASE_11_IMPLEMENTATION_REPORT.md)
- [Phase 12 implementation report](docs/project/PHASE_12_IMPLEMENTATION_REPORT.md)
- [Phase 13 implementation report](docs/project/PHASE_13_IMPLEMENTATION_REPORT.md)
- [Phase 14 OTP Flow and Element Picker report](docs/project/PHASE_14_OTP_FLOW_ELEMENT_PICKER.md)
- [Phase 17 Asset Downloader report](docs/project/PHASE_17_IMPLEMENTATION_REPORT.md)
- [Phase 18 HTML Rewriter report](docs/project/PHASE_18_IMPLEMENTATION_REPORT.md)
- [Phase 19 API Capture/Replay and Local Runtime report](docs/project/PHASE_19_IMPLEMENTATION_REPORT.md)
- [Phase 13 native evidence execution matrix](docs/project/PHASE_13_EVIDENCE_EXECUTION_MATRIX.md)
- [Post-Phase-12 baseline audit](docs/project/POST_PHASE_12_BASELINE_AUDIT.md)
- [Phase 13 security review](docs/architecture/PHASE_13_SECURITY_REVIEW.md)
- [Phase 14 security review](docs/architecture/PHASE_14_SECURITY_REVIEW.md)
- [Asset Downloader architecture](docs/architecture/ASSET_DOWNLOADER.md)
- [Phase 17 security review](docs/architecture/PHASE_17_SECURITY_REVIEW.md)
- [Phase 18 HTML Rewriter architecture](docs/architecture/HTML_REWRITER.md)
- [Phase 18 security review](docs/architecture/PHASE_18_SECURITY_REVIEW.md)
- [Phase 18 ADR](docs/project/adr/ADR-061-html-rewriter-route-and-dependency-maps.md)
- [Phase 19 Network Replay architecture](docs/architecture/NETWORK_REPLAY.md)
- [Phase 19 Local Runtime architecture](docs/architecture/LOCAL_RUNTIME.md)
- [Phase 19 security review](docs/architecture/PHASE_19_SECURITY_REVIEW.md)
- [Phase 19 ADR](docs/project/adr/ADR-062-api-capture-replay-and-isolated-runtime.md)
- [Authentication Sessions architecture](docs/architecture/AUTHENTICATION_SESSIONS.md)
- [Secret Store architecture](docs/architecture/SECRET_STORE.md)
- [Phase 11 security review](docs/architecture/PHASE_11_SECURITY_REVIEW.md)
- [Phase 10 security review](docs/architecture/PHASE_10_SECURITY_REVIEW.md)
- [Acceptance matrix](docs/product/ACCEPTANCE_MATRIX.md)
- [Canonical Google OKF v0.2 knowledge](okf/index.md)
- [OKF maintainer guide](docs/okf-conformance/MAINTENANCE_GUIDE.md)
- [Current OKF structure](docs/okf-conformance/CURRENT_STRUCTURE.md)
- [Archived OKF history](docs/archive/okf/README.md)
- [Current handoff](HANDOFF.md)

## Open Knowledge Format

The repository uses Google Open Knowledge Format v0.2. The official Bundle is
under [`okf/`](okf/index.md); OfflineWebArchiver extensions are under
[`okf-extension/`](okf-extension/README.md); validator tooling is under
[`tools/okf/`](tools/okf/README.md); focused tests are under
[`tests/okf/`](tests/okf/); and active maintainer documentation is under
[`docs/okf-conformance/`](docs/okf-conformance/MAINTENANCE_GUIDE.md).

Official conformance and OWA policy validation are separate. Run the official
check with `npm run okf:validate:conformance`; run the complete OWA policy
surface with `npm run okf:validate`; and run focused regressions with
`npm run test:okf`. The broader documentation, format, lint, type, test, and
build gates are `npm run docs:validate`, `npm run format:check`, `npm run lint`,
`npm run typecheck`, `npm run test`, and `npm run build`.

The archive at [`docs/archive/okf/`](docs/archive/okf/README.md) contains
non-authoritative bootstrap and migration history. It is not active
configuration. Indexes and registries are maintained inputs, not generated
OKF artifacts. See the [maintainer guide](docs/okf-conformance/MAINTENANCE_GUIDE.md)
for the ownership boundaries, source/provenance workflow, CI behavior, and
review checklist. Hosted CI execution and branch protection are not claimed as
verified from the local repository.

The clean committed Windows 11 x64 Phase 13 gate and Phase 14 revalidation both pass. Phase 15 is implemented and validated within its declared proxy boundary; Phase 16 is implemented and locally validated within its Worker Pool/rate-limit boundary; Phase 17 is implemented and locally validated within its explicit-asset, scheduler-bound downloader boundary; Phase 18 is implemented and locally validated within its deterministic rewrite/map and atomic derived-output boundary; Phase 19 is implemented and locally validated within its selective capture/replay, strict-offline, and map-bounded Local Runtime boundary. Linux and macOS native validation remains future-version work and is non-blocking for the current release. Product Phase 9 remains a separate prerequisite for full discovery/crawl behavior; Product Phase 10 must not be marked complete until that prerequisite and its evidence exist. Application Service preview orchestration, exact clean-HEAD promotion, Phase 20 hardening/reporting, and authorized target-site acceptance remain later gates.
