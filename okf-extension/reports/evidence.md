# Evidence Report

This extension report summarizes Product Phase 8 evidence and the partial
Product Phase 10 foundation. `OKF-EV-P08-*` covers Browser and Render source,
schema 6 persistence, real Chromium fixtures, artifact and database fault
injection, Page and Browser process termination, interfaces, security,
documentation, and the canonical record.

`OKF-EV-P10-*` covers bounded browser-native interaction, real Playwright input,
deterministic pacing and budgets, contract/CLI surfaces, redacted fenced Trace
persistence, lifecycle tests, and the security review. `OKF-EV-P10-DISCOVERY-GATE`
records the blocking fact that the repository baseline has no completed Phase 9
Discovery Engine; it is not a completion claim for discovery integration.

Paths are repository-relative. External targets and discovery or downloader evidence are not claimed. All Phase 1 through 7 evidence remains preserved, and `okf-extension/registry/evidence.json` remains authoritative for evidence identity and location.

Phase 15 evidence (`OKF-EV-P15-*`) covers Core proxy policy, contract 1.11,
SQLite schema 10, Secret Store-backed Application Service orchestration, real
Chromium HTTP/HTTPS/SOCKS5 connectivity, health/cooldown/eligibility,
authenticated Session affinity, security review, documentation, and the
repository-owned exact-HEAD runner. The HTTPS certificate exception is
generated-fixture-only and gated by `OWAB_TEST_MODE=1`; no production TLS
validation is weakened.

Phase 16 evidence (`OKF-EV-P16-*`) covers the Core Worker Pool policy, shared
Origin cooldown and Retry-After handling, sticky/fail-closed affinity, SQLite
schema 11 scheduler state, Browser Runtime multi-Context ownership, security
review, and documentation. Authorized target-site all-path capture, exact
clean-HEAD promotion, downloader, replay, and rewrite evidence is not claimed.
