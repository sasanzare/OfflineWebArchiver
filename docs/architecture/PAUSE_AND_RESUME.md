# Pause and Resume

Pause is cooperative. `run.requestPause` moves Run control from `active` to `pause_requested`. An owner acknowledges at a safe boundary by writing a final Job Checkpoint and Run Checkpoint, releasing its Lease, and moving the Job to logical `paused`. The Run becomes `paused` only after acknowledgement.

`run.resume` records the transient `resuming` state, changes the Run back to `active`, and requeues paused Jobs to `pending`; the next claim receives a higher Fencing Generation. Resume never reuses a released token. A pause request is not a forced process kill, and Phase 7 does not implement a Worker Pool or pause timeout.

Project/Profile revision changes are not auto-reconciled; ownership and revision mismatches fail closed and require a future explicit policy.
