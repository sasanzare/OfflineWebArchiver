# Configuration Model

Build-owned Phase 6 values are application `0.6.0`, contract `1.3.0`, Project format `1.1.0`, SQLite schema `4`, Site Profile schema `1`, Scope Engine `1`, Queue state machine `1`, and priority policy `1`. Site Profile policy lives inside the Project and is never read from environment variables. `OWAB_LOG_LEVEL` remains the sole environment override.

Runtime/platform facts expose only normalized Node version, OS family, and architecture.

Archive/Profile/Scope/Queue safety limits, priority categories, retry bounds, pagination, and SQLite pragmas are code/profile constants, not untrusted renderer/environment settings. Project locations are per-command local values selected by CLI arguments or granted native Desktop dialogs; they are never persisted inside the Project. Queue state is Project-local SQLite data. Credentials, proxy settings, browser paths, crawler settings, Lease timers, and secret stores remain absent.
