# Page Job State Machine — Transitional Legacy Artifact

> This file is not authoritative. The migrated Concept is [Page Job State Machine](../../workflow/job-state-machine.md). It remains for legacy-path compatibility until Phase 8 cleanup.

**Status:** VERIFIED through version 2.

Phase 7 adds logical processing→interrupted/paused, interrupted→pending/failed/blocked, and paused→pending. Completed, failed, skipped and blocked remain terminal. Abandoned attempts close as interrupted; pause acknowledgement closes as paused. Recovery and Resume retain histories and the next claim increments Fencing Generation.
