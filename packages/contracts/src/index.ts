import { z } from "zod";

export const CONTRACT_VERSION = "1.1.0" as const;

export const COMMAND_TYPES = [
  "system.describe",
  "project.create",
  "project.open",
  "project.close",
  "project.validate",
  "project.export",
  "project.import",
  "project.info",
] as const;

export const SYSTEM_DESCRIBE_COMMAND = COMMAND_TYPES[0];
export const PROJECT_COMMAND_TYPES = COMMAND_TYPES.slice(1);

export const ERROR_CATEGORIES = [
  "validation",
  "configuration",
  "contract",
  "application",
  "domain",
  "platform",
  "security",
  "internal",
] as const;

export const ERROR_CODES = [
  "CONTRACT_UNSUPPORTED_VERSION",
  "CONTRACT_INVALID_PAYLOAD",
  "APPLICATION_COMMAND_FAILED",
  "CORE_CAPABILITY_NOT_IMPLEMENTED",
  "PLATFORM_OPERATION_FAILED",
  "SECURITY_UNAUTHORIZED_TRANSPORT",
  "INTERNAL_UNEXPECTED_ERROR",
  "PROJECT_ALREADY_EXISTS",
  "PROJECT_NOT_FOUND",
  "PROJECT_MANIFEST_INVALID",
  "PROJECT_FORMAT_UNSUPPORTED",
  "PROJECT_DATABASE_MISSING",
  "PROJECT_DATABASE_INVALID",
  "PROJECT_DATABASE_INTEGRITY_FAILED",
  "PROJECT_SCHEMA_UNSUPPORTED",
  "PROJECT_MIGRATION_REQUIRED",
  "PROJECT_MIGRATION_FAILED",
  "PROJECT_MIGRATION_CHECKSUM_MISMATCH",
  "PROJECT_BACKUP_FAILED",
  "PROJECT_LOCKED",
  "PROJECT_LOCK_INVALID",
  "PROJECT_NOT_OPEN",
  "PROJECT_VALIDATION_FAILED",
  "PROJECT_EXPORT_FAILED",
  "PROJECT_IMPORT_FAILED",
  "PROJECT_IMPORT_UNSAFE_ARCHIVE",
  "PROJECT_IMPORT_LIMIT_EXCEEDED",
  "PROJECT_ATOMIC_WRITE_FAILED",
] as const;

