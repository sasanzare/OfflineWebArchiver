# Product Phase 13 Security Review

## Review status

**Status:** PARTIAL — no Critical finding is open, but current-release
Windows 11 x64 evidence remains non-promotable until a clean committed run.
Linux and macOS evidence is deferred future-version work, not a current-release
security blocker.

**Scope:** post-Phase-12 architecture and security hardening only. This review
does not approve Phase 14 authentication/OTP, proxy, downloader, replay-engine,
archive-runtime, or Worker Pool functionality.

## Closure remediation checkpoint — 2026-08-09

The registered Session fixture was strengthened so its protected marker depends
on cookie, localStorage, and an IndexedDB record; it also asserts that the
documented unsupported sessionStorage value is not serialized. Authentication
marker validation now waits within a bounded five-second window for
asynchronous page state. The Electron smoke fixture now resolves the native
executable path by host platform. These changes are typechecked and covered by
deterministic tests, but no real-browser or native-platform acceptance result
is promoted: official Chromium provisioning still fails DNS resolution and
the Electron package has no downloaded macOS binary. Detailed commands and
totals are in [the Phase 13 Closure Report](../project/PHASE_13_CLOSURE_REPORT.md).

## Findings

| Finding | Severity | Owner | Target | Evidence / disposition | Acceptance |
|---|---|---|---|---|---|
| S13-001: Registered real Chromium session fixture cannot currently execute | High | Browser Runtime / QA | Before Phase 13 closure | Approved Windows Chromium now passes the registered Session fixture; current-release promotion still requires a clean committed Windows 11 x64 run. Linux/macOS execution is deferred. | AC-P13-002 |
| S13-002: Service Worker block/allow behavior lacks real browser evidence | High | Browser Runtime / QA | Before Phase 13 closure | Approved Windows Chromium now passes the registered block/allow fixture; current-release promotion still requires a clean committed Windows 11 x64 run. Linux/macOS execution is deferred. | AC-P13-012 |
| S13-003: Future platform support is unverified | High | Platform / QA | Before any future-platform claim | Windows 11 x64 is the only mandatory current-release target; Windows 10 is legacy/non-blocking and Linux/macOS remain deferred until their own native evidence exists. | AC-P13-016 |
| S13-004: Full Worker Pool concurrency stress is not executable yet | Medium | Queue / Reliability | Phase 14+ scheduler work | NOT_APPLICABLE to the current runtime because no Worker Pool scheduler exists. The versioned contract and SQLite stress plan prevent premature implementation claims. | AC-P13-018, AC-P13-019 |
| S13-005: Archive runtime isolation is a future boundary | Medium | Desktop / Security | Before archive HTML is introduced | NOT_APPLICABLE to the current product. A separate untrusted-runtime baseline is documented and the current trusted renderer cannot load archive content. | AC-P13-005 |

## Verified controls

- Authentication authorization is checked for every intercepted request class,
  including non-document requests and redirects, against the configured exact
  origin allowlist.
- Desktop IPC requires exact bridge methods, sender/frame/origin checks, trusted
  renderer navigation, approved command types, and approved Project paths.
- Archive Core remains free of Electron, Node, Browser, filesystem, and transport
  dependencies; sensitive data is not added to public contracts.
- Strict Offline unknown external requests abort; replay keys are deterministic;
  sensitive request headers are excluded from persisted replay metadata.
- Service Worker policy defaults to `block`; allowing it is explicit and
  profile-controlled.
- Canonical path checks reject traversal, encoded traversal, absolute/drive/UNC
  forms, invalid Unicode, reserved names, control characters, and ambiguous
  aliases before filesystem writes.
- SQLite writes retain parameterized statements, short transactions, ownership,
  Lease/fencing checks, and existing WAL/FULL-sync/extension-disabled settings.

## Required closure evidence

1. Run the registered real Chromium Session and Service Worker fixtures with the
   repository-owned browser and loopback fixture server available.
2. Execute the platform evidence matrix for each platform whose support is
   claimed.
3. Rerun the complete repository gates and update the Phase 13 report and
   acceptance matrix only from inspected results.

## Related records

- [Post-Phase-12 baseline audit](../project/POST_PHASE_12_BASELINE_AUDIT.md)
- [Trust zones and IPC](TRUST_ZONES_AND_IPC.md)
- [Network Replay](NETWORK_REPLAY.md)
- [Strict Offline Mode](STRICT_OFFLINE_MODE.md)
- [Canonical path safety](CANONICAL_PATH_SAFETY.md)
- [Phase 13 acceptance rows](../product/ACCEPTANCE_MATRIX.md)
