# Offline Web Archive Builder

Offline Web Archive Builder is a planned portable desktop application for creating authorized, navigable offline archives of modern websites. Product Phase 6 is complete: the production monorepo now combines the portable Project/SQLite foundation, versioned Site Profile and Scope Engine, and a durable Page Job queue with deterministic identity, ordering, atomic claims, token-fenced terminal writes, retries, history, statistics, CLI operations, Desktop inspection, and canonical OKF evidence.

The application/workspaces are `0.6.0`, transport contract is `1.3.0`, Project format is `1.1.0`, SQLite schema is `4`, Site Profile/Scope Engine are `1`, and Queue state/priority policies are `1`. Queue persistence does not mean pages are crawled: there is no website request, DNS dispatch, browser rendering, link discovery, Lease, Heartbeat, Checkpoint, stale-processing recovery, or real crawler.

## Safety and authorization

Use is limited to websites the user is authorized to archive or for which another valid legal basis exists. The product does not bypass access controls, challenges, or rate limits. Project, ZIP, Profile, URL, Queue, and result input is untrusted and bounded. Credential-bearing URLs fail closed; sensitive URL/error/result values are redacted; SQL stays behind parameterized repository methods; and Project/Run/Profile plus claim-token ownership is enforced.

## Workspace

```text
apps/
  desktop/              Isolated Electron Project/Profile/Scope/Queue UI
  cli/                  Internal Project/Profile/Scope/Queue CLI
packages/
  archive-core/         GUI/platform-independent models and repository ports
  scope-engine/         Profile schema and pure URL/scope policy
  queue/                Pure state, priority, retry, idempotency, redaction policy
  project-format/       Portable manifest/version/path contract
  persistence-sqlite/   SQLite schema 4, migrations, repositories, files/ZIP/locks
  application-service/ Use-case and ownership orchestration
  contracts/            Runtime-validated transport contract 1.3.0
  platform/             Platform/configuration adapter
  observability/        Structured logging and redaction
  test-support/         Test-only deterministic fixtures
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
npm run test:architecture
npm run contracts:check
npm run project-format:validate
npm run migrations:validate
npm run scope:validate
npm run scope:golden
npm run queue:validate
npm run queue:state-machine
npm run security:check
npm run docs:validate
npm run okf:validate
```

CLI examples:

```text
npm run project -- project create D:\Archives\example --name "Example" --slug example
npm run project -- profile create D:\Archives\example --name "Example scope" --seed https://example.com/
npm run project -- scope explain D:\Archives\example https://example.com/docs --json
npm run project -- queue enqueue D:\Archives\example https://example.com/docs --run <run-uuid> --profile-revision <profile-revision-uuid> --idempotency-key enqueue-docs-001
npm run project -- queue list D:\Archives\example --run <run-uuid> --state pending --json
npm run project -- queue stats D:\Archives\example --run <run-uuid>
```

Run `npm run project -- queue --help` for all Queue commands and limits. `npm run dev:desktop` opens the local UI. Desktop paths come from main-process native selection grants; the renderer receives no filesystem or SQLite primitive. Controlled Queue actions simulate future workers but never crawl a target.

## Documentation

- [Production architecture](docs/architecture/README.md)
- [Persistent Queue](docs/architecture/PERSISTENT_QUEUE.md)
- [Job state machine](docs/architecture/JOB_STATE_MACHINE.md)
- [Queue persistence](docs/architecture/QUEUE_PERSISTENCE.md)
- [Phase 6 security review](docs/architecture/PHASE_06_SECURITY_REVIEW.md)
- [Phase 6 implementation report](docs/project/PHASE_06_IMPLEMENTATION_REPORT.md)
- [Acceptance matrix](docs/product/ACCEPTANCE_MATRIX.md)
- [Phase plan](docs/project/PHASE_PLAN.md)
- [Risks and decisions](docs/project/RISK_REGISTER.md)
- [Canonical OKF](okf/README.md)
- [Current handoff](HANDOFF.md)

Canonical `okf/` is synchronized through Product Phase 6. `okf-bootstrap/` remains historical governance/migration evidence. The exact next phase is **Product Phase 7 — Checkpoint, Lease, and Crash Recovery**; it must preserve Phase 6 idempotency and state invariants.
