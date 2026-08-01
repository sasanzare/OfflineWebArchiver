# Run Control State

Run control states are `active`, `pause_requested`, `paused`, `resuming`, `recovering`, `stopped`, `completed`, and `failed`. Migration 005 backfills one `active` row for existing Runs, and new Runs create the row explicitly. State changes are transactional, Project/Run owned, idempotent by operation ID, and paired with Run Checkpoints.

Only `active` Runs may claim new work. Pause is requested by the controller, acknowledged by a current Lease owner at a Checkpoint boundary, and resumed by an explicit controller action. `recovering` serializes a confirmed recovery batch; terminal Run states do not accept new claims. Run control is independent from browser lifecycle; no renderer or worker pool is present.
