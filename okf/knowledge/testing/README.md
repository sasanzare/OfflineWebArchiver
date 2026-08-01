# Testing Knowledge

Phase 7 adds pure fake-clock policy tests, SQLite recovery lifecycle, independent-connection concurrency, actual fork/`SIGKILL` boundaries, loopback HTTP Range/no-Range integration, 5m/6h/24h/3d/14d horizons, and built CLI/real Electron smoke. These are local deterministic evidence, not browser/target coverage.

Phase 6 adds Queue unit/state-pair tests, schema-4 lifecycle/security tests, real Worker Thread/separate-SQLite-connection races, 32-command contract validation, built CLI Queue smoke, and real Electron Queue smoke. Queue validators enforce policy and absence of Phase 7 recovery fields.

Node's built-in test runner covers contracts, Core, configuration, logging, service orchestration, desktop transport, built CLI behavior, real Electron isolation, and OKF validation. Architecture, security, docs, and contract validators are separate fail-closed gates.