const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const timestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/);
const localPathSchema = z.string().min(1).max(2_048).refine((value) => !value.includes("\0"));
const baseUrlSchema = z.url().superRefine((value, context) => {
  if (!/^https?:\/\//i.test(value)) {
    context.addIssue({ code: "custom", message: "Base URL must use HTTP or HTTPS" });
  }
  if (/^https?:\/\/[^/?#]*@/i.test(value)) {
    context.addIssue({ code: "custom", message: "Base URL cannot contain credentials" });
  }
});

export const ErrorContractSchema = z
  .object({
    code: z.enum(ERROR_CODES),
    category: z.enum(ERROR_CATEGORIES),
    message: z.string().min(1).max(800),
    userMessage: z.string().min(1).max(400),
    retryable: z.boolean(),
    details: z.record(z.string(), z.unknown()).optional(),
    causeId: identifierSchema.optional(),
  })
  .strict();

const commandBase = {
  contractVersion: z.literal(CONTRACT_VERSION),
  commandId: identifierSchema,
  correlationId: identifierSchema,
  timestamp: timestampSchema,
};

export const SystemDescribeCommandSchema = z.object({
  ...commandBase,
  commandType: z.literal("system.describe"),
  payload: z.object({}).strict(),
}).strict();

export const ProjectCreateCommandSchema = z.object({
  ...commandBase,
  commandType: z.literal("project.create"),
  payload: z.object({
    destinationPath: localPathSchema,
    name: z.string().trim().min(1).max(120),
    slug: z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    baseUrl: baseUrlSchema.nullable().optional(),
  }).strict(),
}).strict();

export const ProjectOpenCommandSchema = z.object({
  ...commandBase,
  commandType: z.literal("project.open"),
  payload: z.object({ projectPath: localPathSchema }).strict(),
}).strict();

export const ProjectCloseCommandSchema = z.object({
  ...commandBase,
  commandType: z.literal("project.close"),
  payload: z.object({}).strict(),
}).strict();

export const ProjectValidateCommandSchema = z.object({
  ...commandBase,
  commandType: z.literal("project.validate"),
  payload: z.object({ projectPath: localPathSchema }).strict(),
}).strict();

export const ProjectExportCommandSchema = z.object({
  ...commandBase,
  commandType: z.literal("project.export"),
  payload: z.object({ projectPath: localPathSchema, archivePath: localPathSchema }).strict(),
}).strict();

export const ProjectImportCommandSchema = z.object({
  ...commandBase,
  commandType: z.literal("project.import"),
  payload: z.object({ archivePath: localPathSchema, destinationPath: localPathSchema }).strict(),
}).strict();

export const ProjectInfoCommandSchema = z.object({
  ...commandBase,
  commandType: z.literal("project.info"),
  payload: z.object({ projectPath: localPathSchema.optional() }).strict(),
}).strict();

export const CommandEnvelopeSchema = z.discriminatedUnion("commandType", [
  SystemDescribeCommandSchema,
  ProjectCreateCommandSchema,
  ProjectOpenCommandSchema,
  ProjectCloseCommandSchema,
  ProjectValidateCommandSchema,
  ProjectExportCommandSchema,
  ProjectImportCommandSchema,
  ProjectInfoCommandSchema,
]);

export const RuntimeInfoSchema = z.object({
  name: z.literal("Node.js"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
}).strict();

export const PlatformInfoSchema = z.object({
  operatingSystem: z.enum(["windows", "linux", "macos", "unknown"]),
  architecture: z.enum(["x64", "arm64", "ia32", "unknown"]),
}).strict();

export const SystemDescriptionSchema = z.object({
  resultType: z.literal("system.description"),
  applicationName: z.literal("Offline Web Archive Builder"),
  applicationVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  contractVersion: z.literal(CONTRACT_VERSION),
  coreStatus: z.literal("project-foundation-ready"),
  implementedCapabilities: z.array(z.enum(COMMAND_TYPES)).min(1),
  plannedCapabilities: z.array(z.string().min(1)).min(1),
  runtime: RuntimeInfoSchema,
  platform: PlatformInfoSchema,
}).strict();

export const ProjectCompatibilitySchema = z.object({
  compatible: z.boolean(),
  formatVersion: z.string().nullable(),
  schemaVersion: z.number().int().nonnegative().nullable(),
  currentSchemaVersion: z.number().int().positive(),
  requiresMigration: z.boolean(),
  reason: z.string().nullable(),
}).strict();

export const ProjectSummarySchema = z.object({
  projectPath: localPathSchema,
  projectId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  formatVersion: z.string(),
  schemaVersion: z.number().int().positive(),
  revisionId: z.string().uuid(),
  runId: z.string().uuid(),
  createdAt: timestampSchema,
  lastOpenedAt: timestampSchema,
  state: z.enum(["ready", "closed"]),
  migrationStatus: z.enum(["current", "migrated"]),
}).strict();

export const ProjectValidationIssueSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["error", "warning"]),
  category: z.enum(["manifest", "compatibility", "filesystem", "database", "migration", "identity", "security"]),
  message: z.string().min(1),
  relativePath: z.string().optional(),
}).strict();

export const ProjectSummaryResultSchema = z.object({
  resultType: z.literal("project.summary"),
  project: ProjectSummarySchema,
}).strict();

export const ProjectValidationResultSchema = z.object({
  resultType: z.literal("project.validation"),
  report: z.object({
    valid: z.boolean(),
    projectPath: localPathSchema,
    checkedAt: timestampSchema,
    compatibility: ProjectCompatibilitySchema,
    issues: z.array(ProjectValidationIssueSchema),
    project: ProjectSummarySchema.nullable(),
  }).strict(),
}).strict();

