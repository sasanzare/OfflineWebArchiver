# Configuration Model

Build-owned values are application `0.4.0`, contract `1.1.0`, Project format `1.0.0`, and SQLite schema 2. Runtime/platform facts expose only normalized Node version, OS family, and architecture. The sole environment override remains `OWAB_LOG_LEVEL=debug|info|warn|error`.

Archive safety limits and SQLite pragmas are adapter constants, not untrusted renderer/environment settings. Project locations are per-command local values selected by CLI arguments or granted native Desktop dialogs; they are never persisted inside the Project. Target scope, credentials, proxy settings, browser paths, queues, crawl configuration, and secret stores remain absent.
