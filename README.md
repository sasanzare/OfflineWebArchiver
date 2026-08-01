# Offline Web Archive Builder

Offline Web Archive Builder is a portable desktop application foundation for creating authorized offline archives. Product Phase 8 is complete: the monorepo now includes an owned Playwright/Chromium Browser Runtime, deterministic Context/Page lifecycle, queued single-Job rendering, combined DOM/network stability, final rendered HTML and optional screenshot artifacts, safe browser evidence, and Browser/Page crash recovery integrated with Phase 7 Leases, Heartbeats, Fencing, Checkpoints, Pause, and Resume.

Current versions are application/workspaces `0.8.0`, transport contract `1.5.0`, Project format `1.1.0`, SQLite schema `6`, Queue state machine `2`, Render Engine `1`, Browser Context profile `1`, Playwright `1.56.1`, and Chromium `141.0.7390.37` revision `1194`. Phase 8 renders only an already approved queued Page Job; it does not discover or enqueue links, download production assets, rewrite HTML, capture APIs, authenticate, use proxies, or create a full crawl/archive.

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
packages/persistence-sqlite  SQLite schema 6 and repositories
packages/application-service use-case and ownership orchestration
packages/contracts       runtime-validated contract 1.5.0
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
```

Run `npm run project -- --help` for all Project/Profile/Scope/Queue/Recovery/Run/Lease/Checkpoint/Browser/Render commands. `npm run dev:desktop` opens the local UI. The renderer receives only the approved two-method bridge and never receives Playwright or raw Browser, filesystem, SQL, or process access. Browser installation is an explicit provisioning action; normal launch never downloads or falls back to system Chrome.

## Documentation

- [Phase 8 implementation report](docs/project/PHASE_08_IMPLEMENTATION_REPORT.md)
- [Browser Runtime](docs/architecture/BROWSER_RUNTIME.md)
- [Rendering Engine](docs/architecture/RENDERING_ENGINE.md)
- [Render stability](docs/architecture/RENDER_STABILITY.md)
- [Security review](docs/architecture/PHASE_08_SECURITY_REVIEW.md)
- [Acceptance matrix](docs/product/ACCEPTANCE_MATRIX.md)
- [Canonical OKF](okf/README.md)
- [Current handoff](HANDOFF.md)

The exact next phase is **Product Phase 9 — Link Discovery and SPA Support**.
