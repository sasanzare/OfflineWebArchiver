import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createSqliteProjectStorage } from "@offline-web-archive/persistence-sqlite";
import { createDefaultSiteProfileDraft, ScopeEngineError } from "@offline-web-archive/scope-engine";

test("Site Profile revisions synchronize portable JSON, SQLite, Project revision, export, and import", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "owa-profile-"));
  const projectPath = path.join(root, "project");
  const archivePath = path.join(root, "project.zip");
  const importedPath = path.join(root, "imported");
  const storage = createSqliteProjectStorage({ applicationVersion: "0.5.0" });
  try {
    const project = await storage.create({ destinationPath: projectPath, name: "Profile Project", slug: "profile-project" });
    await storage.open(projectPath);
    const created = await storage.createProfile({ projectPath, draft: createDefaultSiteProfileDraft({ name: "Primary", seedUrl: "https://example.com/" }) });
    assert.equal(created.sequence, 1);
    assert.notEqual(created.revisionId, project.revisionId);
    assert.equal((await storage.validateStoredProfile(projectPath)).valid, true);
    await assert.rejects(
      () => storage.updateProfile({ projectPath, expectedRevisionId: created.revisionId, draft: createDefaultSiteProfileDraft({ name: "Primary", seedUrl: "https://example.com/" }) }),
      (error) => error instanceof ScopeEngineError && error.code === "PROFILE_NO_CHANGES",
    );
    assert.equal((await storage.getProfile(projectPath)).sequence, 1);
    const update = await storage.updateProfile({ projectPath, expectedRevisionId: created.revisionId, draft: { ...createDefaultSiteProfileDraft({ name: "Primary v2", seedUrl: "https://example.com/docs/" }), pathRules: [{ ruleId: "docs", effect: "allow", match: "prefix", path: "/docs" }] } });
    const updated = update.profile;
    assert.equal(updated.sequence, 2);
    assert.deepEqual([...update.changedPaths].sort(), ["baseUrl", "name", "pathRules", "seedUrls"]);
    await assert.rejects(() => storage.updateProfile({ projectPath, expectedRevisionId: created.revisionId, draft: createDefaultSiteProfileDraft({ name: "stale", seedUrl: "https://example.com/" }) }), (error) => error instanceof ScopeEngineError && error.code === "PROFILE_REVISION_CONFLICT");
    assert.deepEqual([...(await storage.compareProfiles({ projectPath, fromSequence: 1, toSequence: 2 })).changedPaths].sort(), ["baseUrl", "name", "pathRules", "seedUrls"]);
    const manifest = JSON.parse(await readFile(path.join(projectPath, "project.json"), "utf8"));
    assert.equal(manifest.features.scopePolicy, true);
    assert.equal(manifest.source.baseUrl, "https://example.com/docs/");
    assert.equal(manifest.current.revisionId, updated.revisionId);
    const database = new DatabaseSync(path.join(projectPath, "database", "crawl.db"), { readOnly: true });
    assert.equal((database.prepare("SELECT COUNT(*) AS value FROM site_profile_revisions").get() as { value: number }).value, 2);
    assert.equal((database.prepare("SELECT COUNT(*) AS value FROM scope_rules").get() as { value: number }).value > 0, true);
    database.close();
    await storage.close();
    await storage.exportProject({ projectPath, archivePath });
    await storage.importProject({ archivePath, destinationPath: importedPath });
    assert.equal((await storage.validate(importedPath)).valid, true);
    await storage.open(importedPath);
    assert.equal((await storage.getProfile(importedPath)).revisionId, updated.revisionId);
    await storage.close();
    const profilePath = path.join(importedPath, "profile", "config.json");
    const tampered = JSON.parse(await readFile(profilePath, "utf8"));
    tampered.name = "tampered";
    await writeFile(profilePath, `${JSON.stringify(tampered, null, 2)}\n`);
    const report = await storage.validate(importedPath);
    assert.equal(report.valid, false);
    assert.ok(report.issues.some((issue) => issue.code === "PROFILE_INTEGRITY_MISMATCH"));
  } finally {
    if (storage.getCurrent() !== null) await storage.close().catch(() => undefined);
    await rm(root, { recursive: true, force: true });
  }
});

test("a fault after Profile file replacement rolls back database and restores files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "owa-profile-rollback-"));
  const projectPath = path.join(root, "project");
  const initial = createSqliteProjectStorage({ applicationVersion: "0.5.0" });
  let faulted: ReturnType<typeof createSqliteProjectStorage> | null = null;
  try {
    await initial.create({ destinationPath: projectPath, name: "Rollback", slug: "rollback" });
    await initial.open(projectPath);
    const created = await initial.createProfile({ projectPath, draft: createDefaultSiteProfileDraft({ name: "Before", seedUrl: "https://example.com/" }) });
    await initial.close();
    faulted = createSqliteProjectStorage({ applicationVersion: "0.5.0", profileCommitFault: "after-profile-file" });
    await faulted.open(projectPath);
    const beforeProfile = await readFile(path.join(projectPath, "profile", "config.json"), "utf8");
    const beforeManifest = await readFile(path.join(projectPath, "project.json"), "utf8");
    await assert.rejects(() => faulted!.updateProfile({ projectPath, expectedRevisionId: created.revisionId, draft: createDefaultSiteProfileDraft({ name: "After", seedUrl: "https://example.com/" }) }));
    assert.equal(await readFile(path.join(projectPath, "profile", "config.json"), "utf8"), beforeProfile);
    assert.equal(await readFile(path.join(projectPath, "project.json"), "utf8"), beforeManifest);
    assert.equal((await faulted.getProfile(projectPath)).revisionId, created.revisionId);
    const database = new DatabaseSync(path.join(projectPath, "database", "crawl.db"), { readOnly: true });
    assert.equal((database.prepare("SELECT COUNT(*) AS value FROM site_profile_revisions").get() as { value: number }).value, 1);
    database.close();
  } finally {
    if (initial.getCurrent() !== null) await initial.close().catch(() => undefined);
    if (faulted?.getCurrent() !== null) await faulted?.close().catch(() => undefined);
    await rm(root, { recursive: true, force: true });
  }
});
