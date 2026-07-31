import {
  createArchiveCore,
  ProjectOperationError,
  type ArchiveCore,
  type ProjectStoragePort,
} from "@offline-web-archive/archive-core";
import {
  CONTRACT_VERSION,
  ContractValidationError,
  parseCommandEnvelope,
  parseResponseEnvelope,
  type ApplicationConfiguration,
  type CommandEnvelope,
  type ErrorContract,
  type PlatformInfo,
  type ResponseEnvelope,
  type RuntimeInfo,
} from "@offline-web-archive/contracts";
import { createSilentLogger, type Logger } from "@offline-web-archive/observability";
import { createSqliteProjectStorage } from "@offline-web-archive/persistence-sqlite";

export type LocalTransport = "cli" | "electron-ipc";

export interface TransportContext {
  transport: LocalTransport;
  authorized: boolean;
}

export interface ApplicationService {
  execute(command: unknown, context: TransportContext): Promise<ResponseEnvelope>;
}

export interface ApplicationServiceDependencies {
  configuration: ApplicationConfiguration;
  runtime: RuntimeInfo;
  platform: PlatformInfo;
  core?: ArchiveCore;
  projectStorage?: ProjectStoragePort;
  logger?: Logger;
  now?: () => string;
}

function safeIdentifiers(raw: unknown): { commandId: string; correlationId: string } {
  if (typeof raw !== "object" || raw === null) return { commandId: "unknown-command", correlationId: "unknown-correlation" };
  const candidate = raw as Record<string, unknown>;
  const safe = (value: unknown, fallback: string): string =>
    typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value) ? value : fallback;
  return {
    commandId: safe(candidate["commandId"], "unknown-command"),
    correlationId: safe(candidate["correlationId"], "unknown-correlation"),
  };
}

function contractError(error: ContractValidationError): ErrorContract {
  return {
    code: error.code,
    category: "contract",
    message: error.message,
    userMessage: error.code === "CONTRACT_UNSUPPORTED_VERSION"
      ? "This command uses an unsupported contract version."
      : "The command could not be validated.",
    retryable: false,
  };
}

function projectError(error: ProjectOperationError): ErrorContract {
  const validationCodes = new Set([
    "PROJECT_MANIFEST_INVALID",
    "PROJECT_FORMAT_UNSUPPORTED",
    "PROJECT_DATABASE_MISSING",
    "PROJECT_DATABASE_INVALID",
    "PROJECT_DATABASE_INTEGRITY_FAILED",
    "PROJECT_SCHEMA_UNSUPPORTED",
    "PROJECT_MIGRATION_REQUIRED",
    "PROJECT_MIGRATION_CHECKSUM_MISMATCH",
    "PROJECT_VALIDATION_FAILED",
  ]);
  const securityCodes = new Set([
    "PROJECT_IMPORT_UNSAFE_ARCHIVE",
    "PROJECT_IMPORT_LIMIT_EXCEEDED",
    "PROJECT_LOCK_INVALID",
  ]);
  const userMessages: Partial<Record<ProjectOperationError["code"], string>> = {
    PROJECT_ALREADY_EXISTS: "The selected destination already exists.",
    PROJECT_NOT_FOUND: "The selected Project could not be found.",
    PROJECT_MANIFEST_INVALID: "The Project manifest is invalid.",
    PROJECT_FORMAT_UNSUPPORTED: "This Project format is not supported by this application version.",
    PROJECT_DATABASE_INTEGRITY_FAILED: "The Project database failed its integrity check.",
    PROJECT_SCHEMA_UNSUPPORTED: "This Project database schema is not supported.",
    PROJECT_MIGRATION_CHECKSUM_MISMATCH: "The Project migration history has been modified and cannot be trusted.",
    PROJECT_LOCKED: "The Project is already open by another process.",
    PROJECT_IMPORT_UNSAFE_ARCHIVE: "The selected archive contains an unsafe or invalid entry.",
    PROJECT_IMPORT_LIMIT_EXCEEDED: "The selected archive exceeds the safe import limits.",
    PROJECT_NOT_OPEN: "No Project is currently open.",
  };
  return {
    code: error.code,
    category: securityCodes.has(error.code) ? "security" : validationCodes.has(error.code) ? "validation" : "application",
    message: error.message,
    userMessage: userMessages[error.code] ?? "The Project operation could not be completed safely.",
    retryable: error.retryable,
  };
}

