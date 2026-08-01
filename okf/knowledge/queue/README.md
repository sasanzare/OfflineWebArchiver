# Queue

**Status:** VERIFIED through Product Phase 7

**Versions:** Queue state machine 2; SQLite schema 5; contract 1.4.0

Phase 6 logical identity, deterministic priority, idempotency, attempt and history invariants remain authoritative. Phase 7 claims through one active Job Lease with a hashed verifier, increments Fencing Generation, and requires current active unexpired ownership on protected writes. Phase 6 compatibility/idempotency rows retain the active credential for durable identical replay. Logical `interrupted` and `paused` states retain crash/pause history and safely requeue to pending. Recovery is explicit, bounded, transactional and resumable. There is still no browser, network dispatcher, production downloader, or Worker Pool.
