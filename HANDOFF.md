# Handoff

**Document status:** Product Phase 8 completion handoff

**Current branch:** `main`

**Product phase:** Product Phase 8 — Browser Lifecycle and Rendering Engine (`complete`)

**OKF migration:** Phase 8 final audit and cleanup (`complete_with_accepted_exceptions`)

**Next product phase:** Product Phase 9 — Link Discovery and SPA Support (`not started`)

**Last updated:** 2026-08-03

## Product Phase 8 result

Application/workspaces `0.8.0`, contract `1.5.0`, SQLite schema `6`, Render Engine `1`, and Browser Context profile `1` are implemented. Playwright Core `1.56.1` uses owned Chromium `141.0.7390.37` revision `1194`; its relative manifest and executable SHA-256 are validated with no normal-launch download or system fallback. Forward migration `006_add_browser_rendering_engine` preserves migrations 001–005 and adds Render Result, Event, and Failure ledgers.

Rendering begins only from an approved queued Page Job. Application Service claims it with a Lease, creates one fresh deterministic Context/Page, persists fenced stages and Checkpoints, heartbeats/renews ownership, waits for combined DOM/network stability, extracts the final DOM, optionally captures one bounded PNG, and commits SHA-256-described artifacts and relational state. Every protected write revalidates Project/Run/Job/owner/token/generation/active/non-expired ownership.

One Application Service owns one reusable Browser Process and one active Job. The Process recycles after 100 pages or 30 minutes and is limited to three restarts per five minutes. Each Job gets a fresh non-persistent Context; popups close, downloads cancel, dialogs dismiss, permissions clear, service workers block, HTTPS verification remains enabled, and Chromium Sandbox is explicit.

CDP request interception permits only authorized GET/HEAD dispatch, revalidates redirects, resolves/classifies all DNS answers, blocks private/link-local/reserved targets, and grants loopback only to exact deterministic fixture origins in test mode. Evidence is redacted and bounded. Browser and Page crashes are separately classified, release ownership through a durable retry/failure transition, and are proven by actual Windows process termination.

## Evidence

Real Chromium tests cover static HTML, JavaScript DOM changes, SPA route state, bounded lazy scroll, continuous mutation, EventSource, blank content, navigation timeout, redirects, non-GET denial, safe console/page/request evidence, optional screenshot, result replay, Browser crash, and Page crash. Artifact fault injection covers file-before-database and database-after-commit boundaries. CLI and real Electron smoke retain the isolated contract boundary.

ADRs 041–048 are Accepted; AC-P08-001–017 have direct evidence. The Phase 2 spike remains unchanged and isolated. Browser update cadence, cross-platform packaging, DNS rebinding, memory telemetry, screenshot retention, and Phase 9 discovery boundaries remain explicit risks/decisions.

## Known limitations

- Windows x64 Browser/process-kill behavior is verified; Linux/macOS browser provisioning and packaging are deferred.
- OS process memory and browser startup duration are not persisted; page-count and lifetime recycling are the current resource bounds.
- The production loopback exception is unavailable; deterministic fixture scrolling is test-only.
- Screenshot capture is opt-in, but long-term screenshot/evidence retention remains unresolved.
- No automatic Link/Sitemap/History API/React Router/button/pagination/infinite-scroll/JSON discovery or enqueue exists.
- No human-paced interaction, authentication/session, proxy, production Asset Downloader, HTML rewrite, API capture, or full offline archive exists.

## Exact next product phase

**Product Phase 9 — Link Discovery and SPA Support.** It must extract only from the final rendered DOM and bounded client-side route observations, evaluate every candidate through the Phase 5 Scope Engine, enqueue accepted URLs through the Phase 6 Queue, preserve Phase 7 Lease/Recovery invariants, and reuse the Phase 8 Browser/Rendering interfaces without starting Phase 10 human-paced interaction.

## OKF migration closure

The independent migration audit classified all 76 final artifacts, removed 58 obsolete compatibility Markdown paths, preserved 54 evidence records and 61 typed relationships, and reconciled all 40 official Concepts. Official Google OKF v0.2 validation, OfflineWebArchiver metadata policy, extension integrity, knowledge quality, formatting, focused validator tests, and repository tests pass locally.

The only accepted exceptions are administrative: no hosted GitHub Actions run or branch-protection configuration was available as local evidence. Require `OKF Validation / OKF validation and quality gates` in branch protection and verify the next hosted run before reporting either control as verified. Use the [final maintainer handoff](docs/okf-migration/FINAL_MAINTAINER_HANDOFF.md) for routine knowledge work.

## References

- [Phase 8 implementation report](docs/project/PHASE_08_IMPLEMENTATION_REPORT.md)
- [Phase 8 canonical record](okf/history/phase-08.md)
- [Browser Runtime](docs/architecture/BROWSER_RUNTIME.md)
- [Phase 8 security review](docs/architecture/PHASE_08_SECURITY_REVIEW.md)
- [Final OKF conformance report](docs/okf-migration/FINAL_OKF_CONFORMANCE_REPORT.md)
- [Final OKF maintainer handoff](docs/okf-migration/FINAL_MAINTAINER_HANDOFF.md)
