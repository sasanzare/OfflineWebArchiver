# Queue Persistence

SQLite schema `4` is introduced by forward-only migration `004_add_persistent_page_queue`; migrations 001–003 are unchanged. A verified database backup and sidecar precede migration of an existing Project, and the migration runner wraps each migration in one transaction with checksum validation.

Tables are `scope_decisions`, `page_jobs`, `job_attempts`, `job_transitions`, `job_discoveries`, and `queue_operations`. Important constraints cover seven states, terminal timestamps, processing ownership, priority `0..1000`, attempt bounds and uniqueness, result JSON validity, composite Project/Run Scope references, logical Job uniqueness, discovery uniqueness, and operation idempotency.

Indexes are `page_jobs_claim_order`, `page_jobs_retry_due`, `page_jobs_state`, `job_attempts_job_number`, `job_transitions_job_time`, `job_discoveries_child_time`, `job_discoveries_parent`, and `queue_operations_project_time`. Transition and discovery sequences provide insertion-order history even when timestamps tie.

Archive Core exposes `QueueRepositoryPort`; `@offline-web-archive/persistence-sqlite` implements it without leaking `DatabaseSync`, SQL, or database paths through contracts. Application Service opens the selected Project and orchestrates operations. CLI and Desktop never import persistence.

No Lease, Heartbeat, Checkpoint, Worker, or recovery table/column exists. Clear-pending moves visible Jobs to `skipped`; it deletes no Job, attempt, transition, discovery, or idempotency history.
