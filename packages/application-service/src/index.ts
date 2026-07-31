import {
  createArchiveCore,
  type ArchiveCore,
} from "@offline-web-archive/archive-core";
import {
  CONTRACT_VERSION,
  ContractValidationError,
  parseResponseEnvelope,
  parseSystemDescribeCommand,
  type ApplicationConfiguration,
  type ErrorContract,
  type PlatformInfo,
  type ResponseEnvelope,
  type RuntimeInfo,
} from "@offline-web-archive/contracts";
import {
  createSilentLogger,
  type Logger,
} from "@offline-web-archive/observability";

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
  logger?: Logger;
  now?: () => string;
}

function safeIdentifiers(raw: unknown): {
  commandId: string;
  correlationId: string;
} {
  if (typeof raw !== "object" || raw === null) {
    return { commandId: "unknown-command", correlationId: "unknown-correlation" };
  }
  const candidate = raw as Record<string, unknown>;
  const safe = (value: unknown, fallback: string): string =>
    typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)
      ? value
      : fallback;
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
    userMessage:
      error.code === "CONTRACT_UNSUPPORTED_VERSION"
        ? "This command uses an unsupported contract version."
        : "The command could not be validated.",
    retryable: false,
  };
}

function internalError(): ErrorContract {
  return {
    code: "INTERNAL_UNEXPECTED_ERROR",
    category: "internal",
    message: "The application service failed unexpectedly.",
    userMessage: "The system description could not be loaded.",
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

export function createApplicationService(
  dependencies: ApplicationServiceDependencies,
): ApplicationService {
  const core = dependencies.core ?? createArchiveCore();
  const logger = dependencies.logger ?? createSilentLogger();
  const now = dependencies.now ?? (() => new Date().toISOString());

  const errorResponse = (
    raw: unknown,
    error: ErrorContract,
  ): ResponseEnvelope => {
    const identifiers = safeIdentifiers(raw);
    return parseResponseEnvelope({
      contractVersion: CONTRACT_VERSION,
      commandId: identifiers.commandId,
      correlationId: identifiers.correlationId,
      status: "error",
      result: null,
      error,
      timestamp: now(),
    });
  };

  return Object.freeze({
    async execute(
      rawCommand: unknown,
      context: TransportContext,
    ): Promise<ResponseEnvelope> {
      if (!context.authorized) {
        return errorResponse(rawCommand, unauthorizedError());
      }

      let command;
      try {
        command = parseSystemDescribeCommand(rawCommand);
      } catch (error) {
        if (error instanceof ContractValidationError) {
          return errorResponse(rawCommand, contractError(error));
        }
        return errorResponse(rawCommand, internalError());
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
        const coreDescription = core.describeSystem();
        const response = parseResponseEnvelope({
          contractVersion: CONTRACT_VERSION,
          commandId: command.commandId,
          correlationId: command.correlationId,
          status: "success",
          result: {
            applicationName: dependencies.configuration.applicationName,
            applicationVersion: dependencies.configuration.applicationVersion,
            contractVersion: CONTRACT_VERSION,
            ...coreDescription,
            implementedCapabilities: [...coreDescription.implementedCapabilities],
            plannedCapabilities: [...coreDescription.plannedCapabilities],
            runtime: dependencies.runtime,
            platform: dependencies.platform,
          },
          error: null,
          timestamp: now(),
        });
        logger.log({
          timestamp: now(),
          level: "info",
          component: "application-service",
          correlationId: command.correlationId,
          commandId: command.commandId,
          eventName: "command.completed",
          metadata: { status: response.status },
        });
        return response;
      } catch {
        logger.log({
          timestamp: now(),
          level: "error",
          component: "application-service",
          correlationId: command.correlationId,
          commandId: command.commandId,
          eventName: "command.failed",
          errorCode: "INTERNAL_UNEXPECTED_ERROR",
        });
        return errorResponse(rawCommand, internalError());
      }
    },
  });
}

