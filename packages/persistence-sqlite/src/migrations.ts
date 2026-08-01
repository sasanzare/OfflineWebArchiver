import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { ProjectOperationError } from "@offline-web-archive/archive-core";

export interface Migration {
  id: string;
  sequence: number;
  sql: string;
  checksum: string;
}

const INITIALIZE_SCHEMA_SQL = `
CREATE TABLE schema_migrations (
  id TEXT PRIMARY KEY NOT NULL,
  sequence INTEGER NOT NULL UNIQUE CHECK (sequence > 0),
  checksum TEXT NOT NULL CHECK (length(checksum) = 64),
  applied_at TEXT NOT NULL,
  application_version TEXT NOT NULL,
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0)
) STRICT;

CREATE TABLE project_metadata (
  singleton_id INTEGER PRIMARY KEY NOT NULL CHECK (singleton_id = 1),
  project_id TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  project_slug TEXT NOT NULL,
  format_version TEXT NOT NULL,
  schema_version INTEGER NOT NULL CHECK (schema_version >= 0),
  created_at TEXT NOT NULL,
  last_opened_at TEXT NOT NULL,
  current_revision_id TEXT NOT NULL,
  current_run_id TEXT NOT NULL
) STRICT;

CREATE TABLE project_revisions (
  revision_id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  created_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('initialized', 'closed')),
  UNIQUE (project_id, sequence)
) STRICT;

CREATE TABLE runs (
  run_id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  revision_id TEXT NOT NULL REFERENCES project_revisions(revision_id) ON DELETE RESTRICT,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  created_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('initialized', 'closed')),
  UNIQUE (project_id, sequence)
) STRICT;
`;

const ADD_PROJECT_EVENTS_SQL = `
CREATE TABLE project_events (
  event_id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  correlation_id TEXT,
  details_json TEXT NOT NULL CHECK (json_valid(details_json))
) STRICT;

CREATE INDEX project_events_project_time
ON project_events(project_id, occurred_at, event_id);
`;

const ADD_SITE_PROFILES_SQL = `
CREATE TABLE site_profiles (
  profile_id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL UNIQUE,
  current_profile_revision_id TEXT NOT NULL UNIQUE,
  current_sequence INTEGER NOT NULL CHECK (current_sequence > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  profile_hash TEXT NOT NULL CHECK (length(profile_hash) = 64)
) STRICT;

CREATE TABLE site_profile_revisions (
  profile_revision_id TEXT PRIMARY KEY NOT NULL REFERENCES project_revisions(revision_id) ON DELETE RESTRICT,
  profile_id TEXT NOT NULL REFERENCES site_profiles(profile_id) ON DELETE RESTRICT,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  created_at TEXT NOT NULL,
  canonical_json TEXT NOT NULL CHECK (json_valid(canonical_json)),
  profile_hash TEXT NOT NULL CHECK (length(profile_hash) = 64),
  UNIQUE (profile_id, sequence)
) STRICT;

CREATE TABLE scope_rules (
  profile_revision_id TEXT NOT NULL REFERENCES site_profile_revisions(profile_revision_id) ON DELETE CASCADE,
  rule_kind TEXT NOT NULL CHECK (rule_kind IN ('domain', 'path', 'query')),
  rule_id TEXT NOT NULL,
  effect TEXT NOT NULL,
  match_type TEXT NOT NULL,
  canonical_json TEXT NOT NULL CHECK (json_valid(canonical_json)),
  PRIMARY KEY (profile_revision_id, rule_kind, rule_id)
) STRICT;

CREATE INDEX site_profile_revisions_profile_sequence
ON site_profile_revisions(profile_id, sequence);
`;

