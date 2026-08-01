# Offline Web Archive Builder

Offline Web Archive Builder is a portable desktop application foundation for creating authorized offline archives. Product Phase 7 is complete: the monorepo now includes durable SQLite Job Leases, Heartbeats and explicit renewal, monotonic Fencing Generation, versioned Job/Run/Artifact Checkpoints, cooperative Pause/Resume, bounded idempotent Crash Recovery, execution-session detection, completed-output verification, and a partial-file recovery policy with a local HTTP Range fixture.

Current versions are application/workspaces `0.7.0`, transport contract `1.4.0`, Project format `1.1.0`, SQLite schema `5`, Queue state machine `2`, and Recovery/Checkpoint/Lease configuration models `1`. Product Phase 7 does not include website requests, DNS dispatch, browser rendering, link discovery, a production Asset Downloader, a Worker Pool, authentication, proxies, or a real crawler.

## Safety and authorization

Use is limited to websites the user is authorized to archive. The product does not bypass access controls, challenges, or rate limits. Project input, Checkpoints, URLs, recovery reports, and output paths are untrusted and bounded. Lease verification uses a SHA-256 digest in `job_leases`; active owner credentials retained by the Phase 6 compatibility/idempotency ledgers make the Project database sensitive. Tokens are never logged or displayed by inspection/UI/list commands, and protected writes enforce Project/Run/Job ownership, token, active Lease, expiry, and current Fencing Generation.

## Workspace

```text
apps/desktop             isolated Electron Project/Queue/Recovery UI
apps/cli                 internal Project/Queue/Recovery CLI
packages/archive-core    GUI/platform-independent models and ports
packages/recovery        pure Lease/Checkpoint/Recovery/partial-file policy
packages/queue           pure Queue state/idempotency policy
packages/persistence-sqlite  SQLite schema 5 and repositories
packages/application-service use-case and ownership orchestration
packages/contracts       runtime-validated contract 1.4.0
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
npm run test:architecture
npm run contracts:check
npm run migrations:validate
npm run queue:validate
npm run recovery:validate
npm run checkpoint:validate
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
```

Run `npm run project -- --help` for all Project/Profile/Scope/Queue/Recovery/Run/Lease/Checkpoint commands. `npm run dev:desktop` opens the local UI. The renderer receives only the approved two-method bridge; controlled owner mutations may carry an ephemeral token through that validated bridge, but the token is never rendered, logged, listed, or included in recovery reports. The renderer has no filesystem primitive or raw SQL access.

## Documentation

- [Phase 7 implementation report](docs/project/PHASE_07_IMPLEMENTATION_REPORT.md)
- [Crash Recovery](docs/architecture/CRASH_RECOVERY.md)
- [Job Leases](docs/architecture/JOB_LEASES.md)
- [Checkpoint model](docs/architecture/CHECKPOINT_MODEL.md)
- [Security review](docs/architecture/PHASE_07_SECURITY_REVIEW.md)
- [Acceptance matrix](docs/product/ACCEPTANCE_MATRIX.md)
- [Canonical OKF](okf/README.md)
- [Current handoff](HANDOFF.md)

The exact next phase is **Product Phase 8 — Browser Lifecycle and Rendering Engine**.
