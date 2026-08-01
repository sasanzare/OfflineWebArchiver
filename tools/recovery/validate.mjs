import { DatabaseSync } from "node:sqlite";
import { PAGE_JOB_STATES } from "@offline-web-archive/archive-core";
import { applyPendingMigrations, configureDatabase, CURRENT_SCHEMA_VERSION } from "@offline-web-archive/persistence-sqlite";
import { DEFAULT_LEASE_CONFIGURATION, RECOVERY_MODEL_VERSION, validateLeaseConfiguration } from "@offline-web-archive/recovery";

if (RECOVERY_MODEL_VERSION !== 1) throw new Error("Unexpected Recovery model version");
if (!PAGE_JOB_STATES.includes("interrupted") || !PAGE_JOB_STATES.includes("paused")) throw new Error("Recovery states are missing");
validateLeaseConfiguration(DEFAULT_LEASE_CONFIGURATION);
const database = new DatabaseSync(":memory:", { allowExtension: false, defensive: true });
configureDatabase(database);
applyPendingMigrations(database, "0.7.0", () => "2026-08-01T12:00:00.000Z");
for (const table of ["run_control", "job_leases", "recovery_operations", "recovery_events", "execution_sessions"]) {
  if (database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table) === undefined) throw new Error(`Missing Recovery table ${table}`);
}
if (CURRENT_SCHEMA_VERSION !== 5) throw new Error("Recovery requires SQLite schema 5");
database.close();
process.stdout.write("Recovery model, configuration, states, and schema invariants passed.\n");