const ADD_PERSISTENT_PAGE_QUEUE_SQL = `
CREATE TABLE scope_decisions (
  decision_id TEXT NOT NULL CHECK (length(decision_id) = 64),
  project_id TEXT NOT NULL REFERENCES project_metadata(project_id) ON DELETE RESTRICT,
  run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE RESTRICT,
  profile_id TEXT NOT NULL REFERENCES site_profiles(profile_id) ON DELETE RESTRICT,
  profile_revision_id TEXT NOT NULL REFERENCES site_profile_revisions(profile_revision_id) ON DELETE RESTRICT,
  engine_version INTEGER NOT NULL CHECK (engine_version > 0),
  eligible INTEGER NOT NULL CHECK (eligible IN (0, 1)),
  should_queue INTEGER NOT NULL CHECK (should_queue IN (0, 1)),
  normalized_url TEXT,
  identity_url TEXT,
  identity_hash TEXT CHECK (identity_hash IS NULL OR length(identity_hash) = 64),
  safe_display_url TEXT,
  depth INTEGER NOT NULL CHECK (depth >= 0),
  reason_codes_json TEXT NOT NULL CHECK (json_valid(reason_codes_json)),
  matched_rule_ids_json TEXT NOT NULL CHECK (json_valid(matched_rule_ids_json)),
  recorded_at TEXT NOT NULL,
  PRIMARY KEY (decision_id, project_id, run_id)
) STRICT;

CREATE TABLE page_jobs (
  queue_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL UNIQUE,
  project_id TEXT NOT NULL REFERENCES project_metadata(project_id) ON DELETE RESTRICT,
  run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE RESTRICT,
  project_revision_id TEXT NOT NULL REFERENCES project_revisions(revision_id) ON DELETE RESTRICT,
  profile_id TEXT NOT NULL REFERENCES site_profiles(profile_id) ON DELETE RESTRICT,
  profile_revision_id TEXT NOT NULL REFERENCES site_profile_revisions(profile_revision_id) ON DELETE RESTRICT,
  engine_version INTEGER NOT NULL CHECK (engine_version > 0),
  job_type TEXT NOT NULL CHECK (job_type = 'page'),
  normalized_url TEXT NOT NULL CHECK (length(normalized_url) BETWEEN 1 AND 8192),
  identity_url TEXT NOT NULL CHECK (length(identity_url) BETWEEN 1 AND 8192),
  safe_display_url TEXT NOT NULL CHECK (length(safe_display_url) BETWEEN 1 AND 8192),
  identity_hash TEXT NOT NULL CHECK (length(identity_hash) = 64),
  scope_decision_id TEXT NOT NULL,
  scope_reason_code TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'processing', 'completed', 'failed', 'retrying', 'skipped', 'blocked')),
  priority INTEGER NOT NULL CHECK (priority BETWEEN 0 AND 1000),
  priority_source TEXT NOT NULL CHECK (priority_source IN ('policy', 'explicit')),
  depth INTEGER NOT NULL CHECK (depth >= 0),
  discovery_type TEXT NOT NULL CHECK (discovery_type IN ('seed', 'dom-link', 'canonical', 'redirect', 'sitemap', 'history-api', 'navigation-action', 'json-discovery', 'manual')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL CHECK (max_attempts BETWEEN 1 AND 100),
  next_eligible_at TEXT NOT NULL,
  claim_token TEXT,
  claimed_by TEXT,
  claimed_at TEXT,
  last_attempt_at TEXT,
  completed_at TEXT,
  failed_at TEXT,
  completion_key TEXT,
  result_version INTEGER CHECK (result_version IS NULL OR result_version > 0),
  result_summary_json TEXT CHECK (result_summary_json IS NULL OR json_valid(result_summary_json)),
  last_error_code TEXT,
  last_error_category TEXT CHECK (last_error_category IS NULL OR last_error_category IN ('validation', 'configuration', 'application', 'domain', 'platform', 'internal')),
  last_error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  queued_at TEXT NOT NULL,
  CHECK (attempt_count <= max_attempts),
  CHECK ((state = 'processing' AND claim_token IS NOT NULL AND claimed_by IS NOT NULL AND claimed_at IS NOT NULL)
      OR (state <> 'processing' AND claim_token IS NULL AND claimed_by IS NULL)),
  CHECK ((state = 'completed' AND completed_at IS NOT NULL AND completion_key IS NOT NULL AND result_version IS NOT NULL AND result_summary_json IS NOT NULL)
      OR (state <> 'completed' AND completed_at IS NULL)),
  CHECK ((state = 'failed' AND failed_at IS NOT NULL AND last_error_code IS NOT NULL AND last_error_category IS NOT NULL)
      OR state <> 'failed'),
  FOREIGN KEY (scope_decision_id, project_id, run_id)
    REFERENCES scope_decisions(decision_id, project_id, run_id) ON DELETE RESTRICT,
  UNIQUE (project_id, run_id, profile_revision_id, engine_version, identity_hash, job_type)
) STRICT;

CREATE TABLE job_attempts (
  attempt_id TEXT PRIMARY KEY NOT NULL,
  job_id TEXT NOT NULL REFERENCES page_jobs(job_id) ON DELETE RESTRICT,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  claim_token TEXT NOT NULL UNIQUE,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('processing', 'completed', 'failed', 'retrying', 'skipped', 'blocked')),
  error_code TEXT,
  error_category TEXT CHECK (error_category IS NULL OR error_category IN ('validation', 'configuration', 'application', 'domain', 'platform', 'internal')),
  safe_error_message TEXT,
  metadata_json TEXT NOT NULL CHECK (json_valid(metadata_json)),
  UNIQUE (job_id, attempt_number)
) STRICT;

CREATE TABLE job_transitions (
  transition_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  transition_id TEXT NOT NULL UNIQUE,
  job_id TEXT NOT NULL REFERENCES page_jobs(job_id) ON DELETE RESTRICT,
  from_state TEXT CHECK (from_state IS NULL OR from_state IN ('pending', 'processing', 'completed', 'failed', 'retrying', 'skipped', 'blocked')),
  to_state TEXT NOT NULL CHECK (to_state IN ('pending', 'processing', 'completed', 'failed', 'retrying', 'skipped', 'blocked')),
  reason_code TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  safe_metadata_json TEXT NOT NULL CHECK (json_valid(safe_metadata_json))
) STRICT;

CREATE TABLE job_discoveries (
  discovery_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  discovery_id TEXT NOT NULL UNIQUE,
  discovery_key TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES project_metadata(project_id) ON DELETE RESTRICT,
  run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE RESTRICT,
  parent_job_id TEXT REFERENCES page_jobs(job_id) ON DELETE RESTRICT,
  child_job_id TEXT NOT NULL REFERENCES page_jobs(job_id) ON DELETE RESTRICT,
  safe_source_url TEXT,
  discovery_type TEXT NOT NULL CHECK (discovery_type IN ('seed', 'dom-link', 'canonical', 'redirect', 'sitemap', 'history-api', 'navigation-action', 'json-discovery', 'manual')),
  source_depth INTEGER CHECK (source_depth IS NULL OR source_depth >= 0),
  result_depth INTEGER NOT NULL CHECK (result_depth >= 0),
  scope_decision_id TEXT NOT NULL,
  discovered_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL CHECK (json_valid(metadata_json)),
  FOREIGN KEY (scope_decision_id, project_id, run_id)
    REFERENCES scope_decisions(decision_id, project_id, run_id) ON DELETE RESTRICT,
  UNIQUE (child_job_id, discovery_key)
) STRICT;

CREATE TABLE queue_operations (
  operation_record_id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES project_metadata(project_id) ON DELETE RESTRICT,
  run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE RESTRICT,
  operation_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL CHECK (length(request_hash) = 64),
  result_json TEXT NOT NULL CHECK (json_valid(result_json)),
  created_at TEXT NOT NULL,
  UNIQUE (project_id, operation_type, idempotency_key)
) STRICT;

CREATE INDEX page_jobs_claim_order
ON page_jobs(project_id, run_id, state, priority DESC, next_eligible_at, depth, queue_sequence, job_id);

CREATE INDEX page_jobs_retry_due
ON page_jobs(project_id, run_id, state, next_eligible_at, queue_sequence);

CREATE INDEX page_jobs_state
ON page_jobs(project_id, run_id, state, queue_sequence);

CREATE INDEX job_attempts_job_number
ON job_attempts(job_id, attempt_number);

CREATE INDEX job_transitions_job_time
ON job_transitions(job_id, transition_sequence);

CREATE INDEX job_discoveries_child_time
ON job_discoveries(child_job_id, discovery_sequence);

CREATE INDEX job_discoveries_parent
ON job_discoveries(parent_job_id, child_job_id);

CREATE INDEX queue_operations_project_time
ON queue_operations(project_id, run_id, created_at, operation_record_id);
`;