export const ProjectExportResultSchema = z.object({
  resultType: z.literal("project.export"),
  export: z.object({
    archivePath: localPathSchema,
    projectId: z.string().uuid(),
    entryCount: z.number().int().positive(),
    expandedBytes: z.number().int().nonnegative(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
}).strict();

export const ProjectImportResultSchema = z.object({
  resultType: z.literal("project.import"),
  import: z.object({
    project: ProjectSummarySchema,
    archiveSha256: z.string().regex(/^[a-f0-9]{64}$/),
    entryCount: z.number().int().positive(),
  }).strict(),
}).strict();

export const ProjectInfoResultSchema = z.object({
  resultType: z.literal("project.info"),
  currentProject: ProjectSummarySchema.nullable(),
  compatibility: ProjectCompatibilitySchema.nullable(),
}).strict();

export const ResultContractSchema = z.discriminatedUnion("resultType", [
  SystemDescriptionSchema,
  ProjectSummaryResultSchema,
  ProjectValidationResultSchema,
  ProjectExportResultSchema,
  ProjectImportResultSchema,
  ProjectInfoResultSchema,
]);

const responseBase = {
  contractVersion: z.literal(CONTRACT_VERSION),
  commandId: identifierSchema,
  correlationId: identifierSchema,
  timestamp: timestampSchema,
};

export const SuccessResponseEnvelopeSchema = z.object({
  ...responseBase,
  status: z.literal("success"),
  result: ResultContractSchema,
  error: z.null(),
}).strict();

export const ErrorResponseEnvelopeSchema = z.object({
  ...responseBase,
  status: z.literal("error"),
  result: z.null(),
  error: ErrorContractSchema,
}).strict();

export const ResponseEnvelopeSchema = z.discriminatedUnion("status", [
  SuccessResponseEnvelopeSchema,
  ErrorResponseEnvelopeSchema,
]);

export const EventEnvelopeSchema = z.object({
  contractVersion: z.literal(CONTRACT_VERSION),
  eventId: identifierSchema,
  eventType: z.enum(["system.describe.completed", "project.operation.progress", "project.operation.completed"]),
  correlationId: identifierSchema,
  sequence: z.number().int().nonnegative(),
  timestamp: timestampSchema,
  payload: z.object({
    operation: z.enum(COMMAND_TYPES),
    stage: z.string().min(1).max(80),
    percent: z.number().min(0).max(100).optional(),
  }).strict(),
}).strict();

export const ApplicationConfigurationSchema = z.object({
  applicationName: z.literal("Offline Web Archive Builder"),
  applicationVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  contractVersion: z.literal(CONTRACT_VERSION),
  logLevel: z.enum(["debug", "info", "warn", "error"]),
}).strict();

export type ErrorContract = z.infer<typeof ErrorContractSchema>;
export type CommandEnvelope = z.infer<typeof CommandEnvelopeSchema>;
export type CommandType = CommandEnvelope["commandType"];
export type SystemDescribeCommand = z.infer<typeof SystemDescribeCommandSchema>;
export type SystemDescription = z.infer<typeof SystemDescriptionSchema>;
export type ProjectSummaryContract = z.infer<typeof ProjectSummarySchema>;
export type RuntimeInfo = z.infer<typeof RuntimeInfoSchema>;
export type PlatformInfo = z.infer<typeof PlatformInfoSchema>;
export type ResponseEnvelope = z.infer<typeof ResponseEnvelopeSchema>;
export type SuccessResponseEnvelope = z.infer<typeof SuccessResponseEnvelopeSchema>;
export type ErrorResponseEnvelope = z.infer<typeof ErrorResponseEnvelopeSchema>;
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
export type ApplicationConfiguration = z.infer<typeof ApplicationConfigurationSchema>;

export class ContractValidationError extends Error {
  public constructor(
    public readonly code: "CONTRACT_UNSUPPORTED_VERSION" | "CONTRACT_INVALID_PAYLOAD",
    message: string,
  ) {
    super(message);
    this.name = "ContractValidationError";
  }
}

function hasUnsupportedVersion(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { contractVersion?: unknown };
  return typeof candidate.contractVersion === "string" && candidate.contractVersion !== CONTRACT_VERSION;
}

export function parseCommandEnvelope(value: unknown): CommandEnvelope {
  if (hasUnsupportedVersion(value)) {
    throw new ContractValidationError("CONTRACT_UNSUPPORTED_VERSION", `Unsupported contract version. This build accepts ${CONTRACT_VERSION}.`);
  }
  const parsed = CommandEnvelopeSchema.safeParse(value);
  if (!parsed.success) throw new ContractValidationError("CONTRACT_INVALID_PAYLOAD", "The command envelope is invalid.");
  return parsed.data;
}

export function parseSystemDescribeCommand(value: unknown): SystemDescribeCommand {
  const command = parseCommandEnvelope(value);
  if (command.commandType !== "system.describe") {
    throw new ContractValidationError("CONTRACT_INVALID_PAYLOAD", "Expected a system.describe command.");
  }
  return command;
}

export function parseResponseEnvelope(value: unknown): ResponseEnvelope {
  if (hasUnsupportedVersion(value)) {
    throw new ContractValidationError("CONTRACT_UNSUPPORTED_VERSION", `Unsupported contract version. This build accepts ${CONTRACT_VERSION}.`);
  }
  const parsed = ResponseEnvelopeSchema.safeParse(value);
  if (!parsed.success) throw new ContractValidationError("CONTRACT_INVALID_PAYLOAD", "The response envelope is invalid.");
  return parsed.data;
}

export function parseEventEnvelope(value: unknown): EventEnvelope {
  const parsed = EventEnvelopeSchema.safeParse(value);
  if (!parsed.success) {
    throw new ContractValidationError(hasUnsupportedVersion(value) ? "CONTRACT_UNSUPPORTED_VERSION" : "CONTRACT_INVALID_PAYLOAD", "The event envelope is invalid.");
  }
  return parsed.data;
}

interface CommandMetadata {
  commandId: string;
  correlationId: string;
  timestamp: string;
}

export function createSystemDescribeCommand(input: CommandMetadata): SystemDescribeCommand {
  return parseSystemDescribeCommand({ ...input, contractVersion: CONTRACT_VERSION, commandType: "system.describe", payload: {} });
}

export function createProjectCommand(
  commandType: Exclude<CommandType, "system.describe">,
  payload: unknown,
  input: CommandMetadata,
): CommandEnvelope {
  return parseCommandEnvelope({ ...input, contractVersion: CONTRACT_VERSION, commandType, payload });
}
