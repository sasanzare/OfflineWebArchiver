# Offline Web Archive Builder

Offline Web Archive Builder is a planned portable desktop application for creating navigable offline archives of authorized modern, JavaScript-rendered websites. Product Phase 3 is complete: the production monorepo, package boundaries, versioned contracts, secure Electron shell, CLI shell, architecture smoke, enforcement tooling, and canonical OKF now exist.

The only implemented production capability is `system.describe`. It traverses Desktop or CLI -> Local Application Service -> Archive Core and reports minimal non-sensitive architecture/runtime facts. Crawling, Project/database persistence, browser automation/rendering, authentication/OTP/session storage, proxies, archive generation/rewriting, offline archive serving, final UI, and release packaging are not implemented. The exact next phase is Product Phase 4 — Portable Project and SQLite Foundation.

The initial delivery target remains portable Windows. Linux and macOS packages and a cross-platform versioned Project format remain planned and must be proven in their assigned phases. All application UI, reports, validation output, errors, and bundled user documentation are English.

## Safety and authorization

Use is limited to websites the user is authorized to archive or for which another valid legal basis exists. The product will not bypass access controls, CAPTCHA, WAF challenges, rate limits, or `Retry-After`; forge browser fingerprints; intercept SMS; or collect public proxy lists. Proxies must be user-owned or authorized and must not be used to evade restrictions. Passwords and OTP values must never be persisted.

## Production workspace

```text
apps/
  desktop/              Secure Electron shell and IPC adapter
  cli/                  Internal diagnostic CLI
packages/
  archive-core/         GUI/transport-independent domain boundary
  application-service/ Use-case orchestration and error translation
  contracts/            Runtime-validated contract 1.0.0
  platform/             Minimal platform/configuration adapter
  observability/        Structured logging and redaction
  test-support/         Test-only deterministic fixtures
```

Install and validate with Node 24 and npm 11:

```text
npm install
npm run typecheck
npm run build
npm test
npm run test:architecture
npm run contracts:check
npm run security:check
npm run docs:validate
npm run okf:validate
```

Use `npm run dev:cli` for the CLI smoke and `npm run dev:desktop` for the local desktop shell. The Phase 2 spike under `spikes/phase-02-feasibility/` has its own historical instructions and is not a production dependency.

## Documentation

- [Production architecture](docs/architecture/README.md)
- [Project scope and requirements](docs/product/PROJECT_SCOPE.md)
- [Acceptance matrix](docs/product/ACCEPTANCE_MATRIX.md)
- [25-phase plan](docs/project/PHASE_PLAN.md)
- [Traceability](docs/project/TRACEABILITY.md)
- [Risk register](docs/project/RISK_REGISTER.md)
- [Open decisions](docs/project/OPEN_DECISIONS.md)
- [Project-wide Definition of Done](docs/project/DEFINITION_OF_DONE.md)
- [Product Phase 2 feasibility report](docs/project/PHASE_02_FEASIBILITY_REPORT.md)
- [Product Phase 3 architecture record](okf/phases/phase-03/PHASE_03_ARCHITECTURE_RECORD.md)
- [Current handoff](HANDOFF.md)

## Open Knowledge Format

[Canonical OKF](okf/README.md) is active as of Product Phase 3. It contains the versioned manifest, eight machine-readable registries, knowledge/phase/evidence/map records, schemas, semantic rules, and migration report. `npm run okf:validate` fails on invalid JSON/schema shape, duplicate IDs, statuses, mappings, paths, references, phases, unsupported absolute paths, unproven verified nodes, critical requirement orphans, or a missing Phase 3 change.

[OKF Phase 0 bootstrap](okf-bootstrap/README.md) is preserved as historical governance and migration evidence. Its proposed current structure is superseded, not deleted. Every Product Phase 4–25 must keep canonical OKF synchronized with source, configuration, schemas, contracts, security behavior, tests, builds, platform support, operations, risks, decisions, and evidence.

## Phase 2 evidence

Product Phase 2 — Technical Spike and Feasibility Proof — remains intact under [spikes/phase-02-feasibility](spikes/phase-02-feasibility/README.md). It demonstrated a bounded packaged Windows `Render -> Save -> Serve` slice under controlled local conditions. Clean-machine proof remained partial, and its Playwright/browser/runtime/packaging choices are not production architecture. The [promotion review](docs/architecture/SPIKE_PROMOTION_REVIEW.md) records every disposition.
