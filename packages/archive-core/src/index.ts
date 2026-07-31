export const IMPLEMENTED_CORE_CAPABILITIES = [
  "system.describe",
  "project.create",
  "project.open",
  "project.close",
  "project.validate",
  "project.export",
  "project.import",
  "project.info",
] as const;

export const PLANNED_CORE_CAPABILITIES = [
  "profile.scope-policy",
  "url.normalization",
  "crawl.execution",
  "browser.rendering",
  "archive.generation",
  "authentication",
  "proxy.management",
] as const;

export type ProjectOperationErrorCode =
  | "PROJECT_ALREADY_EXISTS"
  | "PROJECT_NOT_FOUND"
  | "PROJECT_MANIFEST_INVALID"
  | "PROJECT_FORMAT_UNSUPPORTED"
  | "PROJECT_DATABASE_MISSING"
  | "PROJECT_DATABASE_INVALID"
  | "PROJECT_DATABASE_INTEGRITY_FAILED"
  | "PROJECT_SCHEMA_UNSUPPORTED"
  | "PROJECT_MIGRATION_REQUIRED"
  | "PROJECT_MIGRATION_FAILED"
  | "PROJECT_MIGRATION_CHECKSUM_MISMATCH"
  | "PROJECT_BACKUP_FAILED"
  | "PROJECT_LOCKED"
  | "PROJECT_LOCK_INVALID"
  | "PROJECT_NOT_OPEN"
  | "PROJECT_VALIDATION_FAILED"
  | "PROJECT_EXPORT_FAILED"
  | "PROJECT_IMPORT_FAILED"
  | "PROJECT_IMPORT_UNSAFE_ARCHIVE"
  | "PROJECT_IMPORT_LIMIT_EXCEEDED"
  | "PROJECT_ATOMIC_WRITE_FAILED";

export type ValidationSeverity = "error" | "warning";
export type ValidationCategory =
  | "manifest"
  | "compatibility"
  | "filesystem"
  | "database"
  | "migration"
  | "identity"
  | "security";

export interface ProjectValidationIssue {
  code: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  message: string;
  relativePath?: string;
}

export interface ProjectCompatibility {
  compatible: boolean;
  formatVersion: string | null;
  schemaVersion: number | null;
  currentSchemaVersion: number;
  requiresMigration: boolean;
  reason: string | null;
}

export interface ProjectSummary {
  projectPath: string;
  projectId: string;
  name: string;
  slug: string;
  formatVersion: string;
  schemaVersion: number;
  revisionId: string;
  runId: string;
  createdAt: string;
  lastOpenedAt: string;
  state: "ready" | "closed";
  migrationStatus: "current" | "migrated";
}

export interface ProjectValidationReport {
  valid: boolean;
  projectPath: string;
  checkedAt: string;
  compatibility: ProjectCompatibility;
  issues: readonly ProjectValidationIssue[];
  project: ProjectSummary | null;
}

export interface ProjectExportResult {
  archivePath: string;
  projectId: string;
  entryCount: number;
  expandedBytes: number;
  sha256: string;
}

export interface ProjectImportResult {
  project: ProjectSummary;
  archiveSha256: string;
  entryCount: number;
}

export interface CreateProjectInput {
  destinationPath: string;
  name: string;
  slug: string;
  baseUrl?: string | null;
}

export interface ExportProjectInput {
  projectPath: string;
  archivePath: string;
}

export interface ImportProjectInput {
  archivePath: string;
  destinationPath: string;
}

export interface ProjectStoragePort {
  create(input: CreateProjectInput): Promise<ProjectSummary>;
  open(projectPath: string): Promise<ProjectSummary>;
  close(): Promise<ProjectSummary>;
  validate(projectPath: string): Promise<ProjectValidationReport>;
  exportProject(input: ExportProjectInput): Promise<ProjectExportResult>;
  importProject(input: ImportProjectInput): Promise<ProjectImportResult>;
  getCompatibility(projectPath: string): Promise<ProjectCompatibility>;
  getCurrent(): ProjectSummary | null;
}

export class ProjectOperationError extends Error {
  public constructor(
    public readonly code: ProjectOperationErrorCode,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "ProjectOperationError";
  }
}

export interface CoreSystemDescription {
  coreStatus: "project-foundation-ready";
  implementedCapabilities: typeof IMPLEMENTED_CORE_CAPABILITIES;
  plannedCapabilities: typeof PLANNED_CORE_CAPABILITIES;
}

export interface ArchiveCore {
  describeSystem(): CoreSystemDescription;
}

export function createArchiveCore(): ArchiveCore {
  return Object.freeze({
    describeSystem(): CoreSystemDescription {
      return {
        coreStatus: "project-foundation-ready",
        implementedCapabilities: IMPLEMENTED_CORE_CAPABILITIES,
        plannedCapabilities: PLANNED_CORE_CAPABILITIES,
      };
    },
  });
}
