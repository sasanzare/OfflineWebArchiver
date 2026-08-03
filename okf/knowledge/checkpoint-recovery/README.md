# Checkpoint Recovery — Transitional Legacy Artifact

> This file is not authoritative. The migrated Concept is [Checkpoint Recovery](../../recovery/checkpoint-recovery.md). It remains for legacy-path compatibility until Phase 8 cleanup.

**Status:** VERIFIED through Product Phase 7. Recovery model 1 provides inspect-only Project open, explicit confirmed/idempotent apply, bounded 100/default and 500/max batches, durable cursor/report Resume, interrupted attempt history, and safe requeue. Evidence: `packages/persistence-sqlite/src/recovery.ts` and recovery/process-kill tests.
