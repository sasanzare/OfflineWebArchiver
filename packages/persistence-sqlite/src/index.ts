import { randomUUID } from "node:crypto";
import { backup, DatabaseSync } from "node:sqlite";
import { lstat, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { hostname } from "node:os";
import {
  ProjectOperationError,
  InteractionOperationError,
  QueueOperationError,
  RecoveryOperationError,
  RenderOperationError,
  type ProjectCompatibility,
  type ProjectOperationErrorCode,
  type ProjectStoragePort,
  type ProjectSummary,
  type ProjectValidationIssue,
  type ProjectValidationReport,
  type InteractionProfileRepositoryPort,
  type InteractionTraceRepositoryPort,
  type QueueRepositoryPort,
  type RecoveryRepositoryPort,
  type RenderRepositoryPort,
} from "@offline-web-archive/archive-core";
import {
  normalizeSiteProfileDraft,
  parseSiteProfile,
  ScopeEngineError,
  serializeSiteProfile,
  validateSiteProfile,
  type ProfileStoragePort,
  type SiteProfile,
  type SiteProfileComparison,
  type SiteProfileDraft,
} from "@offline-web-archive/scope-engine";
import { createSilentLogger, type Logger } from "@offline-web-archive/observability";
import {
  createProjectManifest,
  enableScopePolicy,
  isSupportedProjectFormatVersion,
  parseProjectManifest,
  ProjectFormatError,
  PROJECT_DATABASE_PATH,
  PROJECT_FORMAT_VERSION,
  PROJECT_MANIFEST_FILE,
  REQUIRED_PROJECT_DIRECTORIES,
  serializeProjectManifest,
  type ProjectManifest,
} from "@offline-web-archive/project-format";
import { atomicPromoteDirectory, atomicWriteFile, assertNotSymlink, pathExists } from "./atomic.js";
import {
  createProjectArchive,
  DEFAULT_ARCHIVE_LIMITS,
  extractAndVerifyProjectArchive,
  sha256,
  type ArchiveLimits,
} from "./archive.js";
import { acquireProjectLock, type ProjectLock } from "./locking.js";
import { createSqliteQueueRepository } from "./queue.js";
import { createSqliteRecoveryRepository } from "./recovery.js";
import { createSqliteRenderRepository } from "./render.js";
import { createSqliteInteractionRepository } from "./interaction.js";
import {
  applyPendingMigrations,
  configureDatabase,
  CURRENT_SCHEMA_VERSION,
  inspectMigrationState,
  MIGRATIONS,
  validateMigrationDefinitions,
} from "./migrations.js";

export { atomicPromoteDirectory, atomicWriteFile, assertNotSymlink, pathExists } from "./atomic.js";
export { DEFAULT_ARCHIVE_LIMITS, extractAndVerifyProjectArchive, inspectZipArchive, sha256 } from "./archive.js";
export { acquireProjectLock } from "./locking.js";
export { createSqliteQueueRepository, type SqliteQueueRepositoryOptions } from "./queue.js";
export { createSqliteRecoveryRepository, type RecoveryFaultPoint, type SqliteRecoveryRepositoryOptions } from "./recovery.js";
export { createSqliteRenderRepository, type SqliteRenderRepositoryOptions } from "./render.js";
export { createSqliteInteractionRepository, type SqliteInteractionRepositoryOptions } from "./interaction.js";
export {
  applyPendingMigrations,
  configureDatabase,
  CURRENT_SCHEMA_VERSION,
  inspectMigrationState,
  MIGRATIONS,
  validateMigrationDefinitions,
} from "./migrations.js";

interface ProjectMetadataRow {
  project_id: string;
  project_name: string;
  project_slug: string;
  format_version: string;
  schema_version: number;
  created_at: string;
  last_opened_at: string;
  current_revision_id: string;
  current_run_id: string;
}

interface CurrentProject {
  root: string;
  manifest: ProjectManifest;
  database: DatabaseSync;
  lock: ProjectLock;
  summary: ProjectSummary;
  sessionId: string;
}

export type SqliteProjectStorage = ProjectStoragePort & ProfileStoragePort & QueueRepositoryPort & RecoveryRepositoryPort & RenderRepositoryPort & InteractionProfileRepositoryPort & InteractionTraceRepositoryPort;

export interface SqliteProjectStorageOptions {
  applicationVersion: string;
  logger?: Logger;
  now?: () => string;
  id?: () => string;
  archiveLimits?: ArchiveLimits;
  profileCommitFault?: "after-database" | "after-profile-file" | "after-manifest-file";
  renderCommitFault?: "after-html-write" | "after-database-commit";
}

function profileDraftFrom(profile: SiteProfile): SiteProfileDraft {
  const {
    schemaVersion: _schemaVersion,
    engineVersion: _engineVersion,
    profileId: _profileId,
    projectId: _projectId,
    revisionId: _revisionId,
    sequence: _sequence,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...draft
  } = profile;
  return normalizeSiteProfileDraft(draft);
}

function changedProfilePaths(left: unknown, right: unknown, prefix = ""): string[] {
  if (JSON.stringify(left) === JSON.stringify(right)) return [];
  if (typeof left !== "object" || left === null || typeof right !== "object" || right === null || Array.isArray(left) || Array.isArray(right)) return [prefix || "profile"];
  return [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .sort()
    .flatMap((key) => changedProfilePaths((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key], prefix === "" ? key : `${prefix}.${key}`));
}

function issue(
  code: string,
  category: ProjectValidationIssue["category"],
  message: string,
  relativePath?: string,
  severity: ProjectValidationIssue["severity"] = "error",
): ProjectValidationIssue {
  return relativePath === undefined
    ? { code, category, message, severity }
    : { code, category, message, relativePath, severity };
}

function summaryFromManifest(
  root: string,
  manifest: ProjectManifest,
  migrationStatus: ProjectSummary["migrationStatus"],
): ProjectSummary {
  return {
    projectPath: root,
    projectId: manifest.project.id,
    name: manifest.project.name,
    slug: manifest.project.slug,
    formatVersion: manifest.format.version,
    schemaVersion: manifest.database.schemaVersion,
    revisionId: manifest.current.revisionId,
    runId: manifest.current.runId,
    createdAt: manifest.project.createdAt,
    lastOpenedAt: manifest.project.lastOpenedAt,
    state: manifest.lifecycle.state,
    migrationStatus,
    recoveryStatus: "clean",
    recoverySummary: { processingJobs: 0, activeLeases: 0, expiredLeases: 0, abandonedJobs: 0, outputIssues: 0, uncleanSessions: 0 },
  };
}

function inspectProjectRecovery(database: DatabaseSync, projectId: string, runId: string, evaluationTime: string): Pick<ProjectSummary, "recoveryStatus" | "recoverySummary"> {
  const row = database.prepare(`
    SELECT
      SUM(CASE WHEN pj.state = 'processing' AND pj.recovery_state IS NULL THEN 1 ELSE 0 END) AS processing_jobs,
      SUM(CASE WHEN pj.state = 'processing' AND pj.recovery_state IS NULL AND jl.lease_id IS NULL THEN 1 ELSE 0 END) AS abandoned_jobs,
      (SELECT COUNT(*) FROM job_leases WHERE project_id = ? AND run_id = ? AND status = 'active' AND expires_at > ?) AS active_leases,
      (SELECT COUNT(*) FROM job_leases WHERE project_id = ? AND run_id = ? AND status = 'active' AND expires_at <= ?) AS expired_leases,
      (SELECT COUNT(*) FROM completed_outputs co JOIN page_jobs completed_job ON completed_job.job_id = co.job_id WHERE completed_job.project_id = ? AND completed_job.run_id = ? AND co.verification_status <> 'valid') AS output_issues,
      (SELECT COUNT(*) FROM execution_sessions WHERE project_id = ? AND run_id = ? AND close_kind = 'unclean-detected') AS unclean_sessions
    FROM page_jobs pj
    LEFT JOIN job_leases jl ON jl.job_id = pj.job_id AND jl.status = 'active'
    WHERE pj.project_id = ? AND pj.run_id = ?
  `).get(projectId, runId, evaluationTime, projectId, runId, evaluationTime, projectId, runId, projectId, runId, projectId, runId) as Record<string, number | null>;
  const recoverySummary = {
    processingJobs: Number(row["processing_jobs"] ?? 0),
    activeLeases: Number(row["active_leases"] ?? 0),
    expiredLeases: Number(row["expired_leases"] ?? 0),
    abandonedJobs: Number(row["abandoned_jobs"] ?? 0),
    outputIssues: Number(row["output_issues"] ?? 0),
    uncleanSessions: Number(row["unclean_sessions"] ?? 0),
  };
  const recoveryStatus: ProjectSummary["recoveryStatus"] = recoverySummary.expiredLeases > 0 || recoverySummary.abandonedJobs > 0
    ? "recovery-required"
    : recoverySummary.uncleanSessions > 0 || recoverySummary.outputIssues > 0 || recoverySummary.processingJobs > 0
      ? "recovery-available"
      : "clean";
  return { recoveryStatus, recoverySummary };
}

function validationFailure(report: ProjectValidationReport): ProjectOperationError {
  const first = report.issues.find((entry) => entry.severity === "error");
  const stableCodes = new Set<string>([
    "PROJECT_NOT_FOUND",
    "PROJECT_MANIFEST_INVALID",
    "PROJECT_FORMAT_UNSUPPORTED",
    "PROJECT_DATABASE_INVALID",
    "PROJECT_DATABASE_INTEGRITY_FAILED",
    "PROJECT_SCHEMA_UNSUPPORTED",
    "PROJECT_MIGRATION_REQUIRED",
    "PROJECT_MIGRATION_FAILED",
    "PROJECT_MIGRATION_CHECKSUM_MISMATCH",
    "PROJECT_LOCK_INVALID",
    "PROJECT_VALIDATION_FAILED",
  ]);
  return new ProjectOperationError(
    first !== undefined && stableCodes.has(first.code)
      ? first.code as ProjectOperationErrorCode
      : "PROJECT_VALIDATION_FAILED",
    report.issues.map((entry) => entry.message).join("; ") || "Project validation failed",
  );
}

async function assertProjectRoot(root: string): Promise<void> {
  let stat;
  try {
    stat = await lstat(root);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new ProjectOperationError("PROJECT_NOT_FOUND", "The Project directory does not exist");
    }
    throw error;
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new ProjectOperationError("PROJECT_NOT_FOUND", "The Project root must be a real directory");
  }
}

async function readManifest(root: string): Promise<ProjectManifest> {
  const manifestPath = path.join(root, PROJECT_MANIFEST_FILE);
  try {
    await assertNotSymlink(manifestPath);
    return parseProjectManifest(JSON.parse(await readFile(manifestPath, "utf8")));
  } catch (error) {
    if (error instanceof ProjectOperationError) throw error;
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new ProjectOperationError("PROJECT_MANIFEST_INVALID", "The Project manifest is missing");
    }
    if (error instanceof ProjectFormatError) {
      throw new ProjectOperationError(error.code, error.message);
    }
    throw new ProjectOperationError(
      "PROJECT_MANIFEST_INVALID",
      error instanceof Error ? error.message : "The Project manifest is invalid",
    );
  }
}

