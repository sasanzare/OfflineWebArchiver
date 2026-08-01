import { DatabaseSync } from "node:sqlite";
import { applyPendingMigrations, configureDatabase } from "@offline-web-archive/persistence-sqlite";
import { CHECKPOINT_MODEL_VERSION, validateCheckpointPayload, validatePortableRelativePath } from "@offline-web-archive/recovery";

if (CHECKPOINT_MODEL_VERSION !== 1) throw new Error("Unexpected Checkpoint model version");
validateCheckpointPayload({ phase: "validation", cursor: 1, relativePath: "temp/page.part" });
validatePortableRelativePath("temp/page.part");
const database = new DatabaseSync(":memory:", { allowExtension: false, defensive: true });
configureDatabase(database);
applyPendingMigrations(database, "0.8.0", () => "2026-08-01T12:00:00.000Z");
for (const table of ["job_checkpoints", "run_checkpoints", "artifact_checkpoints", "completed_outputs"]) {
  if (database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table) === undefined) throw new Error(`Missing Checkpoint table ${table}`);
}
database.close();
process.stdout.write("Checkpoint payload, path, version, and schema invariants passed.\n");
