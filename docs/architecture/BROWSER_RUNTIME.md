# Browser Runtime

**Status:** Implemented in Product Phase 8  
**Runtime model:** 1  
**Playwright:** `1.56.1`  
**Chromium:** `141.0.7390.37`, revision `1194`

`packages/browser-runtime` is the only production package that imports Playwright. It implements the Archive Core `BrowserRuntimePort`; Desktop, CLI, Rendering, and Application Service never receive raw Playwright objects.

The browser resource is repository-owned in development/test at `.runtime/browsers` and is resolved from an approved packaged-resource root after packaging. `browser-manifest.json` records provider, exact Playwright/Chromium versions, revision, relative executable path, SHA-256, source, and installation time. Resolution is root-contained and checksum-verified. Missing, incompatible, or altered resources return structured errors. There is no system-browser fallback and application startup never downloads a browser.

Provisioning commands are `npm run browser:install`, `npm run browser:verify`, and `npm run browser:info`. Provisioning is an explicit development/package preparation action. Browser resources and local npm cache are ignored by Git; licenses/notices must accompany the packaged resource in a release phase.

Launch uses `headless: true`, `chromiumSandbox: true`, and the single reviewed fixed argument `--deny-permission-prompts`. There is no persistent user-data directory, arbitrary executable path, caller-supplied Chromium argument, HTTPS-error bypass, extension loading, or exposed debugging port. The Playwright Node dependency remains external to the Electron main bundle and must be copied as a packaged runtime dependency.

Upgrade policy: update Playwright and its matching Chromium together, provision from the official Playwright artifact source, regenerate and review the manifest/checksum, rerun all browser/render/crash/packaging checks, and retain the prior verified pin for rollback until release evidence passes. This is an update process, not a long-term security-support claim.
