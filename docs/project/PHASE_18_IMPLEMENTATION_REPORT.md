# Product Phase 18 — HTML Rewriter, Route Map, and Dependency Map

## Status

Phase 18 is **IMPLEMENTED/VALIDATED within the deterministic transformation,
explicit mapping, and atomic derived-output boundary**. The report does not
claim Phase 9 discovery, a production target-site run, Network Replay,
Strict Offline mode, Local Runtime serving, Service Worker runtime
enforcement, Phase 20 validation/reporting, or clean-HEAD release promotion.

## Delivered

- Archive Core rewrite contracts, mapping index, HTML tokenizer/serializer,
  base handling, internal page and stored Asset mapping, canonical provenance,
  srcset handling, special-scheme classification, and CSS url()/import rewrite.
- Deterministic Route Map generation with extensionless routes, trailing-slash
  policy, SPA fallback metadata, stable serialization, and collision records.
- Original URL to Local Resource mapping for Pages and completed Phase 17
  Assets.
- External Dependency Map generation with bounded provenance and explicit
  local, missing, external, blocked, unsupported, unresolved, and future-replay
  classifications.
- Separate atomic Persistence output at
  pages/<job-id>/rewritten-v1.html; the original rendered.html is retained.
- Deterministic rewriting fixtures and focused unit/integration tests.

## Phase 17 dependency gate

Phase 17 was usable at the Phase 18 starting HEAD. The repository contains
Asset source/content identity, SHA-256 content deduplication, Page↔Asset
provenance, scheduler-bound and fenced downloading, Range checkpoints,
atomic promotion, the shared Canonical Path contract, SQLite schema 12, and
the corresponding focused tests and documentation. No Critical or High
blocker was found that prevented safe Phase 18 integration. The Phase 18
adapter accepts only completed Phase 17 mappings with validated persisted
content paths.

## Architecture decisions

The implementation uses a bounded token-preserving scanner in Archive Core
because the repository had no HTML parser dependency and the transformation
must not execute archived content. The first effective original base is used
for resolution and removed from derived output. Canonical links remain
provenance metadata and do not define Route identity. Route/dependency maps are
pure versioned values and are serialized on demand; the derived HTML artifact
is separate and atomic.

## Version and migration state

No SQLite migration, Project Format bump, or transport contract bump was
necessary. Existing SQLite schema 12, Project format 1.1.0, transport
contract 1.11.0, and Asset pipeline contract 1 remain unchanged. New
in-memory/serialized contracts are HTML rewrite 1, Route Map 1, External
Dependency Map 1, and Original Resource Map 1. The output filename is
rewritten-v1.html and can be regenerated from the original artifact.

## Scope limits

CSS rewriting is an explicit API and does not fetch or recursively download
resources. Dynamic JavaScript URL construction is preserved. Phase 19 owns
API capture/replay, BrowserContext interception, strict offline enforcement,
Local Runtime isolation, loopback policy, and Service Worker runtime behavior.

## Validation record

Final validation on 2026-08-16 passed:

- Phase 18 focused: 9/9.
- Full regression: 211/211.
- Unit: 94/94; integration: 34/34; concurrency: 7/7; recovery: 11/11.
- Phase 17 regression: 7/7.
- Secret tests: 12/12; secret-leakage package run: 12/12.
- Typecheck, build, lint, format, architecture, contracts, migrations,
  Project Format, security, docs, OKF policy, and OKF conformance: PASS.
- Documentation validation: 158 required artifacts, 506 active relative links,
  and 98 readable archived Markdown files.
- Contracts: 67 commands plus response, error, and event envelopes.
- Migrations: 12 immutable migrations at schema 12.
- Project Format: 1.1.0 and 7 unsafe-path probes.

The focused command is npm run test:phase18. The repository test runner uses a
shared build directory, so separate test-runner commands were run serially.

## Related records

- [HTML Rewriter architecture](../architecture/HTML_REWRITER.md)
- [Phase 18 security review](../architecture/PHASE_18_SECURITY_REVIEW.md)
- [ADR-061](adr/ADR-061-html-rewriter-route-and-dependency-maps.md)
- [Phase 17 implementation report](PHASE_17_IMPLEMENTATION_REPORT.md)
- [Acceptance Matrix](../product/ACCEPTANCE_MATRIX.md)
- [Current handoff](../../HANDOFF.md)
