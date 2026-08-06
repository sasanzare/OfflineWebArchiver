# Contract Versioning

## Product Phase 11 contract 1.7.0

Contract `1.7.0` preserves the strict Browser, Render, and Interaction surface and adds metadata-only Secret Store status, list, lock, and delete commands/results. Secret Reference, kind, scope, backend, lifecycle, capability, and status schemas are strict. Raw secret bytes, passphrases, Vault keys, generic secret-read operations, and secret-bearing errors are not transport fields. Interaction transport still carries target descriptors and typed metadata only; raw typed text, Browser/Page/Context handles, arbitrary JavaScript, selectors with declaration syntax, and unbounded payloads are rejected.

## Contract 1.4.0

Version 1.4.0 adds interrupted/paused states, Fencing Generation, recovery summary/report, Lease metadata without tokens, Checkpoint/Artifact Checkpoint, Pause/Resume, and completed-output descriptors. Older contract semantics are not silently upgraded; validation rejects malformed ownership, paths, times, payloads, and bounds.

Current transport contract is `1.7.0`. It preserves Project/Profile/Scope/Queue/Recovery commands, Browser/Render/Interaction commands/results, and adds only safe Secret Store metadata operations. Scope Engine `1`, Profile schema `1`, Queue state machine `2`, Lease/Checkpoint/Recovery model `1`, Render Engine/Context/Stability model `1`, Interaction Profile/Trace schema `1`, Secret Reference/Vault/Envelope schema `1`, Project format `1.1.0`, SQLite schema `7`, and application `0.8.0` remain independent version axes.

Contract `1.2.0` was the Phase 5 Profile/Scope baseline, `1.1.0` the Phase 4 Project baseline, and `1.0.0` the Phase 3 system-description baseline. Current responses use strict result discriminators, stable errors, and correlated events. Unknown fields, invalid paths/IDs/timestamps/states/discriminators, oversized result/error payloads, and unsupported versions fail closed.

Optional compatible additions require a minor version plus consumer tests and synchronized Desktop/CLI docs. Removal, rename, or semantic break requires a major version, compatibility/migration plan, ADR, and parallel handling where processes can roll independently. Patch versions cannot change accepted semantics. ZIP container `1.0.0` and lock `1` retain their Phase 4 axes.