function openDatabase(databasePath: string, readOnly = false): DatabaseSync {
  try {
    const database = new DatabaseSync(databasePath, {
      readOnly,
      timeout: 5_000,
      allowExtension: false,
      defensive: true,
    });
    if (readOnly) {
      database.exec("PRAGMA query_only = ON");
      database.exec("PRAGMA foreign_keys = ON");
      database.exec("PRAGMA busy_timeout = 5000");
      database.exec("PRAGMA trusted_schema = OFF");
    } else {
      configureDatabase(database);
    }
    return database;
  } catch (error) {
    throw new ProjectOperationError(
      "PROJECT_DATABASE_INVALID",
      error instanceof Error ? error.message : "The Project database could not be opened",
    );
  }
}

function readMetadata(database: DatabaseSync): ProjectMetadataRow | null {
  try {
    return (database.prepare(`
      SELECT project_id, project_name, project_slug, format_version, schema_version,
             created_at, last_opened_at, current_revision_id, current_run_id
      FROM project_metadata WHERE singleton_id = 1
    `).get() as ProjectMetadataRow | undefined) ?? null;
  } catch {
    return null;
  }
}

function compatibilityFor(
  manifest: ProjectManifest | null,
  appliedSchema: number | null,
  reason: string | null = null,
): ProjectCompatibility {
  const formatSupported = manifest !== null && isSupportedProjectFormatVersion(manifest.format.version);
  const schemaSupported = appliedSchema !== null && appliedSchema <= CURRENT_SCHEMA_VERSION && appliedSchema > 0;
  return {
    compatible: formatSupported && schemaSupported && reason === null,
    formatVersion: manifest?.format.version ?? null,
    schemaVersion: appliedSchema,
    currentSchemaVersion: CURRENT_SCHEMA_VERSION,
    requiresMigration: schemaSupported && appliedSchema < CURRENT_SCHEMA_VERSION,
    reason: reason ?? (!formatSupported ? "Unsupported Project format" : !schemaSupported ? "Unsupported database schema" : null),
  };
}

