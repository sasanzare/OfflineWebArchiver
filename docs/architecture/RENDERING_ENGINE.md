# Rendering Engine

**Status:** Implemented in Product Phase 8  
**Render Engine version:** 1

`packages/rendering` owns browser-agnostic orchestration through `BrowserPageSession`. The Application Service accepts only an existing queued Job ID, validates Project/Run/Profile ownership, atomically claims the Job with a Lease, creates browser resources, records stage events and Job Checkpoints, maintains Heartbeats, observes pause state, commits the result, and always closes Page/Context resources.

The pipeline stages are `claimed`, `browser-starting`, `context-created`, `page-created`, `navigating`, `waiting-for-stability`, `extracting-html`, optional `capturing-screenshot`, `committing-result`, and `completed`; `failed` and `cancelled` are terminal event stages. Navigation defaults to a 15-second bound, combined stability to 12 seconds, and the entire Render to 30 seconds. Values are contract-bounded.

Navigation uses `domcontentloaded`, records response status/content type, final safe URL, duration, and redirects, then revalidates the final URL. Final HTML comes from the rendered DOM, not the initial response body. Empty meaningful content is `RENDER_BLANK_PAGE`; oversize HTML is `RENDER_HTML_TOO_LARGE`; instability and total-time bounds are explicit retryable failures.

No link extraction, automatic enqueue, Sitemap, History API discovery, button discovery, pagination, infinite scroll, asset download, HTML rewrite, API capture, authentication, or human-paced interaction is present. A bounded scroll hook exists only in deterministic fixture mode and requires an explicit completion selector.
