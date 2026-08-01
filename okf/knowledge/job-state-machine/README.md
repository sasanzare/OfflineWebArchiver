# Page Job State Machine

**Status:** VERIFIED through version 2.

Phase 7 adds logical processing→interrupted/paused, interrupted→pending/failed/blocked, and paused→pending. Completed, failed, skipped and blocked remain terminal. Abandoned attempts close as interrupted; pause acknowledgement closes as paused. Recovery and Resume retain histories and the next claim increments Fencing Generation.
