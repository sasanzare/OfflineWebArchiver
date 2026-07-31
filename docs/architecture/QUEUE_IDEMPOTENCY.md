# Queue Idempotency

Mutation keys are `1..128` characters and match `[A-Za-z0-9][A-Za-z0-9._:-]*`. `queue_operations` persists project, Run, operation type, key, canonical SHA-256 request hash, first result, and time. Business request hashing excludes idempotency key, operation ID, and correlation ID; correlation therefore traces a retry but never defines identity.

| Command | Idempotency behavior |
| --- | --- |
| enqueue | Same key/request replays; another key with same logical identity returns `existing`. |
| enqueueBatch | A bounded batch derives stable per-item keys; stable order and per-item conflicts are returned. |
| claimNext | Same key/request replays the original claim or null without another attempt. |
| complete | Same operation replays; another key with the original claim/completion/result is accepted; conflicting token, key, or result fails. |
| fail | Same operation replays without a duplicate transition or attempt finalization; conflicts fail. |
| scheduleRetry / releaseDueRetries | Same request replays the stored schedule/release result. |
| skip / block / clearPending | Same request replays without repeated terminal transitions. |

The same key with different business data returns `QUEUE_OPERATION_IDEMPOTENCY_CONFLICT`. Records survive restart and are retained for the Project lifetime in Phase 6; they are excluded from clear-pending. A bounded retention/compaction policy is deferred and must never remove keys while clients may safely retry them.
