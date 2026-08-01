# Checkpoint Recovery

**Status:** VERIFIED through Product Phase 7. Recovery model 1 provides inspect-only Project open, explicit confirmed/idempotent apply, bounded 100/default and 500/max batches, durable cursor/report Resume, interrupted attempt history, and safe requeue. Evidence: `packages/persistence-sqlite/src/recovery.ts` and recovery/process-kill tests.