const ADD_CHECKPOINT_LEASE_RECOVERY_SQL = `
ALTER TABLE page_jobs ADD COLUMN fencing_generation INTEGER NOT NULL DEFAULT 0 CHECK (fencing_generation >= 0);
ALTER TABLE page_jobs ADD COLUMN recovery_state TEXT CHECK (recovery_state IS NULL OR recovery_state IN ('interrupted', 'paused'));
ALTER TABLE job_attempts ADD COLUMN recovery_outcome TEXT CHECK (recovery_outcome IS NULL OR recovery_outcome IN ('interrupted', 'paused'));
ALTER TABLE job_transitions ADD COLUMN recovery_from_state TEXT CHECK (recovery_from_state IS NULL OR recovery_from_state IN ('interrupted', 'paused'));
ALTER TABLE job_transitions ADD COLUMN recovery_to_state TEXT CHECK (recovery_to_state IS NULL OR recovery_to_state IN ('interrupted', 'paused'));

CREATE TABLE run_control (
  project_id TEXT NOT NULL REFERENCES project_metadata(project_id) ON DELETE RESTRICT,
  run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE RESTRICT,
  control_state TEXT NOT NULL CHECK (control_state IN ('active', 'pause_requested', 'paused', 'resuming', 'recovering', 'stopped', 'completed', 'failed')),
  requested_at TEXT,
  paused_at TEXT,
  updated_at TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  PRIMARY KEY (project_id, run_id)
) STRICT;

INSERT INTO run_control (project_id, run_id, control_state, updated_at, operation_id)
SELECT project_id, run_id, 'active', created_at, 'migration-005' FROM runs;

CREATE TABLE job_leases (
  lease_id TEXT PRIMARY KEY NOT NULL,
  job_id TEXT NOT NULL REFERENCES page_jobs(job_id) ON DELETE RESTRICT,
  project_id TEXT NOT NULL REFERENCES project_metadata(project_id) ON DELETE RESTRICT,
  run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE RESTRICT,
  owner_id TEXT NOT NULL CHECK (length(owner_id) BETWEEN 1 AND 120),
  lease_token_hash TEXT NOT NULL CHECK (length(lease_token_hash) = 64),
  fencing_generation INTEGER NOT NULL CHECK (fencing_generation > 0),
  status TEXT NOT NULL CHECK (status IN ('active', 'released', 'expired', 'recovered')),
  acquired_at TEXT NOT NULL,
  heartbeat_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  released_at TEXT,
  release_reason TEXT,
  last_operation_id TEXT NOT NULL,
  UNIQUE (job_id, fencing_generation),
  UNIQUE (lease_token_hash)
) STRICT;

CREATE UNIQUE INDEX job_leases_one_active_per_job
ON job_leases(job_id) WHERE status = 'active';
CREATE INDEX job_leases_run_expiration
ON job_leases(project_id, run_id, status, expires_at, job_id);
CREATE INDEX job_leases_owner
ON job_leases(project_id, run_id, owner_id, status);

CREATE TABLE job_checkpoints (
  checkpoint_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  checkpoint_id TEXT NOT NULL UNIQUE,
  job_id TEXT NOT NULL REFERENCES page_jobs(job_id) ON DELETE RESTRICT,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  checkpoint_version INTEGER NOT NULL CHECK (checkpoint_version > 0),
  fencing_generation INTEGER NOT NULL CHECK (fencing_generation > 0),
  owner_id TEXT NOT NULL CHECK (length(owner_id) BETWEEN 1 AND 120),
  phase TEXT NOT NULL CHECK (length(phase) BETWEEN 1 AND 120),
  progress REAL NOT NULL CHECK (progress >= 0 AND progress <= 1),
  relative_path TEXT,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  committed INTEGER NOT NULL CHECK (committed IN (0, 1)),
  supersedes_checkpoint_id TEXT REFERENCES job_checkpoints(checkpoint_id) ON DELETE RESTRICT,
  operation_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (job_id, attempt_number, fencing_generation, operation_id)
) STRICT;

CREATE INDEX job_checkpoints_latest
ON job_checkpoints(job_id, checkpoint_sequence DESC);

CREATE TABLE run_checkpoints (
  checkpoint_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  checkpoint_id TEXT NOT NULL UNIQUE,
  project_id TEXT NOT NULL REFERENCES project_metadata(project_id) ON DELETE RESTRICT,
  run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE RESTRICT,
  checkpoint_version INTEGER NOT NULL CHECK (checkpoint_version > 0),
  control_state TEXT NOT NULL CHECK (control_state IN ('active', 'pause_requested', 'paused', 'resuming', 'recovering', 'stopped', 'completed', 'failed')),
  pending_jobs INTEGER NOT NULL CHECK (pending_jobs >= 0),
  processing_jobs INTEGER NOT NULL CHECK (processing_jobs >= 0),
  completed_jobs INTEGER NOT NULL CHECK (completed_jobs >= 0),
  operation_id TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX run_checkpoints_latest
ON run_checkpoints(project_id, run_id, checkpoint_sequence DESC);

CREATE TABLE artifact_checkpoints (
  artifact_checkpoint_id TEXT PRIMARY KEY NOT NULL,
  job_id TEXT NOT NULL REFERENCES page_jobs(job_id) ON DELETE RESTRICT,
  artifact_key TEXT NOT NULL CHECK (length(artifact_key) BETWEEN 1 AND 160),
  artifact_kind TEXT NOT NULL CHECK (artifact_kind IN ('document', 'asset', 'metadata', 'partial-file')),
  relative_path TEXT NOT NULL CHECK (length(relative_path) BETWEEN 1 AND 2048),
  bytes_written INTEGER NOT NULL CHECK (bytes_written >= 0),
  expected_bytes INTEGER CHECK (expected_bytes IS NULL OR expected_bytes >= bytes_written),
  sha256 TEXT CHECK (sha256 IS NULL OR length(sha256) = 64),
  validator TEXT,
  resume_offset INTEGER NOT NULL CHECK (resume_offset >= 0 AND resume_offset <= bytes_written),
  fencing_generation INTEGER NOT NULL CHECK (fencing_generation > 0),
  committed INTEGER NOT NULL CHECK (committed IN (0, 1)),
  operation_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (job_id, artifact_key, fencing_generation, operation_id)
) STRICT;

CREATE INDEX artifact_checkpoints_latest
ON artifact_checkpoints(job_id, artifact_key, created_at DESC, artifact_checkpoint_id DESC);

CREATE TABLE completed_outputs (
  descriptor_id TEXT PRIMARY KEY NOT NULL,
  job_id TEXT NOT NULL REFERENCES page_jobs(job_id) ON DELETE RESTRICT,
  relative_path TEXT NOT NULL CHECK (length(relative_path) BETWEEN 1 AND 2048),
  byte_length INTEGER NOT NULL CHECK (byte_length >= 0),
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  verification_policy TEXT NOT NULL CHECK (verification_policy = 'size-and-sha256'),
  verified_at TEXT,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('pending', 'valid', 'missing', 'size-mismatch', 'hash-mismatch')),
  UNIQUE (job_id, relative_path)
) STRICT;

CREATE TABLE recovery_operations (
  recovery_operation_id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES project_metadata(project_id) ON DELETE RESTRICT,
  run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL CHECK (length(request_hash) = 64),
  status TEXT NOT NULL CHECK (status IN ('inspected', 'in_progress', 'completed', 'failed')),
  dry_run INTEGER NOT NULL CHECK (dry_run IN (0, 1)),
  evaluation_time TEXT NOT NULL,
  batch_limit INTEGER NOT NULL CHECK (batch_limit BETWEEN 1 AND 500),
  cursor INTEGER NOT NULL DEFAULT 0 CHECK (cursor >= 0),
  scanned INTEGER NOT NULL DEFAULT 0 CHECK (scanned >= 0),
  interrupted INTEGER NOT NULL DEFAULT 0 CHECK (interrupted >= 0),
  requeued INTEGER NOT NULL DEFAULT 0 CHECK (requeued >= 0),
  paused INTEGER NOT NULL DEFAULT 0 CHECK (paused >= 0),
  output_issues INTEGER NOT NULL DEFAULT 0 CHECK (output_issues >= 0),
  has_more INTEGER NOT NULL DEFAULT 0 CHECK (has_more IN (0, 1)),
  items_json TEXT NOT NULL CHECK (json_valid(items_json)),
  owner_operation_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE (project_id, run_id, idempotency_key)
) STRICT;

CREATE UNIQUE INDEX recovery_operations_one_active_run
ON recovery_operations(project_id, run_id) WHERE status = 'in_progress';
CREATE INDEX recovery_operations_run_time
ON recovery_operations(project_id, run_id, started_at DESC, recovery_operation_id DESC);

CREATE TABLE recovery_events (
  recovery_event_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  recovery_event_id TEXT NOT NULL UNIQUE,
  recovery_operation_id TEXT REFERENCES recovery_operations(recovery_operation_id) ON DELETE RESTRICT,
  project_id TEXT NOT NULL REFERENCES project_metadata(project_id) ON DELETE RESTRICT,
  run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE RESTRICT,
  job_id TEXT REFERENCES page_jobs(job_id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT,
  fencing_generation INTEGER,
  safe_metadata_json TEXT NOT NULL CHECK (json_valid(safe_metadata_json)),
  occurred_at TEXT NOT NULL
) STRICT;

CREATE INDEX recovery_events_run_time
ON recovery_events(project_id, run_id, recovery_event_sequence);
CREATE INDEX recovery_events_job_time
ON recovery_events(job_id, recovery_event_sequence);

CREATE TABLE execution_sessions (
  session_id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES project_metadata(project_id) ON DELETE RESTRICT,
  run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE RESTRICT,
  process_id INTEGER NOT NULL CHECK (process_id > 0),
  host_id TEXT NOT NULL CHECK (length(host_id) BETWEEN 1 AND 160),
  started_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  closed_at TEXT,
  close_kind TEXT CHECK (close_kind IS NULL OR close_kind IN ('clean', 'unclean-detected'))
) STRICT;

CREATE INDEX execution_sessions_unclean
ON execution_sessions(project_id, run_id, closed_at, last_seen_at);
`;

