# Browser, Context, and Page Lifecycle

**Status:** Implemented in Product Phase 8  
**Context profile version:** 1

One Application Service owns one Browser Runtime and permits one active Page Job. The Browser Process is reused for at most 100 completed Page sessions or 30 minutes, then recycled before the next Job. An explicit restart budget allows three restarts per five-minute window. Health states are `stopped`, `starting`, `ready`, `unhealthy`, `crashed`, `restarting`, and `closing`. Disconnect events classify process crashes; application shutdown closes the runtime. Phase 8 records version/health but does not enforce an OS-memory ceiling.

Every claimed Job receives a fresh non-persistent Browser Context and one Page. Deterministic defaults are locale `en-US`, timezone `UTC`, viewport `1280x720`, device scale 1, light color scheme, reduced motion, JavaScript enabled, service workers blocked, downloads unaccepted, and a versioned product user agent. Permissions are cleared. Cookies, cache, storage, authentication, and system user profiles are not shared between Jobs.

The lifecycle is `claimed -> browser-starting -> context-created -> page-created -> navigating -> waiting-for-stability -> extracting-html -> [capturing-screenshot] -> committing-result -> completed`; failures end in `failed` or `cancelled`. Page/Context close is attempted from every terminal path and Context close is the final isolation boundary.

Popups are closed, downloads are cancelled, dialogs are dismissed, and permission prompts are denied by the fixed `--deny-permission-prompts` launch policy after Context permissions are cleared. Rich popup/dialog/authentication behavior is deferred. Browser and Page crashes are separately classified as retryable `BROWSER_CRASHED` and `PAGE_CRASHED`; every in-flight Page operation and navigation races the Page crash signal so classification does not wait for an internal Playwright timeout. Durable Queue failure transitions release the Lease and retain attempt history.
