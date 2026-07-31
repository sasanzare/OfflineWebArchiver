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

function checksum(sql: string): string {
  return createHash("sha256").update(sql, "utf8").digest("hex");
}

export const MIGRATIONS: readonly Migration[] = Object.freeze([
  Object.freeze({ id: "001_initialize_project_schema", sequence: 1, sql: INITIALIZE_SCHEMA_SQL, checksum: checksum(INITIALIZE_SCHEMA_SQL) }),
  Object.freeze({ id: "002_add_project_events", sequence: 2, sql: ADD_PROJECT_EVENTS_SQL, checksum: checksum(ADD_PROJECT_EVENTS_SQL) }),
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
