# Test Architecture

Unit tests cover strict contracts, Core capabilities, format serialization/version/IDs/portable paths, migration order/checksums/rollback, atomic replacement, locks, ZIP attacks/limits, configuration, redaction, and CLI parsing/formatting.

Integration tests use real filesystem and `node:sqlite` for create/validate/open/close/move/export/import/identity/exclusions, schema-1 backup/migration, checksum drift, metadata mismatch, corruption, and failed-import cleanup. Application Service and Desktop transport tests verify contract/error/authorization boundaries. Built CLI smoke executes every Phase 4 command. Real hidden Electron smoke executes create/validate/open/info/export/close/import/validate through the sandboxed renderer bridge and embedded Node SQLite.

Fitness gates separately validate build/type safety, formatting/lint, package import allowlists/cycles/public entries/Core purity/app non-persistence, contracts, format, migrations, Desktop security, docs/ADRs, and OKF. No crawl/browser/network/auth/proxy/queue fixture is claimed.
