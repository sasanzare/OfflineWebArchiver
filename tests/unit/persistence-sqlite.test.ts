import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir, rm, writeFile, mkdtemp } from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { strToU8, zipSync } from "fflate";
import { ProjectOperationError } from "@offline-web-archive/archive-core";
import { PROJECT_LOCK_FILE } from "@offline-web-archive/project-format";
import {
  acquireProjectLock,
  applyPendingMigrations,
  atomicWriteFile,
  configureDatabase,
  inspectMigrationState,
  inspectZipArchive,
  MIGRATIONS,
  validateMigrationDefinitions,
} from "@offline-web-archive/persistence-sqlite";

test("migration definitions are ordered, immutable, and detect recorded checksum drift", () => {
  validateMigrationDefinitions();
  assert.throws(() => validateMigrationDefinitions([{ ...MIGRATIONS[0]!, sequence: 2 }]));
  const database = new DatabaseSync(":memory:");
  configureDatabase(database);
  applyPendingMigrations(database, "0.4.0", () => "2026-07-31T12:00:00.000Z");
  database.prepare("UPDATE schema_migrations SET checksum = ? WHERE sequence = 1").run("0".repeat(64));
  assert.throws(
    () => inspectMigrationState(database),
    (error) => error instanceof ProjectOperationError && error.code === "PROJECT_MIGRATION_CHECKSUM_MISMATCH",
  );
  database.close();
});

test("a failed migration transaction rolls back its schema changes", () => {
  const database = new DatabaseSync(":memory:");
  configureDatabase(database);
  const first = MIGRATIONS[0]!;
  database.exec(first.sql);
  database.prepare("INSERT INTO schema_migrations (id, sequence, checksum, applied_at, application_version, duration_ms) VALUES (?, 1, ?, ?, ?, 0)")
    .run(first.id, first.checksum, "2026-07-31T12:00:00.000Z", "0.4.0");
  database.exec("PRAGMA user_version = 1");
  database.exec("CREATE TRIGGER reject_second BEFORE INSERT ON schema_migrations WHEN NEW.sequence = 2 BEGIN SELECT RAISE(ABORT, 'injected migration failure'); END");
  assert.throws(() => applyPendingMigrations(database, "0.4.0", () => "2026-07-31T12:00:00.000Z"));
  const row = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'project_events'").get();
  assert.equal(row, undefined);
  assert.equal(inspectMigrationState(database).applied, 1);
  database.close();
});

test("schema 6 installs Lease, Checkpoint, Recovery, and Render ledgers", () => {
  const database = new DatabaseSync(":memory:", { allowExtension: false, defensive: true });
  configureDatabase(database);
  applyPendingMigrations(database, "0.8.0", () => "2026-08-01T12:00:00.000Z");
  const tables = new Set((database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((row) => row.name));
  for (const name of ["scope_decisions", "page_jobs", "job_attempts", "job_transitions", "job_discoveries", "queue_operations", "job_leases", "job_checkpoints", "run_checkpoints", "artifact_checkpoints", "completed_outputs", "recovery_operations", "recovery_events", "execution_sessions", "run_control", "render_results", "render_events", "render_failures"]) assert.equal(tables.has(name), true, name);
  assert.equal(tables.has("workers"), false);
  const indexes = new Set((database.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all() as { name: string }[]).map((row) => row.name));
  for (const name of ["page_jobs_claim_order", "page_jobs_retry_due", "page_jobs_state", "job_attempts_job_number", "job_transitions_job_time", "job_discoveries_child_time", "queue_operations_project_time", "render_results_job_created", "render_events_job_sequence", "render_failures_job_time"]) assert.equal(indexes.has(name), true, name);
  const jobColumns = (database.prepare("PRAGMA table_info(page_jobs)").all() as { name: string }[]).map((row) => row.name);
  for (const required of ["fencing_generation", "recovery_state"]) assert.equal(jobColumns.includes(required), true, required);
  assert.equal(database.prepare("PRAGMA foreign_keys").get()!["foreign_keys"], 1);
  assert.equal(database.prepare("PRAGMA integrity_check").get()!["integrity_check"], "ok");
  assert.equal(database.prepare("PRAGMA user_version").get()!["user_version"], 6);
  database.close();
});

test("atomic writes preserve prior content on refusal and leave no temporary sibling", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "owa-atomic-"));
  const target = path.join(root, "project.json");
  try {
    await atomicWriteFile(target, "first\n");
    await assert.rejects(() => atomicWriteFile(target, "second\n"), (error) => error instanceof ProjectOperationError && error.code === "PROJECT_ALREADY_EXISTS");
    assert.equal(await readFile(target, "utf8"), "first\n");
    await atomicWriteFile(target, "second\n", { overwrite: true });
    assert.equal(await readFile(target, "utf8"), "second\n");
    assert.deepEqual(await readdir(root), ["project.json"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("single-writer locks reject active owners and recover a provably stale same-host lock", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "owa-lock-"));
  try {
    const first = await acquireProjectLock(root, "test", () => "2026-07-31T12:00:00.000Z");
    await assert.rejects(() => acquireProjectLock(root, "test", () => "2026-07-31T12:00:00.000Z"), (error) => error instanceof ProjectOperationError && error.code === "PROJECT_LOCKED");
    await first.release();
    await writeFile(path.join(root, PROJECT_LOCK_FILE), `${JSON.stringify({ version: 1, instanceId: randomUUID(), pid: 2_000_000_000, hostname: hostname(), operation: "dead", createdAt: "2026-07-31T12:00:00.000Z" })}\n`);
    const recovered = await acquireProjectLock(root, "recovered", () => "2026-07-31T12:00:01.000Z");
    await recovered.release();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ZIP inspection rejects traversal, cross-platform aliases, corruption, and expansion limits", () => {
  assert.throws(() => inspectZipArchive(zipSync({ "../evil.txt": strToU8("x") })), ProjectOperationError);
  assert.throws(() => inspectZipArchive(zipSync({ "A.txt": strToU8("a"), "a.txt": strToU8("b") })), ProjectOperationError);
  assert.throws(() => inspectZipArchive(new Uint8Array([1, 2, 3, 4])), ProjectOperationError);
  const archive = zipSync({ "large.txt": strToU8("x".repeat(1000)) });
  assert.throws(() => inspectZipArchive(archive, {
    maximumArchiveBytes: 10_000,
    maximumEntries: 10,
    maximumExpandedBytes: 100,
    maximumSingleEntryBytes: 100,
    maximumCompressionRatio: 100,
  }), (error) => error instanceof ProjectOperationError && error.code === "PROJECT_IMPORT_LIMIT_EXCEEDED");
});