function checksum(sql: string): string {
  return createHash("sha256").update(sql, "utf8").digest("hex");
}

export const MIGRATIONS: readonly Migration[] = Object.freeze([
  Object.freeze({ id: "001_initialize_project_schema", sequence: 1, sql: INITIALIZE_SCHEMA_SQL, checksum: checksum(INITIALIZE_SCHEMA_SQL) }),
  Object.freeze({ id: "002_add_project_events", sequence: 2, sql: ADD_PROJECT_EVENTS_SQL, checksum: checksum(ADD_PROJECT_EVENTS_SQL) }),
  Object.freeze({ id: "003_add_site_profiles", sequence: 3, sql: ADD_SITE_PROFILES_SQL, checksum: checksum(ADD_SITE_PROFILES_SQL) }),
  Object.freeze({ id: "004_add_persistent_page_queue", sequence: 4, sql: ADD_PERSISTENT_PAGE_QUEUE_SQL, checksum: checksum(ADD_PERSISTENT_PAGE_QUEUE_SQL) }),
  Object.freeze({ id: "005_add_checkpoint_lease_recovery", sequence: 5, sql: ADD_CHECKPOINT_LEASE_RECOVERY_SQL, checksum: checksum(ADD_CHECKPOINT_LEASE_RECOVERY_SQL) }),
]);

