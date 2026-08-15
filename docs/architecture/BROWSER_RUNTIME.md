# Browser Runtime

**Status:** Browser/Rendering implemented in Product Phase 8; Interaction adapter foundation implemented in Product Phase 10
**Runtime model:** 1  
**Playwright:** `1.56.1`  
**Chromium:** `141.0.7390.37`, revision `1194`

`packages/browser-runtime` is the only production package that imports Playwright. It implements the Archive Core `BrowserRuntimePort`; Desktop, CLI, Rendering, and Application Service never receive raw Playwright objects.

The Phase 10 adapter in `packages/browser-runtime/src/interaction.ts` is the only owner of `Page`, `Locator`, `Keyboard`, `Mouse`, `Dialog`, and Popup operations. Approved Interaction Plans use real `locator.focus/click/hover`, `page.mouse.move/wheel`, `page.keyboard.press/type`, Tab/Shift+Tab, and bounded waits. The adapter permits only validated target descriptors, explicit navigation/read-only classifications, bounded budgets, and read-only DOM snapshots. It does not inject JavaScript events, assign DOM values, expose handles, or enable POST-like side effects.

The fixed Context profile remains resolved once per Page Job: `en-US`, `UTC`, `1280x720`, device scale factor `1`, fixed User Agent policy, and an explicit Accept-Language value. Interaction traces record only the non-sensitive context digest and redacted metadata. Phase 9 discovery references are accepted as a bounded target strategy, but no Phase 9 Discovery Engine is present in this baseline.

The browser resource is repository-owned in development/test at `.runtime/browsers` and is resolved from an approved packaged-resource root after packaging. `browser-manifest.json` records provider, exact Playwright/Chromium versions, revision, relative executable path, SHA-256, source, and installation time. Resolution is root-contained and checksum-verified. Missing, incompatible, or altered resources return structured errors. There is no system-browser fallback and application startup never downloads a browser.

Provisioning commands are `npm run browser:install`, `npm run browser:verify`, and `npm run browser:info`. Provisioning is an explicit development/package preparation action. Browser resources and local npm cache are ignored by Git; licenses/notices must accompany the packaged resource in a release phase.

Launch uses `headless: true`, `chromiumSandbox: true`, and the single reviewed fixed argument `--deny-permission-prompts`. There is no persistent user-data directory, arbitrary executable path, caller-supplied Chromium argument, HTTPS-error bypass, extension loading, or exposed debugging port. The Playwright Node dependency remains external to the Electron main bundle and must be copied as a packaged runtime dependency.

Upgrade policy: update Playwright and its matching Chromium together, provision from the official Playwright artifact source, regenerate and review the manifest/checksum, rerun all browser/render/crash/packaging checks, and retain the prior verified pin for rollback until release evidence passes. This is an update process, not a long-term security-support claim.

## Proxy routing and connectivity checks

Phase 15 adds HTTP, HTTPS, and SOCKS5 proxy configuration at the Browser Runtime
boundary. `packages/browser-runtime/src/index.ts` is the only production code
that maps a validated `ProxyRuntimeConfiguration` to Playwright's proxy
settings. A configured proxy is required for proxy-bound work; the runtime
does not silently retry direct or rotate to another proxy.

`testProxy` uses the approved single Chromium process and a fresh isolated
context, performs a real navigation through the supplied proxy, optionally
checks a bounded outbound-IP response, and returns only latency, status, safe
error, and IP-verification metadata. The Application Service persists health
state and counters; it does not receive a browser handle or raw credential.

The generated local HTTPS fixture is the only case allowed to use
`testOnlyAllowInsecureProxyCertificates`, and the option is effective only when
`OWAB_TEST_MODE=1`. Normal authentication and rendering contexts keep strict
certificate validation. This test-only boundary is checked by
`tools/security/check.mjs`; it is not a production trust bypass.