async function validateProjectAt(root: string, now: () => string): Promise<ProjectValidationReport> {
  const issues: ProjectValidationIssue[] = [];
  let manifest: ProjectManifest | null = null;
  let compatibility = compatibilityFor(null, null, "Project has not been inspected");
  try {
    await assertProjectRoot(root);
  } catch (error) {
    issues.push(issue("PROJECT_NOT_FOUND", "filesystem", error instanceof Error ? error.message : "Project not found"));
    return { valid: false, projectPath: root, checkedAt: now(), compatibility, issues, project: null };
  }
  try {
    manifest = await readManifest(root);
  } catch (error) {
    const code = error instanceof ProjectOperationError ? error.code : "PROJECT_MANIFEST_INVALID";
    issues.push(issue(code, code === "PROJECT_FORMAT_UNSUPPORTED" ? "compatibility" : "manifest", error instanceof Error ? error.message : "Invalid manifest", PROJECT_MANIFEST_FILE));
    compatibility = compatibilityFor(null, null, error instanceof Error ? error.message : "Invalid manifest");
    return { valid: false, projectPath: root, checkedAt: now(), compatibility, issues, project: null };
  }
  for (const relative of REQUIRED_PROJECT_DIRECTORIES) {
    const target = path.join(root, ...relative.split("/"));
    try {
      const stat = await lstat(target);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("not a real directory");
    } catch {
      issues.push(issue("PROJECT_DIRECTORY_INVALID", "filesystem", "Required Project directory is missing or unsafe", relative));
    }
  }
  const databasePath = path.join(root, ...PROJECT_DATABASE_PATH.split("/"));
  let database: DatabaseSync | null = null;
  let appliedSchema: number | null = null;
  try {
    const stat = await lstat(databasePath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Database is not a regular file");
    database = openDatabase(databasePath, true);
    const integrity = database.prepare("PRAGMA integrity_check").all() as unknown as { integrity_check: string }[];
    if (integrity.length !== 1 || integrity[0]?.integrity_check !== "ok") {
      issues.push(issue("PROJECT_DATABASE_INTEGRITY_FAILED", "database", "SQLite integrity_check did not return ok", PROJECT_DATABASE_PATH));
    }
    const migrationState = inspectMigrationState(database);
    appliedSchema = migrationState.applied;
    if (migrationState.pending.length > 0) {
      issues.push(issue("PROJECT_MIGRATION_REQUIRED", "migration", `${migrationState.pending.length} migration(s) are pending`, PROJECT_DATABASE_PATH, "warning"));
    }
    const userVersion = (database.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
    if (userVersion !== appliedSchema) {
      issues.push(issue("PROJECT_SCHEMA_VERSION_MISMATCH", "migration", "SQLite user_version does not match migration history", PROJECT_DATABASE_PATH));
    }
    const metadata = readMetadata(database);
    if (metadata === null) {
      issues.push(issue("PROJECT_METADATA_MISSING", "identity", "Project database metadata is missing", PROJECT_DATABASE_PATH));
    } else {
      const mismatches = [
        [metadata.project_id, manifest.project.id, "project ID"],
        [metadata.project_name, manifest.project.name, "project name"],
        [metadata.project_slug, manifest.project.slug, "project slug"],
        [metadata.format_version, manifest.format.version, "format version"],
        [metadata.current_revision_id, manifest.current.revisionId, "revision ID"],
        [metadata.current_run_id, manifest.current.runId, "run ID"],
      ] as const;
      for (const [databaseValue, manifestValue, label] of mismatches) {
        if (databaseValue !== manifestValue) issues.push(issue("PROJECT_IDENTITY_MISMATCH", "identity", `Manifest and database ${label} differ`));
      }
      if (metadata.schema_version !== appliedSchema || manifest.database.schemaVersion !== appliedSchema) {
        issues.push(issue("PROJECT_SCHEMA_VERSION_MISMATCH", "identity", "Manifest, metadata, and migration schema versions differ"));
      }
    }
    if (manifest.features.scopePolicy) {
      const profilePath = path.join(root, "profile", "config.json");
      try {
        await assertNotSymlink(profilePath);
        const serialized = await readFile(profilePath, "utf8");
        const profile = parseSiteProfile(JSON.parse(serialized));
        const profileRow = database.prepare("SELECT project_id, current_profile_revision_id, profile_hash FROM site_profiles WHERE profile_id = ?")
          .get(profile.profileId) as { project_id: string; current_profile_revision_id: string; profile_hash: string } | undefined;
        if (profileRow === undefined || profileRow.project_id !== manifest.project.id || profileRow.current_profile_revision_id !== profile.revisionId || profileRow.profile_hash !== sha256(serializeSiteProfile(profile))) {
          issues.push(issue("PROFILE_INTEGRITY_MISMATCH", "identity", "Site Profile file and SQLite revision ledger differ", "profile/config.json"));
        }
        if (manifest.source.baseUrl !== profile.baseUrl) {
          issues.push(issue("PROFILE_INTEGRITY_MISMATCH", "identity", "Project manifest and Site Profile Base URL differ", "profile/config.json"));
        }
      } catch (error) {
        issues.push(issue(error instanceof ScopeEngineError ? error.code : "PROFILE_INVALID", "security", error instanceof Error ? error.message : "Site Profile validation failed", "profile/config.json"));
      }
    }
  } catch (error) {
    const code = error instanceof ProjectOperationError ? error.code : "PROJECT_DATABASE_INVALID";
    issues.push(issue(code, code.includes("MIGRATION") || code.includes("SCHEMA") ? "migration" : "database", error instanceof Error ? error.message : "Invalid Project database", PROJECT_DATABASE_PATH));
  } finally {
    if (database?.isOpen) database.close();
  }
  compatibility = compatibilityFor(manifest, appliedSchema);
  if (!compatibility.compatible) {
    issues.push(issue("PROJECT_SCHEMA_UNSUPPORTED", "compatibility", compatibility.reason ?? "The Project is incompatible"));
  }
  const valid = issues.every((entry) => entry.severity !== "error") && compatibility.compatible;
  return {
    valid,
    projectPath: root,
    checkedAt: now(),
    compatibility,
    issues,
    project: valid ? summaryFromManifest(root, manifest, "current") : null,
  };
}

function recordEvent(
  database: DatabaseSync,
  id: () => string,
  projectId: string,
  eventType: string,
  timestamp: string,
  details: Readonly<Record<string, unknown>> = {},
): void {
  database.prepare(`
    INSERT INTO project_events (event_id, project_id, event_type, occurred_at, correlation_id, details_json)
    VALUES (?, ?, ?, ?, NULL, ?)
  `).run(id(), projectId, eventType, timestamp, JSON.stringify(details));
}

async function createMigrationBackup(input: {
  root: string;
  database: DatabaseSync;
  fromSchema: number;
  toSchema: number;
  applicationVersion: string;
  now: () => string;
  id: () => string;
}): Promise<string> {
  const backupDirectory = path.join(input.root, "database", "backups");
  await mkdir(backupDirectory, { recursive: true });
  const stamp = input.now().replace(/[:.]/g, "-");
  const basename = `pre-migration-v${input.fromSchema}-to-v${input.toSchema}-${stamp}-${input.id()}`;
  const temporary = path.join(backupDirectory, `.${basename}.db.tmp`);
  const finalPath = path.join(backupDirectory, `${basename}.db`);
  try {
    await backup(input.database, temporary, { rate: 100 });
    const bytes = await readFile(temporary);
    await atomicWriteFile(finalPath, bytes);
    await rm(temporary, { force: true });
    await atomicWriteFile(
      path.join(backupDirectory, `${basename}.json`),
      `${JSON.stringify({
        version: 1,
        createdAt: input.now(),
        fromSchema: input.fromSchema,
        toSchema: input.toSchema,
        applicationVersion: input.applicationVersion,
        databaseFile: `${basename}.db`,
        bytes: bytes.byteLength,
        sha256: sha256(bytes),
      }, null, 2)}\n`,
    );
    return `database/backups/${basename}.db`;
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw new ProjectOperationError("PROJECT_BACKUP_FAILED", error instanceof Error ? error.message : "Migration backup failed");
  }
}

function updateManifestForOpen(manifest: ProjectManifest, timestamp: string, schemaVersion: number): ProjectManifest {
  return parseProjectManifest({
    ...manifest,
    application: { version: manifest.application.version },
    project: { ...manifest.project, lastOpenedAt: timestamp },
    database: { ...manifest.database, schemaVersion },
    features: { ...manifest.features, crawlQueue: schemaVersion >= 4 },
    lifecycle: { state: "ready", lastValidatedAt: timestamp },
  });
}

export function createSqliteProjectStorage(options: SqliteProjectStorageOptions): SqliteProjectStorage {
  const logger = options.logger ?? createSilentLogger();
  const now = options.now ?? (() => new Date().toISOString());
  const id = options.id ?? randomUUID;
  const archiveLimits = options.archiveLimits ?? DEFAULT_ARCHIVE_LIMITS;
  let current: CurrentProject | null = null;

  const log = (eventName: string, projectId: string, metadata: Readonly<Record<string, unknown>> = {}): void => {
    logger.log({ timestamp: now(), level: "info", component: "persistence-sqlite", correlationId: projectId, eventName, metadata });
  };

  const requireCurrent = (projectPath: string): CurrentProject => {
    const root = path.resolve(projectPath);
    if (current === null || current.root !== root) {
      throw new ProjectOperationError("PROJECT_NOT_OPEN", "Open the selected Project before using its Site Profile");
    }
    return current;
  };

  const queueForCurrent = (): QueueRepositoryPort => {
    if (current === null) throw new QueueOperationError("QUEUE_PROJECT_NOT_OPEN", "Open the selected Project before using its queue");
    return createSqliteQueueRepository(current.database, {
      now,
      id,
      onEvent: (eventName, metadata) => log(eventName, current!.manifest.project.id, metadata),
    });
  };

  const recoveryForCurrent = (): RecoveryRepositoryPort => {
    if (current === null) throw new RecoveryOperationError("RECOVERY_INPUT_INVALID", "Open the selected Project before using recovery operations");
    return createSqliteRecoveryRepository(current.database, {
      now,
      id,
      onEvent: (eventName, metadata) => log(eventName, current!.manifest.project.id, metadata),
    });
  };

  const renderForCurrent = (): RenderRepositoryPort => {
    if (current === null) throw new RenderOperationError("RENDER_INPUT_INVALID", "Open the selected Project before using Render operations");
    return createSqliteRenderRepository(current.database, { projectRoot: current.root, now, id, ...(options.renderCommitFault === undefined ? {} : { fault: options.renderCommitFault }) });
  };

  const interactionForCurrent = (): InteractionProfileRepositoryPort & InteractionTraceRepositoryPort => {
    if (current === null) throw new InteractionOperationError("INTERACTION_PERSISTENCE_FAILED", "Open the selected Project before using Interaction operations");
    return createSqliteInteractionRepository(current.database, { now });
  };

  const readCurrentProfile = async (active: CurrentProject): Promise<SiteProfile> => {
    const profilePath = path.join(active.root, "profile", "config.json");
    try {
      await assertNotSymlink(profilePath);
      const serialized = await readFile(profilePath, "utf8");
      const profile = parseSiteProfile(JSON.parse(serialized));
      const row = active.database.prepare(`
        SELECT profile_id, current_profile_revision_id, profile_hash
        FROM site_profiles WHERE project_id = ?
      `).get(active.manifest.project.id) as { profile_id: string; current_profile_revision_id: string; profile_hash: string } | undefined;
      if (row === undefined) throw new ScopeEngineError("PROFILE_NOT_FOUND", "The Project does not have a Site Profile");
      if (row.profile_id !== profile.profileId || row.current_profile_revision_id !== profile.revisionId || row.profile_hash !== sha256(serializeSiteProfile(profile))) {
        throw new ScopeEngineError("PROFILE_INTEGRITY_MISMATCH", "The portable Site Profile and SQLite revision ledger differ");
      }
      if (active.manifest.source.baseUrl !== profile.baseUrl) throw new ScopeEngineError("PROFILE_INTEGRITY_MISMATCH", "The Project manifest and Site Profile Base URL differ");
      return profile;
    } catch (error) {
      if (error instanceof ScopeEngineError) throw error;
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        throw new ScopeEngineError("PROFILE_NOT_FOUND", "The Project does not have a Site Profile");
      }
      throw new ScopeEngineError("PROFILE_INVALID", error instanceof Error ? error.message : "The Site Profile is invalid");
    }
  };

  const persistProfileRevision = async (active: CurrentProject, profile: SiteProfile, create: boolean): Promise<SiteProfile> => {
    const profileDirectory = path.join(active.root, "profile");
    const profilePath = path.join(profileDirectory, "config.json");
    const manifestPath = path.join(active.root, PROJECT_MANIFEST_FILE);
    const serialized = serializeSiteProfile(profile);
    const profileHash = sha256(serialized);
    const oldManifestBytes = await readFile(manifestPath);
    const oldProfileBytes = create ? null : await readFile(profilePath);
    const nextManifest = enableScopePolicy(active.manifest, {
      applicationVersion: options.applicationVersion,
      baseUrl: profile.baseUrl,
      revisionId: profile.revisionId,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: profile.updatedAt,
    });
    try {
      await mkdir(profileDirectory, { recursive: true });
      active.database.exec("BEGIN IMMEDIATE");
      const projectSequence = (active.database.prepare("SELECT COALESCE(MAX(sequence), 0) + 1 AS value FROM project_revisions WHERE project_id = ?").get(profile.projectId) as { value: number }).value;
      active.database.prepare(`
        INSERT INTO project_revisions (revision_id, project_id, sequence, created_at, status)
        VALUES (?, ?, ?, ?, 'initialized')
      `).run(profile.revisionId, profile.projectId, projectSequence, profile.updatedAt);
      if (create) {
        active.database.prepare(`
          INSERT INTO site_profiles
            (profile_id, project_id, current_profile_revision_id, current_sequence, created_at, updated_at, profile_hash)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(profile.profileId, profile.projectId, profile.revisionId, profile.sequence, profile.createdAt, profile.updatedAt, profileHash);
      } else {
        active.database.prepare(`
          UPDATE site_profiles SET current_profile_revision_id = ?, current_sequence = ?, updated_at = ?, profile_hash = ?
          WHERE profile_id = ? AND project_id = ?
        `).run(profile.revisionId, profile.sequence, profile.updatedAt, profileHash, profile.profileId, profile.projectId);
      }
      active.database.prepare(`
        INSERT INTO site_profile_revisions
          (profile_revision_id, profile_id, sequence, created_at, canonical_json, profile_hash)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(profile.revisionId, profile.profileId, profile.sequence, profile.updatedAt, serialized, profileHash);
      const insertRule = active.database.prepare(`
        INSERT INTO scope_rules (profile_revision_id, rule_kind, rule_id, effect, match_type, canonical_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const rule of profile.domainRules) insertRule.run(profile.revisionId, "domain", rule.ruleId, rule.effect, rule.match, JSON.stringify(rule));
      for (const rule of profile.pathRules) insertRule.run(profile.revisionId, "path", rule.ruleId, rule.effect, rule.match, JSON.stringify(rule));
      for (const rule of profile.queryPolicy.rules) insertRule.run(profile.revisionId, "query", rule.key, rule.classification, rule.sensitive ? "sensitive" : "plain", JSON.stringify(rule));
      active.database.prepare("UPDATE project_metadata SET format_version = ?, schema_version = ?, current_revision_id = ? WHERE singleton_id = 1")
        .run(nextManifest.format.version, CURRENT_SCHEMA_VERSION, profile.revisionId);
      recordEvent(active.database, id, profile.projectId, create ? "profile.created" : "profile.updated", profile.updatedAt, { profileId: profile.profileId, profileRevisionId: profile.revisionId, sequence: profile.sequence, profileHash });
      if (options.profileCommitFault === "after-database") throw new Error("Injected Profile commit fault after database changes");
      await atomicWriteFile(profilePath, serialized, { overwrite: !create });
      if (options.profileCommitFault === "after-profile-file") throw new Error("Injected Profile commit fault after Profile file replacement");
      await atomicWriteFile(manifestPath, serializeProjectManifest(nextManifest), { overwrite: true });
      if (options.profileCommitFault === "after-manifest-file") throw new Error("Injected Profile commit fault after manifest replacement");
      const verifiedProfile = parseSiteProfile(JSON.parse(await readFile(profilePath, "utf8")));
      const verifiedManifest = parseProjectManifest(JSON.parse(await readFile(manifestPath, "utf8")));
      const verifiedRow = active.database.prepare("SELECT current_profile_revision_id, profile_hash FROM site_profiles WHERE profile_id = ?").get(profile.profileId) as { current_profile_revision_id: string; profile_hash: string } | undefined;
      if (verifiedProfile.revisionId !== profile.revisionId || verifiedManifest.current.revisionId !== profile.revisionId || verifiedManifest.source.baseUrl !== profile.baseUrl || verifiedRow === undefined || verifiedRow.current_profile_revision_id !== profile.revisionId || verifiedRow.profile_hash !== profileHash) {
        throw new ScopeEngineError("PROFILE_INTEGRITY_MISMATCH", "The proposed Site Profile commit did not validate");
      }
      active.database.exec("COMMIT");
      active.manifest = nextManifest;
      active.summary = summaryFromManifest(active.root, nextManifest, active.summary.migrationStatus);
      log(create ? "profile.created" : "profile.updated", profile.projectId, { profileRevisionId: profile.revisionId, sequence: profile.sequence, profileHash });
      return verifiedProfile;
    } catch (error) {
      if (active.database.isTransaction) active.database.exec("ROLLBACK");
      await atomicWriteFile(manifestPath, oldManifestBytes, { overwrite: true }).catch(() => undefined);
      if (oldProfileBytes === null) await rm(profilePath, { force: true }).catch(() => undefined);
      else await atomicWriteFile(profilePath, oldProfileBytes, { overwrite: true }).catch(() => undefined);
      throw error;
    }
  };

  return Object.freeze({
    async create(input) {
      const destination = path.resolve(input.destinationPath);
      const parent = path.dirname(destination);
      await mkdir(parent, { recursive: true });
      if (await pathExists(destination)) throw new ProjectOperationError("PROJECT_ALREADY_EXISTS", "The Project destination already exists");
      const staging = path.join(parent, `.${path.basename(destination)}.creating-${id()}`);
      const timestamp = now();
      const manifest = createProjectManifest({
        applicationVersion: options.applicationVersion,
        projectId: id(),
        name: input.name,
        slug: input.slug,
        createdAt: timestamp,
        revisionId: id(),
        runId: id(),
        ...(input.baseUrl === undefined ? {} : { baseUrl: input.baseUrl }),
      });
      try {
        await mkdir(staging, { recursive: false });
        await Promise.all(REQUIRED_PROJECT_DIRECTORIES.map((relative) => mkdir(path.join(staging, ...relative.split("/")), { recursive: true })));
        const databasePath = path.join(staging, ...PROJECT_DATABASE_PATH.split("/"));
        const database = openDatabase(databasePath);
        try {
          applyPendingMigrations(database, options.applicationVersion, now, (migration, durationMs) => {
            log("migration.applied", manifest.project.id, { migrationId: migration.id, sequence: migration.sequence, durationMs });
          });
          database.exec("BEGIN IMMEDIATE");
          database.prepare(`
            INSERT INTO project_metadata
              (singleton_id, project_id, project_name, project_slug, format_version, schema_version,
               created_at, last_opened_at, current_revision_id, current_run_id)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            manifest.project.id, manifest.project.name, manifest.project.slug, manifest.format.version,
            CURRENT_SCHEMA_VERSION, timestamp, timestamp, manifest.current.revisionId, manifest.current.runId,
          );
          database.prepare(`
            INSERT INTO project_revisions (revision_id, project_id, sequence, created_at, status)
            VALUES (?, ?, 1, ?, 'initialized')
          `).run(manifest.current.revisionId, manifest.project.id, timestamp);
          database.prepare(`
            INSERT INTO runs (run_id, project_id, revision_id, sequence, created_at, status)
            VALUES (?, ?, ?, 1, ?, 'initialized')
          `).run(manifest.current.runId, manifest.project.id, manifest.current.revisionId, timestamp);
          database.prepare(`
            INSERT INTO run_control (project_id, run_id, control_state, updated_at, operation_id)
            VALUES (?, ?, 'active', ?, 'project-create')
          `).run(manifest.project.id, manifest.current.runId, timestamp);
          recordEvent(database, id, manifest.project.id, "project.created", timestamp, { schemaVersion: CURRENT_SCHEMA_VERSION });
          database.exec("COMMIT");
          database.exec("PRAGMA wal_checkpoint(TRUNCATE)");
        } catch (error) {
          if (database.isTransaction) database.exec("ROLLBACK");
          throw error;
        } finally {
          if (database.isOpen) database.close();
        }
        const closedManifest = parseProjectManifest({ ...manifest, lifecycle: { ...manifest.lifecycle, state: "closed" } });
        await atomicWriteFile(path.join(staging, PROJECT_MANIFEST_FILE), serializeProjectManifest(closedManifest));
        const report = await validateProjectAt(staging, now);
        if (!report.valid || report.project === null) {
          throw new ProjectOperationError("PROJECT_VALIDATION_FAILED", report.issues.map((entry) => entry.message).join("; "));
        }
        await atomicPromoteDirectory(staging, destination);
        log("project.created", manifest.project.id, { schemaVersion: CURRENT_SCHEMA_VERSION });
        return summaryFromManifest(destination, closedManifest, "current");
      } catch (error) {
        await rm(staging, { recursive: true, force: true }).catch(() => undefined);
        throw error;
      }
    },

    async open(projectPath) {
      const root = path.resolve(projectPath);
      if (current !== null) {
        if (current.root === root) return current.summary;
        throw new ProjectOperationError("PROJECT_LOCKED", "Close the current Project before opening another one");
      }
      const initialReport = await validateProjectAt(root, now);
      if (!initialReport.valid || initialReport.project === null) {
        throw validationFailure(initialReport);
      }
      const lock = await acquireProjectLock(root, "open", now);
      let database: DatabaseSync | null = null;
      try {
        const originalManifest = await readManifest(root);
        database = openDatabase(path.join(root, ...PROJECT_DATABASE_PATH.split("/")));
        const migrationState = inspectMigrationState(database);
        let migrationStatus: ProjectSummary["migrationStatus"] = "current";
        if (migrationState.pending.length > 0) {
          const backupPath = await createMigrationBackup({
            root,
            database,
            fromSchema: migrationState.applied,
            toSchema: CURRENT_SCHEMA_VERSION,
            applicationVersion: options.applicationVersion,
            now,
            id,
          });
          log("migration.backup.created", originalManifest.project.id, { fromSchema: migrationState.applied, toSchema: CURRENT_SCHEMA_VERSION, backupPath });
          applyPendingMigrations(database, options.applicationVersion, now, (migration, durationMs) => {
            log("migration.applied", originalManifest.project.id, { migrationId: migration.id, sequence: migration.sequence, durationMs });
          });
          migrationStatus = "migrated";
        }
        const timestamp = now();
        database.prepare("UPDATE project_metadata SET schema_version = ?, last_opened_at = ? WHERE singleton_id = 1")
          .run(CURRENT_SCHEMA_VERSION, timestamp);
        recordEvent(database, id, originalManifest.project.id, "project.opened", timestamp, { migrated: migrationStatus === "migrated" });
        const manifest = updateManifestForOpen(originalManifest, timestamp, CURRENT_SCHEMA_VERSION);
        await atomicWriteFile(path.join(root, PROJECT_MANIFEST_FILE), serializeProjectManifest(manifest), { overwrite: true });
        const sessionId = await createSqliteRecoveryRepository(database, { now, id }).beginExecutionSession({
          projectId: manifest.project.id,
          runId: manifest.current.runId,
          processId: process.pid,
          hostId: hostname(),
        });
        const recovery = inspectProjectRecovery(database, manifest.project.id, manifest.current.runId, timestamp);
        const summary = { ...summaryFromManifest(root, manifest, migrationStatus), ...recovery, state: "ready" as const };
        current = { root, manifest, database, lock, summary, sessionId };
        log("project.opened", manifest.project.id, { migrationStatus, schemaVersion: CURRENT_SCHEMA_VERSION, recoveryStatus: recovery.recoveryStatus, ...recovery.recoverySummary });
        return summary;
      } catch (error) {
        if (database?.isOpen) database.close();
        await lock.release().catch(() => undefined);
        throw error;
      }
    },

    async close() {
      if (current === null) throw new ProjectOperationError("PROJECT_NOT_OPEN", "No Project is currently open");
      const active = current;
      current = null;
      const timestamp = now();
      const manifest = parseProjectManifest({
        ...active.manifest,
        lifecycle: { state: "closed", lastValidatedAt: timestamp },
      });
      const recovery = inspectProjectRecovery(active.database, active.manifest.project.id, active.manifest.current.runId, timestamp);
      let closeError: unknown;
      try {
        await createSqliteRecoveryRepository(active.database, { now, id }).endExecutionSession({
          projectId: active.manifest.project.id,
          runId: active.manifest.current.runId,
          sessionId: active.sessionId,
        });
        recordEvent(active.database, id, manifest.project.id, "project.closed", timestamp);
        active.database.exec("PRAGMA wal_checkpoint(TRUNCATE)");
        await atomicWriteFile(path.join(active.root, PROJECT_MANIFEST_FILE), serializeProjectManifest(manifest), { overwrite: true });
      } catch (error) {
        closeError = error;
      } finally {
        if (active.database.isOpen) active.database.close();
        try {
          await active.lock.release();
        } catch (error) {
          closeError ??= error;
        }
      }
      if (closeError !== undefined) throw closeError;
      const summary = { ...summaryFromManifest(active.root, manifest, active.summary.migrationStatus), ...recovery, state: "closed" as const };
      log("project.closed", manifest.project.id);
      return summary;
    },

    async validate(projectPath) {
      const report = await validateProjectAt(path.resolve(projectPath), now);
      if (report.project !== null) log("project.validated", report.project.projectId, { valid: report.valid, issueCount: report.issues.length });
      return report;
    },

    async exportProject(input) {
      const root = path.resolve(input.projectPath);
      const archivePath = path.resolve(input.archivePath);
      if (await pathExists(archivePath)) throw new ProjectOperationError("PROJECT_ALREADY_EXISTS", "The export destination already exists");
      const report = await validateProjectAt(root, now);
      if (!report.valid || report.project === null) {
        const failure = validationFailure(report);
        throw new ProjectOperationError("PROJECT_EXPORT_FAILED", `${failure.code}: ${failure.message}`);
      }
      const usesCurrent = current?.root === root;
      let lock: ProjectLock | null = null;
      let database: DatabaseSync | null = null;
      const snapshotPath = path.join(root, "temp", `.export-${id()}.db`);
      try {
        if (usesCurrent) {
          database = current!.database;
        } else {
          lock = await acquireProjectLock(root, "export", now);
          database = openDatabase(path.join(root, ...PROJECT_DATABASE_PATH.split("/")));
        }
        recordEvent(database, id, report.project.projectId, "project.exported", now());
        await backup(database, snapshotPath, { rate: 100 });
        const databaseSnapshot = new Uint8Array(await readFile(snapshotPath));
        const archive = await createProjectArchive({
          projectRoot: root,
          projectId: report.project.projectId,
          exportedAt: now(),
          databaseSnapshot,
          limits: archiveLimits,
        });
        await atomicWriteFile(archivePath, archive.data);
        const result = {
          archivePath,
          projectId: report.project.projectId,
          entryCount: archive.entryCount,
          expandedBytes: archive.expandedBytes,
          sha256: sha256(archive.data),
        };
        log("project.export.completed", result.projectId, { entryCount: result.entryCount, expandedBytes: result.expandedBytes, sha256: result.sha256 });
        return result;
      } catch (error) {
        if (error instanceof ProjectOperationError) throw error;
        throw new ProjectOperationError("PROJECT_EXPORT_FAILED", error instanceof Error ? error.message : "Project export failed");
      } finally {
        await rm(snapshotPath, { force: true }).catch(() => undefined);
        if (!usesCurrent && database?.isOpen) database.close();
        await lock?.release().catch(() => undefined);
      }
    },

    async importProject(input) {
      const archivePath = path.resolve(input.archivePath);
      const destination = path.resolve(input.destinationPath);
      if (await pathExists(destination)) throw new ProjectOperationError("PROJECT_ALREADY_EXISTS", "The import destination already exists");
      const parent = path.dirname(destination);
      await mkdir(parent, { recursive: true });
      const staging = path.join(parent, `.${path.basename(destination)}.importing-${id()}`);
      try {
        const archiveData = new Uint8Array(await readFile(archivePath));
        const extracted = extractAndVerifyProjectArchive(archiveData, archiveLimits);
        await mkdir(staging, { recursive: false });
        for (const [relative, data] of extracted.files) {
          await atomicWriteFile(path.join(staging, ...relative.split("/")), data);
        }
        await Promise.all(REQUIRED_PROJECT_DIRECTORIES.map((relative) => mkdir(path.join(staging, ...relative.split("/")), { recursive: true })));
        const report = await validateProjectAt(staging, now);
        if (!report.valid || report.project === null || report.project.projectId !== extracted.projectId) {
          throw new ProjectOperationError("PROJECT_IMPORT_FAILED", report.issues.map((entry) => entry.message).join("; ") || "Export identity mismatch");
        }
        await atomicPromoteDirectory(staging, destination);
        const project = { ...report.project, projectPath: destination };
        log("project.import.completed", project.projectId, { entryCount: extracted.entryCount, archiveSha256: sha256(archiveData) });
        return { project, archiveSha256: sha256(archiveData), entryCount: extracted.entryCount };
      } catch (error) {
        await rm(staging, { recursive: true, force: true }).catch(() => undefined);
        if (error instanceof ProjectOperationError) throw error;
        throw new ProjectOperationError("PROJECT_IMPORT_FAILED", error instanceof Error ? error.message : "Project import failed");
      }
    },

    async createProfile(input) {
      const active = requireCurrent(input.projectPath);
      const existing = active.database.prepare("SELECT profile_id FROM site_profiles WHERE project_id = ?").get(active.manifest.project.id);
      if (existing !== undefined) throw new ScopeEngineError("PROFILE_ALREADY_EXISTS", "The Project already has a Site Profile");
      if (await pathExists(path.join(active.root, "profile", "config.json"))) throw new ScopeEngineError("PROFILE_INTEGRITY_MISMATCH", "A Profile file exists without a matching database ledger");
      const draft = normalizeSiteProfileDraft(input.draft);
      const createdAt = now();
      const profile = parseSiteProfile({
        schemaVersion: 1,
        engineVersion: 1,
        profileId: id(),
        projectId: active.manifest.project.id,
        revisionId: id(),
        sequence: 1,
        createdAt,
        updatedAt: createdAt,
        ...draft,
      });
      return persistProfileRevision(active, profile, true);
    },

    async getProfile(projectPath) {
      return readCurrentProfile(requireCurrent(projectPath));
    },

    async updateProfile(input) {
      const active = requireCurrent(input.projectPath);
      const previous = await readCurrentProfile(active);
      if (previous.revisionId !== input.expectedRevisionId) {
        throw new ScopeEngineError("PROFILE_REVISION_CONFLICT", "The Site Profile changed after it was read");
      }
      const draft = normalizeSiteProfileDraft(input.draft);
      const changedPaths = changedProfilePaths(profileDraftFrom(previous), draft);
      if (changedPaths.length === 0) {
        throw new ScopeEngineError("PROFILE_NO_CHANGES", "The proposed Site Profile has no semantic changes");
      }
      const profile = parseSiteProfile({
        ...previous,
        ...draft,
        revisionId: id(),
        sequence: previous.sequence + 1,
        updatedAt: now(),
      });
      return { profile: await persistProfileRevision(active, profile, false), changedPaths };
    },

    async validateStoredProfile(projectPath) {
      const active = requireCurrent(projectPath);
      try {
        return validateSiteProfile(await readCurrentProfile(active));
      } catch (error) {
        return {
          valid: false,
          errors: [{ code: error instanceof ScopeEngineError ? error.code : "PROFILE_INVALID", path: "profile/config.json", message: error instanceof Error ? error.message : "The Site Profile is invalid" }],
          warnings: [],
        };
      }
    },

    async compareProfiles(input) {
      const active = requireCurrent(input.projectPath);
      const rows = active.database.prepare(`
        SELECT sequence, profile_revision_id, canonical_json FROM site_profile_revisions
        WHERE profile_id = (SELECT profile_id FROM site_profiles WHERE project_id = ?)
          AND sequence IN (?, ?)
        ORDER BY sequence
      `).all(active.manifest.project.id, input.fromSequence, input.toSequence) as unknown as { sequence: number; profile_revision_id: string; canonical_json: string }[];
      const from = rows.find((row) => row.sequence === input.fromSequence);
      const to = rows.find((row) => row.sequence === input.toSequence);
      if (from === undefined || to === undefined) throw new ScopeEngineError("PROFILE_NOT_FOUND", "One or both requested Site Profile revisions do not exist");
      const changedPaths = changedProfilePaths(profileDraftFrom(parseSiteProfile(JSON.parse(from.canonical_json))), profileDraftFrom(parseSiteProfile(JSON.parse(to.canonical_json))));
      return { fromRevisionId: from.profile_revision_id, toRevisionId: to.profile_revision_id, changedPaths } satisfies SiteProfileComparison;
    },

    async enqueue(input) {
      return queueForCurrent().enqueue(input);
    },

    async enqueueBatch(inputs) {
      return queueForCurrent().enqueueBatch(inputs);
    },

    async hasIdentity(input) {
      return queueForCurrent().hasIdentity(input);
    },

    async countIdentities(input) {
      return queueForCurrent().countIdentities(input);
    },

    async claimNext(input) {
      return queueForCurrent().claimNext(input);
    },

    async complete(input) {
      return queueForCurrent().complete(input);
    },

    async fail(input) {
      return queueForCurrent().fail(input);
    },

    async scheduleRetry(input) {
      return queueForCurrent().scheduleRetry(input);
    },

    async releaseDueRetries(input) {
      return queueForCurrent().releaseDueRetries(input);
    },

    async skip(input) {
      return queueForCurrent().skip(input);
    },

    async block(input) {
      return queueForCurrent().block(input);
    },

    async get(input) {
      return queueForCurrent().get(input);
    },

    async list(input) {
      return queueForCurrent().list(input);
    },

    async getStatistics(input) {
      return queueForCurrent().getStatistics(input);
    },

    async getHistory(input) {
      return queueForCurrent().getHistory(input);
    },

    async clearPending(input) {
      return queueForCurrent().clearPending(input);
    },

    async claimNextWithLease(input) {
      return recoveryForCurrent().claimNextWithLease(input);
    },

    async claimJobWithLease(input) {
      return recoveryForCurrent().claimJobWithLease(input);
    },

    async heartbeatLease(input) {
      return recoveryForCurrent().heartbeatLease(input);
    },

    async renewLease(input) {
      return recoveryForCurrent().renewLease(input);
    },

    async releaseLease(input) {
      return recoveryForCurrent().releaseLease(input);
    },

    async listLeases(input) {
      return recoveryForCurrent().listLeases(input);
    },

    async getLease(input) {
      return recoveryForCurrent().getLease(input);
    },

    async saveJobCheckpoint(input) {
      return recoveryForCurrent().saveJobCheckpoint(input);
    },

    async getLatestJobCheckpoint(input) {
      return recoveryForCurrent().getLatestJobCheckpoint(input);
    },

    async listJobCheckpoints(input) {
      return recoveryForCurrent().listJobCheckpoints(input);
    },

    async saveArtifactCheckpoint(input) {
      return recoveryForCurrent().saveArtifactCheckpoint(input);
    },

    async validateArtifactCheckpoint(input) {
      return recoveryForCurrent().validateArtifactCheckpoint(input);
    },

    async saveCompletedOutputs(input) {
      return recoveryForCurrent().saveCompletedOutputs(input);
    },

    async inspectRecovery(input) {
      return recoveryForCurrent().inspectRecovery(input);
    },

    async recover(input) {
      return recoveryForCurrent().recover(input);
    },

    async getRecoveryReport(input) {
      return recoveryForCurrent().getRecoveryReport(input);
    },

    async requestPause(input) {
      return recoveryForCurrent().requestPause(input);
    },

    async getPauseStatus(input) {
      return recoveryForCurrent().getPauseStatus(input);
    },

    async acknowledgePause(input) {
      return recoveryForCurrent().acknowledgePause(input);
    },

    async resumeRun(input) {
      return recoveryForCurrent().resumeRun(input);
    },

    async getRunControlState(input) {
      return recoveryForCurrent().getRunControlState(input);
    },

    async verifyCompletedOutput(input) {
      return recoveryForCurrent().verifyCompletedOutput(input);
    },

    async beginExecutionSession(input) {
      return recoveryForCurrent().beginExecutionSession(input);
    },

    async endExecutionSession(input) {
      return recoveryForCurrent().endExecutionSession(input);
    },

    async recordRenderEvent(input) {
      return renderForCurrent().recordRenderEvent(input);
    },

    async commitRenderResult(input) {
      return renderForCurrent().commitRenderResult(input);
    },

    async recordRenderFailure(input) {
      return renderForCurrent().recordRenderFailure(input);
    },

    async getRenderStatus(input) {
      return renderForCurrent().getRenderStatus(input);
    },

    async getRenderResult(input) {
      return renderForCurrent().getRenderResult(input);
    },

    async listRenderEvents(input) {
      return renderForCurrent().listRenderEvents(input);
    },

    async getInteractionProfile(input) {
      return interactionForCurrent().getInteractionProfile(input);
    },

    async saveInteractionProfile(input) {
      return interactionForCurrent().saveInteractionProfile(input);
    },

    async saveInteractionTrace(input) {
      return interactionForCurrent().saveInteractionTrace(input);
    },

    async getInteractionTrace(input) {
      return interactionForCurrent().getInteractionTrace(input);
    },

    async listInteractionTraces(input) {
      return interactionForCurrent().listInteractionTraces(input);
    },

    async getCompatibility(projectPath) {
      return (await validateProjectAt(path.resolve(projectPath), now)).compatibility;
    },

    getCurrent() {
      return current?.summary ?? null;
    },
  } satisfies SqliteProjectStorage);
}

validateMigrationDefinitions(MIGRATIONS);
