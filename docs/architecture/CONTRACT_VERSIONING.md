# Contract Versioning

## Product Phase 8 contract 1.5.0

Contract `1.5.0` adds strict Browser info/validation/health/restart and Render start/status/result/events/cancel commands/results. Render start identifies an existing queued Job and accepts bounded policy fields; it does not accept a URL, browser path, launch arguments, headers, cookies, or Playwright handles. Results expose safe relative artifact descriptors and sanitized evidence. Browser/Render progress and errors retain command/correlation identity and reject unknown fields or unsupported versions.

## Contract 1.4.0

Version 1.4.0 adds interrupted/paused states, Fencing Generation, recovery summary/report, Lease metadata without tokens, Checkpoint/Artifact Checkpoint, Pause/Resume, and completed-output descriptors. Older contract semantics are not silently upgraded; validation rejects malformed ownership, paths, times, payloads, and bounds.

Current transport contract is `1.5.0`. It preserves Project/Profile/Scope/Queue/Recovery commands and adds strict Browser/Render commands/results with correlated safe events and bounded values. Scope Engine `1`, Profile schema `1`, Queue state machine `2`, Lease/Checkpoint/Recovery model `1`, Render Engine/Context/Stability model `1`, Project format `1.1.0`, SQLite schema `6`, and application `0.8.0` remain independent version axes.

Contract `1.2.0` was the Phase 5 Profile/Scope baseline, `1.1.0` the Phase 4 Project baseline, and `1.0.0` the Phase 3 system-description baseline. Current responses use strict result discriminators, stable errors, and correlated events. Unknown fields, invalid paths/IDs/timestamps/states/discriminators, oversized result/error payloads, and unsupported versions fail closed.

Optional compatible additions require a minor version plus consumer tests and synchronized Desktop/CLI docs. Removal, rename, or semantic break requires a major version, compatibility/migration plan, ADR, and parallel handling where processes can roll independently. Patch versions cannot change accepted semantics. ZIP container `1.0.0` and lock `1` retain their Phase 4 axes.
