# Recovery Operations

Recovery has three surfaces: inspect, apply, and report. Inspection is safe and read-only. Apply requires confirmation and an idempotency key. Reports contain a stable operation ID, evaluation time, cursor, scanned/interrupted/output-issue counts, `hasMore`, and bounded reason-coded items.

The operation ledger enforces one active operation per Project/Run and request-hash equality for idempotency reuse. Each batch uses `BEGIN IMMEDIATE`; a failure rolls back that batch. A persisted cursor and cumulative counters allow the same operation to resume after a crash. Competing recovery callers serialize and cannot double-transition the same Job.

Recovery never follows user paths, emits token values, or performs network requests. CLI and Desktop expose dry-run/inspect before confirmed apply.
