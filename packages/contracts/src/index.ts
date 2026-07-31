import { z } from "zod";

export const CONTRACT_VERSION = "1.0.0" as const;
export const SYSTEM_DESCRIBE_COMMAND = "system.describe" as const;
export const SYSTEM_DESCRIBE_COMPLETED_EVENT = "system.describe.completed" as const;

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
] as const;

const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const timestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/);

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

export const SystemDescribePayloadSchema = z.object({}).strict();

export const SystemDescribeCommandSchema = z
  .object({
    contractVersion: z.literal(CONTRACT_VERSION),
    commandId: identifierSchema,
    commandType: z.literal(SYSTEM_DESCRIBE_COMMAND),
    correlationId: identifierSchema,
    timestamp: timestampSchema,
    payload: SystemDescribePayloadSchema,
  })
  .strict();

export const RuntimeInfoSchema = z
  .object({
    name: z.literal("Node.js"),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
  })
  .strict();

export const PlatformInfoSchema = z
  .object({
    operatingSystem: z.enum(["windows", "linux", "macos", "unknown"]),
    architecture: z.enum(["x64", "arm64", "ia32", "unknown"]),
  })
  .strict();

export const SystemDescriptionSchema = z
  .object({
    applicationName: z.literal("Offline Web Archive Builder"),
    applicationVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    contractVersion: z.literal(CONTRACT_VERSION),
    coreStatus: z.literal("architecture-ready"),
    implementedCapabilities: z.array(z.literal(SYSTEM_DESCRIBE_COMMAND)).min(1),
    plannedCapabilities: z.array(z.string().min(1)).min(1),
    runtime: RuntimeInfoSchema,
    platform: PlatformInfoSchema,
  })
  .strict();

const responseBase = {
  contractVersion: z.literal(CONTRACT_VERSION),
  commandId: identifierSchema,
  correlationId: identifierSchema,
  timestamp: timestampSchema,
};

export const SuccessResponseEnvelopeSchema = z
  .object({
    ...responseBase,
    status: z.literal("success"),
    result: SystemDescriptionSchema,
    error: z.null(),
  })
  .strict();

export const ErrorResponseEnvelopeSchema = z
  .object({
    ...responseBase,
    status: z.literal("error"),
    result: z.null(),
    error: ErrorContractSchema,
  })
  .strict();

export const ResponseEnvelopeSchema = z.discriminatedUnion("status", [
  SuccessResponseEnvelopeSchema,
  ErrorResponseEnvelopeSchema,
]);

export const EventEnvelopeSchema = z
  .object({
    contractVersion: z.literal(CONTRACT_VERSION),
    eventId: identifierSchema,
    eventType: z.literal(SYSTEM_DESCRIBE_COMPLETED_EVENT),
    correlationId: identifierSchema,
    sequence: z.number().int().nonnegative(),
    timestamp: timestampSchema,
    payload: z.object({ coreStatus: z.literal("architecture-ready") }).strict(),
  })
  .strict();

export const ApplicationConfigurationSchema = z
  .object({
    applicationName: z.literal("Offline Web Archive Builder"),
    applicationVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    contractVersion: z.literal(CONTRACT_VERSION),
    logLevel: z.enum(["debug", "info", "warn", "error"]),
  })
  .strict();

export type ErrorContract = z.infer<typeof ErrorContractSchema>;
export type SystemDescribeCommand = z.infer<typeof SystemDescribeCommandSchema>;
export type SystemDescription = z.infer<typeof SystemDescriptionSchema>;
export type RuntimeInfo = z.infer<typeof RuntimeInfoSchema>;
export type PlatformInfo = z.infer<typeof PlatformInfoSchema>;
export type ResponseEnvelope = z.infer<typeof ResponseEnvelopeSchema>;
export type SuccessResponseEnvelope = z.infer<typeof SuccessResponseEnvelopeSchema>;
export type ErrorResponseEnvelope = z.infer<typeof ErrorResponseEnvelopeSchema>;
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
export type ApplicationConfiguration = z.infer<typeof ApplicationConfigurationSchema>;

export class ContractValidationError extends Error {
  public readonly code:
    | "CONTRACT_UNSUPPORTED_VERSION"
    | "CONTRACT_INVALID_PAYLOAD";

  public constructor(
    code: "CONTRACT_UNSUPPORTED_VERSION" | "CONTRACT_INVALID_PAYLOAD",
    message: string,
  ) {
    super(message);
    this.name = "ContractValidationError";
    this.code = code;
  }
}

function hasUnsupportedVersion(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { contractVersion?: unknown };
  return (
    typeof candidate.contractVersion === "string" &&
    candidate.contractVersion !== CONTRACT_VERSION
  );
}

export function parseSystemDescribeCommand(value: unknown): SystemDescribeCommand {
  if (hasUnsupportedVersion(value)) {
    throw new ContractValidationError(
      "CONTRACT_UNSUPPORTED_VERSION",
      `Unsupported contract version. This build accepts ${CONTRACT_VERSION}.`,
    );
  }
  const parsed = SystemDescribeCommandSchema.safeParse(value);
  if (!parsed.success) {
    throw new ContractValidationError(
      "CONTRACT_INVALID_PAYLOAD",
      "The system.describe command envelope is invalid.",
    );
  }
  return parsed.data;
}

export function parseResponseEnvelope(value: unknown): ResponseEnvelope {
  if (hasUnsupportedVersion(value)) {
    throw new ContractValidationError(
      "CONTRACT_UNSUPPORTED_VERSION",
      `Unsupported contract version. This build accepts ${CONTRACT_VERSION}.`,
    );
  }
  const parsed = ResponseEnvelopeSchema.safeParse(value);
  if (!parsed.success) {
    throw new ContractValidationError(
      "CONTRACT_INVALID_PAYLOAD",
      "The response envelope is invalid.",
    );
  }
  return parsed.data;
}

export function parseEventEnvelope(value: unknown): EventEnvelope {
  const parsed = EventEnvelopeSchema.safeParse(value);
  if (!parsed.success) {
    throw new ContractValidationError(
      hasUnsupportedVersion(value)
        ? "CONTRACT_UNSUPPORTED_VERSION"
        : "CONTRACT_INVALID_PAYLOAD",
      "The event envelope is invalid.",
    );
  }
  return parsed.data;
}

export function createSystemDescribeCommand(input: {
  commandId: string;
  correlationId: string;
  timestamp: string;
}): SystemDescribeCommand {
  return parseSystemDescribeCommand({
    contractVersion: CONTRACT_VERSION,
    commandId: input.commandId,
    commandType: SYSTEM_DESCRIBE_COMMAND,
    correlationId: input.correlationId,
    timestamp: input.timestamp,
    payload: {},
  });
}

