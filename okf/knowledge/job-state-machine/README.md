# Page Job State Machine

**Status:** VERIFIED  
**Version:** 1  
**Authority:** `packages/queue/src/index.ts`

The closed vocabulary is `pending`, `processing`, `completed`, `failed`, `retrying`, `skipped`, and `blocked`. `completed`, `failed`, `skipped`, and `blocked` are terminal for the current Run.

Version 1 permits only:

- `pending -> processing`, `pending -> skipped`, `pending -> blocked`
- `processing -> completed`, `processing -> failed`, `processing -> retrying`, `processing -> skipped`, `processing -> blocked`
- `retrying -> pending`, `retrying -> failed`

All other state pairs are rejected. State changes, timestamps, reasons, attempt effects, claim-token requirements, and idempotency behavior are implemented as explicit commands and durable transition rows. Terminal Jobs cannot be silently reopened; administrative requeue is deferred.

Claims increment attempts only after a successful guarded claim. Retryable failures enter `retrying` while attempts remain; exhausted or non-retryable failures enter terminal `failed`. Retry release is explicit and due-time bounded. No HTTP backoff policy exists in this phase.

`paused`, `interrupted`, `waiting_for_network`, and `waiting_for_auth` are reserved vocabulary only. Lease/Heartbeat/Checkpoint recovery is `PLANNED` for Product Phase 7 and is not an operational state or timer in version 1.
