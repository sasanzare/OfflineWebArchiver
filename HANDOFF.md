# Handoff

**Document status:** Product Phase 10 partial implementation handoff; Phase 9 prerequisite remains open

**Current branch:** `main`

**Product phase:** Product Phase 10 — Browser-Native and Human-Paced Interaction (`partially complete; Phase 9 gate not met`)

**OKF maintenance:** Phase 10 partial OKF extension and maintainer documentation (`validated`)

**Next product phase:** Product Phase 9 — Link Discovery and SPA Support (`required prerequisite; not started`)

**Last updated:** 2026-08-06

## Product Phase 10 foundation result

The repository now contains a browser-independent Interaction Profile/Plan/Trace model, deterministic seeded timing, bounded real Playwright input operations, explicit Cookie Banner/Dialog/Popup policies, redacted trace persistence, contract `1.6.0`, SQLite schema `7`, CLI validation/inspection commands, and real Chromium/unit/integration evidence. Popup and Dialog handler work is settled before a Trace snapshot, so asynchronous browser events cannot disappear from evidence. The profile defaults to disabled when absent, and the transport boundary excludes raw typed text.

This is a reusable Phase 10 foundation, not a complete Phase 10 result. The baseline does not contain the required Phase 9 Discovery Engine, so interaction-generated discovery, Queue deduplication through Phase 9, and the full Phase 9-to-10 integration gate remain unverified. The CLI `interaction run` surface also requires an approved plan provider supplied by the embedding service.

## Product Phase 8 result

Application/workspaces remain `0.8.0`; the current transport contract is `1.6.0`, SQLite schema is `7`, Render Engine is `1`, Browser Context profile is `1`, Interaction Profile is `1`, and Interaction Trace is `1`. Playwright Core `1.56.1` uses owned Chromium `141.0.7390.37` revision `1194`; its relative manifest and executable SHA-256 are validated with no normal-launch download or system fallback. Forward migration `007_add_browser_interaction` preserves migrations `001`–`006` and adds bounded Interaction Profile and Trace ledgers.

Rendering begins only from an approved queued Page Job. Application Service claims it with a Lease, creates one fresh deterministic Context/Page, persists fenced stages and Checkpoints, heartbeats/renews ownership, waits for combined DOM/network stability, extracts the final DOM, optionally captures one bounded PNG, and commits SHA-256-described artifacts and relational state. Every protected write revalidates Project/Run/Job/owner/token/generation/active/non-expired ownership.

One Application Service owns one reusable Browser Process and one active Job. The Process recycles after 100 pages or 30 minutes and is limited to three restarts per five minutes. Each Job gets a fresh non-persistent Context; popups close, downloads cancel, dialogs dismiss, permissions clear, service workers block, HTTPS verification remains enabled, and Chromium Sandbox is explicit.

CDP request interception permits only authorized GET/HEAD dispatch, revalidates redirects, resolves/classifies all DNS answers, blocks private/link-local/reserved targets, and grants loopback only to exact deterministic fixture origins in test mode. Evidence is redacted and bounded. Browser and Page crashes are separately classified, release ownership through a durable retry/failure transition, and are proven by actual Windows process termination.

## Evidence

Real Chromium tests cover static HTML, JavaScript DOM changes, SPA route state, bounded lazy scroll, continuous mutation, EventSource, blank content, navigation timeout, redirects, non-GET denial, safe console/page/request evidence, optional screenshot, result replay, Browser crash, and Page crash. Artifact fault injection covers file-before-database and database-after-commit boundaries. CLI and real Electron smoke retain the isolated contract boundary.

ADRs 041–048 are Accepted and ADR-049 records the partial Phase 10 foundation. AC-P08-001–017 and AC-P10-001–014/017 have direct evidence; AC-P10-015 remains partial and AC-P10-016 is blocked by the missing Phase 9 engine. The Phase 2 spike remains unchanged and isolated. Browser update cadence, cross-platform packaging, DNS rebinding, memory telemetry, screenshot retention, and Phase 9 discovery boundaries remain explicit risks/decisions.

