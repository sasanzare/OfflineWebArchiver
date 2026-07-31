# Contract Versioning

Current transport contract is `1.3.0`. It preserves Project/Profile/Scope commands and adds 14 Queue commands with strict Job, batch, claim, mutation, list, history and statistics results, correlated safe events, stable Queue errors, bounded strings/arrays/pagination, and closed state discriminators. Engine `1`, Profile schema `1`, Queue state/priority policy `1`, Project format `1.1.0`, SQLite schema `4`, and application `0.6.0` remain independent version axes.

Contract `1.2.0` was the Phase 5 Profile/Scope baseline, `1.1.0` the Phase 4 Project baseline, and `1.0.0` the Phase 3 system-description baseline. Current responses use strict result discriminators, stable errors, and correlated events. Unknown fields, invalid paths/IDs/timestamps/states/discriminators, oversized result/error payloads, and unsupported versions fail closed.

Optional compatible additions require a minor version plus consumer tests and synchronized Desktop/CLI docs. Removal, rename, or semantic break requires a major version, compatibility/migration plan, ADR, and parallel handling where processes can roll independently. Patch versions cannot change accepted semantics. ZIP container `1.0.0` and lock `1` retain their Phase 4 axes.