export const CURRENT_SCHEMA_VERSION = MIGRATIONS.length;

interface AppliedMigrationRow {
  id: string;
  sequence: number;
  checksum: string;
}

function migrationTableExists(database: DatabaseSync): boolean {
  const row = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
    .get() as { name?: string } | undefined;
  return row?.name === "schema_migrations";
}

export function validateMigrationDefinitions(migrations: readonly Migration[] = MIGRATIONS): void {
  const ids = new Set<string>();
  const sequences = new Set<number>();
  migrations.forEach((migration, index) => {
    if (!/^\d{3}_[a-z0-9_]+$/.test(migration.id)) throw new Error(`Invalid migration id ${migration.id}`);
    if (migration.sequence !== index + 1) throw new Error(`Migration sequence gap at ${migration.id}`);
    if (ids.has(migration.id) || sequences.has(migration.sequence)) throw new Error(`Duplicate migration ${migration.id}`);
    if (checksum(migration.sql) !== migration.checksum) throw new Error(`Migration checksum is stale for ${migration.id}`);
    ids.add(migration.id);
    sequences.add(migration.sequence);
  });
}

export function readAppliedMigrations(database: DatabaseSync): AppliedMigrationRow[] {
  if (!migrationTableExists(database)) return [];
  return database
    .prepare("SELECT id, sequence, checksum FROM schema_migrations ORDER BY sequence")
    .all() as unknown as AppliedMigrationRow[];
}