The 2026-08-06 local validation snapshot is clean: `npm run test` passes
135/135 tests; focused suites pass unit 47/47, browser 8/8, integration 22/22,
concurrency 6/6, recovery 11/11, rendering 9/9, CLI 2/2, Electron 1/1,
process-kill 4/4, and OKF 43/43. Build, typecheck, format, lint, contracts,
Project format, migrations, Scope, Queue, Recovery, Browser, Render, security,
documentation, and all OKF validation layers pass.

## Known limitations

- Windows x64 Browser/process-kill behavior is verified; Linux/macOS browser provisioning and packaging are deferred.
- OS process memory and browser startup duration are not persisted; page-count and lifetime recycling are the current resource bounds.
- The production loopback exception is unavailable; deterministic fixture scrolling is test-only.
- Screenshot capture is opt-in, but long-term screenshot/evidence retention remains unresolved.
- No automatic Link/Sitemap/History API/React Router/button/pagination/infinite-scroll/JSON discovery or enqueue exists.
- No Phase 9 Discovery Engine or Phase 9 evidence exists in this baseline. The Phase 10 interaction foundation is present, but full discovery integration is not verified. Authentication/session, proxy, production Asset Downloader, HTML rewrite, API capture, and a full offline archive remain outside the implemented scope.

## Exact next product phase

**Product Phase 9 — Link Discovery and SPA Support.** It must extract only from the final rendered DOM and bounded client-side route observations, evaluate every candidate through the Phase 5 Scope Engine, enqueue accepted URLs through the Phase 6 Queue, preserve Phase 7 Lease/Recovery invariants, and then provide the missing prerequisite evidence for the Phase 10 interaction integration gate.

After Phase 9 and the remaining Phase 10 acceptance evidence are complete, the following phase is **Product Phase 11 — Secret Store and Sensitive Data Protection**. Phase 11 is not started here.

## OKF migration closure

The independent migration audit classified all 76 final artifacts, removed 58 obsolete compatibility Markdown paths, preserved 54 evidence records and 61 typed relationships, and reconciled the current 43 official Concepts. Official Google OKF v0.2 validation, OfflineWebArchiver metadata policy, extension integrity, knowledge quality, formatting, focused validator tests, and repository tests pass locally.

The only accepted exceptions are administrative: no hosted GitHub Actions run or branch-protection configuration was available as local evidence. Require `OKF Validation / OKF validation and quality gates` in branch protection and verify the next hosted run before reporting either control as verified. Use the [active maintainer guide](docs/okf-conformance/MAINTENANCE_GUIDE.md) for routine knowledge work; the completed migration reports remain in the [OKF archive](docs/archive/okf/README.md).

## References

- [Phase 8 implementation report](docs/project/PHASE_08_IMPLEMENTATION_REPORT.md)
- [Phase 10 implementation report](docs/project/PHASE_10_IMPLEMENTATION_REPORT.md)
- [Human-Paced Interaction architecture](docs/architecture/BROWSER_INTERACTION.md)
- [Phase 10 security review](docs/architecture/PHASE_10_SECURITY_REVIEW.md)
- [Phase 10 ADR](docs/project/adr/ADR-049-browser-native-human-paced-interaction.md)
- [Phase 8 canonical record](okf/history/phase-08.md)
- [Browser Runtime](docs/architecture/BROWSER_RUNTIME.md)
- [Phase 8 security review](docs/architecture/PHASE_08_SECURITY_REVIEW.md)
- [Active OKF maintainer guide](docs/okf-conformance/MAINTENANCE_GUIDE.md)
- [Current OKF structure](docs/okf-conformance/CURRENT_STRUCTURE.md)
- [Phase 5 cleanup report](docs/okf-conformance/PHASE_05_LEGACY_CLEANUP_AND_DOCUMENTATION.md)
- [Archived final OKF conformance report](docs/archive/okf/migration/FINAL_OKF_CONFORMANCE_REPORT.md)
