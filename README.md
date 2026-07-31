# Offline Web Archive Builder

Offline Web Archive Builder is a planned portable desktop application for creating authorized, navigable offline archives of modern websites. Product Phase 4 is complete: the production monorepo now implements a versioned portable Project directory, SQLite identity/lifecycle foundation, forward migrations and backup, atomic file promotion, bounded secure ZIP transfer, Project contracts, CLI commands, minimal Desktop flows, and synchronized canonical OKF.

Implemented commands are `system.describe` and `project.create/open/close/validate/export/import/info`. These are local filesystem operations only. URL normalization, authorization/scope policy, queues, crawling, browser rendering, authentication/OTP/session storage, proxies, captured content, rewriting, offline serving, final UX, release packaging, and target validation are not implemented. The exact next phase is **Product Phase 5 — Profile, Scope, and URL Normalization**.

## Safety and authorization

Use is limited to websites the user is authorized to archive or for which another valid legal basis exists. The product will not bypass access controls, CAPTCHA/WAF challenges, rate limits, or `Retry-After`; forge fingerprints; intercept SMS; or collect public proxies. Phase 4 performs no website request. Project/ZIP input is untrusted and bounded; exported Projects exclude secret-reserved directories by default.

## Production workspace

```text
apps/
  desktop/              Secure Electron Project UI and IPC/path-grant adapter
  cli/                  Internal Project/diagnostic CLI
packages/
  archive-core/         GUI/transport/SQLite-independent domain and Project port
  project-format/       Portable manifest/version/path contract
  persistence-sqlite/   Node SQLite, migrations, backups, atomic files, ZIP, locks
  application-service/ Use-case orchestration and error translation
  contracts/            Runtime-validated transport contract 1.1.0
  platform/             Minimal platform/configuration adapter
  observability/        Structured logging and redaction
  test-support/         Test-only deterministic fixtures
```

Use Node 24 and npm 11:

```text
npm install
npm run typecheck
npm run build
npm test
npm run test:architecture
npm run contracts:check
npm run project-format:validate
npm run migrations:validate
npm run security:check
npm run docs:validate
npm run okf:validate
```

CLI examples:

```text
npm run project -- project create D:\Archives\example --name "Example" --slug example
npm run project -- project validate D:\Archives\example --json
npm run project -- project export D:\Archives\example D:\Archives\example.zip
```

`npm run dev:desktop` opens the local Project UI. Desktop paths come from main-process native selection grants; renderer receives no filesystem or SQLite primitive. The Phase 2 spike at `spikes/phase-02-feasibility/` remains historical evidence and is not a production dependency.

## Documentation

- [Production architecture](docs/architecture/README.md)
- [Project format](docs/architecture/PROJECT_FORMAT.md)
- [SQLite and migrations](docs/architecture/SQLITE_PERSISTENCE.md)
- [Project lifecycle](docs/architecture/PROJECT_LIFECYCLE.md)
- [Import/export security](docs/architecture/PROJECT_IMPORT_EXPORT.md)
- [Phase 4 security review](docs/architecture/PHASE_04_SECURITY_REVIEW.md)
- [Phase 4 implementation report](docs/project/PHASE_04_IMPLEMENTATION_REPORT.md)
- [Scope and acceptance](docs/product/PROJECT_SCOPE.md)
- [Acceptance matrix](docs/product/ACCEPTANCE_MATRIX.md)
- [Phase plan](docs/project/PHASE_PLAN.md)
- [Risks and decisions](docs/project/RISK_REGISTER.md)
- [Canonical OKF](okf/README.md)
- [Current handoff](HANDOFF.md)

Canonical `okf/` is active and synchronized through Product Phase 4. `okf-bootstrap/` is preserved as historical governance/migration evidence. Every later phase must update source authorities, risks/decisions, evidence, relationships, phase/change records, and pass `npm run okf:validate`.
