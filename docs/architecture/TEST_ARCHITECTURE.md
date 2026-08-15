# Test Architecture

## Product Phase 8 evidence layers

Pure unit tests cover Render policies, combined quiet state, bounds, contracts, and redaction. Real Playwright integration uses only deterministic loopback fixtures for static/JavaScript/SPA/lazy/continuous/EventSource/blank/redirect/timeout/evidence/screenshot behavior. Fault tests cover artifact/SQLite boundaries. Actual child processes plus Windows process enumeration and `SIGKILL` cover Page and Browser crashes. Existing Queue/Recovery concurrency, process-kill, CLI, and real Electron suites remain regression gates. No real target site is contacted.

Product Phase 6 adds pure Queue unit/state-pair tests, schema-4 migration/repository integration, adversarial ownership/redaction/limit/SQL tests, and Worker Thread concurrency tests using independent SQLite connections. The built CLI and real hidden Electron smoke drive Queue commands through production contract/service/renderer boundaries. Reserved example domains are used; no external request occurs.

Unit tests cover Queue vocabulary, 10 allowed/39 rejected state pairs, priority/order, retry policy, redaction, contracts, Core capabilities, Project/Profile/Scope behavior, migrations, files/ZIP/locks, configuration, and CLI parsing/formatting. Integration tests cover eligible/rejected/batch enqueue, logical duplicates, revision/engine isolation, multi-parent/lower-depth discovery, claims, tokens, attempts, idempotent/conflicting terminal writes, retry/exhaustion/release, skip/block, clear, histories, statistics, close/reopen, migration and security attacks.

Concurrency tests use real Worker Threads and separate database connections for concurrent equivalent enqueue, claim, identical terminal retries, complete/fail races, retry/release/claim behavior, attempt-number uniqueness, integrity, and reopen persistence. They do not use an application-only mutex or fake in-memory repository.

Fitness gates independently validate build/type safety, formatting/lint, package allowlists/cycles/public entries/Core/Queue/Recovery/Rendering/Interaction/Secret purity, Playwright ownership, contract 1.10.0, Project format/schema 9, Browser provisioning, Render/Interaction/Secret/Session/Run-state/OTP policy, Desktop security, documentation/ADRs, security, and OKF. Phase 13 also adds deterministic replay/offline, Service Worker, canonical-path, redaction, IPC-command, and concurrency-plan checks. Phase 14 adds Locator/Login Flow contract, OTP lifecycle, Run continuation, temporary Picker teardown, and sensitive-input leakage checks. Linux/macOS browser/process-kill, Phase 9 discovery, real targets, proxy, downloader, and crawler evidence are not claimed unless the registered evidence runs.

The repository test runner serializes test-file execution with Node's bounded
test concurrency setting so real Chromium Browser, Render, and process-kill
fixtures cannot compete for host resources. Explicit Worker Thread and
separate-connection concurrency scenarios remain concurrent inside their own
tests.
