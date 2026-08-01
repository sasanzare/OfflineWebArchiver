# Test Architecture

## Product Phase 7 evidence layers

Pure unit tests cover time/paths/payload/partial decisions; integration tests cover SQLite lifecycle and loopback Range; independent connections cover claims/recovery; actual forked children plus `SIGKILL` cover crash boundaries; fake Clock covers 5m through 14d; built CLI and real Electron cover interfaces. External target/network and browser tests are deliberately absent.

Product Phase 6 adds pure Queue unit/state-pair tests, schema-4 migration/repository integration, adversarial ownership/redaction/limit/SQL tests, and Worker Thread concurrency tests using independent SQLite connections. The built CLI and real hidden Electron smoke drive Queue commands through production contract/service/renderer boundaries. Reserved example domains are used; no external request occurs.

Unit tests cover Queue vocabulary, 10 allowed/39 rejected state pairs, priority/order, retry policy, redaction, contracts, Core capabilities, Project/Profile/Scope behavior, migrations, files/ZIP/locks, configuration, and CLI parsing/formatting. Integration tests cover eligible/rejected/batch enqueue, logical duplicates, revision/engine isolation, multi-parent/lower-depth discovery, claims, tokens, attempts, idempotent/conflicting terminal writes, retry/exhaustion/release, skip/block, clear, histories, statistics, close/reopen, migration and security attacks.

Concurrency tests use real Worker Threads and separate database connections for concurrent equivalent enqueue, claim, identical terminal retries, complete/fail races, retry/release/claim behavior, attempt-number uniqueness, integrity, and reopen persistence. They do not use an application-only mutex or fake in-memory repository.

Fitness gates independently validate build/type safety, formatting/lint, package allowlists/cycles/public entries/Core/Queue/Recovery purity/app non-persistence, contract 1.4.0, Project format, migrations, Queue/Recovery/Checkpoint policy, Desktop security, documentation/ADRs, security, and OKF. Lease/Heartbeat/Checkpoint/stale recovery now have direct evidence; browser/production-network/auth/proxy/crawler fixtures are not claimed.