function internalError(): ErrorContract {
  return {
    code: "INTERNAL_UNEXPECTED_ERROR",
    category: "internal",
    message: "The application service failed unexpectedly.",
    userMessage: "The operation could not be completed.",
    retryable: true,
  };
}

function unauthorizedError(): ErrorContract {
  return {
    code: "SECURITY_UNAUTHORIZED_TRANSPORT",
    category: "security",
    message: "The local transport did not pass its authorization boundary.",
    userMessage: "The request was not authorized.",
    retryable: false,
  };
}

async function executeProjectCommand(
  command: Exclude<CommandEnvelope, { commandType: "system.describe" }>,
  storage: ProjectStoragePort,
): Promise<unknown> {
  switch (command.commandType) {
    case "project.create":
      return {
        resultType: "project.summary",
        project: await storage.create({
          destinationPath: command.payload.destinationPath,
          name: command.payload.name,
          slug: command.payload.slug,
          ...(command.payload.baseUrl === undefined ? {} : { baseUrl: command.payload.baseUrl }),
        }),
      };
    case "project.open":
      return { resultType: "project.summary", project: await storage.open(command.payload.projectPath) };
    case "project.close":
      return { resultType: "project.summary", project: await storage.close() };
    case "project.validate":
      return { resultType: "project.validation", report: await storage.validate(command.payload.projectPath) };
    case "project.export":
      return { resultType: "project.export", export: await storage.exportProject(command.payload) };
    case "project.import":
      return { resultType: "project.import", import: await storage.importProject(command.payload) };
    case "project.info":
      return {
        resultType: "project.info",
        currentProject: storage.getCurrent(),
        compatibility: command.payload.projectPath === undefined
          ? null
          : await storage.getCompatibility(command.payload.projectPath),
      };
  }
}

export function createApplicationService(dependencies: ApplicationServiceDependencies): ApplicationService {
  const core = dependencies.core ?? createArchiveCore();
  const logger = dependencies.logger ?? createSilentLogger();
  const now = dependencies.now ?? (() => new Date().toISOString());
  const storage = dependencies.projectStorage ?? createSqliteProjectStorage({
    applicationVersion: dependencies.configuration.applicationVersion,
    logger,
    now,
  });

  const response = (raw: unknown, result: unknown, error: ErrorContract | null): ResponseEnvelope => {
    const identifiers = safeIdentifiers(raw);
    return parseResponseEnvelope({
      contractVersion: CONTRACT_VERSION,
      commandId: identifiers.commandId,
      correlationId: identifiers.correlationId,
      status: error === null ? "success" : "error",
      result: error === null ? result : null,
      error,
      timestamp: now(),
    });
  };

  return Object.freeze({
    async execute(rawCommand: unknown, context: TransportContext): Promise<ResponseEnvelope> {
      if (!context.authorized) return response(rawCommand, null, unauthorizedError());
      let command: CommandEnvelope;
      try {
        command = parseCommandEnvelope(rawCommand);
      } catch (error) {
        return response(rawCommand, null, error instanceof ContractValidationError ? contractError(error) : internalError());
      }
      logger.log({
        timestamp: now(),
        level: "info",
        component: "application-service",
        correlationId: command.correlationId,
        commandId: command.commandId,
        eventName: "command.started",
        metadata: { commandType: command.commandType, transport: context.transport },
      });
      try {
        const result = command.commandType === "system.describe"
          ? {
              resultType: "system.description",
              applicationName: dependencies.configuration.applicationName,
              applicationVersion: dependencies.configuration.applicationVersion,
              contractVersion: CONTRACT_VERSION,
              ...core.describeSystem(),
              implementedCapabilities: [...core.describeSystem().implementedCapabilities],
              plannedCapabilities: [...core.describeSystem().plannedCapabilities],
              runtime: dependencies.runtime,
              platform: dependencies.platform,
            }
          : await executeProjectCommand(command, storage);
        const completed = response(rawCommand, result, null);
        logger.log({
          timestamp: now(),
          level: "info",
          component: "application-service",
          correlationId: command.correlationId,
          commandId: command.commandId,
          eventName: "command.completed",
          metadata: { commandType: command.commandType, status: completed.status },
        });
        return completed;
      } catch (error) {
        const translated = error instanceof ProjectOperationError ? projectError(error) : internalError();
        logger.log({
          timestamp: now(),
          level: "error",
          component: "application-service",
          correlationId: command.correlationId,
          commandId: command.commandId,
          eventName: "command.failed",
          errorCode: translated.code,
          metadata: { commandType: command.commandType },
        });
        return response(rawCommand, null, translated);
      }
    },
  });
}
