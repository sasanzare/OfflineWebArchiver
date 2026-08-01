# Configuration Model

## Lease configuration version 1

Default Lease duration is 60,000ms, Heartbeat interval 15,000ms, renewal extension 60,000ms, recovery batch 100, and Project-open policy `inspect`. Duration is bounded 5,000–86,400,000ms and batch maximum is 500. Heartbeat must be at least one second and less than duration. There is no hidden grace period.

Build-owned Phase 7 values are application `0.7.0`, contract `1.4.0`, Project format `1.1.0`, SQLite schema `5`, Site Profile schema `1`, Scope Engine `1`, Queue state machine `2`, priority policy `1`, and Lease/Checkpoint/Recovery configuration/model `1`. Site Profile policy lives inside the Project and is never read from environment variables. `OWAB_LOG_LEVEL` remains the sole environment override.

Runtime/platform facts expose only normalized Node version, OS family, and architecture.

Archive/Profile/Scope/Queue safety limits, priority categories, retry bounds, pagination, and SQLite pragmas are code/profile constants, not untrusted renderer/environment settings. Project locations are per-command local values selected by CLI arguments or granted native Desktop dialogs; they are never persisted inside the Project. Queue state is Project-local SQLite data. Credentials, proxy settings, browser paths, crawler settings, Lease timers, and secret stores remain absent.
