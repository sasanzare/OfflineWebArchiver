# Contract Versioning

## Contract 1.4.0

Version 1.4.0 adds interrupted/paused states, Fencing Generation, recovery summary/report, Lease metadata without tokens, Checkpoint/Artifact Checkpoint, Pause/Resume, and completed-output descriptors. Older contract semantics are not silently upgraded; validation rejects malformed ownership, paths, times, payloads, and bounds.

Current transport contract is `1.4.0`. It preserves Project/Profile/Scope/Queue commands and adds strict Recovery, Lease, Checkpoint, Artifact Checkpoint and Run-control commands/results with correlated safe events, bounded values, and token-free Lease output. Engine `1`, Profile schema `1`, Queue state machine `2`, Lease/Checkpoint/Recovery model `1`, Project format `1.1.0`, SQLite schema `5`, and application `0.7.0` remain independent version axes.

Contract `1.2.0` was the Phase 5 Profile/Scope baseline, `1.1.0` the Phase 4 Project baseline, and `1.0.0` the Phase 3 system-description baseline. Current responses use strict result discriminators, stable errors, and correlated events. Unknown fields, invalid paths/IDs/timestamps/states/discriminators, oversized result/error payloads, and unsupported versions fail closed.

Optional compatible additions require a minor version plus consumer tests and synchronized Desktop/CLI docs. Removal, rename, or semantic break requires a major version, compatibility/migration plan, ADR, and parallel handling where processes can roll independently. Patch versions cannot change accepted semantics. ZIP container `1.0.0` and lock `1` retain their Phase 4 axes.
