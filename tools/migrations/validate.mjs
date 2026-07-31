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
applyPendingMigrations(database, "0.4.0", () => "2026-07-31T12:00:00.000Z");
const state = inspectMigrationState(database);
const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((row) => row.name);
for (const required of ["schema_migrations", "project_metadata", "project_revisions", "runs", "project_events"]) {
  if (!tables.includes(required)) throw new Error(`Missing migration table ${required}`);
}
if (state.applied !== CURRENT_SCHEMA_VERSION || state.pending.length !== 0 || MIGRATIONS.length !== CURRENT_SCHEMA_VERSION) {
  throw new Error("Migration version constants are inconsistent");
}
database.close();
process.stdout.write(`Validated ${MIGRATIONS.length} immutable migrations at schema ${CURRENT_SCHEMA_VERSION}.\n`);
