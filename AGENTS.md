# OfflineWebArchiver Repository Guide

## Purpose and boundaries

Offline Web Archive Builder is a local, authorized archiving monorepo. Keep domain policy in `packages/archive-core`, browser lifecycle and Playwright access in `packages/browser-runtime`, orchestration in `packages/application-service`, persistence in `packages/persistence-sqlite`, and transport/UI adapters in `packages/contracts`, `apps/cli`, and `apps/desktop`.

## Validation

Use Node 24 and npm 11. Discover current scripts in the root `package.json`; the principal gates are `npm run typecheck`, `npm run build`, `npm run test`, `npm run lint`, `npm run format:check`, `npm run security:check`, `npm run docs:validate`, and the relevant `npm run okf:*` validators. Do not weaken prior security or architecture checks to make Phase work pass.

## Protected areas and documentation

Preserve existing user changes and do not commit, push, reset, clean, or change branches unless explicitly requested. Treat browser authentication state, leases, tokens, project databases, and Secret Store payloads as sensitive. Use `HANDOFF.md` for continuation state, `docs/project/` and `docs/architecture/` for authoritative project records, `okf/` for the Google OKF v0.2 bundle, and `okf-extension/` for project-specific evidence and registries. Update affected knowledge and `HANDOFF.md` with every substantial implementation milestone.
