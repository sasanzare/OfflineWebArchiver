import { DatabaseSync } from "node:sqlite";
import {
  applyPendingMigrations,
  configureDatabase,
  CURRENT_SCHEMA_VERSION,
  inspectMigrationState,
  MIGRATIONS,
  validateMigrationDefinitions,
} from "@offline-web-archive/persistence-sqlite";

validateMigrationDefinitions();
const database = new DatabaseSync(":memory:", { allowExtension: false, defensive: true });
configureDatabase(database);
applyPendingMigrations(database, "0.8.0", () => "2026-08-01T12:00:00.000Z");
const state = inspectMigrationState(database);
const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((row) => row.name);
for (const required of ["schema_migrations", "project_metadata", "project_revisions", "runs", "project_events", "site_profiles", "site_profile_revisions", "scope_rules", "scope_decisions", "page_jobs", "job_attempts", "job_transitions", "job_discoveries", "queue_operations", "run_control", "job_leases", "job_checkpoints", "run_checkpoints", "artifact_checkpoints", "completed_outputs", "recovery_operations", "recovery_events", "execution_sessions", "render_results", "render_events", "render_failures"]) {
  if (!tables.includes(required)) throw new Error(`Missing migration table ${required}`);
}
for (const forbidden of ["workers", "browser_sessions", "proxy_credentials", "authentication_secrets"]) {
  if (tables.includes(forbidden)) throw new Error(`Product Phase 8 table ${forbidden} must not exist`);
}
if (state.applied !== CURRENT_SCHEMA_VERSION || state.pending.length !== 0 || MIGRATIONS.length !== CURRENT_SCHEMA_VERSION) {
  throw new Error("Migration version constants are inconsistent");
}
database.close();
process.stdout.write(`Validated ${MIGRATIONS.length} immutable migrations at schema ${CURRENT_SCHEMA_VERSION}.\n`);
