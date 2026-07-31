import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { ProjectOperationError } from "@offline-web-archive/archive-core";
import { extractAndVerifyProjectArchive, createSqliteProjectStorage } from "@offline-web-archive/persistence-sqlite";

async function workspace() {
  const root = await mkdtemp(path.join(tmpdir(), "owa-project-"));
  return { root, dispose: () => rm(root, { recursive: true, force: true }) };
}

test("create, validate, open, close, move, export, and import preserve Project identity", async () => {
  const temporary = await workspace();
  const projectPath = path.join(temporary.root, "project");
  const archivePath = path.join(temporary.root, "project.zip");
  const importedPath = path.join(temporary.root, "imported");
  const movedPath = path.join(temporary.root, "moved");
  const storage = createSqliteProjectStorage({ applicationVersion: "0.4.0" });
  try {
    const created = await storage.create({ destinationPath: projectPath, name: "Lifecycle", slug: "lifecycle" });
    assert.equal(created.state, "closed");
    assert.equal((await storage.validate(projectPath)).valid, true);
    const opened = await storage.open(projectPath);
    assert.equal(opened.projectId, created.projectId);
    assert.equal(opened.state, "ready");
    await assert.rejects(
      () => createSqliteProjectStorage({ applicationVersion: "0.4.0" }).open(projectPath),
      (error) => error instanceof ProjectOperationError && error.code === "PROJECT_LOCKED",
    );
    const closed = await storage.close();
    assert.equal(closed.state, "closed");
    await writeFile(path.join(projectPath, "reports", "report.json"), "{}\n");
    await writeFile(path.join(projectPath, "logs", "private.log"), "excluded\n");
    await writeFile(path.join(projectPath, "temp", "partial.bin"), "excluded\n");
    const exported = await storage.exportProject({ projectPath, archivePath });
    assert.equal(exported.projectId, created.projectId);
    const archive = extractAndVerifyProjectArchive(new Uint8Array(await readFile(archivePath)));
    assert.equal(archive.files.has("reports/report.json"), true);
    assert.equal(archive.files.has("logs/private.log"), false);
    assert.equal(archive.files.has("temp/partial.bin"), false);
    const imported = await storage.importProject({ archivePath, destinationPath: importedPath });
    assert.equal(imported.project.projectId, created.projectId);
    assert.equal(imported.project.revisionId, created.revisionId);
    assert.equal(imported.project.runId, created.runId);
    await rename(importedPath, movedPath);
    const moved = await storage.validate(movedPath);
    assert.equal(moved.valid, true);
    assert.equal(moved.project?.projectId, created.projectId);
    assert.equal(JSON.stringify(await readFile(path.join(movedPath, "project.json"), "utf8")).includes(projectPath), false);
  } finally {
    await temporary.dispose();
  }
});

test("opening schema version 1 creates a verified backup and migrates forward", async () => {
  const temporary = await workspace();
  const projectPath = path.join(temporary.root, "legacy");
  const storage = createSqliteProjectStorage({ applicationVersion: "0.4.0" });
  try {
    await storage.create({ destinationPath: projectPath, name: "Legacy", slug: "legacy" });
    const databasePath = path.join(projectPath, "database", "crawl.db");
    const database = new DatabaseSync(databasePath);
    database.exec("DROP INDEX project_events_project_time; DROP TABLE project_events; DELETE FROM schema_migrations WHERE sequence = 2; PRAGMA user_version = 1; UPDATE project_metadata SET schema_version = 1");
    database.close();
    const manifestPath = path.join(projectPath, "project.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.database.schemaVersion = 1;
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const before = await storage.validate(projectPath);
    assert.equal(before.valid, true);
    assert.equal(before.compatibility.requiresMigration, true);
    const opened = await storage.open(projectPath);
    assert.equal(opened.migrationStatus, "migrated");
    assert.equal(opened.schemaVersion, 2);
    await storage.close();
    const backups = await readdir(path.join(projectPath, "database", "backups"));
    assert.equal(backups.some((name) => name.endsWith(".db")), true);
    assert.equal(backups.some((name) => name.endsWith(".json")), true);
    assert.equal((await storage.validate(projectPath)).compatibility.requiresMigration, false);
  } finally {
    await temporary.dispose();
  }
});

test("checksum drift, metadata mismatch, corruption, and bad imports fail without promotion", async () => {
  const temporary = await workspace();
  const checksumPath = path.join(temporary.root, "checksum");
  const metadataPath = path.join(temporary.root, "metadata");
  const corruptPath = path.join(temporary.root, "corrupt");
  const storage = createSqliteProjectStorage({ applicationVersion: "0.4.0" });
  try {
    await storage.create({ destinationPath: checksumPath, name: "Checksum", slug: "checksum" });
    const checksumDb = new DatabaseSync(path.join(checksumPath, "database", "crawl.db"));
    checksumDb.prepare("UPDATE schema_migrations SET checksum = ? WHERE sequence = 1").run("0".repeat(64));
    checksumDb.close();
    const checksumReport = await storage.validate(checksumPath);
    assert.equal(checksumReport.valid, false);
    assert.ok(checksumReport.issues.some((entry) => entry.code === "PROJECT_MIGRATION_CHECKSUM_MISMATCH"));

    await storage.create({ destinationPath: metadataPath, name: "Metadata", slug: "metadata" });
    const metadataDb = new DatabaseSync(path.join(metadataPath, "database", "crawl.db"));
    metadataDb.prepare("UPDATE project_metadata SET project_id = ? WHERE singleton_id = 1").run("00000000-0000-4000-8000-000000000999");
    metadataDb.close();
    const metadataReport = await storage.validate(metadataPath);
    assert.equal(metadataReport.valid, false);
    assert.ok(metadataReport.issues.some((entry) => entry.code === "PROJECT_IDENTITY_MISMATCH"));

    await storage.create({ destinationPath: corruptPath, name: "Corrupt", slug: "corrupt" });
    await writeFile(path.join(corruptPath, "database", "crawl.db"), new Uint8Array([1, 2, 3, 4]));
    assert.equal((await storage.validate(corruptPath)).valid, false);

    const invalidArchive = path.join(temporary.root, "invalid.zip");
    const destination = path.join(temporary.root, "must-not-exist");
    await writeFile(invalidArchive, new Uint8Array([1, 2, 3, 4]));
    await assert.rejects(() => storage.importProject({ archivePath: invalidArchive, destinationPath: destination }));
    await assert.rejects(() => readdir(destination));
    assert.equal((await readdir(temporary.root)).some((name) => name.includes(".importing-")), false);
  } finally {
    await temporary.dispose();
  }
});