export function inspectMigrationState(database: DatabaseSync): {
  applied: number;
  pending: readonly Migration[];
} {
  validateMigrationDefinitions();
  const applied = readAppliedMigrations(database);
  for (const [index, row] of applied.entries()) {
    const expected = MIGRATIONS[index];
    if (expected === undefined || row.id !== expected.id || row.sequence !== expected.sequence) {
      throw new ProjectOperationError("PROJECT_SCHEMA_UNSUPPORTED", "The database has an unknown migration history");
    }
    if (row.checksum !== expected.checksum) {
      throw new ProjectOperationError(
        "PROJECT_MIGRATION_CHECKSUM_MISMATCH",
        `Applied migration ${row.id} no longer matches its recorded checksum`,
      );
    }
  }
  return { applied: applied.length, pending: MIGRATIONS.slice(applied.length) };
}

export function configureDatabase(database: DatabaseSync): void {
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA synchronous = FULL");
  database.exec("PRAGMA busy_timeout = 5000");
  database.exec("PRAGMA trusted_schema = OFF");
}

export function applyPendingMigrations(
  database: DatabaseSync,
  applicationVersion: string,
  now: () => string,
  onApplied?: (migration: Migration, durationMs: number) => void,
): number {
  const state = inspectMigrationState(database);
  for (const migration of state.pending) {
    const started = performance.now();
    try {
      database.exec("BEGIN IMMEDIATE");
      database.exec(migration.sql);
      const durationMs = Math.max(0, Math.round(performance.now() - started));
      database.prepare(`
        INSERT INTO schema_migrations
          (id, sequence, checksum, applied_at, application_version, duration_ms)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(migration.id, migration.sequence, migration.checksum, now(), applicationVersion, durationMs);
      database.exec(`PRAGMA user_version = ${migration.sequence}`);
      database.exec("COMMIT");
      onApplied?.(migration, durationMs);
    } catch (error) {
      if (database.isTransaction) database.exec("ROLLBACK");
      throw new ProjectOperationError(
        "PROJECT_MIGRATION_FAILED",
        error instanceof Error ? error.message : `Migration ${migration.id} failed`,
      );
    }
  }
  return CURRENT_SCHEMA_VERSION;
}
