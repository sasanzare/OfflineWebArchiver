# Supported Platform Policy

## Current release

The current product release is Windows-only and its mandatory native target is
**Windows 11 x64**. Phase 13 native acceptance requires a valid Windows 11
environment with the pinned Playwright/Chromium runtime, real Electron smoke,
focused browser evidence, the required regression and quality gates, clean
committed source, and matching source and acceptance-definition hashes.

Windows 10 is a **legacy/compatibility, best-effort, non-blocking** target for
the current release. A Windows 10 run may be retained as diagnostic evidence,
but it must not be labeled Windows 11 or become a required Phase 13 row unless
a future current-release decision explicitly changes this policy.

Linux and macOS are **future-version, deferred, non-blocking** targets. Their
native install, Browser, Secret Store, filesystem, SQLite, and Electron
evidence remains valuable roadmap work, but its absence does not block the
current Windows 11 release or Phase 13 closure.

## Architecture and future support

The release scope does not reject portability. Archive Core, portable project
data, platform-aware runtime resolution, and cross-platform test abstractions
remain in place so future Linux and macOS versions can be qualified without
removing or weakening the current Windows security boundary.

The inputs for a future support decision are OS lifecycle/security support,
Electron and Chromium support, native protected-storage guarantees, filesystem
semantics, architecture availability, CI coverage, and reproducible packaging.
Future native gates may be activated by a versioned platform-support contract;
they are not implicit requirements of the current release.

