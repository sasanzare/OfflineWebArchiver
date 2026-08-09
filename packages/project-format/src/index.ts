import { z } from "zod";
import {
  canonicalPathCollisionKey,
  canonicalRelativePath,
  validateCanonicalRelativePath,
  type CanonicalPathValidation,
} from "@offline-web-archive/archive-core";

export const PROJECT_FORMAT_NAME = "offline-web-archive-project" as const;
export const PROJECT_FORMAT_VERSION = "1.1.0" as const;
export const PROJECT_SCHEMA_VERSION = 9 as const;
export const MINIMUM_APPLICATION_VERSION = "0.8.0" as const;
export const PROJECT_MANIFEST_FILE = "project.json" as const;
export const PROJECT_DATABASE_PATH = "database/crawl.db" as const;
export const PROJECT_LOCK_FILE = ".project.lock" as const;
export const EXPORT_METADATA_FILE = ".offline-archive-export.json" as const;

export const REQUIRED_PROJECT_DIRECTORIES = Object.freeze([
  "database",
  "pages",
  "assets",
  "assets/css",
  "assets/js",
  "assets/images",
  "assets/fonts",
  "assets/media",
  "api",
  "api/responses",
  "runtime",
  "reports",
  "logs",
  "temp",
] as const);

export const RESERVED_PROJECT_DIRECTORIES = Object.freeze([
  "profile",
  "auth",
  "proxies",
  "secrets",
  "secure-exports",
  "diagnostics",
] as const);

export const EXPORT_EXCLUDED_PREFIXES = Object.freeze([
  "temp/",
  "logs/",
  "database/backups/",
  "auth/",
  "proxies/",
  "secrets/",
  "secure-exports/",
  "diagnostics/",
] as const);

const utcTimestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid UTC timestamp");
const uuidSchema = z.string().uuid();
const baseUrlSchema = z.url().superRefine((value, context) => {
  if (!/^https?:\/\//i.test(value)) {
    context.addIssue({ code: "custom", message: "Base URL must use HTTP or HTTPS" });
  }
  if (/^https?:\/\/[^/?#]*@/i.test(value)) {
    context.addIssue({ code: "custom", message: "Base URL cannot contain credentials" });
  }
});
const relativePathSchema = z.string().superRefine((value, context) => {
  const result = validatePortableRelativePath(value);
  if (!result.valid) {
    context.addIssue({ code: "custom", message: result.reason });
  }
});

export const ProjectManifestSchema = z
  .object({
    format: z
      .object({
        name: z.literal(PROJECT_FORMAT_NAME),
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
      })
      .strict(),
    application: z
      .object({ version: z.string().regex(/^\d+\.\d+\.\d+$/) })
      .strict(),
    project: z
      .object({
        id: uuidSchema,
        name: z.string().trim().min(1).max(120),
        slug: z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        createdAt: utcTimestampSchema,
        lastOpenedAt: utcTimestampSchema,
      })
      .strict(),
    source: z
      .object({ baseUrl: baseUrlSchema.nullable() })
      .strict(),
    current: z
      .object({ revisionId: uuidSchema, runId: uuidSchema })
      .strict(),
    database: z
      .object({
        path: relativePathSchema,
        schemaVersion: z.number().int().nonnegative(),
      })
      .strict(),
    paths: z
      .object({
        pages: relativePathSchema,
        assets: relativePathSchema,
        apiResponses: relativePathSchema,
        runtime: relativePathSchema,
        reports: relativePathSchema,
        logs: relativePathSchema,
      })
      .strict(),
    features: z
      .object({
        scopePolicy: z.boolean(),
        crawlQueue: z.boolean(),
        browserRendering: z.literal(false),
        authentication: z.boolean(),
        proxies: z.literal(false),
        archiveGeneration: z.literal(false),
      })
      .strict(),
    lifecycle: z
      .object({
        state: z.enum(["ready", "closed"]),
        lastValidatedAt: utcTimestampSchema,
      })
      .strict(),
    compatibility: z
      .object({
        minimumApplicationVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
      })
      .strict(),
  })
  .strict();

export type ProjectManifest = z.infer<typeof ProjectManifestSchema>;

export interface PortablePathValidation {
  valid: boolean;
  reason: string;
}

export function validatePortableRelativePath(value: string): PortablePathValidation {
  const result: CanonicalPathValidation = validateCanonicalRelativePath(value);
  return { valid: result.valid, reason: result.message };
}

export function normalizeArchiveEntry(value: string): string {
  const validation = validatePortableRelativePath(value);
  if (!validation.valid) throw new ProjectFormatError("PROJECT_IMPORT_UNSAFE_ARCHIVE", validation.reason);
  return canonicalRelativePath(value);
}

export function portablePathCollisionKey(value: string): string {
  return canonicalPathCollisionKey(value);
}

export function isSupportedProjectFormatVersion(version: string): boolean {
  const [major, minor, patch, extra] = version.split(".").map((value) => Number(value));
  if (extra !== undefined || major === undefined || minor === undefined || patch === undefined) return false;
  if (![major, minor, patch].every(Number.isSafeInteger)) return false;
  return major === 1 && (minor === 0 || minor === 1) && patch === 0;
}

export function parseProjectManifest(value: unknown): ProjectManifest {
  const result = ProjectManifestSchema.safeParse(value);
  if (!result.success) {
    throw new ProjectFormatError(
      "PROJECT_MANIFEST_INVALID",
      result.error.issues.map((issue) => `${issue.path.join(".") || "manifest"}: ${issue.message}`).join("; "),
    );
  }
  if (!isSupportedProjectFormatVersion(result.data.format.version)) {
    throw new ProjectFormatError(
      "PROJECT_FORMAT_UNSUPPORTED",
      `Unsupported Project format version ${result.data.format.version}`,
    );
  }
  if (result.data.database.path !== PROJECT_DATABASE_PATH) {
    throw new ProjectFormatError("PROJECT_MANIFEST_INVALID", "The database path is not canonical");
  }
  return result.data;
}

export function serializeProjectManifest(manifest: ProjectManifest): string {
  return `${JSON.stringify(parseProjectManifest(manifest), null, 2)}\n`;
}

export function createProjectManifest(input: {
  applicationVersion: string;
  projectId: string;
  name: string;
  slug: string;
  createdAt: string;
  revisionId: string;
  runId: string;
  baseUrl?: string | null;
}): ProjectManifest {
  return parseProjectManifest({
    format: { name: PROJECT_FORMAT_NAME, version: PROJECT_FORMAT_VERSION },
    application: { version: input.applicationVersion },
    project: {
      id: input.projectId,
      name: input.name,
      slug: input.slug,
      createdAt: input.createdAt,
      lastOpenedAt: input.createdAt,
    },
    source: { baseUrl: input.baseUrl ?? null },
    current: { revisionId: input.revisionId, runId: input.runId },
    database: { path: PROJECT_DATABASE_PATH, schemaVersion: PROJECT_SCHEMA_VERSION },
    paths: {
      pages: "pages",
      assets: "assets",
      apiResponses: "api/responses",
      runtime: "runtime",
      reports: "reports",
      logs: "logs",
    },
    features: {
      scopePolicy: false,
      crawlQueue: true,
      browserRendering: false,
      authentication: true,
      proxies: false,
      archiveGeneration: false,
    },
    lifecycle: { state: "ready", lastValidatedAt: input.createdAt },
    compatibility: { minimumApplicationVersion: MINIMUM_APPLICATION_VERSION },
  });
}

export function enableScopePolicy(manifest: ProjectManifest, input: {
  applicationVersion: string;
  baseUrl: string;
  revisionId: string;
  schemaVersion: number;
  timestamp: string;
}): ProjectManifest {
  return parseProjectManifest({
    ...manifest,
    format: { ...manifest.format, version: PROJECT_FORMAT_VERSION },
    application: { version: input.applicationVersion },
    source: { baseUrl: input.baseUrl },
    current: { ...manifest.current, revisionId: input.revisionId },
    database: { ...manifest.database, schemaVersion: input.schemaVersion },
    features: { ...manifest.features, scopePolicy: true },
    lifecycle: { ...manifest.lifecycle, lastValidatedAt: input.timestamp },
    compatibility: { minimumApplicationVersion: MINIMUM_APPLICATION_VERSION },
  });
}

export type ProjectFormatErrorCode =
  | "PROJECT_MANIFEST_INVALID"
  | "PROJECT_FORMAT_UNSUPPORTED"
  | "PROJECT_IMPORT_UNSAFE_ARCHIVE";

export class ProjectFormatError extends Error {
  public constructor(
    public readonly code: ProjectFormatErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProjectFormatError";
  }
}
