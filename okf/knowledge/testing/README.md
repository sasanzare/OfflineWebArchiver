# Testing Knowledge

Phase 6 adds Queue unit/state-pair tests, schema-4 lifecycle/security tests, real Worker Thread/separate-SQLite-connection races, 32-command contract validation, built CLI Queue smoke, and real Electron Queue smoke. Queue validators enforce policy and absence of Phase 7 recovery fields.

Node's built-in test runner covers contracts, Core, configuration, logging, service orchestration, desktop transport, built CLI behavior, real Electron isolation, and OKF validation. Architecture, security, docs, and contract validators are separate fail-closed gates.
