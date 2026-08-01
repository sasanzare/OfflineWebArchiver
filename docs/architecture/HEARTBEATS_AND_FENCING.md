# Heartbeats and Fencing

Lease ownership is defended twice. The random Lease Token proves possession; the monotonically increasing Fencing Generation proves freshness. Every claimed generation is greater than the prior generation for that Job. A stale owner is rejected even if it retained an old token, and terminal writes also verify that the Lease is active and unexpired.

Heartbeat updates only `heartbeat_at`. Renewal updates both heartbeat and expiry after validating all ownership fields. The configured heartbeat interval is 15 seconds and must be shorter than the Lease duration. No grace period is inferred; the exact expiration boundary is `evaluationTime >= expiresAt`. A `Clock` port and deterministic fake clock make boundary, rollback-independent policy, and 5-minute through 14-day recovery tests reproducible.

The active Lease row compares a SHA-256 token digest. Phase 6 compatibility and durable claim-replay ledgers retain the live credential, so Project database access is credential access. Tokens and token digests are never logged; IDs, owner, generation, timestamps, and reason codes are safe audit metadata.
