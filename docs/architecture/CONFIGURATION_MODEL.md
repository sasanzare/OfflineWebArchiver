# Configuration Model

## Product Phase 8 configuration

Browser executable roots and fixture exceptions are composition-time values, not user/Project/CLI policy. Callers cannot set executable paths or Chromium arguments. Context profile 1 is deterministic (`en-US`, UTC, 1280x720, scale 1, light, reduced motion, JavaScript on, service workers blocked, downloads off). Render policy is contract-bounded with default navigation/stability/total limits of 15s/12s/30s, 500ms DOM/network quiet, 50ms polling, optional selector/screenshot, 8 MiB HTML/PNG, and 100 evidence entries. Fixture scrolling and loopback authorization are rejected outside explicit test composition.

## Lease configuration version 1

Default Lease duration is 60,000ms, Heartbeat interval 15,000ms, renewal extension 60,000ms, recovery batch 100, and Project-open policy `inspect`. Duration is bounded 5,000–86,400,000ms and batch maximum is 500. Heartbeat must be at least one second and less than duration. There is no hidden grace period.

Build-owned Phase 8 values are application `0.8.0`, contract `1.5.0`, Project format `1.1.0`, SQLite schema `6`, Site Profile/Scope/Queue/Lease/Checkpoint/Recovery models, Render Engine `1`, Context profile `1`, Stability model `1`, Playwright `1.56.1`, and Chromium revision `1194`. Site Profile policy lives inside the Project and is never read from environment variables. `OWAB_LOG_LEVEL` remains the sole environment override.

Runtime/platform facts expose only normalized Node version, OS family, and architecture.

Archive/Profile/Scope/Queue safety limits, priority categories, retry bounds, pagination, and SQLite pragmas are code/profile constants, not untrusted renderer/environment settings. Project locations are per-command local values selected by CLI arguments or granted native Desktop dialogs; they are never persisted inside the Project. Queue state is Project-local SQLite data. Credentials, browser paths, crawler settings, Lease timers, and secret stores remain absent from general configuration.

## Product Phase 15 proxy configuration

The optional `proxyPool` configuration is metadata-only and defaults to
`mode: "direct"`, `failOpenToDirect: false`, health checks enabled, a bounded
cooldown, sticky authenticated Sessions enabled, multi-proxy authenticated
Sessions disabled, and bounded per-proxy worker concurrency. Proxy credentials
are referenced through the Secret Store and are not configuration values. A
configured single proxy or pool never authorizes a silent direct fallback.
The health-test and eligibility behavior is implemented now; background
worker scheduling, rate-limit coordination, and automatic rotation remain the
Phase 16 boundary.
